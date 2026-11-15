package ru.ngtu.sabacc.game.session;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import ru.ngtu.sabacc.game.messaging.IGameMessageExchanger;
import ru.ngtu.sabacc.game.messaging.IGameSession;
import ru.ngtu.sabacc.game.session.factory.IGameSessionFactory;
import ru.ngtu.sabacc.room.SessionRoom;
import ru.ngtu.sabacc.room.SessionRoomStatus;
import ru.ngtu.sabacc.system.event.SessionReadyEvent;
import ru.ngtu.sabacc.system.event.SessionStartedEvent;
import ru.ngtu.sabacc.user.User;
import ru.ngtu.sabacc.user.UserService;
import ru.ngtu.sabacc.ws.WebSocketMessageSender;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameSessionServiceTest {

    @Mock
    private IGameSessionFactory sessionFactory;

    @Mock
    private IGameMessageExchanger gameMessageExchanger;

    @Mock
    private WebSocketMessageSender socketMessageSender;

    @Mock
    private UserService userService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private IGameSession gameSession;

    private GameSessionService service;

    @BeforeEach
    void setUp() {
        service = new GameSessionService(
                sessionFactory,
                gameMessageExchanger,
                socketMessageSender,
                userService,
                eventPublisher
        );
    }

    @Test
    @DisplayName("Готовая комната создаёт одну партию на обоих игроков")
    void readyRoomStartsOneGameForBothPlayers() {
        User host = user(1L, "host");
        User guest = user(2L, "guest");
        SessionRoom room = SessionRoom.builder()
                .playerFirst(host)
                .playerSecond(guest)
                .status(SessionRoomStatus.ALL_USERS_CONNECTED)
                .build();
        room.setId(15L);
        when(sessionFactory.createSession(gameMessageExchanger, 15L, 1L, 2L)).thenReturn(gameSession);

        service.onSessionReady(new SessionReadyEvent(15L, room));

        verify(sessionFactory).createSession(gameMessageExchanger, 15L, 1L, 2L);
        verify(gameSession).start();
        verify(socketMessageSender).sendMessageSessionBroadcast(eq(15L), anyString(), any());
        verify(eventPublisher).publishEvent(new SessionStartedEvent(15L));
    }

    private static User user(Long id, String username) {
        User user = User.builder().username(username).build();
        user.setId(id);
        return user;
    }
}
