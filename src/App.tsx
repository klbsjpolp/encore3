import type { RoomSession } from '@klbsjpolp/realtime-core'
import { lazy, Suspense, useCallback, useState } from 'react'

import { EncoreGame } from '@/components/game/EncoreGame'
import type { OnlineEntryHandlers } from '@/components/online/OnlineEntry'
import { createOnlineRoom, joinOnlineRoom } from '@/online/api'
import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from '@/online/session'

// Code-split the online stack (host runtime, online hook, board, lobby): it is
// fetched only when a player actually creates, joins, or resumes an online game.
const OnlineGameScreen = lazy(() =>
  import('@/components/online/OnlineGameScreen').then((module) => ({
    default: module.OnlineGameScreen,
  })),
)

const App = () => {
  const [session, setSession] = useState<RoomSession | null>(() => loadOnlineSession())

  const enterSession = useCallback((nextSession: RoomSession) => {
    saveOnlineSession(nextSession)
    setSession(nextSession)
  }, [])

  const leaveSession = useCallback(() => {
    clearOnlineSession()
    setSession(null)
  }, [])

  const onlineEntry: OnlineEntryHandlers = {
    onCreateRoom: async (playerName) => {
      enterSession(await createOnlineRoom(playerName))
    },
    onJoinRoom: async (roomCode, playerName) => {
      enterSession(await joinOnlineRoom(roomCode, playerName))
    },
  }

  if (session) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gradient-board" />}>
        <OnlineGameScreen
          key={`${session.roomCode}-${session.seatToken}`}
          session={session}
          onLeave={leaveSession}
        />
      </Suspense>
    )
  }

  return <EncoreGame onlineEntry={onlineEntry} />
}

export default App
