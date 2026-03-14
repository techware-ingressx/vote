'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Room, Participant, VoteSession, Recommendation, RecommendationWithVotes } from '@/lib/types'
import JoinRoomForm from '@/components/join-room-form'
import RecommendationCard from '@/components/recommendation-card'
import KakaoMapViewer from '@/components/kakao-map-viewer'
import { createVoteSession, castVote, closeVoteSession } from '@/app/actions/vote'
import { createClient } from '@/lib/supabase/client'

type Props = {
  room: Room
  initialSession: VoteSession | null
  initialParticipants: Participant[]
  initialNickname?: string
}

export default function VoteRoom({ room, initialSession, initialParticipants, initialNickname }: Props) {
  const [currentUser, setCurrentUser] = useState<Participant | null>(() => {
    if (initialNickname) {
      return initialParticipants.find((p) => p.nickname === initialNickname) ?? null
    }
    return null
  })
  const [session, setSession] = useState<VoteSession | null>(initialSession)
  const [recommendations, setRecommendations] = useState<RecommendationWithVotes[]>([])
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [overallComment, setOverallComment] = useState('')

  const isHost = currentUser?.is_host ?? false

  // 추천/투표 데이터 조회
  const fetchRecommendations = useCallback(async (sessionId: string) => {
    const supabase = createClient()

    const { data: recs } = await supabase
      .from('recommendations')
      .select('*')
      .eq('session_id', sessionId)

    const { data: votes } = await supabase
      .from('votes')
      .select('*, participants(nickname)')
      .eq('session_id', sessionId)

    if (recs) {
      const recsWithVotes: RecommendationWithVotes[] = recs.map((rec: Recommendation) => {
        const recVotes = votes?.filter((v: any) => v.recommendation_id === rec.id) ?? []
        return {
          ...rec,
          vote_count: recVotes.length,
          voters: recVotes.map((v: any) => v.participants?.nickname ?? ''),
        }
      })
      setRecommendations(recsWithVotes)
    }

    // 내 투표 확인
    if (currentUser) {
      const myV = votes?.find((v: any) => v.participant_id === currentUser.id)
      setMyVote(myV?.recommendation_id ?? null)
    }
  }, [currentUser])

  // Supabase Realtime 구독
  useEffect(() => {
    if (!session) return

    const supabase = createClient()

    fetchRecommendations(session.id)

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `session_id=eq.${session.id}` },
        () => fetchRecommendations(session.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recommendations', filter: `session_id=eq.${session.id}` },
        () => fetchRecommendations(session.id)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vote_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as VoteSession)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, fetchRecommendations])

  // AI 추천 요청
  async function handleRecommend() {
    setLoading(true)
    try {
      let sessionId = session?.id

      if (!sessionId) {
        const result = await createVoteSession(room.id)
        if (result.error || !result.session) {
          setLoading(false)
          return
        }
        setSession(result.session)
        sessionId = result.session.id
      }

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, sessionId }),
      })

      const data = await res.json()
      if (data.overall_comment) {
        setOverallComment(data.overall_comment)
      }
    } catch (error) {
      console.error('추천 요청 실패:', error)
    }
    setLoading(false)
  }

  // 투표
  async function handleVote(recommendationId: string) {
    if (!currentUser || !session) return
    await castVote(session.id, recommendationId, currentUser.id)
  }

  // 마감
  async function handleClose() {
    if (!session) return
    await closeVoteSession(session.id)
  }

  if (!currentUser) {
    return <JoinRoomForm room={room} onJoin={setCurrentUser} />
  }

  const isClosed = session?.status === 'closed'
  const isVoting = session?.status === 'voting'
  const winner = isClosed
    ? [...recommendations].sort((a, b) => b.vote_count - a.vote_count)[0]
    : null

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="outline">{currentUser.nickname}</Badge>
            {isHost && <Badge>방장</Badge>}
            <Badge variant="secondary">{participants.length}명 참여</Badge>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
              }}
            >
              초대 링크 복사
            </Button>
            <Link href={`/room/${room.invite_code}/history`}>
              <Button variant="ghost" size="sm">이력</Button>
            </Link>
          </div>
        </header>

        {/* 결과 (마감 시) */}
        {isClosed && winner && (
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-orange-600 mb-1">오늘의 점심</p>
            <h2 className="text-2xl font-bold">{winner.place_name}</h2>
            <p className="text-muted-foreground">{winner.vote_count}표</p>
            {winner.ai_comment && (
              <p className="text-sm italic mt-2">&ldquo;{winner.ai_comment}&rdquo;</p>
            )}
          </div>
        )}

        {/* 카카오 지도 */}
        {recommendations.length > 0 && (
          <div className="mb-6">
            <KakaoMapViewer
              centerLat={room.latitude}
              centerLng={room.longitude}
              recommendations={recommendations}
              selectedId={winner?.id}
            />
          </div>
        )}

        {/* AI 전체 코멘트 */}
        {overallComment && (
          <div className="bg-white border rounded-lg p-4 mb-4">
            <p className="text-sm font-medium mb-1">셰프의 한마디</p>
            <p className="text-sm italic">&ldquo;{overallComment}&rdquo;</p>
          </div>
        )}

        {/* AI 추천 받기 버튼 (방장만) */}
        {isHost && !isVoting && !isClosed && (
          <Button
            className="w-full mb-6"
            size="lg"
            onClick={handleRecommend}
            disabled={loading}
          >
            {loading ? 'AI 셰프가 고민 중...' : 'AI 추천 받기'}
          </Button>
        )}

        {/* 추천 카드 목록 */}
        {recommendations.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="font-semibold text-lg">
              {isClosed ? '최종 결과' : '오늘의 추천'}
            </h2>
            {recommendations
              .sort((a, b) => b.vote_count - a.vote_count)
              .map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  isVoted={myVote === rec.id}
                  onVote={() => handleVote(rec.id)}
                  disabled={isClosed}
                />
              ))}
          </div>
        )}

        {/* 마감 버튼 (방장만) */}
        {isHost && isVoting && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleClose}
          >
            투표 마감
          </Button>
        )}

        {/* 새 투표 시작 (마감 후, 방장만) */}
        {isHost && isClosed && (
          <Button
            className="w-full mt-4"
            onClick={() => {
              setSession(null)
              setRecommendations([])
              setMyVote(null)
              setOverallComment('')
            }}
          >
            새 투표 시작
          </Button>
        )}
      </div>
    </main>
  )
}
