import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type HistorySession = {
  id: string
  created_at: string
  recommendations: {
    place_name: string
    category: string | null
    ai_comment: string | null
    votes: { participants: { nickname: string } | null }[]
  }[]
}

type Props = {
  sessions: HistorySession[]
}

export default function VoteHistory({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">📭</div>
        <p className="text-muted-foreground">아직 투표 이력이 없습니다</p>
      </div>
    )
  }

  const rankEmoji = (i: number) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return `${i + 1}위`
  }

  return (
    <div className="relative">
      {/* 타임라인 세로선 */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-300 via-amber-200 to-transparent" />

      <div className="space-y-4">
        {sessions.map((session) => {
          const sorted = [...session.recommendations].sort(
            (a, b) => b.votes.length - a.votes.length
          )
          const winner = sorted[0]
          const date = new Date(session.created_at).toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })

          return (
            <div key={session.id} className="relative pl-12">
              {/* 타임라인 원형 마커 */}
              <div className="absolute left-3 top-4 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 border-2 border-white shadow-sm" />

              <Card className="border-orange-100/50 hover:shadow-md hover:shadow-orange-50 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                      📅 {date}
                    </span>
                    <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 font-semibold">
                      🏆 {winner?.place_name}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {sorted.map((rec, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between text-sm rounded-lg px-2 py-1 ${
                          i === 0
                            ? 'font-bold text-orange-800 bg-orange-50/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{rankEmoji(i)}</span>
                          <span>{rec.place_name}</span>
                          {rec.category && (
                            <span className="text-xs text-muted-foreground/70">({rec.category})</span>
                          )}
                        </span>
                        <span className="font-medium">{rec.votes.length}표</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
