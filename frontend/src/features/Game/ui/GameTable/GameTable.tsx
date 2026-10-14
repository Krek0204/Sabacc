import type { GameState } from '../../model/types/game';
import type { SendTurn } from '../../model/types/game';
import { memo } from 'react';
import cls from './GameTable.module.scss';
import { GameCard, GameCardType } from '@/entities/GameCard';
import { TurnType } from '../../model/types/game';
import { GameBank } from '../GameBank/GameBank';
import BackgroundTable from '@/shared/assets/images/table.png'

interface GameTableProps {
  gameState: GameState;
  sendTurn: SendTurn;
  userId: number;
}

export const GameTable = memo((props: GameTableProps) => {
  const { gameState, sendTurn, userId } = props;

  const handleGetSand = () => {
    sendTurn(TurnType.GET_SAND)
  }
  const handleGetDiscardSand = () => {
    sendTurn(TurnType.GET_SAND_DISCARD)
  }
  const handleGetBlood = () => {
    sendTurn(TurnType.GET_BLOOD)
  }
  const handleGetDiscardBlood = () => {
    sendTurn(TurnType.GET_BLOOD_DISCARD)
  }
  return (
    <div className={cls.table}>
      <img src={BackgroundTable} className={cls.background} />

      <div className={cls.discardBlood}>
        {gameState.bloodDiscard && <GameCard type={GameCardType.BLOOD} card={gameState.bloodDiscard} onClick={handleGetDiscardBlood} />}
      </div>
      <GameCard type={GameCardType.BLOOD} isFlipped isMultiple onClick={handleGetBlood} />
      <GameCard type={GameCardType.SAND} isFlipped isMultiple onClick={handleGetSand} />
      <div className={cls.discardSand}>
        {gameState.sandDiscard && <GameCard type={GameCardType.SAND} card={gameState.sandDiscard} onClick={handleGetDiscardSand} />}
      </div>

      <GameBank gameState={gameState} userId={userId} className={cls.bank} sendTurn={sendTurn} />
    </div>
  );
});
