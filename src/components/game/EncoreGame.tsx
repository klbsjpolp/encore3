import { CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Gamepad2, Users, Bot, Play, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DiceColor, DiceNumber, GameColor, Square, GAME_COLORS, DEFAULT_GAME_COLOR } from '@/types/game';
import { useEncoreGame, findConnectedGroup } from '@/hooks/useEncoreGame';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSelectionLimit, MAX_SELECTABLE_CELLS } from '@/lib/game-rules';
import { BOARD_CONFIGURATIONS, BoardId, getBoardConfiguration, getDefaultBoardId } from '@/data/boardConfigurations';
import { BoardPreview } from './BoardPreview';
import { DicePanel } from './DicePanel';
import { GameBoard } from './GameBoard';
import { ScorePanel } from './ScorePanel';

const COLOR_LABELS: Record<DiceColor, string> = {
  yellow: 'Jaune',
  green: 'Vert',
  blue: 'Bleu',
  red: 'Rouge',
  orange: 'Orange',
  wild: 'Joker',
};

function formatDiceValue(value?: DiceColor | DiceNumber) {
  if (value == null) return 'Aucun';
  if (typeof value === 'number') return value.toString();
  return COLOR_LABELS[value] ?? value;
}

function hasAnyPossibleMove(
  board: Square[][],
  selectedColor: DiceColor | undefined,
  selectedNumber: DiceNumber | undefined,
  isValidMove: (squares: { row: number; col: number }[], color: GameColor, playerBoard: Square[][]) => boolean,
) {
  if (!selectedColor || !selectedNumber) return false;

  const colorsToCheck: GameColor[] = selectedColor === 'wild'
    ? [...GAME_COLORS]
    : [selectedColor];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const square = board[row][col];
      if (square.crossed) continue;

      for (const color of colorsToCheck) {
        if (square.color !== color) continue;

        const group = findConnectedGroup(row, col, color, board);
        if (group.length === 0) continue;

        if (selectedNumber === 'wild') {
          for (let size = 1; size <= Math.min(group.length, MAX_SELECTABLE_CELLS); size++) {
            const candidate = group.slice(0, size);
            if (isValidMove(candidate, color, board)) {
              return true;
            }
          }
          continue;
        }

        if (group.length >= selectedNumber) {
          const candidate = group.slice(0, selectedNumber);
          if (isValidMove(candidate, color, board)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export const EncoreGame = () => {
  const { gameState, initializeGame, rollNewDice, selectDice, makeMove, skipTurn, isValidMove, completePlayerSwitch } = useEncoreGame();
  const isMobile = useIsMobile();
  const [setupMode, setSetupMode] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<'other' | 'scores'>('other');
  const [playerNames, setPlayerNames] = useState(['Joueur 1', 'Joueur 2']);
  const [aiPlayers, setAIPlayers] = useState([false, true]);
  const [selectedBoards, setSelectedBoards] = useState<[BoardId, BoardId]>([getDefaultBoardId(), getDefaultBoardId()]);
  const [selectedSquares, _setSelectedSquares] = useState<{ row: number; col: number }[]>([]);
  const [hoveredSquares, setHoveredSquares] = useState<{ row: number; col: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const setSelectedSquares = useCallback((squares: { row: number; col: number }[]) => {
    const deduped: { row: number; col: number }[] = [];
    for (const square of squares) {
      if (!deduped.some(existing => existing.row === square.row && existing.col === square.col)) {
        deduped.push(square);
        if (deduped.length >= MAX_SELECTABLE_CELLS) break;
      }
    }
    _setSelectedSquares(deduped);
  }, []);

  const mainBoardContainerRef = useRef<HTMLDivElement>(null);
  const otherBoardContainerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<{ main: DOMRect | null; other: DOMRect | null }>({ main: null, other: null });

  const isSwitching = gameState.phase === 'player-switching';

  useLayoutEffect(() => {
    if (!isMobile && !isAnimating && mainBoardContainerRef.current && otherBoardContainerRef.current) {
      setPositions({
        main: mainBoardContainerRef.current.getBoundingClientRect(),
        other: otherBoardContainerRef.current.getBoundingClientRect(),
      });
    }
  }, [isAnimating, isMobile]);

  useEffect(() => {
    if (!isMobile && isSwitching) {
      const pauseTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 500);

      return () => clearTimeout(pauseTimer);
    }
  }, [isMobile, isSwitching]);

  const handleTransitionEnd = useCallback(() => {
    if (isAnimating) {
      completePlayerSwitch();
      setIsAnimating(false);
    }
  }, [completePlayerSwitch, isAnimating]);

  const handleGameSetup = useCallback(() => {
    if (playerNames.some(name => !name.trim())) return;

    initializeGame(playerNames, aiPlayers, selectedBoards);
    setMobilePanel('other');
    setSetupMode(false);
  }, [aiPlayers, initializeGame, playerNames, selectedBoards]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.phase !== 'active-selection' && gameState.phase !== 'passive-selection') return;

    const player = gameState.players[gameState.currentPlayer];
    const clickedColor = player.board[row][col].color;
    const group = findConnectedGroup(row, col, clickedColor, player.board);
    const square = { row, col };
    const isSelected = selectedSquares.some(s => s.row === row && s.col === col);
    const isSubsetSelection = isSelected && group.length > selectedSquares.length;

    if (isSubsetSelection) {
      setSelectedSquares(selectedSquares.filter(s => !(s.row === row && s.col === col)));
      return;
    }

    const selectedColor = gameState.selectedDice.color?.value;
    const numberValue = gameState.selectedDice.number?.value;
    const colorMatches = !selectedColor || selectedColor === 'wild' || selectedColor === clickedColor;
    const clickSelectableGroup = (() => {
      if (!numberValue || !colorMatches) return null;

      if (numberValue === 'wild') {
        if (group.length <= MAX_SELECTABLE_CELLS && isValidMove(group, clickedColor, player.board)) {
          return group;
        }

        return null;
      }

      if (group.length === numberValue && isValidMove(group, clickedColor, player.board)) {
        return group;
      }

      return null;
    })();

    const isClickOnValidHoveredGroup =
      hoveredSquares.length > 0 &&
      hoveredSquares.some(s => s.row === row && s.col === col) &&
      numberValue &&
      hoveredSquares.length <= MAX_SELECTABLE_CELLS &&
      (numberValue === 'wild' || hoveredSquares.length === numberValue) &&
      colorMatches;

    const groupToSelect = isClickOnValidHoveredGroup ? hoveredSquares : clickSelectableGroup;

    if (groupToSelect) {
      const isGroupAlreadySelected =
        selectedSquares.length === groupToSelect.length &&
        groupToSelect.every(candidate => selectedSquares.some(ss => ss.row === candidate.row && ss.col === candidate.col));

      setSelectedSquares(isGroupAlreadySelected ? [] : [...groupToSelect]);
      return;
    }

    if (isSelected) {
      setSelectedSquares(selectedSquares.filter(s => !(s.row === row && s.col === col)));
      return;
    }

    const maxNumber = getSelectionLimit(numberValue);
    if (selectedSquares.length >= maxNumber) return;

    setSelectedSquares([...selectedSquares, square]);
  }, [gameState.currentPlayer, gameState.phase, gameState.players, gameState.selectedDice.color, gameState.selectedDice.number, hoveredSquares, isValidMove, selectedSquares, setSelectedSquares]);

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
    const numberValue = gameState.selectedDice.number.value;

    if (numberValue === 'wild') {
      if (group.length <= MAX_SELECTABLE_CELLS && isValidMove(group, color, player.board)) {
        setHoveredSquares(group);
      } else {
        setHoveredSquares([]);
      }
      return;
    }

    if (group.length === numberValue) {
      if (isValidMove(group, color, player.board)) {
        setHoveredSquares(group);
      } else {
        setHoveredSquares([]);
      }
      return;
    }

    const selectedFromGroup = selectedSquares.filter(s => group.some(c => s.row === c.row && s.col === c.col));
    if (selectedFromGroup.length > 0) {
      const isAlreadyInSelection = selectedFromGroup.some(s => s.row === row && s.col === col);
      setHoveredSquares(isAlreadyInSelection ? selectedFromGroup : [...selectedFromGroup, { row, col }]);
    } else if (group.length > numberValue) {
      if (isValidMove([{ row, col }], color, player.board)) {
        setHoveredSquares([{ row, col }]);
      } else {
        setHoveredSquares([]);
      }
    } else {
      setHoveredSquares([]);
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
    const colorValue = gameState.selectedDice.color.value === 'wild'
      ? (selectedSquares.length > 0 ? player.board[selectedSquares[0].row][selectedSquares[0].col].color : DEFAULT_GAME_COLOR)
      : gameState.selectedDice.color.value;
    const numberValue = gameState.selectedDice.number.value === 'wild' ? selectedSquares.length : gameState.selectedDice.number.value;

    return selectedSquares.length === numberValue &&
      isValidMove(selectedSquares, colorValue as GameColor, player.board);
  }, [gameState.currentPlayer, gameState.players, gameState.selectedDice.color, gameState.selectedDice.number, isValidMove, selectedSquares]);

  const resetGame = useCallback(() => {
    setSetupMode(true);
    setMobilePanel('other');
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
                          <BoardPreview size="small" board={getBoardConfiguration(selectedBoards[index])} />
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
  const selectionLimit = getSelectionLimit(gameState.selectedDice.number?.value);
  const boardDisabled = isSwitching || gameState.phase === 'rolling' || gameState.phase === 'game-over';
  const state = isSwitching ? 'Changement de joueur...' :
    gameState.phase === 'game-over'
      ? gameState.winners.length > 1
        ? `🤝 Égalité : ${gameState.winners.map(player => player.name).join(', ')}`
        : `🎉 ${gameState.winner?.name} gagne ! 🎉`
      : gameState.phase === 'rolling' ? 'Lancer les dés'
      : gameState.phase === 'active-selection' ? 'Tour du joueur actif'
      : gameState.phase === 'passive-selection' ? 'Tour des joueurs passifs'
      : null;
  const statusLabel = isSwitching ? 'Changement...'
    : gameState.phase === 'game-over'
      ? gameState.winners.length > 1 ? 'Égalité' : `${gameState.winner?.name} gagne !`
      : gameState.phase === 'rolling' ? 'Lancer dés'
      : gameState.phase === 'active-selection' ? 'Joueur actif'
      : gameState.phase === 'passive-selection' ? 'Joueurs passifs'
      : 'En cours';

  let mainBoardStyle: CSSProperties = {};
  let otherBoardStyle: CSSProperties = {};

  if (!isMobile && isAnimating) {
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
  const hasSelectedDice = !!gameState.selectedDice.color && !!gameState.selectedDice.number;
  const confirmGlow = canMakeMove() && !actionsDisable;
  const skipGlow = !actionsDisable && hasSelectedDice && !hasAnyPossibleMove(
    currentPlayer.board,
    gameState.selectedDice.color?.value,
    gameState.selectedDice.number?.value,
    isValidMove,
  );
  const currentPlayerSummary = (
    <div className="bg-card rounded-lg p-3 sm:p-4 shadow-square">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base sm:text-lg font-semibold">
            Tour actuel : {currentPlayer?.name}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Couleur: {formatDiceValue(gameState.selectedDice.color?.value)} · Nombre: {formatDiceValue(gameState.selectedDice.number?.value)}
          </p>
        </div>
        <Badge variant="default" className="shrink-0 text-xs sm:text-sm px-2 py-0.5 sm:px-3 sm:py-1">
          {statusLabel}
        </Badge>
      </div>
      {isMobile && (
        <div className="mt-3 flex items-center justify-between rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          <span>Sélection</span>
          <span>{selectedSquares.length}/{selectionLimit}</span>
        </div>
      )}
    </div>
  );
  const moveControls = (
    <div className={cn('gap-2', isMobile ? 'grid grid-cols-3' : 'flex flex-col sm:flex-row')}>
      <Button
        onClick={handleConfirmMove}
        disabled={!canMakeMove() || actionsDisable}
        variant="game"
        glow={confirmGlow}
        className="flex-1 text-sm sm:text-base"
      >
        {isMobile ? (
          <span>Confirmer ({selectedSquares.length})</span>
        ) : (
          <>
            <span className="hidden sm:inline">Confirmer le placement ({selectedSquares.length} cases)</span>
            <span className="sm:hidden">Confirmer ({selectedSquares.length})</span>
          </>
        )}
      </Button>
      <Button
        onClick={() => setSelectedSquares([])}
        variant="outline"
        disabled={actionsDisable}
        className="text-sm sm:text-base"
      >
        Effacer
      </Button>
      <Button
        onClick={onSkipTurn}
        variant="secondary"
        disabled={actionsDisable}
        glow={skipGlow}
        className="text-sm sm:text-base"
      >
        <span className="hidden sm:inline">Passer le tour</span>
        <span className="sm:hidden">Passer</span>
      </Button>
    </div>
  );
  const mainBoard = (
    <div className="@container" ref={mainBoardContainerRef} style={mainBoardStyle} onTransitionEnd={handleTransitionEnd}>
      <GameBoard
        board={currentPlayer?.board || []}
        boardConfiguration={currentPlayer?.boardConfiguration}
        onSquareClick={handleSquareClick}
        onSquareHover={handleSquareHover}
        onSquareLeave={handleSquareLeave}
        selectedSquares={selectedSquares}
        hoveredSquares={hoveredSquares}
        disabled={boardDisabled}
        firstBonusClaimed={firstBonusClaimed}
        iClaimedFirstBonus={currentPlayer.completedColumnsFirst}
        iClaimedSecondBonus={currentPlayer.completedColumnsNotFirst}
        compact={isMobile}
      />
    </div>
  );
  const otherBoard = (
    <div className="flex flex-col gap-1">
      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
        {isMobile ? `Autre : ${otherPlayer?.name ?? '—'}` : `Autre joueur (${otherPlayer?.name ?? '—'}) :`}
      </p>
      <div className="@container" ref={otherBoardContainerRef} style={otherBoardStyle}>
        <GameBoard
          board={otherPlayer?.board || []}
          boardConfiguration={otherPlayer?.boardConfiguration}
          selectedSquares={[]}
          disabled={true}
          firstBonusClaimed={firstBonusClaimed}
          iClaimedFirstBonus={otherPlayer.completedColumnsFirst}
          iClaimedSecondBonus={otherPlayer.completedColumnsNotFirst}
          compact={isMobile}
          showColumnScores={!isMobile}
        />
      </div>
    </div>
  );
  const scorePanels = (
    <div className={cn(isMobile ? 'space-y-3' : 'space-y-4')}>
      {gameState.players.map((player, index) => (
        <ScorePanel
          key={player.id}
          player={player}
          isCurrentPlayer={index === gameState.currentPlayer}
          gameComplete={gameState.phase === 'game-over'}
          allPlayers={gameState.players}
          compact={isMobile}
        />
      ))}
    </div>
  );

  return (
    <div className={cn("min-h-screen bg-gradient-board", isMobile ? "px-2 pb-28 pt-2" : "p-4 overflow-hidden")}>
      <div className={cn("max-w-7xl mx-auto", isMobile ? "space-y-3" : "space-y-6")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              Encore !
            </h1>
            {!isMobile && state && <Badge variant="default" className="text-sm sm:text-base lg:text-lg px-2 sm:px-3">
              {state}
            </Badge>}
          </div>
          <Button onClick={resetGame} variant="outline" size="sm" className="w-full sm:w-auto">
            <RotateCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Nouvelle partie</span>
            <span className="sm:hidden">Nouvelle</span>
          </Button>
        </div>

        {isMobile ? (
          <>
            {gameState.phase !== 'game-over' && currentPlayerSummary}
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
              compact={true}
            />
            {mainBoard}
            <div className="rounded-xl bg-card p-3 shadow-square">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mobilePanel === 'other' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setMobilePanel('other')}
                  aria-pressed={mobilePanel === 'other'}
                >
                  Autre joueur
                </Button>
                <Button
                  type="button"
                  variant={mobilePanel === 'scores' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setMobilePanel('scores')}
                  aria-pressed={mobilePanel === 'scores'}
                >
                  Scores
                </Button>
              </div>
              <div className="mt-3">
                {mobilePanel === 'other' ? otherBoard : scorePanels}
              </div>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <div className="mx-auto max-w-7xl">
                {moveControls}
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-4">
              {gameState.phase !== 'game-over' && currentPlayerSummary}
              {mainBoard}
              {moveControls}
            </div>

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
              {otherBoard}
            </div>

            {scorePanels}
          </div>
        )}
      </div>
    </div>
  );
};
