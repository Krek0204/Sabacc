import { CountdownTimer } from '@/shared/ui/CountdownTimer';
import { memo } from 'react';
import cls from './GameResultModal.module.scss';
import { useSelector } from 'react-redux';
import BackgroundTable from '@/shared/assets/images/table_cubes.png'
import { selectCurrentUser } from '@/features/Auth';

interface GameResultModalProps {
  winnerId: number | null;
  draw?: boolean;
  secondsLeft: number;
  onClose: () => void;
  onRematch?: () => void;
  rematchDisabled: boolean;
  rematchStatus?: string;
}

export const GameResultModal = memo(({
  winnerId, draw = false, secondsLeft, onClose, onRematch, rematchDisabled, rematchStatus,
}: GameResultModalProps) => {
  const user = useSelector(selectCurrentUser)

  if (!user) return <div></div>

  const isWinner = !draw && user.id == winnerId;
  const outcome = draw ? 'draw' : isWinner ? 'win' : 'loss';
  const resultText = draw ? 'НИЧЬЯ' : isWinner ? 'ПОБЕДА!' : 'ПРОИГРЫШ';

  return (
    <div className={cls.GameResultModal}>
      <div className={cls.modalContent} data-outcome={outcome}>
        <img src={BackgroundTable} alt="" className={cls.background} />
        <div className={cls.content}>
          <div className={cls.title}>РЕЗУЛЬТАТ</div>
          <div className={cls.resultText}>
            {resultText}
          </div>
          <CountdownTimer secondsLeft={secondsLeft} caption="в меню" />
          {rematchStatus && <p className={cls.rematchStatus} role="status">{rematchStatus}</p>}
          {onRematch && (
            <button type="button" className={cls.closeButton} onClick={onRematch} disabled={rematchDisabled}>
              Играть ещё
            </button>
          )}
          <button type="button" className={cls.closeButton} onClick={onClose}>
            В меню
          </button>
        </div>
      </div>
    </div>
  );
});