import { subscribeOnConnect } from '@/shared/lib/stomp/subscribeOnConnect';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import hud from '@/shared/ui/Hud/Hud.module.scss';
import { useCountdown, useDeadlineCountdown } from '@/shared/lib/countdown/useCountdown';
import { CountdownTimer } from '@/shared/ui/CountdownTimer';
import { selectCurrentUser } from '@/features/Auth';
import { GameHeader } from '../GameHeader/GameHeader';
import { GameFooter } from '../GameFooter/GameFooter';
import { Card, GameState, GameStatus, TokensTypes } from '../../model/types/game';
import cls from './Game.module.scss';
import { useOpponent } from '@/shared/lib/hooks/useOpponent';
import { RoomState } from '@/entities/Room/types/room';
import { GameCardType } from '@/entities/GameCard';
import { GameCardModal } from '../GameCardModal/GameCardModal';
import { GameDiceModal } from '../GameDiceModal/GameDiceModal';
import { GameRoundResultModal } from '../GameRoundResultModal/GameRoundResultModal';
import { GameResultModal } from '../GameResultModal/GameResultModal';
import { useNavigate } from 'react-router-dom';
import { getRouteMain } from '@/shared/const/router';
import { GameTable } from '../GameTable/GameTable';
import { GameRulesDialog } from '../GameRules/GameRulesDialog';
import { opponentTokensLeft } from '../../model/opponentTokensLeft';
import { reconnectDeadlineFromLeftAt } from '../../model/reconnectDeadline';
import { timeoutTurn } from '../../model/timeoutTurn';

function opponentLeftDeadline(
  room: {
    playerFirst?: { id?: number | string } | null;
    playerSecond?: { id?: number | string } | null;
    playerFirstLeftAt?: string | null;
    playerSecondLeftAt?: string | null;
  } | null | undefined,
  myId?: number | string | null,
): string | null {
  if (!room || myId == null) {
    return null;
  }
  const iAmFirst = room.playerFirst?.id != null && String(room.playerFirst.id) === String(myId);
  const mine = iAmFirst ? room.playerFirstLeftAt : room.playerSecondLeftAt;
  if (mine) {
    return null;
  }
  return reconnectDeadlineFromLeftAt(iAmFirst ? room.playerSecondLeftAt : room.playerFirstLeftAt);
}



interface GameProps {
  client: Client;
  gameState: GameState;
  roomState: RoomState;
  diceDetails: { first: number; second: number } | null;
  opponentTurnNotice: string | null;
  handleDiceSelection: (index: number) => void;
  winnerId: number | null;
  gameDraw?: boolean;
  roundResult: any | null;
  leaveCurrentRoom: any;
  finishLeave?: () => void;
  requestRematch: () => Promise<void>;
  fetchGameState: any;

  myTokens: TokensTypes[];
}

