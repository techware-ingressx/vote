import { generateText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createRecommendationTools } from '@/lib/ai/tools'
import { CHEF_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { roomId, sessionId } = await request.json()

  if (!roomId || !sessionId) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
  }

  const supabase = await createClient()

  // 투표방 정보 조회
  const { data: room } = await supabase
    .from('rooms')
    .select()
    .eq('id', roomId)
    .single()

  if (!room) {
    return NextResponse.json({ error: '투표방을 찾을 수 없습니다' }, { status: 404 })
  }

  const tools = createRecommendationTools(room.latitude, room.longitude, roomId)

  const { text } = await generateText({
    model: openai('gpt-4o'),
    system: CHEF_SYSTEM_PROMPT,
    tools,
    stopWhen: stepCountIs(5),
    prompt: `위치: ${room.address} (위도: ${room.latitude}, 경도: ${room.longitude})
팀명: ${room.name}

주변 식당을 검색하고, 날씨를 확인하고, 최근 투표 이력을 조회해서 오늘 점심 메뉴 3~5개를 추천해주세요.`,
  })

  // AI 응답 파싱
  try {
    const jsonMatch = text.match(/\{[\s\S]*"recommendations"[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // 추천 결과를 DB에 저장
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .insert(
        parsed.recommendations.map((rec: Record<string, unknown>) => ({
          session_id: sessionId,
          place_name: rec.place_name,
          place_id: rec.place_id,
          category: rec.category,
          address: rec.address,
          latitude: rec.latitude,
          longitude: rec.longitude,
          distance: rec.distance,
          phone: rec.phone,
          place_url: rec.place_url,
          ai_reason: rec.ai_reason,
          ai_comment: rec.ai_comment,
        }))
      )
      .select()

    if (error) {
      return NextResponse.json({ error: '추천 저장 실패' }, { status: 500 })
    }

    // 세션 상태를 'voting'으로 변경
    await supabase
      .from('vote_sessions')
      .update({ status: 'voting' })
      .eq('id', sessionId)

    return NextResponse.json({
      recommendations,
      overall_comment: parsed.overall_comment,
    })
  } catch {
    return NextResponse.json({ error: 'AI 응답 처리 실패' }, { status: 500 })
  }
}
