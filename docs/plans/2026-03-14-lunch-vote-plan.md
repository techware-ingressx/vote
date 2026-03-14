# 점심식사 투표앱 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 안성재 셰프 스타일 AI가 주변 식당을 추천하고, 팀원들이 실시간 투표로 점심을 결정하는 PWA 웹앱

**Architecture:** Next.js 15 App Router 풀스택. Supabase로 DB/Realtime 처리. Claude API (Vercel AI SDK)로 Tool Use 기반 식당 추천. 카카오맵 JS SDK로 지도 표시.

**Tech Stack:** Next.js 15, Supabase (PostgreSQL + Realtime), Vercel AI SDK + Claude API, 카카오맵 JS SDK, 카카오 로컬 API, OpenWeatherMap API, Tailwind CSS, shadcn/ui

---

## Task 1: 프로젝트 초기 설정

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `.env.local.example`

**Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/jason/Library/CloudStorage/Dropbox/PC2/day6
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

**Step 2: shadcn/ui 초기화**

```bash
npx shadcn@latest init -d
```

**Step 3: 필요한 shadcn 컴포넌트 설치**

```bash
npx shadcn@latest add button card input label dialog badge toast
```

**Step 4: 추가 의존성 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr ai @ai-sdk/anthropic nanoid
npm install -D @types/node
```

**Step 5: 환경변수 템플릿 생성**

`.env.local.example`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Claude API
ANTHROPIC_API_KEY=your-anthropic-api-key

# 카카오
NEXT_PUBLIC_KAKAO_JS_KEY=your-kakao-javascript-key
KAKAO_REST_API_KEY=your-kakao-rest-api-key

# 날씨
OPENWEATHER_API_KEY=your-openweather-api-key
```

**Step 6: 개발 서버 실행 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속, Next.js 기본 페이지 확인.

**Step 7: 커밋**

```bash
git init
git add .
git commit -m "init: Next.js 15 + Tailwind + shadcn/ui 프로젝트 초기 설정"
```

---

## Task 2: Supabase 데이터베이스 설정

**Files:**
- Create: `supabase/schema.sql`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Step 1: Supabase SQL 스키마 작성**

`supabase/schema.sql`:
```sql
-- 투표방
create table rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  latitude double precision not null,
  longitude double precision not null,
  address text not null,
  created_by text not null,
  created_at timestamptz default now()
);

-- 참여자
create table participants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  nickname text not null,
  is_host boolean default false,
  joined_at timestamptz default now()
);

-- 투표 세션
create table vote_sessions (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  status text default 'recommending' check (status in ('recommending', 'voting', 'closed')),
  deadline timestamptz,
  created_at timestamptz default now()
);

-- AI 추천
create table recommendations (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references vote_sessions(id) on delete cascade not null,
  place_name text not null,
  place_id text,
  category text,
  address text,
  latitude double precision,
  longitude double precision,
  distance integer,
  phone text,
  place_url text,
  ai_reason text,
  ai_comment text,
  created_at timestamptz default now()
);

-- 투표
create table votes (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references vote_sessions(id) on delete cascade not null,
  recommendation_id uuid references recommendations(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  voted_at timestamptz default now(),
  unique(session_id, participant_id)
);

-- RLS 활성화
alter table rooms enable row level security;
alter table participants enable row level security;
alter table vote_sessions enable row level security;
alter table recommendations enable row level security;
alter table votes enable row level security;

-- 모든 테이블에 anon 접근 허용 (인증 없는 앱)
create policy "rooms_all" on rooms for all using (true) with check (true);
create policy "participants_all" on participants for all using (true) with check (true);
create policy "vote_sessions_all" on vote_sessions for all using (true) with check (true);
create policy "recommendations_all" on recommendations for all using (true) with check (true);
create policy "votes_all" on votes for all using (true) with check (true);

-- Realtime 활성화
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table vote_sessions;
alter publication supabase_realtime add table recommendations;
```

