'use client'

import { useState } from 'react'
import type { Room, Participant, VoteSession } from '@/lib/types'
import JoinRoomForm from '@/components/join-room-form'

type Props = {
  room: Room
  initialSession: VoteSession | null
  initialParticipants: Participant[]
  initialNickname?: string
}

export default function VoteRoom({ room, initialSession, initialParticipants, initialNickname }: Props) {
  const [currentUser, setCurrentUser] = useState<Participant | null>(() => {
    if (initialNickname) {
      return initialParticipants.find((p) => p.nickname === initialNickname) ?? null
    }
    return null
  })

  if (!currentUser) {
    return <JoinRoomForm room={room} onJoin={setCurrentUser} />
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-muted-foreground">
            {currentUser.nickname}님 환영합니다!
          </p>
        </header>

        {/* Task 8에서 AI 추천 + 투표 UI 구현 */}
        <p className="text-center text-muted-foreground">투표 기능 준비 중...</p>
      </div>
    </main>
  )
}
