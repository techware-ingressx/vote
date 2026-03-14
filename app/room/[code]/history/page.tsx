import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VoteHistory from '@/components/vote-history'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ code: string }>
}

export default async function HistoryPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select()
    .eq('invite_code', code)
    .single()

  if (!room) notFound()

  const { data: sessions } = await supabase
    .from('vote_sessions')
    .select(`
      *,
      recommendations (
        *,
        votes (
          *,
          participants (nickname)
        )
      )
    `)
    .eq('room_id', room.id)
    .eq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
            📊 투표 이력
          </h1>
          <Link href={`/room/${code}`}>
            <Button variant="outline" size="sm" className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 cursor-pointer">
              ← 돌아가기
            </Button>
          </Link>
        </div>
        <VoteHistory sessions={sessions ?? []} />
      </div>
    </main>
  )
}
