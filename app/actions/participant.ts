'use server'

import { createClient } from '@/lib/supabase/server'

export async function joinRoom(roomId: string, nickname: string) {
  const supabase = await createClient()

  // 이미 같은 닉네임이 있는지 확인
  const { data: existing } = await supabase
    .from('participants')
    .select()
    .eq('room_id', roomId)
    .eq('nickname', nickname)
    .single()

  if (existing) {
    return { participant: existing }
  }

  const { data: participant, error } = await supabase
    .from('participants')
    .insert({ room_id: roomId, nickname })
    .select()
    .single()

  if (error) {
    return { error: '입장에 실패했습니다' }
  }

  return { participant }
}
