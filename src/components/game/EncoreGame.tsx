import { Gamepad2, RotateCcw } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { AppVersion } from '@/components/AppVersion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  PLAYER_SWITCH_ANIMATION_DELAY_MS,
  PLAYER_SWITCH_ANIMATION_DURATION_MS,
  shouldAnimatePlayerSwitch,
} from '@/hooks/encore-game/playerSwitch'
import { useIsMobile } from '@/hooks/use-mobile'
import { useEncoreGame } from '@/hooks/useEncoreGame'
import { useStoredGameSetup } from '@/hooks/useStoredGameSetup'
import { getSelectionLimit } from '@/lib/game-rules'
import { cn } from '@/lib/utils'
import type { DiceColor, DiceNumber } from '@/types/game'

import { DicePanel } from './DicePanel'
import { EncoreGameCurrentPlayerSummary } from './EncoreGameCurrentPlayerSummary'
import { EncoreGameMoveControls } from './EncoreGameMoveControls'
import { EncoreGameSetup } from './EncoreGameSetup'
import { getGameStateMessage, getGameStatusLabel } from './encoreGameStatus'
import { GameBoard } from './GameBoard'
import { ScorePanel } from './ScorePanel'
import { useEncoreSelection } from './useEncoreSelection'
import { useSpacebarShortcut } from './useSpacebarShortcut'

export const RESET_CONFIRM_TIMEOUT_MS = 4000

