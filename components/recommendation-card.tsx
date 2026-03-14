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
  return (
    <Card className={`transition-all ${isVoted ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{recommendation.place_name}</h3>
              {recommendation.category && (
                <Badge variant="secondary">{recommendation.category}</Badge>
              )}
            </div>
            {recommendation.distance && (
              <p className="text-sm text-muted-foreground mb-2">
                {recommendation.distance}m | {recommendation.address}
              </p>
            )}
            {recommendation.ai_reason && (
              <p className="text-sm mb-2 italic text-gray-700">
                &ldquo;{recommendation.ai_reason}&rdquo;
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 ml-4">
            <Button
              variant={isVoted ? 'default' : 'outline'}
              size="sm"
              onClick={onVote}
              disabled={disabled}
              className="min-w-[60px]"
            >
              {isVoted ? '투표됨' : '투표'}
            </Button>
            <span className="text-lg font-bold">{recommendation.vote_count}</span>
            {recommendation.voters.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {recommendation.voters.join(', ')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
