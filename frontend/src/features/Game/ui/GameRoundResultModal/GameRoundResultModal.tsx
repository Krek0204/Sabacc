import { CountdownTimer } from '@/shared/ui/CountdownTimer';
import { memo } from 'react';
import cls from './GameRoundResultModal.module.scss';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/features/Auth';
import { useOpponent } from '@/shared/lib/hooks/useOpponent';
import CreditImg from '@/shared/assets/images/credit.png'
import BackgroundTable from '@/shared/assets/images/table_cubes.png'
import type { Player } from '../../model/types/game';

interface GameRoundResultModalProps {
  roundResult: { players: Player[] };
  roomState: any;
  secondsLeft: number;
  onClose: () => void;
}

export const GameRoundResultModal = memo(({ roundResult, roomState, secondsLeft, onClose }: GameRoundResultModalProps) => {
  const user = useSelector(selectCurrentUser);
  const opponent = useOpponent(user?.id, roomState);

  // Сервер уже упорядочивает игроков с учётом эффектов жетонов.
  const [first, second] = roundResult.players;
  const ranked = first?.handRating != null && second?.handRating != null
    && (first.handRating.first !== second.handRating.first
      || first.handRating.second !== second.handRating.second);

  return (
    <div className={cls.GameRoundResultModal} onClick={onClose}>
      <div className={cls.modalContent} onClick={(e) => e.stopPropagation()}>
        <img src={BackgroundTable} className={cls.background} />
        <div className={cls.content}>
          <div className={cls.title}>РЕЗУЛЬТАТ РАУНДА</div>
          <CountdownTimer secondsLeft={secondsLeft} caption="на закрытие" />
          <ul className={cls.list}>
            {roundResult.players.map((player, index) => (
              <li key={player.playerId} className={cls.container}
                data-result={ranked ? (index === 0 ? 'winner' : 'loser') : undefined}>
                <h4 className={cls.nickname}>
                  <span>{player.playerId === user?.id ? user.username : opponent?.username ?? 'Соперник'}</span>
                </h4>

                <div className={cls.credit}>
                  <span>потрачено {player.spentChips}</span>
                  <div className={cls.imgContainer}>
                    <img src={CreditImg} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button className={cls.closeButton} onClick={onClose}>
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
  );
});