**Step 2: Supabase 대시보드에서 SQL 실행**

Supabase 프로젝트 생성 후, SQL Editor에서 위 스키마 실행.

**Step 3: Supabase 브라우저 클라이언트 생성**

`lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 4: Supabase 서버 클라이언트 생성**

`lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 무시
          }
        },
      },
    }
  )
}
```

**Step 5: .env.local 설정**

Supabase 대시보드에서 URL, anon key 복사하여 `.env.local`에 설정.

**Step 6: 커밋**

```bash
git add supabase/ lib/supabase/
git commit -m "feat: Supabase 스키마 및 클라이언트 유틸리티 설정"
```

---

## Task 3: 타입 정의 및 공통 유틸리티

**Files:**
- Create: `lib/types.ts`
- Create: `lib/utils/invite-code.ts`

**Step 1: 타입 정의**

`lib/types.ts`:
```typescript
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
```

**Step 2: 초대 코드 생성 유틸리티**

`lib/utils/invite-code.ts`:
```typescript
import { nanoid } from 'nanoid'

export function generateInviteCode(): string {
  return nanoid(8)
}
```

**Step 3: 커밋**

```bash
git add lib/types.ts lib/utils/
git commit -m "feat: 타입 정의 및 초대 코드 유틸리티"
```

---

## Task 4: 홈 페이지 - 투표방 생성

**Files:**
- Modify: `app/page.tsx`
- Create: `app/actions/room.ts`
- Create: `components/create-room-form.tsx`

**Step 1: 투표방 생성 Server Action 작성**

`app/actions/room.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils/invite-code'
import { redirect } from 'next/navigation'

export async function createRoom(formData: FormData) {
  const name = formData.get('name') as string
  const nickname = formData.get('nickname') as string
  const latitude = parseFloat(formData.get('latitude') as string)
  const longitude = parseFloat(formData.get('longitude') as string)
  const address = formData.get('address') as string

  if (!name || !nickname || !latitude || !longitude || !address) {
    return { error: '모든 필드를 입력해주세요' }
  }

  const supabase = await createClient()
  const inviteCode = generateInviteCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      name,
      invite_code: inviteCode,
      latitude,
      longitude,
      address,
      created_by: nickname,
    })
    .select()
    .single()

  if (roomError) {
    return { error: '투표방 생성에 실패했습니다' }
  }

  // 방장을 참여자로 등록
  await supabase.from('participants').insert({
    room_id: room.id,
    nickname,
    is_host: true,
  })

  redirect(`/room/${inviteCode}?nickname=${encodeURIComponent(nickname)}`)
}
```

**Step 2: 투표방 생성 폼 컴포넌트**

`components/create-room-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createRoom } from '@/app/actions/room'
import KakaoMap from '@/components/kakao-map'

export default function CreateRoomForm() {
  const [location, setLocation] = useState<{
    latitude: number
    longitude: number
    address: string
  } | null>(null)

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          점심 투표방 만들기
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createRoom} className="space-y-4">
          <div>
            <Label htmlFor="name">투표방 이름</Label>
            <Input
              id="name"
              name="name"
              placeholder="예: 개발팀 점심"
              required
            />
          </div>

          <div>
            <Label htmlFor="nickname">닉네임 (방장)</Label>
            <Input
              id="nickname"
              name="nickname"
              placeholder="예: 홍길동"
              required
            />
          </div>

          <div>
            <Label>회사 위치 설정</Label>
            <div className="h-64 mt-2 rounded-lg overflow-hidden border">
              <KakaoMap
                onLocationSelect={(lat, lng, addr) =>
                  setLocation({ latitude: lat, longitude: lng, address: addr })
                }
              />
            </div>
            {location && (
              <p className="text-sm text-muted-foreground mt-1">
                {location.address}
              </p>
            )}
          </div>

          <input type="hidden" name="latitude" value={location?.latitude ?? ''} />
          <input type="hidden" name="longitude" value={location?.longitude ?? ''} />
          <input type="hidden" name="address" value={location?.address ?? ''} />

          <Button type="submit" className="w-full" disabled={!location}>
            투표방 생성
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 3: 홈 페이지 업데이트**

