package ru.ngtu.sabacc;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import ru.ngtu.sabacc.room.SessionRoom;
import ru.ngtu.sabacc.room.SessionRoomService;
import ru.ngtu.sabacc.room.SessionRoomStatus;
import ru.ngtu.sabacc.user.CreateUserDto;
import ru.ngtu.sabacc.user.User;
import ru.ngtu.sabacc.user.UserService;

import static org.assertj.core.api.Assertions.assertThat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "server.forward-headers-strategy=framework")
@AutoConfigureMockMvc
class SabaccApplicationTests {

    @Autowired
    private MockMvc mvc;

    @Test
    void contextLoads() {
    }

    @Test
    @Transactional
    void publicHostAndPortAllowCreatingPlayerThroughProxy() throws Exception {
        String username = "qa" + UUID.randomUUID().toString().substring(0, 8);
        mvc.perform(post("/api/v1/users/create/anonymous")
                        .header("Host", "backend:8080")
                        .header("X-Forwarded-Host", "103.85.115.215:18080")
                        .header("X-Forwarded-Proto", "http")
                        .header("Origin", "http://103.85.115.215:18080")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void foreignOriginIsStillRejected() throws Exception {
        mvc.perform(post("/api/v1/users/create/anonymous")
                        .header("Host", "backend:8080")
                        .header("X-Forwarded-Host", "103.85.115.215")
                        .header("X-Forwarded-Proto", "http")
                        .header("Origin", "http://foreign.invalid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"forbidden\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void sockJsAllowsSiteOriginAndRejectsForeignOrigin() throws Exception {
        mvc.perform(get("/game/info")
                        .header("Host", "backend:8080")
                        .header("X-Forwarded-Host", "103.85.115.215")
                        .header("X-Forwarded-Proto", "http")
                        .header("Origin", "http://103.85.115.215"))
                .andExpect(status().isOk());
        mvc.perform(get("/game/info")
                        .header("Host", "backend:8080")
                        .header("X-Forwarded-Host", "103.85.115.215")
                        .header("X-Forwarded-Proto", "http")
                        .header("Origin", "http://foreign.invalid"))
                .andExpect(status().isForbidden());
    }
    @Autowired
    private SessionRoomService rooms;

    @Autowired
    private UserService users;

    @Test
    void simultaneousConnectionsAndDisconnectsKeepBothPlayerFlags() throws Exception {
        User first = createPlayer();
        User second = createPlayer();
        Long roomId = rooms.createSessionRoom(first.getId()).getId();
        try {
            rooms.joinSession(roomId, second.getId());
            concurrently(
                    () -> rooms.handlePlayerSocketConnection(roomId, first.getId()),
                    () -> rooms.handlePlayerSocketConnection(roomId, second.getId()));
            SessionRoom connected = rooms.getRoomById(roomId);
            assertThat(connected.isPlayerFirstConnected()).isTrue();
            assertThat(connected.isPlayerSecondConnected()).isTrue();
            assertThat(connected.getStatus()).isEqualTo(SessionRoomStatus.IN_PROGRESS);

            concurrently(
                    () -> rooms.handlePlayerSocketDisconnect(roomId, first.getId()),
                    () -> rooms.handlePlayerSocketDisconnect(roomId, second.getId()));
            SessionRoom disconnected = rooms.getRoomById(roomId);
            assertThat(disconnected.isPlayerFirstConnected()).isFalse();
            assertThat(disconnected.isPlayerSecondConnected()).isFalse();
            assertThat(disconnected.getPlayerFirstLeftAt()).isNotNull();
            assertThat(disconnected.getPlayerSecondLeftAt()).isNotNull();
            assertThat(disconnected.getStatus()).isEqualTo(SessionRoomStatus.PLAYER_DISCONNECTED);
        } finally {
            rooms.deleteSessionRoomById(roomId);
            users.deleteUserById(first.getId());
            users.deleteUserById(second.getId());
        }
    }

    private User createPlayer() {
        CreateUserDto dto = new CreateUserDto();
        dto.setUsername("qa" + UUID.randomUUID().toString().substring(0, 8));
        return users.createUser(dto);
    }

    private static void concurrently(Runnable first, Runnable second) throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<?> a = pool.submit(() -> {
                await(start);
                first.run();
            });
            Future<?> b = pool.submit(() -> {
                await(start);
                second.run();
            });
            start.countDown();
            a.get(10, TimeUnit.SECONDS);
            b.get(10, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Не началась параллельная проверка");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
