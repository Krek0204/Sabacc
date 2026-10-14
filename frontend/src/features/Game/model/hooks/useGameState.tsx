import type { RoomState } from '@/entities/Room/types/room';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/features/Auth/model/selectors/authSelector';
import { useWebSocketGame } from '@/shared/lib/hooks/useWebSocketGame';
import { useSetupRoom } from '@/shared/lib/hooks/useSetupRoom';
import axios from 'axios';
import { DiceDetails, RoundResult, GameState, GameStatus, TurnType } from '../types/game';

export const useGameState = () => {
  const playerId = useSelector(selectCurrentUser)?.id;
  const sessionId = useSetupRoom(playerId);
  const client = useWebSocketGame(playerId, sessionId || undefined);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diceDetails, setDiceDetails] = useState<DiceDetails | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  const roomStateRef = useRef(roomState);
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  // Получаем состояние комнаты
  const fetchRoomState = async (id?: string | number) => {
    if (!id) return;
    try {
      const data = (await axios.get(`${__API__}/v1/room/${id}`)).data;
      setRoomState(data);
    } catch (err) {
      console.error('Ошибка при получении состояния комнаты:', err);
    }
  };

  // Получаем состояние игры (только если статус комнаты подходящий)
  const fetchGameState = useCallback(async (id?: string | number) => {
    if (!id) return;
    console.log("получаем состояние игры В fetchGameState() useGameState")
    if (!roomStateRef.current || roomStateRef.current.status === GameStatus.WAITING_SECOND_USER) {
      //setGameState(null);
      return;
    }
    try {
      const data = (await axios.get(`${__API__}/v1/room/game/current-state?sessionId=${id}`)).data;
      console.log('[DEBUG] fetchGameState', data);
      setGameState(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // Игра ещё не начата, gameState недоступен
        setGameState(null);
        return;
      }
      console.error('Ошибка при получении состояния игры:', err);
    }
  }, []);

  const leaveCurrentRoom = async () => {
    if (!sessionId) return;
    try {
      await axios.post(`${__API__}/v1/room/leave/${sessionId}?userId=${playerId}`);
      localStorage.removeItem('roomId');
      console.log("ПОКИДАЕМ ИГРУ В LEAVECURRENTROOM() useGameState")

      setGameState(null);
      setRoomState(null);
    } catch (err) {
      console.error('Ошибка при выходе из комнаты:', err);
    }
  };

  const showDiceModal = (details: DiceDetails | null) => setDiceDetails(details);

  const handleDiceSelection = (index: number) => {
    if (client && playerId && roomState?.id) {
      client.publish({
        destination: `/app/input/session/${roomState.id}/turn`,
        body: JSON.stringify({
          sessionId: roomState.id,
          playerId: playerId,
          turnType: TurnType.SELECT_DICE,
          details: { index },
        }),
      });
    }
  };

  // Получаем roomState при подключении (и при смене sessionId)
  useEffect(() => {
    if (sessionId) {
      fetchRoomState(sessionId);
    }
  }, [sessionId]);

  // Получаем gameState когда статус комнаты позволяет
  useEffect(() => {
    if (sessionId && roomState && roomState.status !== GameStatus.WAITING_SECOND_USER) {
      fetchGameState(sessionId);
    }
  }, [sessionId, roomState, fetchGameState]);

  // Подписки на сокет при подключении клиента
  useEffect(() => {
    if (client && sessionId) {
      let subscriptions: Array<{ unsubscribe: () => void }> = [];
      const unsubscribe = () => {
        subscriptions.forEach(subscription => subscription.unsubscribe());
        subscriptions = [];
      };
      const handleConnect = () => {
        unsubscribe();
        // --- ГАРАНТИРОВАННО ЗАПРОСИТЬ АКТУАЛЬНЫЕ ДАННЫЕ ---
        fetchRoomState(sessionId);
        fetchGameState(sessionId);

        // Подписка на обновление прогресса игры
        subscriptions.push(client.subscribe(`/queue/session/${sessionId}/game-progress`, (message) => {
          const data = JSON.parse(message.body);
          console.log('[WS] Получен статус игры:', data.status);
          setRoomState((prev) => prev ? ({ ...prev, status: data.status }) : prev);
          //fetchRoomState(sessionId);
          fetchGameState(sessionId);
        }));

        // Подписка на подтвержденные ходы
        subscriptions.push(client.subscribe(`/queue/session/${sessionId}/accepted-turns`, (message) => {
          const data = JSON.parse(message.body);
          if (data.turnType === "AWAITING_DICE" && data.playerId === playerId) {
            showDiceModal(data.details);
          } else {
            showDiceModal(null);
          }
          fetchGameState(sessionId);
          fetchRoomState(sessionId);
        }));

        // Результаты игры
        subscriptions.push(client.subscribe(`/queue/session/${sessionId}/game-results`, (message) => {
          const data = JSON.parse(message.body);
          setWinnerId(data.winnerId);
          localStorage.removeItem('roomId');
          console.log('[INFO] Игра завершена — roomId удалён из localStorage по событию game-results');
        }));

        // Результаты раунда
        subscriptions.push(client.subscribe(`/queue/session/${sessionId}/round-results`, (message) => {
          const data = JSON.parse(message.body);
          setRoundResult(data);
          fetchGameState(sessionId);
          fetchRoomState(sessionId);
        }));

        // Ошибки
        subscriptions.push(client.subscribe(`/queue/session/${sessionId}/errors`, (message) => {
          console.error('WebSocket error:', JSON.stringify(message.body));
        }));
      };

      const previousOnConnect = client.onConnect;
      client.onConnect = handleConnect;
      if (client.connected) handleConnect();
      setIsLoading(false);
      return () => {
        unsubscribe();
        client.onConnect = previousOnConnect;
      };
    }
  }, [client, sessionId, playerId, fetchGameState]);

  useEffect(() => {
    if (roomState?.status === GameStatus.FINISHED) {
      console.log('[INFO] Комната завершена, сбрасываем состояние игрока');
      setGameState(null);
      setRoomState(null);
      setDiceDetails(null);
      localStorage.removeItem('roomId');
    }
  }, [roomState?.status]);



  const isGameInProgress = () => {
    const status = roomState?.status;
    return (
      status !== GameStatus.WAITING_SECOND_USER &&
      status !== GameStatus.PLAYER_DISCONNECTED &&
      status !== GameStatus.FINISHED
    );
  };

  return {
    client,
    gameState,
    roomState,
    isLoading,
    isGameInProgress: isGameInProgress(),
    fetchGameState,
    diceDetails,
    handleDiceSelection,
    winnerId,
    roundResult,
    leaveCurrentRoom
  };
};