'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { RecommendationWithVotes } from '@/lib/types'

type Props = {
  recommendation: RecommendationWithVotes
  isVoted: boolean
  onVote: () => void
  disabled: boolean
}

export default function RecommendationCard({
  recommendation,
  isVoted,
  onVote,
  disabled,
}: Props) {
  const categoryEmoji: Record<string, string> = {
    '한식': '🍚',
    '중식': '🥟',
    '일식': '🍣',
    '양식': '🍝',
    '분식': '🍜',
    '카페': '☕',
    '패스트푸드': '🍔',
    '치킨': '🍗',
    '피자': '🍕',
    '베이커리': '🥐',
  }

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, string> = {
      '한식': 'bg-red-50 text-red-700 border-red-200',
      '중식': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      '일식': 'bg-blue-50 text-blue-700 border-blue-200',
      '양식': 'bg-green-50 text-green-700 border-green-200',
      '분식': 'bg-purple-50 text-purple-700 border-purple-200',
      '카페': 'bg-amber-50 text-amber-700 border-amber-200',
      '패스트푸드': 'bg-orange-50 text-orange-700 border-orange-200',
    }
    return styles[category] ?? 'bg-gray-50 text-gray-700 border-gray-200'
  }

  return (
    <Card className={`transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border-orange-100/50 ${isVoted ? 'ring-2 ring-orange-400 bg-orange-50/50 shadow-md shadow-orange-100' : 'hover:shadow-orange-100'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="font-bold text-lg text-gray-800">{recommendation.place_name}</h3>
              {recommendation.category && (
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${getCategoryStyle(recommendation.category)}`}
                >
                  {categoryEmoji[recommendation.category] ?? '🍴'} {recommendation.category}
                </Badge>
              )}
            </div>
            {recommendation.distance && (
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <span>📍</span>
                <span>{recommendation.distance}m</span>
                <span className="text-gray-300">|</span>
                <span className="truncate">{recommendation.address}</span>
              </p>
            )}
            {recommendation.ai_reason && (
              <div className="text-sm mb-1 italic text-amber-700 bg-amber-50/70 rounded-lg p-2 border border-amber-100">
                <span className="not-italic">🧑‍🍳</span> &ldquo;{recommendation.ai_reason}&rdquo;
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5 ml-4 shrink-0">
            <Button
              variant={isVoted ? 'default' : 'outline'}
              size="sm"
              onClick={onVote}
              disabled={disabled}
              className={`min-w-[70px] cursor-pointer transition-all duration-200 ${
                isVoted
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm border-0'
                  : 'border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'
              }`}
            >
              {isVoted ? '✅ 투표됨' : '🗳️ 투표'}
            </Button>
            <span className="text-xl font-extrabold text-orange-600">{recommendation.vote_count}</span>
            {recommendation.voters.length > 0 && (
              <p className="text-xs text-muted-foreground text-center max-w-[80px] truncate">
                {recommendation.voters.join(', ')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
