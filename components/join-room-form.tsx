'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { joinRoom } from '@/app/actions/participant'
import type { Room, Participant } from '@/lib/types'

type Props = {
  room: Room
  onJoin: (participant: Participant) => void
}

export default function JoinRoomForm({ room, onJoin }: Props) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return

    setLoading(true)
    setError('')

    const result = await joinRoom(room.id, nickname.trim())

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (result.participant) {
      onJoin(result.participant)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">{room.name}</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            에 참여하려면 닉네임을 입력하세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 입력"
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '입장 중...' : '입장하기'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
