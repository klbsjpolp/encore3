import { useState, useRef, useLayoutEffect, CSSProperties, useEffect } from 'react';
import { useEncoreGame } from '@/hooks/useEncoreGame';
import { GameColor } from '@/types/game';
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
  const { gameState, initializeGame, rollNewDice, selectDice, makeMove, skipTurn, isValidMove, completePlayerSwitch } = useEncoreGame();
  const [setupMode, setSetupMode] = useState(true);
  const [playerNames, setPlayerNames] = useState(['Joueur 1', 'Joueur 2']);
  const [aiPlayers, setAIPlayers] = useState([false, true]);
  const [selectedSquares, setSelectedSquares] = useState<{ row: number; col: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const mainBoardContainerRef = useRef<HTMLDivElement>(null);
  const otherBoardContainerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<{ main: DOMRect | null; other: DOMRect | null }>({ main: null, other: null });

  const isSwitching = gameState.phase === 'player-switching';

  useLayoutEffect(() => {
    // On every render, if we're not animating, measure the positions.
    // This captures the correct "before" state for the animation.
    if (!isAnimating && mainBoardContainerRef.current && otherBoardContainerRef.current) {
      positionsRef.current = {
        main: mainBoardContainerRef.current.getBoundingClientRect(),
        other: otherBoardContainerRef.current.getBoundingClientRect(),
      };
    }
  });

  useEffect(() => {
    if (isSwitching) {
      // 1. Pause for 500ms
      const pauseTimer = setTimeout(() => {
        // 2. Start the animation
        setIsAnimating(true);
      }, 500);

      return () => clearTimeout(pauseTimer);
    }
  }, [isSwitching]);

  const handleTransitionEnd = () => {
    // 3. When animation is over, complete the switch
    if (isAnimating) {
      completePlayerSwitch();
      setIsAnimating(false);
    }
  };

  const handleGameSetup = () => {
    if (playerNames.some(name => !name.trim())) {
      toast({
        title: "Configuration invalide",
        description: "Veuillez entrer les noms de tous les joueurs.",
        variant: "destructive"
      });
      return;
    }

    initializeGame(playerNames, aiPlayers);
    setSetupMode(false);
    toast({
      title: "Partie commencée !",
      description: `${playerNames[0]} commence.`
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
    makeMove(selectedSquares);
    setSelectedSquares([]);
    toast({
      title: "Déplacement terminé",
      description: `${gameState.players[gameState.currentPlayer].name} a joué son tour.`
    });
  };

  const canMakeMove = () => {
    if (!gameState.selectedDice.color || !gameState.selectedDice.number) return false;
    if (selectedSquares.length === 0) return false;
    
    const player = gameState.players[gameState.currentPlayer];
    const colorValue = gameState.selectedDice.color.value === 'wild' ? 
      (selectedSquares.length > 0 ? player.board[selectedSquares[0].row][selectedSquares[0].col].color : 'yellow') :
      gameState.selectedDice.color.value;
    const numberValue = gameState.selectedDice.number.value === 'wild' ? selectedSquares.length : gameState.selectedDice.number.value;
    
    return selectedSquares.length === numberValue && 
           isValidMove(selectedSquares, colorValue as GameColor, player.board);
  };

  const resetGame = () => {
    setSetupMode(true);
    setSelectedSquares([]);
  };

  const onSkipTurn = () => {
    setSelectedSquares([]);
    skipTurn();
  }

  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-board flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Gamepad2 className="w-6 h-6" />
              Configuration d'Encore !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {playerNames.map((name, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`player-${index}`}>
                    Joueur {index + 1} {aiPlayers[index] && <Badge variant="secondary">IA</Badge>}
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
                      placeholder={`Nom du joueur ${index + 1}`}
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
              Commencer la partie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayer];
  const otherPlayer = gameState.players[(gameState.currentPlayer + 1) % gameState.players.length];
  const canRoll = gameState.phase === 'rolling';
  const canSelectDice = gameState.phase === 'active-selection' || gameState.phase === 'passive-selection';
  const firstBonusClaimed = gameState.players.flatMap(p => p.completedColumnsFirst);

  let mainBoardStyle: CSSProperties = {};
  let otherBoardStyle: CSSProperties = {};

  if (isAnimating) {
    const { main: mainPos, other: otherPos } = positionsRef.current;
    if (mainPos && otherPos) {
      const mainTx = otherPos.left - mainPos.left;
      const mainTy = otherPos.top - mainPos.top;
      const mainS = otherPos.width / mainPos.width;
      mainBoardStyle = {
        transformOrigin: 'left top',
        transition: 'transform 0.5s ease-in-out',
        transform: `translate(${mainTx}px, ${mainTy}px) scale(${mainS})`,
        zIndex: 20,
      };

      const otherTx = mainPos.left - otherPos.left;
      const otherTy = mainPos.top - otherPos.top;
      const otherS = mainPos.width / otherPos.width;
      otherBoardStyle = {
        transformOrigin: 'left top',
        transition: 'transform 0.5s ease-in-out',
        transform: `translate(${otherTx}px, ${otherTy}px) scale(${otherS})`,
        zIndex: 20,
      };
    }
  }

  const actionsDisable = isSwitching || !(gameState.phase === 'active-selection' || gameState.phase === 'passive-selection');

  return (
    <div className="min-h-screen bg-gradient-board p-4 overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="w-8 h-8" />
              Encore !
            </h1>
            <Badge variant="default" className="text-lg px-3 py-1">
              {isSwitching && 'Changement de joueur...'}
              {gameState.phase === 'rolling' && 'Lancer les dés'}
              {gameState.phase === 'active-selection' && 'Tour du joueur actif'}
              {gameState.phase === 'passive-selection' && 'Tour des joueurs passifs'}
              {gameState.phase === 'game-over' && 'Partie terminée'}
            </Badge>
          </div>
          <Button onClick={resetGame} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Nouvelle partie
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board - Takes up most space */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Current Player Info */}
            {gameState.phase !== 'game-over' && (
              <div className="bg-card rounded-lg p-4">
                <p className="text-lg font-semibold">
                  Tour actuel : {currentPlayer?.name}
                  {gameState.phase === 'passive-selection' && ' (Tous les autres joueurs peuvent jouer)'}
                </p>
              </div>
            )}
            <div className="@container" ref={mainBoardContainerRef} style={mainBoardStyle} onTransitionEnd={handleTransitionEnd}>
              <GameBoard
                board={currentPlayer?.board || []}
                onSquareClick={handleSquareClick}
                selectedSquares={selectedSquares}
                disabled={isSwitching || gameState.phase === 'rolling' || gameState.phase === 'game-over'}
                firstBonusClaimed={firstBonusClaimed}
                iClaimedFirstBonus={currentPlayer.completedColumnsFirst}
                iClaimedSecondBonus={currentPlayer.completedColumnsNotFirst}
              />
            </div>
            
            {/* Move Controls */}
            <div className="flex gap-2">
              <Button
                onClick={handleConfirmMove}
                disabled={!canMakeMove() || actionsDisable}
                variant="game"
                className="flex-1"
              >
                Confirmer le déplacement ({selectedSquares.length} cases)
              </Button>
              <Button
                onClick={() => setSelectedSquares([])}
                variant="outline"
                disabled={actionsDisable}
              >
                Effacer
              </Button>
              <Button
                onClick={onSkipTurn}
                variant="secondary"
                disabled={actionsDisable}
              >
                Passer le tour
              </Button>
            </div>
          </div>

          {/* Dice Panel */}
          <div className="flex flex-col gap-2">
            <DicePanel
              dice={gameState.dice}
              onDiceSelect={selectDice}
              onRollDice={rollNewDice}
              canRoll={canRoll}
              canSelect={canSelectDice}
              selectedColorDice={gameState.selectedDice.color}
              selectedNumberDice={gameState.selectedDice.number}
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground">Autre joueur ({otherPlayer.name}) :</p>
              <div className="@container" ref={otherBoardContainerRef} style={otherBoardStyle}>
                <GameBoard
                  board={otherPlayer?.board || []}
                  selectedSquares={[]}
                  disabled={true}
                  firstBonusClaimed={firstBonusClaimed}
                  iClaimedFirstBonus={otherPlayer.completedColumnsFirst}
                  iClaimedSecondBonus={otherPlayer.completedColumnsNotFirst}
                />
              </div>
            </div>
          </div>

          {/* Score Panel */}
          <div className="space-y-4">
            {gameState.players.map((player, index) => (
              <ScorePanel
                key={player.id}
                player={player}
                isCurrentPlayer={index === gameState.currentPlayer}
                gameComplete={gameState.phase === 'game-over'}
                claimedFirstColumnBonus={gameState.claimedFirstColumnBonus}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Game Over Dialog */}
      <Dialog open={gameState.phase === 'game-over'}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Partie terminée !</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-xl">
              🎉 {gameState.winner?.name} gagne ! 🎉
            </p>
            <p className="text-muted-foreground">
              A complété {gameState.winner?.completedColors.length} couleurs
            </p>
            <Button onClick={resetGame} className="w-full">
              Rejouer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
