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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Card className="w-full max-w-sm shadow-lg shadow-orange-100 border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <h2 className="text-white font-bold text-lg">환영합니다!</h2>
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-xl bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
            {room.name}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            닉네임을 입력하고 점심 투표에 참여하세요 🗳️
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="😊 닉네임 입력"
              required
              className="focus-visible:ring-orange-400 text-center"
            />
            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-200 py-5 text-base cursor-pointer"
              disabled={loading}
            >
              {loading ? '⏳ 입장 중...' : '🚀 입장하기'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
