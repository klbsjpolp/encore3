import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, DiceResult, GameColor, DiceColor, DiceNumber, Square, GamePhase, AIPhase } from '@/types/game';
import { useAIPlayer } from './useAIPlayer';

export const COLUMN_FIRST_PLAYER_POINTS = [5, 3, 3, 3, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 5];
export const COLUMN_SECOND_PLAYER_POINTS = [3, 2, 2, 2, 1, 1, 1, 0, 1, 1, 1, 2, 2, 2, 3];

export const TOTAL_STARS = 15;

const createInitialBoard = (): Square[][] => {
  const colorLayout: GameColor[][] = [
    ['green','green','green','yellow','yellow','yellow','yellow','green','blue','blue','blue','orange','yellow','yellow','yellow'],
    ['orange','green','yellow','green','yellow','yellow','orange','orange','red','blue','blue','orange','orange','green','green'],
    ['blue','green','red','green','green','green','green','red','red','red','yellow','yellow','orange','green','green'],
    ['blue','red','red','green','orange','orange','blue','blue','green','green','yellow','yellow','orange','red','blue'],
    ['red','orange','orange','orange','orange','red','blue','blue','orange','orange','orange','red','red','red','red'],
    ['red','blue','blue','red','red','red','red','yellow','yellow','orange','red','blue','blue','blue','orange'],
    ['yellow','yellow','blue','blue','blue','blue','red','yellow','yellow','yellow','green','green','green','orange','orange']
  ];
  const starPositions = new Set([
    '2,0', '5,1', '1,2', '5,3', '1,4', '3,5', '2,6', '0,7', '5,8', '1,9', '5,10', '0,11', '6,12', '3,13', '5,14',
  ]);
  const board: Square[][] = [];
  for (let row = 0; row < colorLayout.length; row++) {
    const boardRow: Square[] = [];
    for (let col = 0; col < colorLayout[0].length; col++) {
      boardRow.push({
        color: colorLayout[row][col],
        hasStar: starPositions.has(`${row},${col}`),
        crossed: false,
        column: String.fromCharCode(65 + col),
        row
      });
    }
    board.push(boardRow);
  }
  return board;
};

const generateDiceId = () => Math.random().toString(36).substr(2, 9);

const rollDice = (): DiceResult[] => {
  const colorValues: DiceColor[] = ['yellow', 'green', 'blue', 'red', 'orange', 'wild'];
  const numberValues: DiceNumber[] = [1, 2, 3, 4, 5, 'wild'];
  const dice: DiceResult[] = [];
  for (let i = 0; i < 3; i++) dice.push({ id: generateDiceId(), type: 'color', value: colorValues[Math.floor(Math.random() * colorValues.length)], selected: false });
  for (let i = 0; i < 3; i++) dice.push({ id: generateDiceId(), type: 'number', value: numberValues[Math.floor(Math.random() * numberValues.length)], selected: false });
  return dice;
};

const checkColorCompletion = (board: Square[][], color: GameColor): boolean => {
  return board.every(row => row.every(square => square.color !== color || square.crossed));
};

