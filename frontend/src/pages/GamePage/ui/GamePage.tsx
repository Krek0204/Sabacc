import { subscribeOnConnect } from '@/shared/lib/stomp/subscribeOnConnect';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectCurrentUser } from '@/features/Auth';
import { Game } from '@/features/Game';
import { useGameState } from '@/features/Game/model/hooks/useGameState';
import { TOKEN_HAND_SIZE } from '@/features/Game/model/opponentTokensLeft';
import { tokenCatalog } from '@/features/Game/model/tokenCatalog';
import { TokensTypes } from '@/features/Game/model/types/game';
import { getRouteMain } from '@/shared/const/router';
import { formatSelectionCountdown } from '@/shared/lib/countdown/countdown';
import hud from '@/shared/ui/Hud/Hud.module.scss';
import {
  clearTokenSelection,
  DEFAULT_TOKEN_SELECTION,
  OPPONENT_SELECTING_TOKENS_CAPTION,
  readTokenSelection,
  remainingSelectionSeconds,
  saveTokenSelection,
  shouldOpenTokenSelection,
  shouldShowOpponentSelectingTokens,
  TOKEN_SELECTION_TIMEOUT_SEC,
} from '../model/tokenSelection';
import cls from './GamePage.module.scss';

const GamePage = () => {
  const navigate = useNavigate();
  const {
    client,
    gameState,
    roomState,
    isLoading,
    isGameInProgress,
    diceDetails,
    opponentTurnNotice,
    handleDiceSelection,
    winnerId,
    gameDraw,
    roundResult,
    leaveCurrentRoom,
    requestRematch,
    cancelMatchmaking,
    fetchGameState,
  } = useGameState();
  const playerId = useSelector(selectCurrentUser)?.id;
  const opponentId = roomState?.playerFirst?.id === playerId
    ? roomState?.playerSecond?.id
    : roomState?.playerFirst?.id;
  const tokenSelectionDestination = roomState?.id == null
    ? null
    : `/topic/session/${roomState.id}/token-selection`;

  const [myTokens, setMyTokens] = useState<TokensTypes[]>([]);
  const [hasSelectedTokens, setHasSelectedTokens] = useState<boolean>(false);
  const [awaitingOpponentTokens, setAwaitingOpponentTokens] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);

  const handleCancelMatchmaking = async () => {
    setIsCancelling(true);
    setCancelError(false);
    try {
      if (await cancelMatchmaking()) {
        navigate(getRouteMain(), { replace: true });
      }
    } catch {
      setCancelError(true);
    } finally {
      setIsCancelling(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectionSecondsLeft, setSelectionSecondsLeft] = useState(TOKEN_SELECTION_TIMEOUT_SEC);
  const [opponentSecondsLeft, setOpponentSecondsLeft] = useState<number | null>(null);
  const selectionSettledRef = useRef(false);
  const confirmTokensRef = useRef<(tokens: TokensTypes[]) => void>(() => {});
  const opponentReplyRef = useRef(false);


  // Один раз на комнату: повторный заход из меню не открывает выбор заново.
  useEffect(() => {
    if (roomState?.id == null || playerId == null) {
      return;
    }

    const saved = readTokenSelection(roomState.id, playerId);
    if (saved) {
      setMyTokens((current) => (
        current.length === saved.length && current.every((token, index) => token === saved[index])
          ? current
          : saved
      ));
      setHasSelectedTokens(true);
      setIsModalOpen(false);
      return;
    }

    setIsModalOpen(shouldOpenTokenSelection({
      status: roomState.status,
      hasSecondPlayer: Boolean(roomState.playerSecond),
      alreadySelected: hasSelectedTokens,
    }));
  }, [roomState?.id, roomState?.status, roomState?.playerSecond, playerId, hasSelectedTokens]);

  const handleSelectTokens = (tokens: TokensTypes[]) => {
    if (selectionSettledRef.current || tokens.length !== TOKEN_HAND_SIZE) {
      return;
    }

    selectionSettledRef.current = true;
    if (roomState?.id != null && playerId != null) {
      saveTokenSelection(roomState.id, playerId, tokens);
    }
    setMyTokens(tokens);
    setHasSelectedTokens(true);
    setAwaitingOpponentTokens(true);
    setIsModalOpen(false);
  };

  confirmTokensRef.current = handleSelectTokens;

  useEffect(() => {
    setOpponentReady(false);
    setOpponentSecondsLeft(null);
    setAwaitingOpponentTokens(false);
    opponentReplyRef.current = false;
  }, [roomState?.id]);

  useEffect(() => {
    if (!client || !tokenSelectionDestination || playerId == null) {
      return undefined;
    }

    const destination = tokenSelectionDestination;
    let subscriptions: { unsubscribe: () => void }[] = [];
    let stopped = false;

    const publishReady = () => {
      if (stopped || !hasSelectedTokens || !client.connected) {
        return;
      }
      client.publish({
        destination,
        body: JSON.stringify({ playerId }),
      });
    };

    const handleCountdown = (message: { body: string }) => {
      let data: { playerId?: unknown; seconds?: unknown } | null;
      try {
        data = JSON.parse(message.body);
      } catch {
        return;
      }
      if (opponentId == null || String(data?.playerId) !== String(opponentId)) {
        return;
      }
      const seconds = data?.seconds;
      if (typeof seconds === 'number' && Number.isInteger(seconds)
        && seconds >= 0 && seconds <= TOKEN_SELECTION_TIMEOUT_SEC) {
        setOpponentSecondsLeft(seconds);
      }
    };

    const handleMessage = (message: { body: string }) => {
      let senderId: unknown;
      try {
        senderId = JSON.parse(message.body)?.playerId;
      } catch {
        return;
      }
      if (senderId == null || String(senderId) === String(playerId)) {
        return;
      }

      setOpponentReady(true);
      setAwaitingOpponentTokens(false);
      if (!hasSelectedTokens || opponentReplyRef.current || !client.connected) {
        return;
      }
      opponentReplyRef.current = true;
      publishReady();
    };

    const listen = () => {
      if (stopped || !client.connected) {
        return;
      }
      subscriptions = [
        client.subscribe(destination, handleMessage),
        client.subscribe(`${destination}/countdown`, handleCountdown),
      ];
      publishReady();
    };

    const stopListening = subscribeOnConnect(client, listen);

    return () => {
      stopped = true;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      stopListening();
    };
  }, [client, hasSelectedTokens, opponentId, playerId, tokenSelectionDestination]);

  useEffect(() => {
    if (!isModalOpen || hasSelectedTokens) {
      return undefined;
    }

    selectionSettledRef.current = false;
    const startedAt = Date.now();
    setSelectionSecondsLeft(TOKEN_SELECTION_TIMEOUT_SEC);

    const timer = window.setInterval(() => {
      const left = remainingSelectionSeconds(Date.now() - startedAt);
      setSelectionSecondsLeft((current) => (current === left ? current : left));
      if (left > 0) {
        return;
      }

      window.clearInterval(timer);
      confirmTokensRef.current([...DEFAULT_TOKEN_SELECTION]);
    }, 250);

    return () => window.clearInterval(timer);
  }, [isModalOpen, hasSelectedTokens]);

  useEffect(() => {
    if (!client || !tokenSelectionDestination || playerId == null || !isModalOpen || hasSelectedTokens) {
      return undefined;
    }
    return subscribeOnConnect(client, () => {
      client.publish({
        destination: `${tokenSelectionDestination}/countdown`,
        body: JSON.stringify({ playerId, seconds: selectionSecondsLeft }),
      });
    });
  }, [client, hasSelectedTokens, isModalOpen, playerId, selectionSecondsLeft, tokenSelectionDestination]);


  const toggleToken = (token: TokensTypes) => {
    setMyTokens((current) => {
      if (current.includes(token)) {
        return current.filter((item) => item !== token);
      }
      return current.length < TOKEN_HAND_SIZE ? [...current, token] : current;
    });
  };

  const waitingForOpponent = roomState?.status === 'WAITING_SECOND_USER' || (isLoading && !isGameInProgress);
  const waitingForTokens = shouldShowOpponentSelectingTokens({
    status: roomState?.status,
    hasSelectedTokens: awaitingOpponentTokens,
    opponentReady,
  });

  let statusMessage = null;
  if (!client) statusMessage = 'Подключение к серверу…';
  else if (!roomState) statusMessage = 'Создание комнаты…';
  else if (waitingForTokens) statusMessage = OPPONENT_SELECTING_TOKENS_CAPTION;
  else if (waitingForOpponent) statusMessage = 'Ожидание соперника…';
  else if (!gameState || !hasSelectedTokens) statusMessage = 'Подготовка партии…';

  return (
    <main className={hud.screen}>
      {isModalOpen ? (
        <section className={`${hud.panel} ${cls.tokenPanel}`} aria-labelledby="token-selection-title">
          <header className={cls.header}>
            <div>
              <h1 id="token-selection-title">Выберите жетоны смены для игры</h1>
              <p className={cls.hint}>
                Если время истечёт, будут выданы «Бесплатный розыгрыш», «Возврат» и «Хищение».
              </p>
            </div>
            <div className={cls.status}>
              <span className={hud.pill}>⏱ Осталось {formatSelectionCountdown(selectionSecondsLeft)}</span>
              <span className={cls.counter}>Выбрано {myTokens.length} / {TOKEN_HAND_SIZE}</span>
            </div>
          </header>

          <div className={cls.tokensGrid}>
            {(Object.keys(tokenCatalog) as TokensTypes[]).map((type) => {
              const token = tokenCatalog[type];
              const selected = myTokens.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={cls.tokenCard}
                  aria-pressed={selected}
                  disabled={!selected && myTokens.length >= TOKEN_HAND_SIZE}
                  onClick={() => toggleToken(type)}
                >
                  <span className={cls.tokenName}>
                    <img className={cls.tokenIcon} src={token.icon} alt="" />
                    {token.name}
                  </span>
                  <span className={cls.tokenDescription}>{token.description}</span>
                  <span className={cls.tokenAction} aria-hidden="true">{selected ? '− Убрать' : '+ Выбрать'}</span>
                </button>
              );
            })}
          </div>

          <footer className={cls.actions}>
            <p className={cls.hint}>Выбранный набор сохраняется на всю партию.</p>
            <button
              type="button"
              className={`${hud.button} ${hud.gold}`}
              onClick={() => handleSelectTokens(myTokens)}
              disabled={myTokens.length !== TOKEN_HAND_SIZE}
            >
              Подтвердить выбор ({myTokens.length}/{TOKEN_HAND_SIZE})
            </button>
          </footer>
        </section>
      ) : statusMessage ? (
        <section className={`${hud.panel} ${cls.loader}`}>
          <p role="status">
            {waitingForOpponent && roomState?.id != null && (
              <strong className={cls.roomNumber}>Комната {roomState.id}</strong>
            )}
            {statusMessage}
            {waitingForTokens && opponentSecondsLeft != null && (
              <span className={cls.waitingTimer} role="timer">
                ⏱ Осталось {formatSelectionCountdown(opponentSecondsLeft)}
              </span>
            )}
          </p>
          {roomState?.status === 'WAITING_SECOND_USER' && !roomState.playerSecond && (
            <div className={cls.cancelMatchmaking}>
              <button type="button" className={hud.button} disabled={isCancelling} onClick={handleCancelMatchmaking}>
                {isCancelling ? 'Отменяем подбор…' : 'Вернуться в главное меню'}
              </button>
              {cancelError && <p role="alert">Не удалось отменить подбор. Попробуйте ещё раз.</p>}
            </div>
          )}
        </section>
      ) : client && gameState && roomState && (
        <Game
          key={roomState.matchNumber}
          requestRematch={requestRematch}
          client={client}
          gameState={gameState}
          roomState={roomState}
          diceDetails={diceDetails}
          opponentTurnNotice={opponentTurnNotice}
          handleDiceSelection={handleDiceSelection}
          winnerId={winnerId}
          gameDraw={gameDraw}
          roundResult={roundResult}
          leaveCurrentRoom={leaveCurrentRoom}
          finishLeave={() => {
            if (playerId != null) {
              clearTokenSelection(roomState.id, playerId);
            }
            return leaveCurrentRoom();
          }}
          fetchGameState={fetchGameState}
          myTokens={myTokens}
        />
      )}
    </main>
  );
};

export default GamePage;
