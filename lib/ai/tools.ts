import { tool } from 'ai'
import { z } from 'zod'

export function createRecommendationTools(
  latitude: number,
  longitude: number,
  roomId: string
) {
  return {
    search_restaurants: tool({
      description: '카카오 로컬 API로 주변 식당을 카테고리별로 검색합니다',
      inputSchema: z.object({
        query: z.string().describe('검색 키워드 (예: "한식", "중식", "일식", "분식")'),
        radius: z.number().default(500).describe('검색 반경 (미터)'),
      }),
      execute: async ({ query, radius }) => {
        const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
        url.searchParams.set('query', query)
        url.searchParams.set('x', String(longitude))
        url.searchParams.set('y', String(latitude))
        url.searchParams.set('radius', String(radius))
        url.searchParams.set('category_group_code', 'FD6')
        url.searchParams.set('sort', 'distance')
        url.searchParams.set('size', '10')

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
          },
        })

        if (!res.ok) return { error: '식당 검색 실패', documents: [] }

        const data = await res.json()
        return {
          documents: data.documents.map((doc: Record<string, unknown>) => ({
            place_name: doc.place_name,
            place_id: doc.id,
            category: doc.category_name,
            address: doc.road_address_name || doc.address_name,
            latitude: parseFloat(doc.y as string),
            longitude: parseFloat(doc.x as string),
            distance: parseInt(doc.distance as string),
            phone: doc.phone,
            place_url: doc.place_url,
          })),
        }
      },
    }),

    get_weather: tool({
      description: '현재 날씨 정보를 가져옵니다',
      inputSchema: z.object({}),
      execute: async () => {
        const url = new URL('https://api.openweathermap.org/data/2.5/weather')
        url.searchParams.set('lat', String(latitude))
        url.searchParams.set('lon', String(longitude))
        url.searchParams.set('appid', process.env.OPENWEATHER_API_KEY!)
        url.searchParams.set('units', 'metric')
        url.searchParams.set('lang', 'kr')

        const res = await fetch(url.toString())
        if (!res.ok) return { error: '날씨 조회 실패' }

        const data = await res.json()
        return {
          temp: data.main.temp,
          feels_like: data.main.feels_like,
          description: data.weather[0].description,
          is_rainy: ['Rain', 'Drizzle', 'Thunderstorm'].includes(data.weather[0].main),
          is_cold: data.main.temp < 5,
          is_hot: data.main.temp > 30,
        }
      },
    }),

    get_vote_history: tool({
      description: '최근 투표 이력 (최근 7일, 선택된 식당)을 조회합니다',
      inputSchema: z.object({}),
      execute: async () => {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: sessions } = await supabase
          .from('vote_sessions')
          .select(`
            id,
            created_at,
            recommendations (
              place_name,
              category,
              votes (id)
            )
          `)
          .eq('room_id', roomId)
          .eq('status', 'closed')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })

        if (!sessions) return { history: [] }

        return {
          history: sessions.map((session: Record<string, unknown>) => {
            const recommendations = session.recommendations as Array<Record<string, unknown>> | undefined
            const winner = recommendations
              ?.sort((a, b) => {
                const aVotes = (a.votes as Array<unknown>)?.length ?? 0
                const bVotes = (b.votes as Array<unknown>)?.length ?? 0
                return bVotes - aVotes
              })[0]

            return {
              date: session.created_at,
              winner_name: (winner?.place_name as string) ?? '미정',
              winner_category: (winner?.category as string) ?? '미정',
            }
          }),
        }
      },
    }),
  }
}