export const useEncoreGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayer: 0,
    activePlayer: 0,
    phase: 'rolling',
    dice: [],
    selectedDice: { color: null, number: null },
    selectedFromJoker: { color: false, number: false },
    gameStarted: false,
    winner: null,
    claimedFirstColumnBonus: {},
  });
  const { makeAIMove } = useAIPlayer();

  const isValidMove = useCallback((
    squares: { row: number; col: number }[],
    color: GameColor,
    playerBoard: Square[][]
  ): boolean => {
    if (squares.length === 0) return false;
    if (!squares.every(({ row, col }) => playerBoard[row][col].color === color && !playerBoard[row][col].crossed)) return false;

    if (squares.length > 1) {
      const visited = new Set<string>();
      const toVisit = [squares[0]];
      visited.add(`${squares[0].row},${squares[0].col}`);
      while (toVisit.length > 0) {
        const current = toVisit.pop()!;
        const neighbors = [{ r: current.row - 1, c: current.col }, { r: current.row + 1, c: current.col }, { r: current.row, c: current.col - 1 }, { r: current.row, c: current.col + 1 }];
        for (const { r, c } of neighbors) {
          const key = `${r},${c}`;
          if (!visited.has(key) && squares.some(s => s.row === r && s.col === c)) {
            visited.add(key);
            toVisit.push({ row: r, col: c });
          }
        }
      }
      if (visited.size !== squares.length) return false;
    }

    if (!squares.some(({ col }) => col === 7)) {
      const hasAdjacency = squares.some(({ row, col }) => {
        const neighbors = [{ r: row - 1, c: col }, { r: row + 1, c: col }, { r: row, c: col - 1 }, { r: row, c: col + 1 }];
        return neighbors.some(({ r, c }) => r >= 0 && r < playerBoard.length && c >= 0 && c < playerBoard[0].length && playerBoard[r][c].crossed);
      });
      if (!hasAdjacency) return false;
    }

    return true;
  }, []);

  const initializeGame = useCallback((playerNames: string[], aiPlayers: boolean[] = []) => {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `player-${index}`,
      name,
      isAI: aiPlayers[index] || false,
      board: createInitialBoard(),
      starsCollected: 0,
      completedColors: [],
      completedColumnsFirst: [],
      completedColumnsNotFirst: [],
      score: 0,
      jokersRemaining: 8
    }));
    setGameState({
      players,
      currentPlayer: 0,
      activePlayer: 0,
      phase: players[0].isAI ? 'rolling-ai' : 'rolling',
      dice: rollDice(),
      selectedDice: { color: null, number: null },
      selectedFromJoker: { color: false, number: false },
      gameStarted: true,
      winner: null,
      claimedFirstColumnBonus: {}
    });
  }, []);

  const rollNewDice = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'rolling' && prev.phase !== 'rolling-ai') return prev;
      const nextPhase = prev.phase === 'rolling-ai' ? 'active-selection-ai' : 'active-selection';
      return { ...prev, dice: rollDice(), phase: nextPhase, lastPhase: prev.phase, selectedDice: { color: null, number: null }, selectedFromJoker: { color: false, number: false } };
    });
  }, []);

  const selectDice = useCallback((dice: DiceResult) => {
    setGameState(prev => {
      if (prev.phase.includes('-ai') || (prev.phase !== 'active-selection' && prev.phase !== 'passive-selection') || dice.selected) {
        return prev;
      }
      const newSelectedDice = { ...prev.selectedDice };
      newSelectedDice[dice.type] = dice;
      const newSelectedFromJoker = { ...prev.selectedFromJoker };
      newSelectedFromJoker[dice.type] = dice.value === 'wild';
      const jokersNeeded = (newSelectedFromJoker.color ? 1 : 0) + (newSelectedFromJoker.number ? 1 : 0);
      if (jokersNeeded > prev.players[prev.currentPlayer].jokersRemaining) {
        return prev;
      }
      return { ...prev, selectedDice: newSelectedDice, selectedFromJoker: newSelectedFromJoker };
    });
  }, []);

  const makeMove = useCallback((squares: { row: number; col: number }[]) => {
    setGameState(prev => {
      const { selectedDice, currentPlayer, players, phase, selectedFromJoker, claimedFirstColumnBonus, activePlayer } = prev;
      if (!selectedDice.color || !selectedDice.number || !['active-selection', 'passive-selection', 'active-selection-ai', 'passive-selection-ai'].includes(phase)) return prev;

      const player = players[currentPlayer];
      const colorValue = selectedDice.color.value === 'wild' ? (squares.length > 0 ? player.board[squares[0].row][squares[0].col].color : 'yellow') : selectedDice.color.value as GameColor;
      const numberValue = selectedDice.number.value === 'wild' ? squares.length : (selectedDice.number.value as number);

      if (squares.length !== numberValue || !isValidMove(squares, colorValue, player.board)) {
        if (player.isAI) {
            return { ...prev, phase: 'player-switching', lastPhase: phase };
        }
        return prev;
      }

      const jokersUsed = (selectedFromJoker.color ? 1 : 0) + (selectedFromJoker.number ? 1 : 0);
      const newClaimedFirstColumnBonus = { ...claimedFirstColumnBonus };
      const newPlayers = players.map((p, index) => {
        if (index !== currentPlayer) return p;
        const newBoard = p.board.map(row => row.map(cell => ({ ...cell })));
        let starsCollected = p.starsCollected;
        let newScore = p.score;
        const newCompletedColumnsFirst = [...p.completedColumnsFirst];
        const newCompletedColumnsNotFirst = [...p.completedColumnsNotFirst];

        squares.forEach(({ row, col }) => {
          if (!newBoard[row][col].crossed) {
            newBoard[row][col].crossed = true;
            if (newBoard[row][col].hasStar) starsCollected++;
          }
        });

        for (let col = 0; col < newBoard[0].length; col++) {
          const column = String.fromCharCode(65 + col);
          if (!newCompletedColumnsFirst.includes(column) && !newCompletedColumnsNotFirst.includes(column)) {
            if (newBoard.every(row => row[col].crossed)) {
              if (!newClaimedFirstColumnBonus[column]) {
                newScore += COLUMN_FIRST_PLAYER_POINTS[col];
                newClaimedFirstColumnBonus[column] = p.id;
                newCompletedColumnsFirst.push(column);
              } else {
                newScore += COLUMN_SECOND_PLAYER_POINTS[col];
                newCompletedColumnsNotFirst.push(column);
              }
            }
          }
        }

        const completedColors = colorValue && checkColorCompletion(newBoard, colorValue) ? [...p.completedColors, colorValue] : p.completedColors;
        return { ...p, board: newBoard, starsCollected, completedColors, completedColumnsFirst: newCompletedColumnsFirst, completedColumnsNotFirst: newCompletedColumnsNotFirst, score: newScore, jokersRemaining: p.jokersRemaining - jokersUsed };
      });

      const updatedPlayer = newPlayers[currentPlayer];
      if (updatedPlayer.completedColors.length >= 2) {
        return { ...prev, players: newPlayers, phase: 'game-over', winner: updatedPlayer, claimedFirstColumnBonus: newClaimedFirstColumnBonus };
      }

      const newDice = prev.dice.map(d => ({ ...d, selected: d.selected || d.id === prev.selectedDice.color?.id || d.id === prev.selectedDice.number?.id }));
      const newState = (newPhase: GameState['phase'], switchActivePlayer: boolean): GameState => {
        const newActivePlayer = switchActivePlayer ? (activePlayer + 1) % players.length : activePlayer;
        return {
          ...prev,
          phase: newPhase,
          lastPhase: phase,
          activePlayer: newActivePlayer,
          selectedDice: {color: null, number: null},
          selectedFromJoker: {color: false, number: false}
        };
      };if (phase === 'passive-selection')
        return newState('rolling', true);
      if (phase === 'passive-selection-ai')
        return newState('rolling-ai', true);
      if (phase === 'active-selection' || phase === 'active-selection-ai')
        return newState('player-switching', false);
      return prev;
    });
  }, [isValidMove]);

  const skipTurn = useCallback(() => {
    setGameState(prev => {
      const { phase, activePlayer, players } = prev;
      const newState = (newPhase: GameState['phase'], switchActivePlayer: boolean): GameState => {
        const newActivePlayer = switchActivePlayer ? (activePlayer + 1) % players.length : activePlayer;
        return {
          ...prev,
          phase: newPhase,
          lastPhase: phase,
          activePlayer: newActivePlayer,
          selectedDice: {color: null, number: null},
          selectedFromJoker: {color: false, number: false}
        };
      };
      if (phase === 'passive-selection')
        return newState('rolling', true);
      if (phase === 'passive-selection-ai')
        return newState('rolling-ai', true);
      if (phase === 'active-selection' || phase === 'active-selection-ai')
        return newState('player-switching', false);
      return prev;
    });
  }, []);

  const completePlayerSwitch = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'player-switching') return prev;
      const { players, currentPlayer, activePlayer, lastPhase } = prev;

      if (lastPhase === 'active-selection' || lastPhase === 'active-selection-ai') {
        const nextPlayerIndex = (activePlayer + 1) % players.length;
        const nextPlayer = players[nextPlayerIndex];
        const nextPhase = nextPlayer.isAI ? 'passive-selection-ai' : 'passive-selection';
        return { ...prev, phase: nextPhase, currentPlayer: nextPlayerIndex };
      }

      return prev;
    });
  }, []);

  useEffect(() => {
    const { phase } = gameState;
    if (!phase.includes('-ai')) return;

    if (phase === 'rolling-ai') {
      setTimeout(() => rollNewDice(), 1000);
    } else if (phase === 'active-selection-ai' || phase === 'passive-selection-ai') {
      setTimeout(() => {
        const move = makeAIMove(gameState, isValidMove);
        if (move) {
          setGameState(prev => ({
            ...prev,
            selectedDice: { color: move.color, number: move.number },
            selectedFromJoker: { color: move.color.value === 'wild', number: move.number.value === 'wild' },
          }));
          setTimeout(() => makeMove(move.squares), 500);
        } else {
          skipTurn();
        }
      }, 1000);
    }
  }, [gameState, rollNewDice, makeAIMove, isValidMove, makeMove, skipTurn]);

  return { gameState, initializeGame, rollNewDice, selectDice, makeMove, skipTurn, isValidMove, completePlayerSwitch };
};