`app/page.tsx`:
```tsx
import CreateRoomForm from '@/components/create-room-form'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🍽️ 오늘 뭐 먹지?</h1>
          <p className="text-muted-foreground">
            AI 셰프가 추천하고, 팀이 투표로 결정!
          </p>
        </div>
        <CreateRoomForm />
      </div>
    </main>
  )
}
```

**Step 4: 개발 서버에서 홈 페이지 확인**

```bash
npm run dev
```

`http://localhost:3000` 접속, 폼 렌더링 확인 (지도는 Task 5에서 구현).

**Step 5: 커밋**

```bash
git add app/ components/
git commit -m "feat: 홈 페이지 및 투표방 생성 폼"
```

---

## Task 5: 카카오지도 통합

**Files:**
- Create: `components/kakao-map.tsx`
- Create: `components/kakao-map-viewer.tsx`
- Modify: `app/layout.tsx`

**Step 1: 카카오맵 SDK 스크립트 로드**

`app/layout.tsx` 수정 — `<head>`에 카카오맵 SDK 추가:
```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: '오늘 뭐 먹지? - AI 점심 투표',
  description: 'AI 셰프가 추천하고, 팀이 투표로 결정!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services`}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  )
}
```

**Step 2: 카카오맵 위치 선택 컴포넌트 (방 생성용)**

`components/kakao-map.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    kakao: any
  }
}

type Props = {
  onLocationSelect: (lat: number, lng: number, address: string) => void
}

export default function KakaoMap({ onLocationSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!mapRef.current || !window.kakao) return

    window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(37.5665, 126.9780) // 서울 시청
      const mapInstance = new window.kakao.maps.Map(mapRef.current, {
        center,
        level: 3,
      })
      const markerInstance = new window.kakao.maps.Marker({ position: center })
      markerInstance.setMap(mapInstance)

      setMap(mapInstance)
      setMarker(markerInstance)

      // 클릭으로 위치 선택
      window.kakao.maps.event.addListener(mapInstance, 'click', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng
        markerInstance.setPosition(latlng)

        const geocoder = new window.kakao.maps.services.Geocoder()
        geocoder.coord2Address(
          latlng.getLng(),
          latlng.getLat(),
          (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].road_address?.address_name
                ?? result[0].address.address_name
              onLocationSelect(latlng.getLat(), latlng.getLng(), addr)
            }
          }
        )
      })
    })
  }, [onLocationSelect])

  function handleSearch() {
    if (!map || !searchQuery.trim()) return

    const ps = new window.kakao.maps.services.Places()
    ps.keywordSearch(searchQuery, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const place = data[0]
        const position = new window.kakao.maps.LatLng(place.y, place.x)
        map.setCenter(position)
        marker?.setPosition(position)
        onLocationSelect(parseFloat(place.y), parseFloat(place.x), place.address_name)
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="주소 또는 건물명 검색"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" variant="outline" onClick={handleSearch}>
          검색
        </Button>
      </div>
      <div ref={mapRef} className="w-full h-64 rounded-lg" />
    </div>
  )
}
```

**Step 3: 카카오맵 뷰어 컴포넌트 (투표방용 — 핀 표시)**

`components/kakao-map-viewer.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import type { Recommendation } from '@/lib/types'

declare global {
  interface Window {
    kakao: any
  }
}

type Props = {
  centerLat: number
  centerLng: number
  recommendations: Recommendation[]
  selectedId?: string
}

