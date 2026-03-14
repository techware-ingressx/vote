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
    return <p className="text-center text-muted-foreground">아직 투표 이력이 없습니다</p>
  }

  return (
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
          <Card key={session.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{date}</span>
                <Badge variant="outline">{winner?.place_name}</Badge>
              </div>
              <div className="space-y-1">
                {sorted.map((rec, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-sm ${
                      i === 0 ? 'font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    <span>
                      {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i+1}th`}{' '}
                      {rec.place_name}
                      {rec.category && (
                        <span className="text-xs ml-1">({rec.category})</span>
                      )}
                    </span>
                    <span>{rec.votes.length}표</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
