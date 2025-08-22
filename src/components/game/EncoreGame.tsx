import { useState } from 'react';
import { useEncoreGame } from '@/hooks/useEncoreGame';
import { DiceResult } from '@/types/game';
import { GameBoard } from './GameBoard';
import { DicePanel } from './DicePanel';
import { ScorePanel } from './ScorePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gamepad2, Users, Bot, Play, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const EncoreGame = () => {
  const { gameState, initializeGame, rollNewDice, selectDice, makeMove, skipTurn, isValidMove } = useEncoreGame();
  const [setupMode, setSetupMode] = useState(true);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2']);
  const [aiPlayers, setAIPlayers] = useState([false, true]);
  const [selectedSquares, setSelectedSquares] = useState<{ row: number; col: number }[]>([]);

  const handleGameSetup = () => {
    if (playerNames.some(name => !name.trim())) {
      toast({
        title: "Invalid Setup",
        description: "Please enter names for all players.",
        variant: "destructive"
      });
      return;
    }

    initializeGame(playerNames, aiPlayers);
    setSetupMode(false);
    toast({
      title: "Game Started!",
      description: `${playerNames[0]} goes first.`
    });
  };

  const handleSquareClick = (row: number, col: number) => {
    if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') return;
    
    const square = { row, col };
    const isSelected = selectedSquares.some(s => s.row === row && s.col === col);
    
    if (isSelected) {
      setSelectedSquares(prev => prev.filter(s => !(s.row === row && s.col === col)));
    } else {
      setSelectedSquares(prev => [...prev, square]);
    }
  };

  const handleConfirmMove = () => {
    const success = makeMove(selectedSquares);
    if (success) {
      setSelectedSquares([]);
      toast({
        title: "Move Completed",
        description: `${gameState.players[gameState.currentPlayer].name} made their move.`
      });
    } else {
      toast({
        title: "Invalid Move",
        description: "Please check the rules and try again.",
        variant: "destructive"
      });
    }
  };

  const canMakeMove = () => {
    if (!gameState.selectedDice.color || !gameState.selectedDice.number) return false;
    if (selectedSquares.length === 0) return false;
    
    const player = gameState.players[gameState.currentPlayer];
    // If color is wild, determine actual color from first selected square
    const colorValue = gameState.selectedDice.color.value === 'wild' ? 
      (selectedSquares.length > 0 ? player.board[selectedSquares[0].row][selectedSquares[0].col].color : 'yellow') :
      gameState.selectedDice.color.value;
    const numberValue = gameState.selectedDice.number.value === 'wild' ? selectedSquares.length : gameState.selectedDice.number.value;
    
    return selectedSquares.length === numberValue && 
           isValidMove(selectedSquares, colorValue as any, player.board);
  };

  const handleUseJoker = (type: 'color' | 'number') => {
    const jokerDice: DiceResult = {
      id: `joker-${type}`,
      type,
      value: 'wild',
      selected: false
    };
    selectDice(jokerDice);
  };

  const resetGame = () => {
    setSetupMode(true);
    setSelectedSquares([]);
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-board flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Gamepad2 className="w-6 h-6" />
              Encore! Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {playerNames.map((name, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`player-${index}`}>
                    Player {index + 1} {aiPlayers[index] && <Badge variant="secondary">AI</Badge>}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`player-${index}`}
                      value={name}
                      onChange={(e) => {
                        const newNames = [...playerNames];
                        newNames[index] = e.target.value;
                        setPlayerNames(newNames);
                      }}
                      placeholder={`Player ${index + 1} name`}
                    />
                    <Button
                      variant={aiPlayers[index] ? "default" : "outline"}
                      size="icon"
                      onClick={() => {
                        const newAI = [...aiPlayers];
                        newAI[index] = !newAI[index];
                        setAIPlayers(newAI);
                      }}
                    >
                      {aiPlayers[index] ? <Bot className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleGameSetup} className="w-full" variant="game" size="lg">
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const canRoll = gameState.phase === 'rolling';
  const canSelectDice = gameState.phase === 'active-selection' || gameState.phase === 'passive-selection';

  return (
    <div className="min-h-screen bg-gradient-board p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="w-8 h-8" />
              Encore!
            </h1>
            <Badge variant="default" className="text-lg px-3 py-1">
              {gameState.phase === 'rolling' && 'Roll Dice'}
              {gameState.phase === 'active-selection' && 'Active Player Turn'}
              {gameState.phase === 'passive-selection' && 'Passive Players Turn'}
              {gameState.phase === 'game-over' && 'Game Over'}
            </Badge>
          </div>
          <Button onClick={resetGame} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            New Game
          </Button>
        </div>

        {/* Current Player Info */}
        {gameState.phase !== 'game-over' && (
          <div className="bg-card rounded-lg p-4">
            <p className="text-lg font-semibold">
              Current Turn: {currentPlayer?.name}
              {gameState.phase === 'passive-selection' && ' (All other players can play)'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board - Takes up most space */}
          <div className="lg:col-span-2">
            <GameBoard
              board={currentPlayer?.board || []}
              onSquareClick={handleSquareClick}
              selectedSquares={selectedSquares}
              disabled={gameState.phase === 'rolling' || gameState.phase === 'game-over'}
            />
            
            {/* Move Controls */}
            {(gameState.phase === 'active-selection' || gameState.phase === 'passive-selection') && (
              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={handleConfirmMove}
                  disabled={!canMakeMove()}
                  variant="game"
                  className="flex-1"
                >
                  Confirm Move ({selectedSquares.length} squares)
                </Button>
                <Button 
                  onClick={() => setSelectedSquares([])}
                  variant="outline"
                >
                  Clear
                </Button>
                {gameState.phase === 'passive-selection' && (
                  <Button 
                    onClick={skipTurn}
                    variant="secondary"
                  >
                    Skip Turn
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Dice Panel */}
          <div>
            <DicePanel
              dice={gameState.dice}
              onDiceSelect={selectDice}
              onRollDice={rollNewDice}
              canRoll={canRoll}
              canSelect={canSelectDice}
              selectedColorDice={gameState.selectedDice.color}
              selectedNumberDice={gameState.selectedDice.number}
              jokersRemaining={currentPlayer?.jokersRemaining}
              onUseJoker={handleUseJoker}
            />
          </div>

          {/* Score Panel */}
          <div className="space-y-4">
            {gameState.players.map((player, index) => (
              <ScorePanel
                key={player.id}
                player={player}
                isCurrentPlayer={index === gameState.currentPlayer}
                gameComplete={gameState.phase === 'game-over'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Game Over Dialog */}
      <Dialog open={gameState.phase === 'game-over'}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Game Over!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-xl">
              🎉 {gameState.winner?.name} wins! 🎉
            </p>
            <p className="text-muted-foreground">
              Completed {gameState.winner?.completedColors.length} colors
            </p>
            <Button onClick={resetGame} className="w-full">
              Play Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};