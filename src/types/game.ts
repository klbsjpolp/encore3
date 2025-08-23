export type GameColor = 'yellow' | 'green' | 'blue' | 'red' | 'orange' | 'purple';
export type DiceColor = GameColor | 'wild';
export type DiceNumber = 1 | 2 | 3 | 4 | 5 | 'wild';

export interface Square {
  color: GameColor;
  hasStar: boolean;
  crossed: boolean;
  column: string;
  row: number;
}

export interface DiceResult {
  id: string;
  type: 'color' | 'number';
  value: DiceColor | DiceNumber;
  selected: boolean;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  board: Square[][];
  starsCollected: number;
  completedColors: GameColor[];
  completedColumns: string[];
  score: number;
  jokersRemaining: number;
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  activePlayer: number;
  phase: 'rolling' | 'active-selection' | 'passive-selection' | 'game-over';
  dice: DiceResult[];
  selectedDice: { color: DiceResult | null; number: DiceResult | null };
  selectedFromJoker: { color: boolean; number: boolean };
  gameStarted: boolean;
  winner: Player | null;
  claimedFirstColumnBonus: Record<string, string>; // Maps column char to player ID
}

export interface GameMove {
  playerId: string;
  colorDice: DiceResult;
  numberDice: DiceResult;
  squares: { row: number; col: number }[];
}