export default function KakaoMapViewer({ centerLat, centerLng, recommendations, selectedId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current || !window.kakao) return

    window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(centerLat, centerLng)
      const map = new window.kakao.maps.Map(mapRef.current, {
        center,
        level: 4,
      })

      // 회사 위치 마커
      new window.kakao.maps.Marker({
        map,
        position: center,
        title: '회사',
      })

      // 추천 식당 마커
      recommendations.forEach((rec) => {
        if (!rec.latitude || !rec.longitude) return

        const position = new window.kakao.maps.LatLng(rec.latitude, rec.longitude)
        const isSelected = rec.id === selectedId

        const marker = new window.kakao.maps.Marker({
          map,
          position,
          title: rec.place_name,
        })

        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-size:13px;font-weight:${isSelected ? 'bold' : 'normal'}">${rec.place_name}</div>`,
        })

        if (isSelected) {
          infowindow.open(map, marker)
        }

        window.kakao.maps.event.addListener(marker, 'mouseover', () => {
          infowindow.open(map, marker)
        })
        window.kakao.maps.event.addListener(marker, 'mouseout', () => {
          if (!isSelected) infowindow.close()
        })
      })
    })
  }, [centerLat, centerLng, recommendations, selectedId])

  return <div ref={mapRef} className="w-full h-80 rounded-lg" />
}
```

**Step 4: 개발 서버에서 지도 확인**

카카오 개발자 사이트에서 JS 키 발급 후 `.env.local`에 설정.
홈 페이지에서 지도 로드 및 주소 검색 동작 확인.

**Step 5: 커밋**

```bash
git add components/kakao-map.tsx components/kakao-map-viewer.tsx app/layout.tsx
git commit -m "feat: 카카오맵 위치 선택 및 뷰어 컴포넌트"
```

---

## Task 6: 투표방 입장 페이지

**Files:**
- Create: `app/room/[code]/page.tsx`
- Create: `app/actions/participant.ts`
- Create: `components/join-room-form.tsx`
- Create: `components/vote-room.tsx`

**Step 1: 참여자 입장 Server Action**

`app/actions/participant.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function joinRoom(roomId: string, nickname: string) {
  const supabase = await createClient()

  // 이미 같은 닉네임이 있는지 확인
  const { data: existing } = await supabase
    .from('participants')
    .select()
    .eq('room_id', roomId)
    .eq('nickname', nickname)
    .single()

  if (existing) {
    return { participant: existing }
  }

  const { data: participant, error } = await supabase
    .from('participants')
    .insert({ room_id: roomId, nickname })
    .select()
    .single()

  if (error) {
    return { error: '입장에 실패했습니다' }
  }

  return { participant }
}
```

**Step 2: 닉네임 입력 폼**

`components/join-room-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { joinRoom } from '@/app/actions/participant'
import type { Room, Participant } from '@/lib/types'

type Props = {
  room: Room
  onJoin: (participant: Participant) => void
}

