'use server'

import { createClient } from '@/lib/supabase/server'

export async function createVoteSession(roomId: string) {
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from('vote_sessions')
    .insert({
      room_id: roomId,
      status: 'recommending',
    })
    .select()
    .single()

  if (error) return { error: '투표 세션 생성 실패' }
  return { session }
}

export async function castVote(
  sessionId: string,
  recommendationId: string,
  participantId: string
) {
  const supabase = await createClient()

  // 기존 투표 삭제 (변경 투표 허용)
  await supabase
    .from('votes')
    .delete()
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)

  const { error } = await supabase.from('votes').insert({
    session_id: sessionId,
    recommendation_id: recommendationId,
    participant_id: participantId,
  })

  if (error) return { error: '투표 실패' }
  return { success: true }
}

export async function closeVoteSession(sessionId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vote_sessions')
    .update({ status: 'closed' })
    .eq('id', sessionId)

  if (error) return { error: '마감 실패' }
  return { success: true }
}
