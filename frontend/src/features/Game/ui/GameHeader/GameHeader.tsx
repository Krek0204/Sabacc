
import { GameCard, GameCardType } from '@/entities/GameCard';
import { User } from '@/features/Auth/model/types/auth';
import { formatSelectionCountdown } from '@/shared/lib/countdown/countdown';
import { TOKEN_HAND_SIZE } from '../../model/opponentTokensLeft';
import { Player } from '../../model/types/game';
import cls from './GameHeader.module.scss';

interface GameHeaderProps {
  opponent: User | null;
  player?: Player;
  isCurrentTurn: boolean;
  tokensLeft: number;
  roomId: number;
  round: number;
  turnOwner?: 'self' | 'opponent';
  turnSecondsLeft?: number;
}

export const GameHeader = ({
  opponent, player, isCurrentTurn, tokensLeft, roomId, round, turnOwner, turnSecondsLeft,
}: GameHeaderProps) => (
  <header className={cls.header}>
    <div className={cls.opponent}>
      <div className={cls.badge} data-active={isCurrentTurn}>
        <div>
          <div className={cls.label}>{isCurrentTurn ? 'Ход соперника' : 'Соперник'}</div>
          <strong>{opponent?.username || 'Соперник'}</strong>
        </div>
        <span className={cls.value}>Фишки {player?.remainChips ?? '—'}</span>
      </div>

      <div className={cls.tokens}>
        <span className={cls.label}>Жетоны соперника ({tokensLeft}/{TOKEN_HAND_SIZE})</span>
        {Array.from({ length: TOKEN_HAND_SIZE }, (_, index) => (
          <span className={cls.token} data-used={index >= tokensLeft} key={index} aria-hidden="true">
            {index < tokensLeft ? '◈' : '×'}
          </span>
        ))}
      </div>
    </div>

    <div className={cls.cards} aria-label="Скрытые карты соперника" role="group">
      <GameCard type={GameCardType.BLOOD} isFlipped />
      <GameCard type={GameCardType.SAND} isFlipped />
    </div>

    <div className={cls.status}>
      {turnOwner && (
        <div className={cls.turnIndicator} data-owner={turnOwner}>
          <strong role="status">{turnOwner === 'self' ? 'Ваш ход' : 'Ход соперника'}</strong>
          {turnSecondsLeft != null && (
            <span className={cls.turnTime} role="timer">{formatSelectionCountdown(turnSecondsLeft)}</span>
          )}
        </div>
      )}
      <div className={cls.badge}>
        <span className={cls.label}>Комната {roomId}</span>
        <strong className={cls.value}>Раунд {round}</strong>
      </div>
    </div>
  </header>
);
