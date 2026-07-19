import type { RoomSession } from '@klbsjpolp/realtime-core'
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOnlineEncoreGame } from '@/hooks/online/useOnlineEncoreGame'
import { cn } from '@/lib/utils'

import { LobbyScreen } from './LobbyScreen'
import { OnlineGameBoard } from './OnlineGameBoard'

interface OnlineGameScreenProps {
  session: RoomSession
  onLeave: () => void
}

const REMOVAL_MESSAGES = {
  removed: {
    title: 'Salle fermée',
    body: "Vous ne faites plus partie de cette salle : l'hôte l'a fermée ou vous en a exclu.",
  },
} as const

export const OnlineGameScreen = ({ session, onLeave }: OnlineGameScreenProps) => {
  const online = useOnlineEncoreGame(session)
  const {
    connectionStatus,
    lastError,
    lobbyRemovalReason,
    gameState,
    roomStatus,
    hasGameView,
    leaveLobby,
  } = online

  const handleLeave = () => {
    leaveLobby()
    onLeave()
  }

  if (lobbyRemovalReason) {
    const message = REMOVAL_MESSAGES[lobbyRemovalReason]
    return (
      <div className="min-h-screen bg-gradient-board flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive" />
              {message.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{message.body}</p>
            <Button type="button" className="w-full" onClick={onLeave}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (roomStatus === 'WAITING' || !hasGameView || !gameState) {
    return (
      <LobbyScreen
        allSeatsReady={online.allSeatsReady}
        canStartGame={online.canStartGame}
        connectedSeats={online.connectedSeats}
        isHost={online.isLocalHost}
        kickSeat={online.kickSeat}
        lobbySeats={online.lobbySeats}
        mySeatIndex={online.mySeatIndex}
        myReadyState={online.myReadyState}
        onLeave={handleLeave}
        onReady={online.sendSetReady}
        onStartGame={online.startGame}
        onUnready={online.sendSetUnready}
        roomCode={online.roomCode}
        seatCapacity={online.seatCapacity}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-board p-2 sm:p-4">
      <div className="max-w-7xl mx-auto mb-3 flex items-center justify-between gap-2">
        <ConnectionBadge status={connectionStatus} />
        <div className="flex items-center gap-2">
          {lastError && <span className="text-xs text-destructive">{lastError}</span>}
          <Button type="button" variant="outline" size="sm" onClick={handleLeave}>
            Quitter
          </Button>
        </div>
      </div>
      <OnlineGameBoard gameState={gameState} online={online} />
    </div>
  )
}

const ConnectionBadge = ({ status }: { status: 'connected' | 'connecting' | 'disconnected' }) => {
  const label =
    status === 'connected' ? 'Connecté' : status === 'connecting' ? 'Reconnexion…' : 'Déconnecté'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'connected'
          ? 'bg-game-green/15 text-game-green'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {status === 'connected' ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {label}
    </span>
  )
}
