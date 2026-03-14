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
    <Card className="w-full max-w-lg mx-auto shadow-lg shadow-orange-100 hover:shadow-xl hover:shadow-orange-200 transition-all duration-300 border-orange-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
          <span>🗳️</span>
          <span>점심 투표방 만들기</span>
        </CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          방을 만들고 팀원을 초대하세요
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">📝 투표방 이름</Label>
            <Input
              id="name"
              name="name"
              placeholder="예: 개발팀 점심"
              required
              className="focus-visible:ring-orange-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nickname" className="text-sm font-medium">😊 닉네임 (방장)</Label>
            <Input
              id="nickname"
              name="nickname"
              placeholder="예: 홍길동"
              required
              className="focus-visible:ring-orange-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">📍 회사 위치 설정</Label>
            <div className="rounded-xl overflow-hidden shadow-md border border-orange-100">
              <KakaoMap
                onLocationSelect={(lat, lng, addr) =>
                  setLocation({ latitude: lat, longitude: lng, address: addr })
                }
              />
            </div>
            {location && (
              <p className="text-sm text-amber-600 mt-1.5 flex items-center gap-1">
                <span>✅</span> {location.address}
              </p>
            )}
          </div>

          <input type="hidden" name="latitude" value={location?.latitude ?? ''} />
          <input type="hidden" name="longitude" value={location?.longitude ?? ''} />
          <input type="hidden" name="address" value={location?.address ?? ''} />

          {state.error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{state.error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-200 text-base py-5 cursor-pointer"
            disabled={!location || isPending}
          >
            {isPending ? '⏳ 생성 중...' : '🚀 투표방 생성'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
