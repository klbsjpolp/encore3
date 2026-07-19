import type { LobbyReadyState, LobbySeatInfo } from '@klbsjpolp/realtime-core'
import { getDefaultPlayerName, MAX_PLAYER_NAME_LENGTH } from '@klbsjpolp/realtime-core'
import { Check, Copy, LogOut, Pencil, Play, UserX } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getStoredPlayerName, storePlayerName } from '@/online/session'

interface LobbyScreenProps {
  canStartGame: boolean
  connectedSeats: number[]
  isHost: boolean
  kickSeat: (seatIndex: number) => void
  lobbySeats: LobbySeatInfo[]
  mySeatIndex: number | null
  myReadyState: LobbyReadyState
  onLeave: () => void
  onReady: (name?: string) => void
  onStartGame: () => void
  onUnready: () => void
  roomCode: string
  seatCapacity: number
}

const SeatRow = ({
  isHost,
  isSelf,
  lobbyInfo,
  onKick,
  seatIndex,
}: {
  isHost: boolean
  isSelf: boolean
  lobbyInfo: LobbySeatInfo | undefined
  onKick: (seatIndex: number) => void
  seatIndex: number
}) => {
  const readyState = lobbyInfo?.readyState ?? 'never-ready'
  const isReady = readyState === 'ready'
  const nameLabel = lobbyInfo?.displayName ?? getDefaultPlayerName(seatIndex)

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isReady ? 'bg-game-green text-white' : 'bg-muted text-muted-foreground',
        )}
      >
        {isReady ? <Check className="size-4" /> : <Pencil className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium">
          {nameLabel}
          {isSelf && ' (vous)'}
        </span>
      </div>
      {isHost && !isSelf && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => onKick(seatIndex)}
          aria-label={`Exclure le joueur au siège ${seatIndex + 1}`}
        >
          <UserX className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Exclure</span>
        </Button>
      )}
    </div>
  )
}

export const LobbyScreen = ({
  canStartGame,
  connectedSeats,
  isHost,
  kickSeat,
  lobbySeats,
  mySeatIndex,
  myReadyState,
  onLeave,
  onReady,
  onStartGame,
  onUnready,
  roomCode,
  seatCapacity,
}: LobbyScreenProps) => {
  const [playerName, setPlayerName] = useState(() => getStoredPlayerName())
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const handleReady = () => {
    const trimmed = playerName.trim()
    storePlayerName(trimmed)
    onReady(trimmed || undefined)
  }

  const isReady = myReadyState === 'ready'
  const seats = Array.from({ length: seatCapacity }, (_, index) => index)
  const allReady =
    connectedSeats.length >= 2 &&
    connectedSeats.every(
      (seat) =>
        lobbySeats.find((lobbySeat) => lobbySeat.seatIndex === seat)?.readyState === 'ready',
    )

  return (
    <div className="min-h-screen bg-gradient-board flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Salle d'attente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-secondary p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Code de partie</p>
              <p className="font-mono text-3xl font-bold tracking-[0.25em]">{roomCode}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1">{copied ? 'Copié' : 'Copier'}</span>
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lobby-player-name">
              Nom (optionnel, {MAX_PLAYER_NAME_LENGTH} caractères max)
            </Label>
            <div className="flex gap-2">
              <Input
                id="lobby-player-name"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Votre nom"
                maxLength={MAX_PLAYER_NAME_LENGTH}
                autoComplete="nickname"
                disabled={isReady}
                className="flex-1"
              />
              {isReady ? (
                <Button type="button" variant="outline" onClick={onUnready}>
                  Pas prêt
                </Button>
              ) : (
                <Button type="button" onClick={handleReady}>
                  Je suis prêt
                </Button>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {connectedSeats.length < 2
              ? "En attente d'au moins un autre joueur…"
              : allReady
                ? 'Tous les joueurs sont prêts !'
                : 'Tous les joueurs doivent être prêts pour démarrer.'}
          </p>

          <div className="space-y-2">
            {seats
              .filter((seatIndex) => connectedSeats.includes(seatIndex))
              .map((seatIndex) => (
                <SeatRow
                  key={seatIndex}
                  isHost={isHost}
                  isSelf={seatIndex === mySeatIndex}
                  lobbyInfo={lobbySeats.find((seat) => seat.seatIndex === seatIndex)}
                  onKick={kickSeat}
                  seatIndex={seatIndex}
                />
              ))}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onLeave}>
              <LogOut className="mr-2 h-4 w-4" />
              Quitter
            </Button>
            {isHost && (
              <Button
                type="button"
                variant="game"
                className="flex-1"
                disabled={!canStartGame}
                onClick={onStartGame}
              >
                <Play className="mr-2 h-4 w-4" />
                Démarrer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