export const Game = memo(({
  client,
  gameState,
  roomState,
  diceDetails,
  opponentTurnNotice,
  handleDiceSelection,
  winnerId,
  gameDraw = false,
  roundResult,
  leaveCurrentRoom,
  finishLeave,
  requestRematch,
  fetchGameState,
  myTokens,
}: GameProps) => {
  const user = useSelector(selectCurrentUser);
  const opponent = useOpponent(user?.id, roomState);
  const navigate = useNavigate();

  const playerIndex = gameState.players[0].playerId === user?.id ? 0 : 1;
  const player = gameState.players[playerIndex];
  const opponentPlayer = gameState.players.find((item) => item.playerId !== user?.id);
  const [rematchPending, setRematchPending] = useState(false);
  const [rematchError, setRematchError] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [modalCards, setModalCards] = useState<{ cards: Card[], type: GameCardType } | null>(null);

  // Управление модалками через одно состояние
  const [currentModal, setCurrentModal] = useState<'ROUND' | 'GAME' | null>(null);
  const [forcedWinnerId, setForcedWinnerId] = useState<number | null>(null);
  const [myRoundClosed, setMyRoundClosed] = useState(false);
  const [opponentClosedRound, setOpponentClosedRound] = useState(false);
  const [waitingForOpponentRound, setWaitingForOpponentRound] = useState(false);
  const [matchDraw, setMatchDraw] = useState(false);
  const roundClosedRef = useRef(false);
  const opponentClosedRef = useRef(false);
  const roundTimedOutRef = useRef(false);
  const opponentTimedOutRef = useRef(false);
  const roundDecidedRef = useRef(false);
  const leftMatchRef = useRef(false);
  const roundKeyRef = useRef<number | null>(roundResult?.round ?? null);
  roundKeyRef.current = roundResult?.round ?? null;
  const bothReadyToPlay = !roundResult || (myRoundClosed && opponentClosedRound);
  const opponentId = opponent?.id
    ?? gameState.players.find((player) => player.playerId !== user?.id)?.playerId;
  const isMyTurn = user?.id != null && user.id === gameState.currentPlayerId;
  const hiddenTokensLeft = opponentTokensLeft(opponentPlayer?.tokens?.length);
  const awayDeadline = opponentLeftDeadline(roomState, user?.id);
  const opponentAway = awayDeadline != null;
  const returnSecondsLeft = useDeadlineCountdown(awayDeadline);

  // Отправка хода
  const sendTurn = useCallback((turnType: string, details: object = {}) => {
      console.log('[SEND TURN] turnType:', turnType, 'details:', details);
    if (client.connected && user) {
      client.publish({
        destination: `/app/input/session/${roomState.id}/turn`,
        body: JSON.stringify({
          sessionId: roomState.id,
          playerId: user.id,
          turnType,
          details
        }),
      });
    }
  }, [client, user, roomState]);

  const showDraw = useCallback(() => {
    roundDecidedRef.current = true;
    setWaitingForOpponentRound(false);
    setMatchDraw(true);
    setForcedWinnerId(null);
    setCurrentModal('GAME');
  }, []);

  const showWinner = useCallback((playerId: number) => {
    roundDecidedRef.current = true;
    setWaitingForOpponentRound(false);
    setMatchDraw(false);
    setForcedWinnerId(playerId);
    setCurrentModal('GAME');
  }, []);

  const publishRoundAction = useCallback((action: 'closed' | 'forfeit' | 'timeout') => {
    if (!client?.connected || !user) {
      return;
    }
    client.publish({
      destination: `/topic/session/${roomState.id}/round-timer`,
      body: JSON.stringify({ playerId: user.id, action, round: roundResult?.round ?? null }),
    });
  }, [client, roundResult, roomState.id, user]);

  const leaveMatch = useCallback(() => {
    if (leftMatchRef.current) {
      return;
    }
    leftMatchRef.current = true;
    (finishLeave ?? leaveCurrentRoom)?.();
    navigate(getRouteMain());
  }, [finishLeave, leaveCurrentRoom, navigate]);

  const handleSurrender = () => {
    if (!client.connected || opponentId == null || roundDecidedRef.current || currentModal === 'GAME') {
      return;
    }

    publishRoundAction('forfeit');
    showWinner(opponentId);
  };

  const finishRoundByTimeout = useCallback(() => {
    if (roundClosedRef.current || roundDecidedRef.current) {
      return;
    }
    if (winnerId != null || gameDraw) {
      setCurrentModal('GAME');
      return;
    }
    roundTimedOutRef.current = true;
    publishRoundAction('timeout');
    if (opponentClosedRef.current && opponentId != null) {
      roundDecidedRef.current = true;
      setMatchDraw(false);
      setWaitingForOpponentRound(false);
      setForcedWinnerId(opponentId);
      setCurrentModal('GAME');
      return;
    }
    // Соперник «Закрыть» не присылал: к концу таймера кнопку не нажал никто.
    showDraw();
  }, [gameDraw, opponentId, publishRoundAction, showDraw, winnerId]);

  const passTurnByTimeout = useCallback(() => {
    if (!isMyTurn || !user) {
      return;
    }
    const me = gameState.players.find((player) => player.playerId === user.id);
    const action = timeoutTurn({
      hasDice: Boolean(diceDetails),
      sandCount: me?.sandCards.length ?? 0,
      bloodCount: me?.bloodCards.length ?? 0,
    });
    sendTurn(action.turnType, action.turnType === 'PASS' ? { timedOut: true } : action.details ?? {});
  }, [diceDetails, gameState.players, isMyTurn, sendTurn, user]);

  const turnSecondsLeft = useCountdown(
    isMyTurn && bothReadyToPlay && currentModal === null && forcedWinnerId == null && !waitingForOpponentRound,
    `${gameState.currentPlayerId}-${gameState.round}-${bothReadyToPlay ? 'ready' : 'wait'}`,
    passTurnByTimeout,
    { paused: opponentAway },
  );
  const [opponentTurnSeconds, setOpponentTurnSeconds] = useState<{ round: number; seconds: number } | null>(null);
  const timerDestination = `/topic/session/${roomState.id}/round-timer`;
  const turnTimerVisible = bothReadyToPlay && currentModal === null && forcedWinnerId == null
    && !waitingForOpponentRound && winnerId == null && !gameDraw && !opponentAway;

  useEffect(() => {
    if (isMyTurn || !turnTimerVisible) {
      setOpponentTurnSeconds(null);
    }
  }, [isMyTurn, turnTimerVisible]);

  useEffect(() => {
    if (!isMyTurn || !turnTimerVisible || !user) {
      return undefined;
    }
    return subscribeOnConnect(client, () => {
      client.publish({
        destination: timerDestination,
        body: JSON.stringify({
          action: 'turn-countdown',
          playerId: user.id,
          round: gameState.round,
          seconds: turnSecondsLeft,
        }),
      });
    });
  }, [client, gameState.round, isMyTurn, timerDestination, turnSecondsLeft, turnTimerVisible, user]);

  const roundSecondsLeft = useCountdown(
    currentModal === 'ROUND',
    gameState.round,
    finishRoundByTimeout,
  );
  const isFirstInRoom = roomState.playerFirst?.id === user?.id;
  const readyForRematch = isFirstInRoom
    ? roomState.playerFirstReadyForRematch : roomState.playerSecondReadyForRematch;
  const opponentReadyForRematch = isFirstInRoom
    ? roomState.playerSecondReadyForRematch : roomState.playerFirstReadyForRematch;
  const canRematch = roomState.status === GameStatus.FINISHED && Boolean(roomState.playerSecond)
    && roomState.playerFirstConnected && roomState.playerSecondConnected;

  let rematchStatus: string | undefined;
  if (readyForRematch) {
    rematchStatus = canRematch ? 'Ждём подтверждения соперника…' : 'Реванш недоступен.';
  } else if (rematchError) {
    rematchStatus = 'Не удалось отправить запрос на реванш.';
  } else if (canRematch && opponentReadyForRematch) {
    rematchStatus = 'Соперник предлагает реванш.';
  }

  const handleRematch = async () => {
    setRematchPending(true);
    setRematchError(false);
    try {
      await requestRematch();
    } catch {
      setRematchError(true);
    } finally {
      setRematchPending(false);
    }
  };

  const resultSecondsLeft = useCountdown(
    currentModal === 'GAME',
    forcedWinnerId ?? winnerId ?? 'result',
    leaveMatch,
  );




  useEffect(() => {
    const playerIndex = gameState.players[0].playerId === user?.id ? 0 : 1;
    if (gameState.players[playerIndex].bloodCards.length > 1) {
      setModalCards({ cards: gameState.players[playerIndex].bloodCards, type: GameCardType.BLOOD });
    } else if (gameState.players[playerIndex].sandCards.length > 1) {
      setModalCards({ cards: gameState.players[playerIndex].sandCards, type: GameCardType.SAND });
    } else {
      setModalCards(null);
    }
  }, [gameState, user?.id]);

  // Новое окно результата — только когда сменился номер раунда.
  const roundNumber = roundResult?.round;
  useEffect(() => {
    if (roundNumber == null || roundDecidedRef.current) {
      return;
    }
    roundClosedRef.current = false;
    opponentClosedRef.current = false;
    roundTimedOutRef.current = false;
    opponentTimedOutRef.current = false;
    setMyRoundClosed(false);
    setOpponentClosedRound(false);
    setWaitingForOpponentRound(false);
    setMatchDraw(false);
    setCurrentModal('ROUND');
  }, [roundNumber]);

  useEffect(() => {
    if (!client || !user) {
      return undefined;
    }

    let subscription: { unsubscribe: () => void } | null = null;
    let stopped = false;

    const handleMessage = (message: { body: string }) => {
      let data: { playerId?: number | string; action?: string; round?: number | null; seconds?: number };
      try {
        data = JSON.parse(message.body);
      } catch {
        return;
      }
      if (data?.playerId == null || String(data.playerId) === String(user.id)) {
        return;
      }
      if (data.action === 'turn-countdown') {
        if (String(data.playerId) === String(opponentId) && typeof data.round === 'number'
          && typeof data.seconds === 'number' && Number.isInteger(data.seconds) && data.seconds >= 0) {
          setOpponentTurnSeconds({ round: data.round, seconds: data.seconds });
        }
        return;
      }
      if (data.action === 'forfeit') {
        if (!roundDecidedRef.current && String(data.playerId) === String(opponentId)) {
          showWinner(user.id);
        }
        return;
      }
      if (
        data.round != null
        && roundKeyRef.current != null
        && Number(data.round) !== Number(roundKeyRef.current)
      ) {
        return;
      }
      if (data.action === 'closed') {
        opponentClosedRef.current = true;
        setOpponentClosedRound(true);
        if (roundTimedOutRef.current) {
          roundDecidedRef.current = true;
          setMatchDraw(false);
          setWaitingForOpponentRound(false);
          setForcedWinnerId(Number(data.playerId));
          setCurrentModal('GAME');
          return;
        }
        if (roundClosedRef.current) {
          setWaitingForOpponentRound(false);
        }
        return;
      }
      if (data.action !== 'timeout') {
        return;
      }
      if (roundDecidedRef.current) {
        return;
      }
      opponentTimedOutRef.current = true;
      if (roundClosedRef.current) {
        roundDecidedRef.current = true;
        setWaitingForOpponentRound(false);
        setForcedWinnerId(user.id);
        setCurrentModal('GAME');
        return;
      }
      if (roundTimedOutRef.current) {
        showDraw();
      }
    };

    const listen = () => {
      if (stopped || !client.connected) {
        return;
      }
      subscription = client.subscribe(timerDestination, handleMessage);
    };

    const stopListening = subscribeOnConnect(client, listen);

    return () => {
      stopped = true;
      subscription?.unsubscribe();
      stopListening();
    };
  }, [client, opponentId, showDraw, showWinner, timerDestination, user]);

  // Показ модалки игры, если победитель есть и нет открытой модалки раунда
  useEffect(() => {
    if ((winnerId != null || gameDraw) && (!roundResult || roundClosedRef.current)) {
      setWaitingForOpponentRound(false);
      if (gameDraw) {
        setMatchDraw(true);
      }
      setCurrentModal('GAME');
    }
  }, [winnerId, gameDraw, roundResult]);

  useEffect(() => {
    if (gameState) {
      console.log('[DEBUG] Текущее состояние игры:', gameState);
    }
  }, [gameState]);






  // Закрытие модалки раунда
  const handleCloseRoundModal = () => {
    if (roundDecidedRef.current) {
      return;
    }
    roundClosedRef.current = true;
    setMyRoundClosed(true);
    publishRoundAction('closed');
    if (opponentTimedOutRef.current) {
      roundDecidedRef.current = true;
      setWaitingForOpponentRound(false);
      setForcedWinnerId(user.id);
      setCurrentModal('GAME');
      return;
    }
    if (winnerId || forcedWinnerId || gameDraw) {
      if (gameDraw) {
        setMatchDraw(true);
      }
      setWaitingForOpponentRound(false);
      setCurrentModal('GAME');
      return;
    }
    fetchGameState();
    setCurrentModal(null);
    setWaitingForOpponentRound(!opponentClosedRef.current);
  };

  const actionsBlocked = !bothReadyToPlay || currentModal !== null || opponentAway
    || Boolean(diceDetails || modalCards) || waitingForOpponentRound;
  const canAct = isMyTurn && !actionsBlocked && client.connected;
  const visibleTurnSeconds = isMyTurn && bothReadyToPlay && currentModal === null && forcedWinnerId == null
    ? turnSecondsLeft
    : undefined;

  useEffect(() => {
    if (actionsBlocked) {
      setRulesOpen(false);
    }
  }, [actionsBlocked]);

  const shownWinnerId = forcedWinnerId ?? winnerId ?? null;
  const resultIsDraw = forcedWinnerId == null && (matchDraw || gameDraw);

  return (
    <>
      <div className={cls.turnNotice} role="status">{opponentTurnNotice}</div>
      {/* Модалка раунда */}
      {currentModal === 'ROUND' && (
        <GameRoundResultModal
          roundResult={roundResult}
          roomState={roomState}
          secondsLeft={roundSecondsLeft}
          onClose={handleCloseRoundModal}
        />
      )}

      {/* Модалка результатов игры */}
      {currentModal === 'GAME' && (resultIsDraw || shownWinnerId != null) && (
        <GameResultModal
          winnerId={resultIsDraw ? null : shownWinnerId}
          draw={resultIsDraw}
          secondsLeft={resultSecondsLeft}
          onClose={leaveMatch}
          onRematch={canRematch ? handleRematch : undefined}
          rematchDisabled={rematchPending || readyForRematch}
          rematchStatus={rematchStatus}
        />
      )}

      {opponentAway && currentModal !== 'GAME' && (
        <div className={cls.waitScreen}>
          <div className={cls.loader}>
            Соперник вышел, ожидаем возвращения
            <CountdownTimer secondsLeft={returnSecondsLeft} caption="на возвращение" />
          </div>
        </div>
      )}

      {waitingForOpponentRound && currentModal === null && !opponentAway && (
        <div className={cls.waitScreen}>
          <div className={cls.loader}>Ждем действий соперника</div>
        </div>
      )}

      {!waitingForOpponentRound && (
      <>
      {/* Модалка карт */}
      {currentModal !== 'GAME' && modalCards && (
        <GameCardModal
          cards={modalCards.cards}
          sendTurn={sendTurn}
          type={modalCards.type}
        />
      )}

      {/* Модалка кубиков */}
      {currentModal !== 'GAME' && diceDetails && (
        <GameDiceModal
          first={diceDetails.first}
          second={diceDetails.second}
          onSelect={handleDiceSelection}
        />
      )}

      <div className={`${hud.panel} ${cls.board}`}>
        <GameHeader
          opponent={opponent}
          player={opponentPlayer}
          isCurrentTurn={opponentId === gameState.currentPlayerId}
          tokensLeft={hiddenTokensLeft}
          roomId={roomState.id}
          round={gameState.round}
          turnOwner={turnTimerVisible
            ? (isMyTurn ? 'self' : opponentId === gameState.currentPlayerId ? 'opponent' : undefined)
            : undefined}
          turnSecondsLeft={turnTimerVisible && !isMyTurn
            ? (opponentTurnSeconds?.round === gameState.round ? opponentTurnSeconds.seconds : undefined)
            : visibleTurnSeconds}
        />

        <GameTable
          gameState={gameState}
          player={player}
          opponent={opponentPlayer}
          playerName={user?.username ?? 'Вы'}
          opponentName={opponent?.username ?? 'Соперник'}
          canDraw={canAct}
          sendTurn={sendTurn}
        />

        <GameFooter
          user={user ?? null}
          player={player}
          canAct={canAct}
          selectedTokens={myTokens}
          onPass={() => sendTurn('PASS')}
          onSurrender={client.connected && opponentId != null ? handleSurrender : undefined}
          onShowRules={() => setRulesOpen(true)}
          onPlayToken={(token) => sendTurn('PLAY_TOKEN', { token })}
        />

        {rulesOpen && !actionsBlocked && (
          <GameRulesDialog
            onClose={() => setRulesOpen(false)}
            turnSecondsLeft={visibleTurnSeconds}
          />
        )}
      </div>
      </>
      )}
    </>
  );
});

export default Game;
