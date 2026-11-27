import { User } from "@/features/Auth/model/types/auth";
import { GameStatus } from "@/features/Game/model/types/game";

export interface RoomState {
  id: number;
  matchNumber: number;
  playerFirstReadyForRematch: boolean;
  playerSecondReadyForRematch: boolean;
  status: GameStatus;
  playerFirst: User | null;
  playerSecond: User | null;
  playerFirstConnected: boolean;
  playerSecondConnected: boolean;
  playerFirstLeftAt?: string | null;
  playerSecondLeftAt?: string | null;
}
