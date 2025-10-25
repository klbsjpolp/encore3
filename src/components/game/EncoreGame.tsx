import {useState, useRef, useLayoutEffect, CSSProperties, useEffect, useCallback} from 'react';
import { useEncoreGame, findConnectedGroup, MAX_MARKS_PER_TURN } from '@/hooks/useEncoreGame';
import { GameColor } from '@/types/game';
import { GameBoard } from './GameBoard';
import { BoardPreview } from './BoardPreview';
import { DicePanel } from './DicePanel';
import { ScorePanel } from './ScorePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gamepad2, Users, Bot, Play, RotateCcw } from 'lucide-react';
import {
  BOARD_CONFIGURATIONS,
  BoardId, getBoardConfiguration,
  getDefaultBoardId
} from '@/data/boardConfigurations';

export const EncoreGame = () => {
  const { gameState, initializeGame, rollNewDice, selectDice, makeMove, skipTurn, isValidMove, completePlayerSwitch } = useEncoreGame();
  const [setupMode, setSetupMode] = useState(true);
  const [playerNames, setPlayerNames] = useState(['Joueur 1', 'Joueur 2']);
  const [aiPlayers, setAIPlayers] = useState([false, true]);
  const [selectedBoards, setSelectedBoards] = useState<[BoardId,BoardId]>([getDefaultBoardId(), getDefaultBoardId()]);
  const [selectedSquares, _setSelectedSquares] = useState<{ row: number; col: number }[]>([]);
  const setSelectedSquares = useCallback((squares: { row: number; col: number }[]) => {
    // remove duplicates and clamp to MAX_MARKS_PER_TURN
    const deduped: { row: number; col: number }[] = [];
    for (const s of squares) {
      if (!deduped.some(ns => ns.row === s.row && ns.col === s.col)) {
        deduped.push(s);
        if (deduped.length >= MAX_MARKS_PER_TURN) break;
      }
    }
    _setSelectedSquares(deduped);
  }, []);
  const [hoveredSquares, setHoveredSquares] = useState<{ row: number; col: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const mainBoardContainerRef = useRef<HTMLDivElement>(null);
  const otherBoardContainerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<{ main: DOMRect | null; other: DOMRect | null }>({ main: null, other: null });

  const isSwitching = gameState.phase === 'player-switching';

  useLayoutEffect(() => {
    // On every render, if we're not animating, measure the positions.
    // This captures the correct "before" state for the animation.
    if (!isAnimating && mainBoardContainerRef.current && otherBoardContainerRef.current) {
      setPositions({
        main: mainBoardContainerRef.current.getBoundingClientRect(),
        other: otherBoardContainerRef.current.getBoundingClientRect(),
      });
    }
  }, [isAnimating]);

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

  const handleTransitionEnd = useCallback(() => {
    // 3. When animation is over, complete the switch
    if (isAnimating) {
      completePlayerSwitch();
      setIsAnimating(false);
    }
  }, [completePlayerSwitch, isAnimating]);

  const handleGameSetup = useCallback(() => {
    if (playerNames.some(name => !name.trim())) {
      return;
    }

    initializeGame(playerNames, aiPlayers, selectedBoards);
    setSetupMode(false);
  }, [aiPlayers, initializeGame, playerNames, selectedBoards]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') return;

    const player = gameState.players[gameState.currentPlayer];
    const color = player.board[row][col].color;
    const group = findConnectedGroup(row, col, color, player.board);
    const isGroupAlreadySelected =
      selectedSquares.length === group.length &&
      group.every(hs => selectedSquares.some(ss => ss.row === hs.row && ss.col === hs.col));

    if (isGroupAlreadySelected) {
      setSelectedSquares([]);
    } else {
      const square = { row, col };
      const isSelected = selectedSquares.some(s => s.row === row && s.col === col);

      if (isSelected) {
        setSelectedSquares(selectedSquares.filter(s => !(s.row === row && s.col === col)));
      } else {
        const isClickOnHoveredGroup = hoveredSquares.length > 0 && hoveredSquares.some(s => s.row === row && s.col === col);

        if (isClickOnHoveredGroup) {
          setSelectedSquares([...hoveredSquares]);
        } else {
          setSelectedSquares([...selectedSquares, square]);
        }
      }
    }
  }, [gameState.currentPlayer, gameState.phase, gameState.players, hoveredSquares, selectedSquares, setSelectedSquares]);

  const handleSquareHover = useCallback((row: number, col: number) => {
    if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') return;
    if (!gameState.selectedDice.color || !gameState.selectedDice.number) return;

    const player = gameState.players[gameState.currentPlayer];
    const color = player.board[row][col].color;
    const selectedColor = gameState.selectedDice.color.value;

    if (selectedColor !== 'wild' && selectedColor !== color) {
      setHoveredSquares([]);
      return;
    }

    const group = findConnectedGroup(row, col, color, player.board);
    const numberValue = gameState.selectedDice.number.value as (number | 'wild');

    if (numberValue === 'wild' || group.length === numberValue) { //If it fits the whole group, select it all
      if(isValidMove(group, color, player.board)) {
        setHoveredSquares(group);
      } else {
        setHoveredSquares([]);
      }
    } else {
      const selectedFromGroup = selectedSquares.filter(s => group.some(c => s.row === c.row && s.col === c.col));
      if (selectedFromGroup.length > 0) { //If we already started to select from this group, select the cell
        setHoveredSquares([...selectedFromGroup, {row, col}]);
      } else if (group.length > numberValue) { //If the group is larger, select the cell
        if (isValidMove([{row, col}], color, player.board)) {
          setHoveredSquares([{row, col}]);
        } else {
          setHoveredSquares([]);
        }
      } else {
        setHoveredSquares([]);
      }
    }
  }, [gameState.currentPlayer, gameState.phase, gameState.players, gameState.selectedDice.color, gameState.selectedDice.number, isValidMove, selectedSquares]);

  const handleSquareLeave = useCallback(() => {
    setHoveredSquares([]);
  }, []);

  const handleConfirmMove = useCallback(() => {
    makeMove(selectedSquares);
    setSelectedSquares([]);
  }, [makeMove, selectedSquares, setSelectedSquares]);

  const canMakeMove = useCallback(() => {
    if (!gameState.selectedDice.color || !gameState.selectedDice.number) return false;
    if (selectedSquares.length === 0) return false;
    
    const player = gameState.players[gameState.currentPlayer];
    const colorValue = gameState.selectedDice.color.value === 'wild' ? 
      (selectedSquares.length > 0 ? player.board[selectedSquares[0].row][selectedSquares[0].col].color : 'yellow') :
      gameState.selectedDice.color.value;
    const numberValue = gameState.selectedDice.number.value === 'wild' ? selectedSquares.length : gameState.selectedDice.number.value;
    
    return selectedSquares.length === numberValue && 
           isValidMove(selectedSquares, colorValue as GameColor, player.board);
  }, [gameState.currentPlayer, gameState.players, gameState.selectedDice.color, gameState.selectedDice.number, isValidMove, selectedSquares]);

  const resetGame = useCallback(() => {
    setSetupMode(true);
    setSelectedSquares([]);
  }, [setSelectedSquares]);

  const onSkipTurn = useCallback(() => {
    setSelectedSquares([]);
    skipTurn();
  }, [setSelectedSquares, skipTurn]);

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
                      className="flex-1"
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
                    <Select
                      value={selectedBoards[index]}
                      onValueChange={(value) => {
                        const newBoards = [...selectedBoards];
                        newBoards[index] = value as BoardId;
                        setSelectedBoards(newBoards as [BoardId, BoardId]);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue>
                          <BoardPreview size="small" board={getBoardConfiguration(selectedBoards[index])}/>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {BOARD_CONFIGURATIONS.map((preview) => (
                          <SelectItem key={preview.id} value={preview.id}>
                            <BoardPreview size="large" board={preview} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
    const { main: mainPos, other: otherPos } = positions;
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
  const state = isSwitching ? 'Changement de joueur...' :
    gameState.phase === 'game-over' ? `🎉 ${gameState.winner?.name} gagne ! 🎉` :
      gameState.phase === 'rolling' ? 'Lancer les dés' :
        gameState.phase === 'active-selection' ? 'Tour du joueur actif' :
          gameState.phase === 'passive-selection' ? 'Tour des joueurs passifs' :
              null;
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
            {state && <Badge variant="default" className="text-lg px-3 py-1">
              {state}
            </Badge>}
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
                boardConfiguration={currentPlayer?.boardConfiguration}
                onSquareClick={handleSquareClick}
                onSquareHover={handleSquareHover}
                onSquareLeave={handleSquareLeave}
                selectedSquares={selectedSquares}
                hoveredSquares={hoveredSquares}
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
                Confirmer le placement ({selectedSquares.length} cases)
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
              phase={gameState.phase}
              dice={gameState.dice}
              onDiceSelect={selectDice}
              onRollDice={rollNewDice}
              canRoll={canRoll}
              canSelect={canSelectDice}
              selectedColorDice={gameState.selectedDice.color}
              selectedNumberDice={gameState.selectedDice.number}
              flashRoll={gameState.phase === 'rolling'}
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground">Autre joueur ({otherPlayer.name}) :</p>
              <div className="@container" ref={otherBoardContainerRef} style={otherBoardStyle}>
                <GameBoard
                  board={otherPlayer?.board || []}
                  boardConfiguration={otherPlayer?.boardConfiguration}
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
                allPlayers={gameState.players}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
