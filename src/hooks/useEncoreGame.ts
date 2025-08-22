import { useState, useCallback } from 'react';
import { GameState, Player, DiceResult, GameColor, DiceColor, DiceNumber, Square } from '@/types/game';

// Create initial game board based on typical Encore! layout
const createInitialBoard = (): Square[][] => {
  const colors: GameColor[] = ['yellow', 'green', 'blue', 'red', 'orange', 'purple'];
  const board: Square[][] = [];
  
  // 9 rows, 15 columns (A-O)
  for (let row = 0; row < 9; row++) {
    const boardRow: Square[] = [];
    for (let col = 0; col < 15; col++) {
      // Assign colors in a pattern similar to actual Encore!
      const colorIndex = (row + col) % colors.length;
      const column = String.fromCharCode(65 + col); // A-O
      
      // Add stars to specific positions (simplified pattern)
      const hasStar = (row + col) % 7 === 0 && row > 0 && row < 8;
      
      boardRow.push({
        color: colors[colorIndex],
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

export const useEncoreGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayer: 0,
    phase: 'rolling',
    dice: [],
    selectedDice: { color: null, number: null },
    gameStarted: false,
    winner: null
  });

  const initializeGame = useCallback((playerNames: string[], aiPlayers: boolean[] = []) => {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `player-${index}`,
      name,
      isAI: aiPlayers[index] || false,
      board: createInitialBoard(),
      starsCollected: 0,
      completedColors: [],
      score: 0
    }));

    setGameState({
      players,
      currentPlayer: 0,
      phase: 'rolling',
      dice: rollDice(),
      selectedDice: { color: null, number: null },
      gameStarted: true,
      winner: null
    });
  }, []);

  const rollNewDice = useCallback(() => {
    if (gameState.phase !== 'rolling') return;
    
    setGameState(prev => ({
      ...prev,
      dice: rollDice(),
      phase: 'active-selection',
      selectedDice: { color: null, number: null }
    }));
  }, [gameState.phase]);

  const selectDice = useCallback((dice: DiceResult) => {
    if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') return;
    if (dice.selected) return;

    setGameState(prev => {
      const newSelectedDice = { ...prev.selectedDice };
      
      if (dice.type === 'color') {
        newSelectedDice.color = dice;
      } else {
        // Number dice wild can only be selected by active player
        if (dice.value === 'wild' && prev.phase === 'passive-selection') return prev;
        newSelectedDice.number = dice;
      }

      return {
        ...prev,
        selectedDice: newSelectedDice
      };
    });
  }, [gameState.phase]);

  const isValidMove = useCallback((
    squares: { row: number; col: number }[],
    color: GameColor,
    playerBoard: Square[][]
  ): boolean => {
    if (squares.length === 0) return false;

    // Check if all squares match the color
    const allMatchColor = squares.every(({ row, col }) => 
      playerBoard[row][col].color === color && !playerBoard[row][col].crossed
    );
    if (!allMatchColor) return false;

    // Check adjacency
    if (squares.length > 1) {
      // All squares must form a connected group
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

      if (visited.size !== squares.length) return false;
    }

    // Check starting rule (first color must include column H)
    const hasColorCrossed = playerBoard.some(row => 
      row.some(square => square.color === color && square.crossed)
    );
    
    if (!hasColorCrossed) {
      // Must include column H (index 7)
      const includesColumnH = squares.some(({ col }) => col === 7);
      if (!includesColumnH) return false;
    } else {
      // Must be adjacent to any previously crossed square
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
      
      if (!hasAdjacency) return false;
    }

    return true;
  }, []);

  const makeMove = useCallback((squares: { row: number; col: number }[]) => {
    const { selectedDice, currentPlayer, players } = gameState;
    if (!selectedDice.color || !selectedDice.number) return false;
    if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') return false;

    const player = players[currentPlayer];
    const colorValue = selectedDice.color.value === 'wild' ? 'yellow' : selectedDice.color.value as GameColor; // Simplified wild selection
    const numberValue = selectedDice.number.value === 'wild' ? squares.length : selectedDice.number.value as number;

    if (squares.length !== numberValue) return false;
    if (!isValidMove(squares, colorValue, player.board)) return false;

    setGameState(prev => {
      const newPlayers = [...prev.players];
      const newBoard = newPlayers[currentPlayer].board.map(row => [...row]);
      let starsCollected = newPlayers[currentPlayer].starsCollected;

      // Cross off squares and collect stars
      squares.forEach(({ row, col }) => {
        newBoard[row][col].crossed = true;
        if (newBoard[row][col].hasStar) {
          starsCollected++;
        }
      });

      newPlayers[currentPlayer] = {
        ...newPlayers[currentPlayer],
        board: newBoard,
        starsCollected
      };

      // Mark dice as selected
      const newDice = prev.dice.map(d => ({
        ...d,
        selected: d.id === selectedDice.color!.id || d.id === selectedDice.number!.id
      }));

      // Check for game end condition
      const completedColors = colorValue && checkColorCompletion(newBoard, colorValue) ? 
        [...newPlayers[currentPlayer].completedColors, colorValue] : 
        newPlayers[currentPlayer].completedColors;
      
      newPlayers[currentPlayer].completedColors = completedColors;

      const gameEnded = completedColors.length >= 2;

      return {
        ...prev,
        players: newPlayers,
        dice: newDice,
        selectedDice: { color: null, number: null },
        phase: gameEnded ? 'game-over' : prev.phase === 'active-selection' ? 'passive-selection' : 'rolling',
        currentPlayer: prev.phase === 'passive-selection' ? (currentPlayer + 1) % prev.players.length : currentPlayer,
        winner: gameEnded ? newPlayers[currentPlayer] : null
      };
    });

    return true;
  }, [gameState, isValidMove]);

  const checkColorCompletion = (board: Square[][], color: GameColor): boolean => {
    return board.every(row => 
      row.every(square => 
        square.color !== color || square.crossed
      )
    );
  };

  const skipTurn = useCallback(() => {
    setGameState(prev => {
      if (prev.phase === 'passive-selection') {
        return {
          ...prev,
          phase: 'rolling',
          currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
          selectedDice: { color: null, number: null }
        };
      }
      return prev;
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