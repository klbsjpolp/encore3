import { Check, Dices, SkipForward, X } from 'lucide-react'
import { useCallback } from 'react'

import { DicePanel } from '@/components/game/DicePanel'
import { getGameStateMessage } from '@/components/game/encoreGameStatus'
import { GameBoard } from '@/components/game/GameBoard'
import { ScorePanel } from '@/components/game/ScorePanel'
import { useEncoreSelection } from '@/components/game/useEncoreSelection'
import { useSpacebarShortcut } from '@/components/game/useSpacebarShortcut'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { useOnlineEncoreGame } from '@/hooks/online/useOnlineEncoreGame'
import { getSelectionLimit } from '@/lib/game-rules'
import type { GameState } from '@/types/game'

type OnlineGame = ReturnType<typeof useOnlineEncoreGame>

interface OnlineGameBoardProps {
  gameState: GameState
  online: OnlineGame
}

const getTurnLabel = (
  gameState: GameState,
  isMyTurn: boolean,
  currentPlayerName: string,
): string => {
  if (gameState.phase === 'game-over') {
    // Reuse the shared status helper so the online badge matches the local
    // game, including the tied-winners name list.
    return getGameStateMessage(gameState) ?? 'Partie terminée'
  }
  if (isMyTurn) {
    return gameState.phase === 'rolling' ? 'À vous de lancer les dés' : 'À vous de jouer'
  }
  return `Tour de ${currentPlayerName}…`
}

export const OnlineGameBoard = ({ gameState, online }: OnlineGameBoardProps) => {
  const { isMyTurn, myPlayerIndex, rollNewDice, selectDice, makeMove, skipTurn, isValidMove } =
    online

  // Drive the shared selection hook from the authoritative state only while it
  // is our turn. When spectating, hand it a non-selection phase so its
  // forced-move auto-select never tracks another seat's board (which would then
  // render as a stale selection on ours when our turn comes back around).
  const selectionState = isMyTurn ? gameState : { ...gameState, phase: 'player-switching' as const }

  const {
    selectedSquares,
    hoveredSquares,
    setSelectedSquares,
    handleSquareClick,
    handleSquareHover,
    handleSquareLeave,
    handleConfirmMove,
    onSkipTurn,
    canMakeMove,
  } = useEncoreSelection({ gameState: selectionState, makeMove, skipTurn, selectDice, isValidMove })

  const isSelectionPhase =
    gameState.phase === 'active-selection' || gameState.phase === 'passive-selection'
  const canRoll = isMyTurn && gameState.phase === 'rolling'
  const canSelect = isMyTurn && isSelectionPhase
  const canInteract = isMyTurn && isSelectionPhase

  const handleRoll = useCallback(() => {
    rollNewDice()
  }, [rollNewDice])

  useSpacebarShortcut({
    canRoll,
    onRoll: handleRoll,
    canConfirm: canInteract && canMakeMove(),
    onConfirm: handleConfirmMove,
  })

  const myPlayer = gameState.players[myPlayerIndex]
  const otherPlayers = gameState.players.filter((_, index) => index !== myPlayerIndex)
  const currentPlayerName = gameState.players[gameState.currentPlayer]?.name ?? ''
  const firstBonusClaimed = gameState.players.flatMap((player) => player.completedColumnsFirst)
  const selectionLimit = getSelectionLimit(gameState.selectedDice.number?.value)
  const turnLabel = getTurnLabel(gameState, isMyTurn, currentPlayerName)

  if (!myPlayer) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Dices className="w-6 h-6" />
          Encore ! en ligne
        </h1>
        <Badge variant={isMyTurn ? 'default' : 'secondary'} className="text-sm sm:text-base">
          {turnLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <DicePanel
            phase={gameState.phase}
            lastPhase={gameState.lastPhase}
            dice={gameState.dice}
            onDiceSelect={selectDice}
            onRollDice={handleRoll}
            canRoll={canRoll}
            canSelect={canSelect}
            selectedColorDice={gameState.selectedDice.color}
            selectedNumberDice={gameState.selectedDice.number}
            flashRoll={canRoll}
          />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Votre plateau ({myPlayer.name})
            </p>
            <div className="@container">
              <GameBoard
                board={myPlayer.board}
                boardConfiguration={myPlayer.boardConfiguration}
                onSquareClick={canInteract ? handleSquareClick : undefined}
                onSquareHover={canInteract ? handleSquareHover : undefined}
                onSquareLeave={canInteract ? handleSquareLeave : undefined}
                selectedSquares={canInteract ? selectedSquares : []}
                hoveredSquares={canInteract ? hoveredSquares : []}
                disabled={!canInteract}
                firstBonusClaimed={firstBonusClaimed}
                iClaimedFirstBonus={myPlayer.completedColumnsFirst}
                iClaimedSecondBonus={myPlayer.completedColumnsNotFirst}
              />
            </div>
          </div>

          {canInteract && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedSquares.length}/{selectionLimit} case(s)
              </span>
              <Button
                type="button"
                variant="game"
                disabled={!canMakeMove()}
                glow={canMakeMove()}
                onClick={handleConfirmMove}
              >
                <Check className="mr-2 h-4 w-4" />
                Confirmer
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelectedSquares([])}>
                <X className="mr-2 h-4 w-4" />
                Effacer
              </Button>
              <Button type="button" variant="outline" onClick={onSkipTurn}>
                <SkipForward className="mr-2 h-4 w-4" />
                Passer
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {otherPlayers.map((player) => (
            <div key={player.id}>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {player.name}
                {gameState.players[gameState.currentPlayer]?.id === player.id && ' — à son tour'}
              </p>
              <div className="@container">
                <GameBoard
                  board={player.board}
                  boardConfiguration={player.boardConfiguration}
                  selectedSquares={[]}
                  disabled
                  firstBonusClaimed={firstBonusClaimed}
                  iClaimedFirstBonus={player.completedColumnsFirst}
                  iClaimedSecondBonus={player.completedColumnsNotFirst}
                  compact
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {gameState.players.map((player, index) => (
          <ScorePanel
            key={player.id}
            player={player}
            isCurrentPlayer={index === gameState.currentPlayer}
            gameComplete={gameState.phase === 'game-over'}
            allPlayers={gameState.players}
            compact
          />
        ))}
      </div>
    </div>
  )
}
