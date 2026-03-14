'use server'

import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils/invite-code'
import { redirect } from 'next/navigation'

export type CreateRoomState = {
  error?: string
}

export async function createRoom(
  _prevState: CreateRoomState,
  formData: FormData
): Promise<CreateRoomState> {
  const name = formData.get('name') as string
  const nickname = formData.get('nickname') as string
  const latitude = parseFloat(formData.get('latitude') as string)
  const longitude = parseFloat(formData.get('longitude') as string)
  const address = formData.get('address') as string

  if (!name || !nickname || !latitude || !longitude || !address) {
    return { error: '모든 필드를 입력해주세요' }
  }

  const supabase = await createClient()
  const inviteCode = generateInviteCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      name,
      invite_code: inviteCode,
      latitude,
      longitude,
      address,
      created_by: nickname,
    })
    .select()
    .single()

  if (roomError) {
    return { error: '투표방 생성에 실패했습니다' }
  }

  // 방장을 참여자로 등록
  await supabase.from('participants').insert({
    room_id: room.id,
    nickname,
    is_host: true,
  })

  redirect(`/room/${inviteCode}?nickname=${encodeURIComponent(nickname)}`)
}
