package ru.ngtu.sabacc.gamecore.game.session

import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import ru.ngtu.sabacc.game.messaging.IGameMessageExchanger
import ru.ngtu.sabacc.gamecore.token.Token
import ru.ngtu.sabacc.gamecore.turn.TurnDto
import ru.ngtu.sabacc.gamecore.turn.TurnType
import kotlin.test.assertEquals

class EmbargoTurnOrderTest {
    @Test
    fun `second player skips the opponent at the start of the next turn cycle`() {
        val messages = mock(IGameMessageExchanger::class.java)
        val session = GameSession(1L, 10L, 20L, messages)
        session.start()
        val first = requireNotNull(session.getCurrentState().currentPlayerId)
        val second = if (first == 10L) 20L else 10L

        session.tryMakeTurn(TurnDto(1L, first, TurnType.GET_SAND))
        session.tryMakeTurn(TurnDto(1L, first, TurnType.DISCARD_SAND, mutableMapOf("index" to 0)))
        assertEquals(second, session.getCurrentState().currentPlayerId)

        session.tryMakeTurn(TurnDto(1L, second, TurnType.PLAY_TOKEN, mutableMapOf("token" to Token.EMBARGO.name)))
        session.tryMakeTurn(TurnDto(1L, second, TurnType.PASS))

        verify(messages).sendAcceptedTurn(
            TurnDto(1L, first, TurnType.PASS, mutableMapOf("forced" to true)),
            session
        )
        assertEquals(second, session.getCurrentState().currentPlayerId)
        assertEquals(1, session.getCurrentState().round)

        session.tryMakeTurn(TurnDto(1L, second, TurnType.GET_SAND))
        session.tryMakeTurn(TurnDto(1L, second, TurnType.DISCARD_SAND, mutableMapOf("index" to 0)))
        assertEquals(first, session.getCurrentState().currentPlayerId)
    }
}
