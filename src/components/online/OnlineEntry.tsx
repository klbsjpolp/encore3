import {
  isValidRoomCode,
  MAX_PLAYER_NAME_LENGTH,
  normalizeRoomCode,
} from '@klbsjpolp/realtime-core'
import { Globe, LogIn, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getStoredPlayerName, storePlayerName } from '@/online/session'

export interface OnlineEntryHandlers {
  onCreateRoom: (playerName?: string) => Promise<void>
  onJoinRoom: (roomCode: string, playerName?: string) => Promise<void>
}

export const OnlineEntry = ({ onCreateRoom, onJoinRoom }: OnlineEntryHandlers) => {
  const [playerName, setPlayerName] = useState(() => getStoredPlayerName())
  const [roomCode, setRoomCode] = useState('')
  const [pending, setPending] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAction = async (kind: 'create' | 'join', action: () => Promise<void>) => {
    if (pending) {
      return
    }
    setError(null)
    setPending(kind)
    const trimmed = playerName.trim()
    // Don't clobber a previously remembered name with an empty value.
    if (trimmed) {
      storePlayerName(trimmed)
    }
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Une erreur est survenue.')
      setPending(null)
    }
  }

  const trimmedName = () => playerName.trim() || undefined

  const handleCreate = () => runAction('create', () => onCreateRoom(trimmedName()))
  const handleJoin = () => {
    const normalized = normalizeRoomCode(roomCode)
    if (!isValidRoomCode(normalized)) {
      setError('Code de partie invalide.')
      return
    }
    return runAction('join', () => onJoinRoom(normalized, trimmedName()))
  }

  return (
    <div className="space-y-4 rounded-xl border bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Globe className="h-4 w-4" />
        Jouer en ligne
      </div>

      <div className="space-y-2">
        <Label htmlFor="online-player-name">Nom (optionnel)</Label>
        <Input
          id="online-player-name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Votre nom"
          maxLength={MAX_PLAYER_NAME_LENGTH}
          autoComplete="nickname"
        />
      </div>

      <Button
        type="button"
        variant="game"
        className="w-full"
        disabled={pending !== null}
        onClick={handleCreate}
      >
        <Plus className="mr-2 h-4 w-4" />
        {pending === 'create' ? 'Création…' : 'Créer une partie'}
      </Button>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="online-room-code">Rejoindre avec un code</Label>
          <Input
            id="online-room-code"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="ABC"
            autoCapitalize="characters"
            className="font-mono tracking-[0.25em]"
          />
        </div>
        <Button type="button" disabled={pending !== null} onClick={() => void handleJoin()}>
          <LogIn className="mr-2 h-4 w-4" />
          {pending === 'join' ? 'Connexion…' : 'Rejoindre'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
