import type { SendTurn } from '../../model/types/game';
import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import cls from './GameBank.module.scss';
import { GameState } from '../../model/types/game';
import CreditImg from '@/shared/assets/images/credit.png'

interface GameBankProps {
  gameState: GameState;
  sendTurn: SendTurn;
  userId?: number;
  className?: string
}

export const GameBank = memo((props: GameBankProps) => {
  const { gameState, userId, className, sendTurn: _sendTurn, ...otherProps } = props;
  void _sendTurn;
  const playerSpentChips = gameState?.players[0].playerId == userId ? gameState.players[0].spentChips : gameState.players[1].spentChips;
  const oppenentSpentChips = gameState?.players[1].playerId == userId ? gameState.players[0].spentChips : gameState.players[1].spentChips;

  const generateImg = (count: number) => {
    const maxCount = Math.min(count, 3);
    return (
      <>
        {Array.from({ length: maxCount }).map((_, index) => (
          <img key={index} src={CreditImg} alt="Credit" />
        ))}
      </>
    );
  };

  return (
    <div className={classNames(cls.GameBank, {}, [className])} {...otherProps}>

      <div className={cls.GameBankContainer}>
        <div className={cls.credit}>
          <span>{oppenentSpentChips}</span>
          <div className={cls.imgContainer}>
            {generateImg(oppenentSpentChips)}
          </div>
        </div>

        <div className={cls.credit}>
          <span>{playerSpentChips}</span>
          <div className={cls.imgContainer}>
            {generateImg(playerSpentChips)}
          </div>
        </div>
      </div>

      <h2>БАНК</h2>
    </div>
  );
});
