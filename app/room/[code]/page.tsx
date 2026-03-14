import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VoteRoom from '@/components/vote-room'

type Props = {
  params: Promise<{ code: string }>
  searchParams: Promise<{ nickname?: string }>
}

export default async function RoomPage({ params, searchParams }: Props) {
  const { code } = await params
  const { nickname } = await searchParams

  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select()
    .eq('invite_code', code)
    .single()

  if (!room) notFound()

  // 현재 활성 세션 조회
  const { data: activeSession } = await supabase
    .from('vote_sessions')
    .select()
    .eq('room_id', room.id)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 참여자 목록
  const { data: participants } = await supabase
    .from('participants')
    .select()
    .eq('room_id', room.id)

  return (
    <VoteRoom
      room={room}
      initialSession={activeSession}
      initialParticipants={participants ?? []}
      initialNickname={nickname}
    />
  )
}
