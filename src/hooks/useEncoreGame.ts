import { useState, useCallback } from 'react';
import {GameState, Player, DiceResult, GameColor, DiceColor, DiceNumber, Square } from '@/types/game';

export const COLUMN_FIRST_PLAYER_POINTS = [5,3,3,3,2,2,2,1,2,2,2,3,3,3,5];
export const COLUMN_SECOND_PLAYER_POINTS = [3,2,2,2,1,1,1,0,1,1,1,2,2,2,3];

export const TOTAL_STARS = 15;

// Create initial game board based on the standard Encore! layout
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

  // 0-indexed positions of the stars based on the official board
  const starPositions = new Set([
    '2,0',  // Col A
    '5,1',  // Col B
    '1,2',  // Col C
    '5,3',  // Col D
    '1,4',  // Col E
    '3,5',  // Col F
    '2,6',  // Col G
    '0,7',  // Col H
    '5,8',  // Col I
    '1,9',  // Col J
    '5,10', // Col K
    '0,11', // Col L
    '6,12', // Col M
    '3,13', // Col N
    '5,14', // Col O
  ]);


  const board: Square[][] = [];
  
  // 9 rows, 15 columns (A-O)
  for (let row = 0; row < colorLayout.length; row++) {
    const boardRow: Square[] = [];
    for (let col = 0; col < colorLayout[0].length; col++) {
      const column = String.fromCharCode(65 + col);
      const hasStar = starPositions.has(`${row},${col}`);
      
      boardRow.push({
        color: colorLayout[row][col],
        hasStar,
        crossed: false,
        column,
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
  
  // 3 color dice
  for (let i = 0; i < 3; i++) {
    dice.push({
      id: generateDiceId(),
      type: 'color',
      value: colorValues[Math.floor(Math.random() * colorValues.length)],
      selected: false
    });
  }
  
  // 3 number dice
  for (let i = 0; i < 3; i++) {
    dice.push({
      id: generateDiceId(),
      type: 'number',
      value: numberValues[Math.floor(Math.random() * numberValues.length)],
      selected: false
    });
  }
  
  return dice;
};

const checkColorCompletion = (board: Square[][], color: GameColor): boolean => {
  return board.every(row =>
    row.every(square =>
      square.color !== color || square.crossed
    )
  );
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
      phase: 'rolling',
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
      if (prev.phase !== 'rolling') return prev;
      
      return {
        ...prev,
        dice: rollDice(),
        phase: 'active-selection',
        activePlayer: prev.currentPlayer,
        selectedDice: { color: null, number: null },
        selectedFromJoker: { color: false, number: false }
      }
    });
  }, []);

  const selectDice = useCallback((dice: DiceResult) => {
    setGameState(prev => {
      if ((prev.phase !== 'active-selection' && prev.phase !== 'passive-selection') || dice.selected) {
        return prev;
      }
      
      const newSelectedDice = { ...prev.selectedDice };
      const newSelectedFromJoker = { ...prev.selectedFromJoker };

      newSelectedDice[dice.type] = dice;
      newSelectedFromJoker[dice.type] = dice.value === 'wild';

      const jokersNeeded = (newSelectedFromJoker.color ? 1 : 0) + (newSelectedFromJoker.number ? 1 : 0);
      if (jokersNeeded > prev.players[prev.currentPlayer].jokersRemaining) {
        return prev; // Not enough jokers, so we revert the selection by returning the previous state
      }

      return {
        ...prev,
        selectedDice: newSelectedDice,
        selectedFromJoker: newSelectedFromJoker,
      };
    });
  }, []);

  const isValidMove = useCallback((
    squares: { row: number; col: number }[],
    color: GameColor,
    playerBoard: Square[][]
  ): boolean => {
    if (squares.length === 0) {
      console.error("Invalid move: No squares selected");
      return false;
    }

    const allMatchColor = squares.every(({ row, col }) => 
      playerBoard[row][col].color === color && !playerBoard[row][col].crossed
    );
    if (!allMatchColor) {
      console.error("Invalid move: Squares do not match color");
      return false;
    }

    if (squares.length > 1) {
      const visited = new Set<string>();
      const toVisit = [squares[0]];
      visited.add(`${squares[0].row},${squares[0].col}`);

      while (toVisit.length > 0) {
        const current = toVisit.pop()!;
        const neighbors = [
          { row: current.row - 1, col: current.col },
          { row: current.row + 1, col: current.col },
          { row: current.row, col: current.col - 1 },
          { row: current.row, col: current.col + 1 }
        ];

        for (const neighbor of neighbors) {
          const key = `${neighbor.row},${neighbor.col}`;
          if (!visited.has(key) && 
              squares.some(s => s.row === neighbor.row && s.col === neighbor.col)) {
            visited.add(key);
            toVisit.push(neighbor);
          }
        }
      }

      if (visited.size !== squares.length) {
        console.error("Invalid move: Squares are not connected");
        return false;
      }
    }
    const includesColumnH = squares.some(({ col }) => col === 7);
    if (!includesColumnH) {
      const hasAdjacency = squares.some(({ row, col }) => {
        const neighbors = [
          { row: row - 1, col },
          { row: row + 1, col },
          { row, col: col - 1 },
          { row, col: col + 1 }
        ];

        return neighbors.some(({ row: nr, col: nc }) =>
          nr >= 0 && nr < playerBoard.length &&
          nc >= 0 && nc < playerBoard[0].length &&
          playerBoard[nr][nc].crossed
        );
      });
      
      if (!hasAdjacency) {
        console.error("Invalid move: Squares are not adjacent to a crossed square");
        return false;
      }
    }

    return true;
  }, []);

  const makeMove = useCallback((squares: { row: number; col: number }[]) => {
    setGameState(prev => {
      const { selectedDice, currentPlayer, players, phase, selectedFromJoker, claimedFirstColumnBonus } = prev;

      if (!selectedDice.color || !selectedDice.number || (phase !== 'active-selection' && phase !== 'passive-selection')) {
        return prev;
      }

      const player = players[currentPlayer];
      const colorValue = selectedDice.color.value === 'wild' ? 
        (squares.length > 0 ? player.board[squares[0].row][squares[0].col].color : 'yellow') : 
        selectedDice.color.value as GameColor;
      const numberValue = selectedDice.number.value === 'wild' ? squares.length : (selectedDice.number.value as number);

      if (squares.length !== numberValue || !isValidMove(squares, colorValue, player.board)) {
        return prev;
      }

      const jokersUsed = (selectedFromJoker.color ? 1 : 0) + (selectedFromJoker.number ? 1 : 0);
      
      const newClaimedFirstColumnBonus = {...claimedFirstColumnBonus};

      const newPlayers = players.map((p, index) => {
        if (index === currentPlayer) {
          const newBoard = p.board.map(row => row.map(cell => ({ ...cell })));
          let starsCollected = p.starsCollected;
          let newScore = p.score;
          const newCompletedColumnsFirst = [...p.completedColumnsFirst];
          const newCompletedColumnsNotFirst = [...p.completedColumnsNotFirst];

          squares.forEach(({ row, col }) => {
            if (!newBoard[row][col].crossed) {
              newBoard[row][col].crossed = true;
              if (newBoard[row][col].hasStar) {
                starsCollected++;
              }
            }
          });
          
          // Check for column completions
          for (let col = 0; col < newBoard[0].length; col++) {
            const column = String.fromCharCode(65 + col);
            const isAlreadyCompletedByPlayer = newCompletedColumnsFirst.includes(column) || newCompletedColumnsNotFirst.includes(column);
            
            if (!isAlreadyCompletedByPlayer) {
              const isColumnComplete = newBoard.every(row => row[col].crossed);
              
              if (isColumnComplete) {
                const isFirstBonusClaimed = !!newClaimedFirstColumnBonus[column];

                if (!isFirstBonusClaimed) {
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

          const completedColors = colorValue && checkColorCompletion(newBoard, colorValue) ? 
            [...p.completedColors, colorValue] : 
            p.completedColors;

          return {
            ...p,
            board: newBoard,
            starsCollected,
            completedColors,
            completedColumnsFirst: newCompletedColumnsFirst,
            completedColumnsNotFirst: newCompletedColumnsNotFirst,
            score: newScore,
            jokersRemaining: p.jokersRemaining - jokersUsed,
          };
        }
        return p;
      });

      const updatedPlayer = newPlayers[currentPlayer];
      const gameEnded = updatedPlayer.completedColors.length >= 2;

      if (gameEnded) {
        return {
          ...prev,
          players: newPlayers,
          phase: 'game-over',
          winner: updatedPlayer,
          claimedFirstColumnBonus: newClaimedFirstColumnBonus,
        };
      }

      const newDice = prev.dice.map(d => ({
        ...d,
        selected: d.selected || d.id === prev.selectedDice.color?.id || d.id === prev.selectedDice.number?.id
      }));

      let nextPhase: GameState['phase'] = phase;
      let nextPlayer = currentPlayer;
      let nextActivePlayer = prev.activePlayer;

      if (phase === 'active-selection') {
        nextPhase = 'passive-selection';
        nextPlayer = (currentPlayer + 1) % players.length;
        if (nextPlayer === prev.activePlayer) {
            nextPhase = 'rolling';
        }
      } else if (phase === 'passive-selection') {
        nextPlayer = (currentPlayer + 1) % players.length;
        if (nextPlayer === prev.activePlayer) {
            nextPhase = 'rolling';
            nextPlayer = (prev.activePlayer + 1) % players.length;
            nextActivePlayer = nextPlayer;
        }
      }

      return {
        ...prev,
        players: newPlayers,
        dice: newDice,
        selectedDice: { color: null, number: null },
        selectedFromJoker: { color: false, number: false },
        phase: nextPhase,
        currentPlayer: nextPlayer,
        activePlayer: nextActivePlayer,
        claimedFirstColumnBonus: newClaimedFirstColumnBonus,
      };
    });
  }, [isValidMove]);

  const skipTurn = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'passive-selection') return prev;

      let nextPlayer = (prev.currentPlayer + 1) % prev.players.length;
      let nextPhase: GameState['phase'] = prev.phase;
      let nextActivePlayer = prev.activePlayer;

      if (nextPlayer === prev.activePlayer) {
        nextPhase = 'rolling';
        nextPlayer = (prev.activePlayer + 1) % prev.players.length;
        nextActivePlayer = nextPlayer;
      }

      return {
        ...prev,
        phase: nextPhase,
        currentPlayer: nextPlayer,
        activePlayer: nextActivePlayer,
        selectedDice: { color: null, number: null },
        selectedFromJoker: { color: false, number: false }
      };
    });
  }, []);

  return {
    gameState,
    initializeGame,
    rollNewDice,
    selectDice,
    makeMove,
    skipTurn,
    isValidMove
  };
};
