'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createRoom, type CreateRoomState } from '@/app/actions/room'
import KakaoMap from '@/components/kakao-map'

const initialState: CreateRoomState = {}

export default function CreateRoomForm() {
  const [state, formAction, isPending] = useActionState(createRoom, initialState)
  const [location, setLocation] = useState<{
    latitude: number
    longitude: number
    address: string
  } | null>(null)

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          점심 투표방 만들기
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">투표방 이름</Label>
            <Input
              id="name"
              name="name"
              placeholder="예: 개발팀 점심"
              required
            />
          </div>

          <div>
            <Label htmlFor="nickname">닉네임 (방장)</Label>
            <Input
              id="nickname"
              name="nickname"
              placeholder="예: 홍길동"
              required
            />
          </div>

          <div>
            <Label>회사 위치 설정</Label>
            <KakaoMap
              onLocationSelect={(lat, lng, addr) =>
                setLocation({ latitude: lat, longitude: lng, address: addr })
              }
            />
            {location && (
              <p className="text-sm text-muted-foreground mt-1">
                {location.address}
              </p>
            )}
          </div>

          <input type="hidden" name="latitude" value={location?.latitude ?? ''} />
          <input type="hidden" name="longitude" value={location?.longitude ?? ''} />
          <input type="hidden" name="address" value={location?.address ?? ''} />

          {state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={!location || isPending}>
            {isPending ? '생성 중...' : '투표방 생성'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