export default function JoinRoomForm({ room, onJoin }: Props) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return

    setLoading(true)
    setError('')

    const result = await joinRoom(room.id, nickname.trim())

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (result.participant) {
      onJoin(result.participant)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">{room.name}</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            에 참여하려면 닉네임을 입력하세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 입력"
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '입장 중...' : '입장하기'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: 투표방 페이지 (서버 컴포넌트)**

`app/room/[code]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VoteRoom from '@/components/vote-room'

type Props = {
  params: Promise<{ code: string }>
  searchParams: Promise<{ nickname?: string }>
}

export default async function RoomPage({ params, searchParams }: Props) {
  const { code } = await params
  const { nickname } = await searchParams

  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select()
    .eq('invite_code', code)
    .single()

  if (!room) notFound()

  // 현재 활성 세션 조회
  const { data: activeSession } = await supabase
    .from('vote_sessions')
    .select()
    .eq('room_id', room.id)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 참여자 목록
  const { data: participants } = await supabase
    .from('participants')
    .select()
    .eq('room_id', room.id)

  return (
    <VoteRoom
      room={room}
      initialSession={activeSession}
      initialParticipants={participants ?? []}
      initialNickname={nickname}
    />
  )
}
```

**Step 4: VoteRoom 클라이언트 컴포넌트 (스켈레톤)**

`components/vote-room.tsx`:
```tsx
'use client'

import { useState } from 'react'
import type { Room, Participant, VoteSession } from '@/lib/types'
import JoinRoomForm from '@/components/join-room-form'

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

  if (!currentUser) {
    return <JoinRoomForm room={room} onJoin={setCurrentUser} />
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-muted-foreground">
            {currentUser.nickname}님 환영합니다!
          </p>
        </header>

        {/* Task 7, 8에서 AI 추천 + 투표 UI 구현 */}
        <p className="text-center text-muted-foreground">투표 기능 준비 중...</p>
      </div>
    </main>
  )
}
```

**Step 5: 초대 링크로 접속 확인**

1. 홈에서 투표방 생성
2. 생성 후 리다이렉트된 URL 확인 (예: `/room/abc12345`)
3. 새 시크릿 탭에서 같은 URL 접속 → 닉네임 입력 → 입장

**Step 6: 커밋**

```bash
git add app/room/ app/actions/participant.ts components/join-room-form.tsx components/vote-room.tsx
git commit -m "feat: 투표방 입장 페이지 및 닉네임 입력"
```

---

## Task 7: AI 추천 엔진 (Claude + Tool Use)

**Files:**
- Create: `app/api/recommend/route.ts`
- Create: `lib/ai/system-prompt.ts`
- Create: `lib/ai/tools.ts`

**Step 1: 안성재 셰프 시스템 프롬프트**

`lib/ai/system-prompt.ts`:
```typescript
export const CHEF_SYSTEM_PROMPT = `당신은 안성재 셰프 스타일의 점심 추천 전문가입니다.

## 페르소나
- 음식에 대한 깊은 애정과 전문 지식을 가진 셰프
- 식재료의 본질, 조리법의 디테일에 집중
- 따뜻하고 다정한 어조로 이야기
- '~거든요', '~잖아요' 같은 친근한 종결어미 사용

## 역할
주어진 도구들을 사용해 주변 식당을 검색하고, 날씨와 과거 이력을 고려해서 3~5개 식당을 추천하세요.

## 추천 기준
1. 최근 3일 내 먹은 메뉴/카테고리는 제외
2. 날씨 반영 (비/추운 날 → 따뜻한 국물, 가까운 곳 우선)
3. 거리 500m 이내 우선
4. 카테고리 다양성 확보 (한식, 중식, 일식 등 섞기)

## 응답 형식
반드시 아래 JSON 형식으로 응답하세요:
{
  "recommendations": [
    {
      "place_name": "식당명",
      "place_id": "카카오 장소 ID",
      "category": "한식",
      "address": "주소",
      "latitude": 37.123,
      "longitude": 127.123,
      "distance": 300,
      "phone": "02-1234-5678",
      "place_url": "https://place.map.kakao.com/...",
      "ai_reason": "추천 이유 (2-3문장, 안성재 셰프 말투)",
      "ai_comment": "한마디 코멘트 (1문장, 안성재 셰프 말투)"
    }
  ],
  "overall_comment": "오늘의 전체 추천 코멘트 (안성재 셰프 말투)"
}`
```

**Step 2: AI Tool 정의**

`lib/ai/tools.ts`:
```typescript
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
      parameters: z.object({
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
          documents: data.documents.map((doc: any) => ({
            place_name: doc.place_name,
            place_id: doc.id,
            category: doc.category_name,
            address: doc.road_address_name || doc.address_name,
            latitude: parseFloat(doc.y),
            longitude: parseFloat(doc.x),
            distance: parseInt(doc.distance),
            phone: doc.phone,
            place_url: doc.place_url,
          })),
        }
      },
    }),

    get_weather: tool({
      description: '현재 날씨 정보를 가져옵니다',
      parameters: z.object({}),
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
      parameters: z.object({}),
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
          history: sessions.map((session: any) => {
            const winner = session.recommendations
              ?.sort((a: any, b: any) => (b.votes?.length ?? 0) - (a.votes?.length ?? 0))[0]

            return {
              date: session.created_at,
              winner_name: winner?.place_name ?? '미정',
              winner_category: winner?.category ?? '미정',
            }
          }),
        }
      },
    }),
  }
}
```

**Step 3: AI 추천 API 라우트**

`app/api/recommend/route.ts`:
```typescript
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
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
    model: anthropic('claude-sonnet-4-20250514'),
    system: CHEF_SYSTEM_PROMPT,
    tools,
    maxSteps: 5,
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
        parsed.recommendations.map((rec: any) => ({
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
```

**Step 4: 개발 서버에서 API 테스트**

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"roomId":"<room-id>","sessionId":"<session-id>"}'
```

AI 추천 응답이 JSON으로 반환되는지 확인.

**Step 5: 커밋**

```bash
git add lib/ai/ app/api/recommend/
git commit -m "feat: Claude Tool Use 기반 AI 추천 엔진 (안성재 셰프 스타일)"
```

---

## Task 8: 투표 UI + 실시간 동기화

**Files:**
- Modify: `components/vote-room.tsx`
- Create: `components/recommendation-card.tsx`
- Create: `components/vote-results.tsx`
- Create: `app/actions/vote.ts`

**Step 1: 투표 Server Actions**

`app/actions/vote.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function createVoteSession(roomId: string) {
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from('vote_sessions')
    .insert({
      room_id: roomId,
      status: 'recommending',
    })
    .select()
    .single()

  if (error) return { error: '투표 세션 생성 실패' }
  return { session }
}

