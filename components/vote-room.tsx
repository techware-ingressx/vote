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

      // API 응답에서 직접 추천 데이터 반영 (Realtime 실패 대비)
      if (data.recommendations) {
        const recsWithVotes: RecommendationWithVotes[] = data.recommendations.map((rec: Recommendation) => ({
          ...rec,
          vote_count: 0,
          voters: [],
        }))
        setRecommendations(recsWithVotes)
      }

      // 세션 상태를 voting으로 직접 업데이트
      setSession((prev) => prev ? { ...prev, status: 'voting' } : prev)
    } catch (error) {
      console.error('추천 요청 실패:', error)
    }
    setLoading(false)
  }

  // 투표
  async function handleVote(recommendationId: string) {
    if (!currentUser || !session) return
    await castVote(session.id, recommendationId, currentUser.id)
    setMyVote(recommendationId)
    // 직접 데이터 갱신 (Realtime 실패 대비)
    await fetchRecommendations(session.id)
  }

  // 마감
  async function handleClose() {
    if (!session) return
    await closeVoteSession(session.id)
    setSession((prev) => prev ? { ...prev, status: 'closed' } : prev)
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
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <header className="text-center mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md shadow-orange-100 p-5 border border-orange-100/50">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
              🍽️ {room.name}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                😊 {currentUser.nickname}
              </Badge>
              {isHost && (
                <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0">
                  👑 방장
                </Badge>
              )}
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                👥 {participants.length}명 참여
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-1 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                }}
              >
                📋 초대 링크 복사
              </Button>
              <Link href={`/room/${room.invite_code}/history`}>
                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 cursor-pointer">
                  📊 이력
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* 결과 (마감 시) */}
        {isClosed && winner && (
          <div className="bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 border border-orange-200 rounded-2xl p-6 mb-6 text-center shadow-lg shadow-orange-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full text-center text-2xl opacity-20 pointer-events-none select-none">
              🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉
            </div>
            <p className="text-sm text-orange-600 font-semibold mb-1">🏆 오늘의 점심</p>
            <h2 className="text-3xl font-extrabold text-orange-700">{winner.place_name}</h2>
            <p className="text-orange-500 font-bold text-lg mt-1">🗳️ {winner.vote_count}표</p>
            {winner.ai_comment && (
              <p className="text-sm italic mt-3 text-amber-700 bg-white/50 rounded-lg p-2 inline-block">
                &ldquo;{winner.ai_comment}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* 카카오 지도 */}
        {recommendations.length > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden shadow-md border border-orange-100">
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
          <div className="relative bg-white border border-orange-100 rounded-2xl p-5 mb-6 shadow-md shadow-orange-50">
            <div className="absolute -top-3 left-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              🧑‍🍳 셰프의 한마디
            </div>
            <p className="text-sm italic text-gray-700 mt-1 leading-relaxed">
              &ldquo;{overallComment}&rdquo;
            </p>
          </div>
        )}

        {/* AI 추천 받기 버튼 (방장만) */}
        {isHost && !isVoting && !isClosed && (
          <Button
            className="w-full mb-6 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-all duration-300 text-lg py-7 rounded-xl font-bold cursor-pointer"
            size="lg"
            onClick={handleRecommend}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🍳</span> AI 셰프가 고민 중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                🧑‍🍳 AI 추천 받기
              </span>
            )}
          </Button>
        )}

        {/* 추천 카드 목록 */}
        {recommendations.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="font-bold text-lg flex items-center gap-2 text-orange-800">
              {isClosed ? '🏁 최종 결과' : '✨ 오늘의 추천'}
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
            className="w-full rounded-xl py-5 text-base shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={handleClose}
          >
            🔒 투표 마감
          </Button>
        )}

        {/* 새 투표 시작 (마감 후, 방장만) */}
        {isHost && isClosed && (
          <Button
            className="w-full mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl py-5 text-base shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => {
              setSession(null)
              setRecommendations([])
              setMyVote(null)
              setOverallComment('')
            }}
          >
            🔄 새 투표 시작
          </Button>
        )}
      </div>
    </main>
  )
}