export const EncoreGame = () => {
  const {
    gameState,
    initializeGame,
    abandonGame,
    rollNewDice,
    selectDice,
    makeMove,
    skipTurn,
    isValidMove,
  } = useEncoreGame()
  const isMobile = useIsMobile()
  const {
    playerNames,
    aiPlayers,
    selectedBoards,
    setPlayerName,
    toggleAIPlayer,
    setSelectedBoard,
  } = useStoredGameSetup()
  // Resume a stored in-progress game instead of showing the setup screen.
  const [setupMode, setSetupMode] = useState(() => !gameState.gameStarted)
  const [mobilePanel, setMobilePanel] = useState<'other' | 'scores'>('other')
  const [isAnimating, setIsAnimating] = useState(false)
  // Surface the scores directly once the game ends, instead of leaving the
  // player on whichever mobile panel they last had open. Adjusted during
  // render (rather than an effect) to avoid an extra commit.
  const [prevPhase, setPrevPhase] = useState(gameState.phase)
  if (gameState.phase !== prevPhase) {
    setPrevPhase(gameState.phase)
    if (gameState.phase === 'game-over' && isMobile) {
      setMobilePanel('scores')
    }
  }
  const {
    selectedSquares,
    hoveredSquares,
    setSelectedSquares,
    clearSelection,
    handleSquareClick,
    handleSquareHover,
    handleSquareLeave,
    handleConfirmMove,
    onSkipTurn,
    canMakeMove,
    hasAnyPossibleMove,
  } = useEncoreSelection({
    gameState,
    makeMove,
    skipTurn,
    selectDice,
    isValidMove,
  })

  // Spacebar triggers the highlighted primary action: roll the dice while
  // rolling, or confirm the placement while a valid move is selected.
  useSpacebarShortcut({
    canRoll: gameState.phase === 'rolling',
    onRoll: rollNewDice,
    canConfirm:
      (gameState.phase === 'active-selection' || gameState.phase === 'passive-selection') &&
      canMakeMove(),
    onConfirm: handleConfirmMove,
  })

  const mainBoardContainerRef = useRef<HTMLDivElement>(null)
  const otherBoardContainerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<{ main: DOMRect | null; other: DOMRect | null }>({
    main: null,
    other: null,
  })

  const isSwitching = gameState.phase === 'player-switching'
  const shouldAnimateSwitch = !isMobile && shouldAnimatePlayerSwitch(gameState)

  useLayoutEffect(() => {
    if (
      !isMobile &&
      !isAnimating &&
      mainBoardContainerRef.current &&
      otherBoardContainerRef.current
    ) {
      setPositions({
        main: mainBoardContainerRef.current.getBoundingClientRect(),
        other: otherBoardContainerRef.current.getBoundingClientRect(),
      })
    }
  }, [isAnimating, isMobile])

  useEffect(() => {
    if (!shouldAnimateSwitch) {
      return
    }

    let frameId: number | undefined
    const timerId = window.setTimeout(() => {
      frameId = requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    }, PLAYER_SWITCH_ANIMATION_DELAY_MS)

    return () => {
      window.clearTimeout(timerId)
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [shouldAnimateSwitch])

  // Clear the animation flag once the switch resolves. The transform itself is
  // released atomically with the content swap (see the `isSwitching` guard on
  // the styles below); this just lets the boards be re-measured and re-arms the
  // hold delay for the next transition. Deferred to a frame to avoid a
  // synchronous state update inside the effect body.
  useEffect(() => {
    if (isSwitching) {
      return
    }
    const frameId = requestAnimationFrame(() => setIsAnimating(false))
    return () => cancelAnimationFrame(frameId)
  }, [isSwitching])

  const handleGameSetup = useCallback(() => {
    if (playerNames.some((name) => !name.trim())) {
      return
    }

    initializeGame(playerNames, aiPlayers, selectedBoards)
    setMobilePanel('other')
    setSetupMode(false)
  }, [aiPlayers, initializeGame, playerNames, selectedBoards])

  const resetGame = useCallback(() => {
    abandonGame()
    setSetupMode(true)
    setMobilePanel('other')
    clearSelection()
  }, [abandonGame, clearSelection])

  // Abandoning a game in progress is destructive, so the reset button asks
  // for a second click; the pending confirmation expires on its own or as
  // soon as the player interacts elsewhere (button blur).
  const [confirmingReset, setConfirmingReset] = useState(false)

  useEffect(() => {
    if (!confirmingReset) {
      return
    }
    const timerId = window.setTimeout(() => setConfirmingReset(false), RESET_CONFIRM_TIMEOUT_MS)
    return () => window.clearTimeout(timerId)
  }, [confirmingReset])

  // A pending confirmation no longer applies once the game ends (the reset
  // becomes non-destructive), so ignore it instead of showing a stale state.
  const showResetConfirm = confirmingReset && gameState.phase !== 'game-over'

  const handleResetClick = useCallback(() => {
    if (gameState.phase !== 'game-over' && !confirmingReset) {
      setConfirmingReset(true)
      return
    }
    setConfirmingReset(false)
    resetGame()
  }, [confirmingReset, gameState.phase, resetGame])

  if (setupMode) {
    return (
      <EncoreGameSetup
        playerNames={playerNames}
        aiPlayers={aiPlayers}
        selectedBoards={selectedBoards}
        setPlayerName={setPlayerName}
        toggleAIPlayer={toggleAIPlayer}
        setSelectedBoard={setSelectedBoard}
        onStart={handleGameSetup}
      />
    )
  }

  const currentPlayer = gameState.players[gameState.currentPlayer]
  const otherPlayer = gameState.players[(gameState.currentPlayer + 1) % gameState.players.length]
  const canRoll = gameState.phase === 'rolling'
  const canSelectDice =
    gameState.phase === 'active-selection' || gameState.phase === 'passive-selection'
  const firstBonusClaimed = gameState.players.flatMap((p) => p.completedColumnsFirst)
  const selectionLimit = getSelectionLimit(gameState.selectedDice.number?.value)
  const boardDisabled =
    isSwitching || gameState.phase === 'rolling' || gameState.phase === 'game-over'
  const state = getGameStateMessage(gameState)
  const statusLabel = getGameStatusLabel(gameState)

  let mainBoardStyle: CSSProperties = {}
  let otherBoardStyle: CSSProperties = {}

  if (!isMobile && isAnimating && isSwitching) {
    const { main: mainPos, other: otherPos } = positions
    if (mainPos && otherPos) {
      const mainTx = otherPos.left - mainPos.left
      const mainTy = otherPos.top - mainPos.top
      const mainS = otherPos.width / mainPos.width
      mainBoardStyle = {
        transformOrigin: 'left top',
        transition: `transform ${PLAYER_SWITCH_ANIMATION_DURATION_MS}ms ease-in-out`,
        transform: `translate(${mainTx}px, ${mainTy}px) scale(${mainS})`,
        zIndex: 20,
      }

      const otherTx = mainPos.left - otherPos.left
      const otherTy = mainPos.top - otherPos.top
      const otherS = mainPos.width / otherPos.width
      otherBoardStyle = {
        transformOrigin: 'left top',
        transition: `transform ${PLAYER_SWITCH_ANIMATION_DURATION_MS}ms ease-in-out`,
        transform: `translate(${otherTx}px, ${otherTy}px) scale(${otherS})`,
        zIndex: 20,
      }
    }
  }

  const actionsDisable =
    isSwitching ||
    !(gameState.phase === 'active-selection' || gameState.phase === 'passive-selection')
  const confirmGlow = canMakeMove() && !actionsDisable
  const availableColorValues = new Set<DiceColor>()
  const availableNumberValues = new Set<DiceNumber>()
  for (const die of gameState.dice) {
    if (die.selected) {
      continue
    }
    if (die.type === 'color') {
      availableColorValues.add(die.value)
    } else {
      availableNumberValues.add(die.value)
    }
  }
  const colorCandidates = gameState.selectedDice.color
    ? [gameState.selectedDice.color.value]
    : [...availableColorValues]
  const numberCandidates = gameState.selectedDice.number
    ? [gameState.selectedDice.number.value]
    : [...availableNumberValues]
  const hasAnyPlayableDiceSelection = colorCandidates.some((color) =>
    numberCandidates.some((number) => {
      const jokersNeeded = (color === 'wild' ? 1 : 0) + (number === 'wild' ? 1 : 0)
      if (jokersNeeded > currentPlayer.jokersRemaining) {
        return false
      }
      return hasAnyPossibleMove(currentPlayer.board, color, number)
    }),
  )
  const skipGlow = !actionsDisable && !hasAnyPlayableDiceSelection
  const currentPlayerSummary = (
    <EncoreGameCurrentPlayerSummary
      currentPlayerName={currentPlayer?.name}
      selectedColor={gameState.selectedDice.color?.value}
      selectedNumber={gameState.selectedDice.number?.value}
      statusLabel={statusLabel}
    />
  )
  const moveControls = (
    <EncoreGameMoveControls
      isMobile={isMobile}
      selectedCount={selectedSquares.length}
      selectionLimit={selectionLimit}
      canConfirm={canMakeMove()}
      actionsDisabled={actionsDisable}
      confirmGlow={confirmGlow}
      skipGlow={skipGlow}
      showRoll={gameState.phase === 'rolling' || gameState.phase === 'rolling-ai'}
      canRoll={canRoll}
      onRoll={rollNewDice}
      onConfirm={handleConfirmMove}
      onClear={() => setSelectedSquares([])}
      onSkip={onSkipTurn}
    />
  )
  const mainBoard = (
    <div className="@container" ref={mainBoardContainerRef} style={mainBoardStyle}>
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
  )
  const otherBoard = (
    <div className="flex flex-col gap-1">
      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
        {isMobile
          ? `Autre : ${otherPlayer?.name ?? '—'}`
          : `Autre joueur (${otherPlayer?.name ?? '—'}) :`}
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
  )
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
  )

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-board',
        isMobile ? 'px-1 pb-28 pt-2' : 'p-4 overflow-hidden',
      )}
    >
      <div
        className={cn('max-w-7xl 2xl:max-w-[1600px] mx-auto', isMobile ? 'space-y-3' : 'space-y-6')}
      >
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-row items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              Encore !
            </h1>
            {!isMobile && state && (
              <Badge variant="default" className="text-sm sm:text-base lg:text-lg px-2 sm:px-3">
                {state}
              </Badge>
            )}
            <AppVersion />
          </div>
          <Button
            onClick={handleResetClick}
            onBlur={() => setConfirmingReset(false)}
            variant={showResetConfirm ? 'destructive' : 'outline'}
            size="sm"
            className="shrink-0"
            aria-label={showResetConfirm ? undefined : 'Nouvelle partie'}
          >
            <RotateCcw className="w-4 h-4 sm:mr-2" />
            {showResetConfirm ? (
              <>
                <span className="sm:hidden">Abandonner ?</span>
                <span className="hidden sm:inline">Abandonner la partie ?</span>
              </>
            ) : (
              <span className="hidden sm:inline">Nouvelle partie</span>
            )}
          </Button>
        </div>

        {isMobile ? (
          <>
            {gameState.phase !== 'game-over' && currentPlayerSummary}
            <DicePanel
              phase={gameState.phase}
              lastPhase={gameState.lastPhase}
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
              <div className="mt-3">{mobilePanel === 'other' ? otherBoard : scorePanels}</div>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <div className="mx-auto max-w-7xl">{moveControls}</div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            <div className="lg:col-span-2 2xl:col-span-3 flex flex-col gap-4">
              {gameState.phase !== 'game-over' && currentPlayerSummary}
              {mainBoard}
              {moveControls}
            </div>

            <div className="flex flex-col gap-2">
              <DicePanel
                phase={gameState.phase}
                lastPhase={gameState.lastPhase}
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
  )
}
