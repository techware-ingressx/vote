export type Room = {
  id: string
  name: string
  invite_code: string
  latitude: number
  longitude: number
  address: string
  created_by: string
  created_at: string
}

export type Participant = {
  id: string
  room_id: string
  nickname: string
  is_host: boolean
  joined_at: string
}

export type VoteSession = {
  id: string
  room_id: string
  status: 'recommending' | 'voting' | 'closed'
  deadline: string | null
  created_at: string
}

export type Recommendation = {
  id: string
  session_id: string
  place_name: string
  place_id: string | null
  category: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  distance: number | null
  phone: string | null
  place_url: string | null
  ai_reason: string | null
  ai_comment: string | null
  created_at: string
}

export type Vote = {
  id: string
  session_id: string
  recommendation_id: string
  participant_id: string
  voted_at: string
}

export type RecommendationWithVotes = Recommendation & {
  vote_count: number
  voters: string[]
}