export async function castVote(
  sessionId: string,
  recommendationId: string,
  participantId: string
) {
  const supabase = await createClient()

  // 기존 투표 삭제 (변경 투표 허용)
  await supabase
    .from('votes')
    .delete()
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)

  const { error } = await supabase.from('votes').insert({
    session_id: sessionId,
    recommendation_id: recommendationId,
    participant_id: participantId,
  })

  if (error) return { error: '투표 실패' }
  return { success: true }
}

export async function closeVoteSession(sessionId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vote_sessions')
    .update({ status: 'closed' })
    .eq('id', sessionId)

  if (error) return { error: '마감 실패' }
  return { success: true }
}
```

**Step 2: 추천 카드 컴포넌트**

`components/recommendation-card.tsx`:
```tsx
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
                📍 {recommendation.distance}m · {recommendation.address}
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
              {isVoted ? '✓ 투표' : '투표'}
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
```

**Step 3: VoteRoom 완성 (Supabase Realtime 포함)**

`components/vote-room.tsx` 전체 교체:
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
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
      let activeSession = session

      if (!activeSession) {
        const result = await createVoteSession(room.id)
        if (result.error || !result.session) {
          setLoading(false)
          return
        }
        activeSession = result.session
        setSession(activeSession)
      }

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, sessionId: activeSession.id }),
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
          {/* 초대 링크 복사 */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
            }}
          >
            🔗 초대 링크 복사
          </Button>
        </header>

        {/* 결과 (마감 시) */}
        {isClosed && winner && (
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-orange-600 mb-1">🏆 오늘의 점심</p>
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
            <p className="text-sm font-medium mb-1">👨‍🍳 셰프의 한마디</p>
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
            {loading ? '🤖 AI 셰프가 고민 중...' : '🍽️ AI 추천 받기'}
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
            🔒 투표 마감
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
            🔄 새 투표 시작
          </Button>
        )}
      </div>
    </main>
  )
}
```

**Step 4: 전체 흐름 테스트**

1. 방장: 투표방 생성 → AI 추천 받기 → 투표 → 마감
2. 팀원: 초대 링크 접속 → 닉네임 입력 → 투표
3. 실시간으로 투표 결과 반영되는지 확인

**Step 5: 커밋**

```bash
git add components/ app/actions/vote.ts
git commit -m "feat: 투표 UI + Supabase Realtime 실시간 동기화"
```

---

## Task 9: 투표 이력 페이지

