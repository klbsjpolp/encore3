import { GameColor } from '@/types/game';
import { generateRandomBoard } from './randomBoardGenerator';

export interface BoardConfiguration {
  id: string;
  fillClass: string;
  colorLayout: GameColor[][];
  starPositions: Set<string>;
}

const BOARD_1: BoardConfiguration = {
  id: 'classic',
  fillClass: 'bg-gradient-to-br from-stone-600 to-black',
  colorLayout: [
    ['green','green','green','yellow','yellow','yellow','yellow','green','blue','blue','blue','orange','yellow','yellow','yellow'],
    ['orange','green','yellow','green','yellow','yellow','orange','orange','red','blue','blue','orange','orange','green','green'],
    ['blue','green','red','green','green','green','green','red','red','red','yellow','yellow','orange','green','green'],
    ['blue','red','red','green','orange','orange','blue','blue','green','green','yellow','yellow','orange','red','blue'],
    ['red','orange','orange','orange','orange','red','blue','blue','orange','orange','orange','red','red','red','red'],
    ['red','blue','blue','red','red','red','red','yellow','yellow','orange','red','blue','blue','blue','orange'],
    ['yellow','yellow','blue','blue','blue','blue','red','yellow','yellow','yellow','green','green','green','orange','orange']
  ],
  starPositions: new Set([
    '2,0', '5,1', '1,2', '5,3', '1,4', '3,5', '2,6', '0,7', '5,8', '1,9', '5,10', '0,11', '6,12', '3,13', '5,14',
  ])
};

const BOARD_2: BoardConfiguration = {
  id: 'blue',
  fillClass: 'bg-gradient-to-br from-sky-400 to-blue-600',
  colorLayout: [
    ['red','red','green','green','yellow','yellow','yellow','green','green','red','red','red','red','orange','orange'],
    ['orange','red','red','blue','blue','green','yellow','green','green','red','green','yellow','red','orange','orange'],
    ['blue','orange','orange','blue','green','green','green','red','orange','green','green','green','green','green','yellow'],
    ['blue','blue','orange','orange','orange','green','red','red','orange','orange','orange','orange','blue','blue','yellow'],
    ['green','blue','blue','red','red','red','blue','blue','blue','blue','orange','blue','yellow','yellow','green'],
    ['green','green','yellow','yellow','red','blue','blue','yellow','yellow','yellow','blue','blue','orange','yellow','blue'],
    ['yellow','yellow','yellow','yellow','red','orange','orange','orange','red','yellow','yellow','blue','orange','red','red']
  ],
  starPositions: new Set([
    '1,0', '2,1', '5,2', '1,3', '6,4', '1,5', '0,6', '4,7', '6,8', '1,9', '4,10', '1,11', '3,12', '2,13', '4,14',
  ])
};

const BOARD_3: BoardConfiguration = {
  id: 'green',
  fillClass: 'bg-gradient-to-br from-green-400 to-lime-600',
  colorLayout: [
    ['orange','green','blue','blue','red','red','red','green','green','green','yellow','yellow','yellow','red','red'],
    ['green','green','green','green','red','yellow','green','red','green','green','red','yellow','yellow','red','yellow'],
    ['blue','blue','orange','green','yellow','yellow','green','blue','red','red','red','red','orange','orange','yellow'],
    ['blue','orange','orange','orange','orange','green','green','blue','blue','blue','blue','orange','red','orange','orange'],
    ['blue','red','orange','red','blue','orange','orange','orange','blue','yellow','orange','orange','red','yellow','orange'],
    ['red','red','red','red','blue','blue','blue','yellow','yellow','yellow','orange','blue','green','green','green'],
    ['yellow','yellow','yellow','yellow','green','blue','yellow','yellow','orange','orange','green','green','blue','blue','blue']
  ],
  starPositions: new Set([
    '0,0', '4,1', '4,2', '2,3', '6,4', '6,5', '2,6', '1,7', '4,8', '4,9', '0,10', '5,11', '3,12', '4,13', '4,14',
  ])
};

const BOARD_4: BoardConfiguration = {
  id: 'red',
  fillClass: 'bg-gradient-to-br from-rose-400 to-red-600',
  colorLayout: [
    ['green','green','orange','orange','orange','red','red','red','yellow','blue','blue','blue','blue','blue','red'],
    ['red','orange','orange','yellow','green','green','blue','yellow','yellow','yellow','green','orange','orange','orange','red'],
    ['blue','blue','blue','red','green','green','blue','yellow','red','red','red','orange','green','orange','orange'],
    ['blue','blue','red','red','red','green','green','orange','orange','red','yellow','green','green','green','green'],
    ['blue','red','red','blue','blue','blue','orange','blue','blue','orange','yellow','yellow','yellow','yellow','blue'],
    ['orange','yellow','green','green','blue','orange','orange','green','blue','orange','orange','yellow','red','red','yellow'],
    ['yellow','yellow','yellow','green','yellow','yellow','yellow','green','green','green','orange','red','red','red','yellow']
  ],
  starPositions: new Set([
    '2,0', '0,1', '6,2', '2,3', '0,4', '1,5', '2,6', '3,7', '0,8', '3,9', '1,10', '5,11', '5,12', '1,13', '4,14',
  ])
};

const BOARD_5: BoardConfiguration = {
  id: 'orange',
  fillClass: 'bg-gradient-to-br from-orange-400 to-amber-600',
  colorLayout: [
    ['yellow','green','green','red','red','red','green','green','green','blue','red','yellow','yellow','yellow','yellow'],
    ['orange','blue','blue','green','green','green','yellow','yellow','green','yellow','yellow','red','red','red','yellow'],
    ['orange','orange','blue','yellow','yellow','yellow','yellow','blue','blue','blue','orange','orange','red','green','green'],
    ['orange','green','green','blue','orange','orange','orange','orange','blue','green','orange','orange','green','green','green'],
    ['green','green','green','blue','yellow','yellow','orange','orange','red','red','red','orange','red','red','red'],
    ['orange','green','orange','blue','yellow','red','red','blue','blue','red','red','yellow','red','red','red'],
    ['orange','orange','blue','blue','blue','orange','orange','blue','blue','blue','yellow','yellow','yellow','blue','blue']
  ],
  starPositions: new Set([
    '2,0', '6,1', '4,2', '2,3', '6,4', '1,5', '6,6', '0,7', '4,8', '0,9', '1,10', '5,11', '2,12', '6,13', '5,14',
  ])
};

export const baseRandomBoardConfiguration: BoardConfiguration = {
  id: 'random',
  fillClass: 'bg-gradient-to-br from-purple-600 to-indigo-600',
  colorLayout: [],
  starPositions: new Set()
}

export const BOARD_CONFIGURATIONS: BoardConfiguration[] = [BOARD_1, BOARD_2, BOARD_3, BOARD_4, BOARD_5, baseRandomBoardConfiguration];

export const getBoardConfiguration = (id: string): BoardConfiguration | undefined => {
  if (id === 'random') {
    return generateRandomBoard();
  }
  return BOARD_CONFIGURATIONS.find(config => config.id === id);
};

export const getDefaultBoardId = (): string => BOARD_1.id;
