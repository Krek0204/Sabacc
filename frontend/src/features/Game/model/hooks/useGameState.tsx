import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/features/Auth/model/selectors/authSelector';
import { useWebSocketGame } from '@/shared/lib/hooks/useWebSocketGame';
import { useSetupRoom } from '@/shared/lib/hooks/useSetupRoom';
import { subscribeOnConnect } from '@/shared/lib/stomp/subscribeOnConnect';
import { RoomState } from '@/entities/Room/types/room';
import axios from 'axios';
import { GameState, GameStatus, TurnType } from '../types/game';

export const useGameState = () => {
  const playerId = useSelector(selectCurrentUser)?.id;
  const sessionId = useSetupRoom(playerId);
  const client = useWebSocketGame(playerId, sessionId);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diceDetails, setDiceDetails] = useState<{ first: number; second: number } | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [gameDraw, setGameDraw] = useState(false);
  const [roundResult, setRoundResult] = useState<{ round: number; players: GameState["players"] }>();

  const fetchRoomState = useCallback(async (id = sessionId) => {
    if (id == null) return null;
    try {
      const { data } = await axios.get<RoomState>(`${__API__}/v1/room/${id}`);
      setRoomState(data);
      setIsLoading(false);
      return data;
    } catch (err) {
      console.error('Ошибка при получении состояния комнаты:', err);
      return null;
    }
  }, [sessionId]);

  const fetchGameState = useCallback(async (id = sessionId) => {
    if (id == null) return;
    try {
      const { data } = await axios.get<GameState>(`${__API__}/v1/room/game/current-state?sessionId=${id}`);
      setGameState(data);
    } catch (err) {
      // Между handshake и стартом сессии состояние ещё может быть недоступно.
      if (axios.isAxiosError(err) && err.response?.status === 404) return;
      console.error('Ошибка при получении состояния игры:', err);
    }
  }, [sessionId]);

  const refreshState = useCallback(async () => {
    const room = await fetchRoomState();
    if (room && [
      GameStatus.ALL_USERS_CONNECTED,
      GameStatus.IN_PROGRESS,
      GameStatus.PLAYER_DISCONNECTED,
    ].includes(room.status)) {
      await fetchGameState();
    }
  }, [fetchRoomState, fetchGameState]);

  const leaveCurrentRoom = async () => {
    if (sessionId == null) return;
    try {
      await axios.post(`${__API__}/v1/room/leave/${sessionId}?userId=${playerId}`);
      localStorage.removeItem('roomId');
      setGameState(null);
      setRoomState(null);
    } catch (err) {
      console.error('Ошибка при выходе из комнаты:', err);
    }
  };

  const handleDiceSelection = (index: number) => {
    if (!client?.connected || playerId == null || !roomState) return;
    client.publish({
      destination: `/app/input/session/${roomState.id}/turn`,
      body: JSON.stringify({
        sessionId: roomState.id,
        playerId,
        turnType: TurnType.SELECT_DICE,
        details: { index },
      }),
    });
  };

  useEffect(() => { void fetchRoomState(); }, [fetchRoomState]);

  useEffect(() => {
    if (!client || sessionId == null) return;
    let subscriptions: { unsubscribe: () => void }[] = [];
    const stopListening = subscribeOnConnect(client, () => {
      // После reconnect подписки старого сокета больше не действуют.
      subscriptions = [
        client.subscribe(`/queue/session/${sessionId}/game-progress`, () => {
          void refreshState();
        }),
        client.subscribe(`/queue/session/${sessionId}/accepted-turns`, (message) => {
          const data = JSON.parse(message.body);
          setDiceDetails(data.turnType === 'AWAITING_DICE' && data.playerId === playerId ? data.details : null);
          void refreshState();
        }),
        client.subscribe(`/queue/session/${sessionId}/game-results`, (message) => {
          const data = JSON.parse(message.body);
          setGameDraw(Boolean(data.draw));
          setWinnerId(data.draw ? null : data.winnerId);
          localStorage.removeItem('roomId');
        }),
        client.subscribe(`/queue/session/${sessionId}/round-results`, (message) => {
          setRoundResult(JSON.parse(message.body));
          void refreshState();
        }),
        client.subscribe(`/queue/session/${sessionId}/errors`, (message) => {
          console.error('Ошибка хода:', message.body);
        }),
      ];
      // Сначала подписки, затем снимок: событие старта могло прийти до CONNECTED.
      void refreshState();
    });
    return () => {
      stopListening();
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [client, sessionId, playerId, refreshState]);

  return {
    client,
    gameState,
    roomState,
    isLoading,
    isGameInProgress: gameState != null,
    fetchGameState,
    diceDetails,
    handleDiceSelection,
    winnerId,
    gameDraw,
    roundResult,
    leaveCurrentRoom,
  };
};