**Files:**
- Create: `app/room/[code]/history/page.tsx`
- Create: `components/vote-history.tsx`

**Step 1: 이력 페이지 (서버 컴포넌트)**

`app/room/[code]/history/page.tsx`:
```tsx
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
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">📋 투표 이력</h1>
          <Link href={`/room/${code}`}>
            <Button variant="outline" size="sm">← 돌아가기</Button>
          </Link>
        </div>
        <VoteHistory sessions={sessions ?? []} />
      </div>
    </main>
  )
}
```

**Step 2: 이력 컴포넌트**

`components/vote-history.tsx`:
```tsx
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
                <Badge variant="outline">🏆 {winner?.place_name}</Badge>
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
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '}{' '}
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
```

**Step 3: 투표방에서 이력 페이지 링크 추가**

`components/vote-room.tsx`의 헤더 부분에 이력 링크 추가:
```tsx
// 초대 링크 복사 버튼 옆에 추가
<Link href={`/room/${room.invite_code}/history`}>
  <Button variant="ghost" size="sm">📋 이력</Button>
</Link>
```

상단에 import 추가: `import Link from 'next/link'`

**Step 4: 이력 페이지 확인**

`/room/<code>/history` 접속하여 과거 투표 결과가 표시되는지 확인.

**Step 5: 커밋**

```bash
git add app/room/*/history/ components/vote-history.tsx components/vote-room.tsx
git commit -m "feat: 투표 이력 페이지"
```

---

## Task 10: PWA 설정 및 최종 마무리

**Files:**
- Create: `public/manifest.json`
- Modify: `app/layout.tsx`
- Create: `app/not-found.tsx`

**Step 1: PWA manifest 생성**

`public/manifest.json`:
```json
{
  "name": "오늘 뭐 먹지?",
  "short_name": "점심투표",
  "description": "AI 셰프가 추천하고, 팀이 투표로 결정!",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fff7ed",
  "theme_color": "#f97316",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: layout.tsx에 manifest 링크 추가**

`app/layout.tsx`의 metadata에 추가:
```typescript
export const metadata: Metadata = {
  title: '오늘 뭐 먹지? - AI 점심 투표',
  description: 'AI 셰프가 추천하고, 팀이 투표로 결정!',
  manifest: '/manifest.json',
  themeColor: '#f97316',
}
```

**Step 3: 404 페이지**

`app/not-found.tsx`:
```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl mb-4">🍽️</h1>
        <h2 className="text-2xl font-bold mb-2">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-4">
          투표방 링크가 올바른지 확인해주세요
        </p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    </main>
  )
}
```

**Step 4: 빌드 확인**

```bash
npm run build
```

빌드 에러가 없는지 확인.

**Step 5: 최종 커밋**

```bash
git add public/manifest.json app/not-found.tsx app/layout.tsx
git commit -m "feat: PWA 설정 및 404 페이지"
```

---

## 체크리스트

- [ ] Task 1: 프로젝트 초기 설정 (Next.js + Tailwind + shadcn)
- [ ] Task 2: Supabase 데이터베이스 스키마 + 클라이언트
- [ ] Task 3: 타입 정의 및 유틸리티
- [ ] Task 4: 홈 페이지 - 투표방 생성
- [ ] Task 5: 카카오지도 통합 (위치 선택 + 뷰어)
- [ ] Task 6: 투표방 입장 페이지 (초대 링크 + 닉네임)
- [ ] Task 7: AI 추천 엔진 (Claude Tool Use + 안성재 스타일)
- [ ] Task 8: 투표 UI + Supabase Realtime
- [ ] Task 9: 투표 이력 페이지
- [ ] Task 10: PWA 설정 및 최종 마무리

## 환경변수 준비 체크리스트

- [ ] Supabase 프로젝트 생성 → URL, anon key
- [ ] Anthropic API 키 발급
- [ ] 카카오 개발자 앱 등록 → JS 키, REST API 키
- [ ] OpenWeatherMap API 키 발급
