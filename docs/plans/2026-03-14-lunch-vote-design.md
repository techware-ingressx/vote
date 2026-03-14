# 점심식사 투표앱 설계 문서

> 작성일: 2026-03-14
> 상태: 승인됨

## 개요

회사 팀/부서(5~20명)가 매일 점심 메뉴를 AI 추천 기반으로 투표하여 결정하는 PWA 웹앱.
안성재 셰프 스타일의 AI가 주변 식당을 추천하고, 팀원들이 실시간 투표로 결정한다.

## 핵심 사용자 흐름

```
방장: 투표방 생성 → 위치 설정 (카카오지도) → 초대 링크 공유
팀원: 링크 클릭 → 닉네임 입력 → 투표방 입장
방장: "AI 추천 받기" 클릭
  → Claude API가 과거 이력 + 날씨 + 카카오 로컬 API 종합
  → 지도 위에 3~5개 식당 핀 표시 + 추천 이유 카드
팀원: 1인 1표 투표 (실시간 반영)
마감 → 결과 공개 + AI 한마디 코멘트 + 지도에 당선 식당 표시
```

## 접근 방식

**A. AI 추천 중심형** 선택

- AI가 매일 자동으로 후보 메뉴 생성 (과거 이력 + 날씨 + 주변 식당)
- 팀원은 투표만 하면 됨 → 최소 인터랙션
- MVP로 핵심 가치 검증 후 확장 가능

## 기술 스택

| 영역 | 기술 | 이유 |
|------|------|------|
| 프론트엔드 | Next.js 15 App Router + Tailwind CSS + shadcn/ui | 빠른 UI 개발 |
| 지도 | 카카오맵 JS SDK + 카카오 로컬 API | 국내 식당 데이터 최적 |
| 백엔드 | Next.js Server Actions | 별도 서버 불필요 |
| DB/실시간 | Supabase (PostgreSQL + Realtime) | 실시간 투표 동기화 |
| AI | Vercel AI SDK + Claude API | 추천 엔진 |
| 날씨 | OpenWeatherMap API | 무료 티어 충분 |
| 배포 | Vercel | Next.js 최적 배포 |

## 인증 방식

- 로그인 없음, 초대 링크 + 닉네임 입력으로 입장
- 방장만 투표방 생성 및 AI 추천 요청 가능

## 데이터 모델

```sql
-- 투표방
rooms
  id          uuid (PK)
  name        text           -- "개발팀 점심"
  invite_code text (unique)  -- 초대 링크용 짧은 코드
  latitude    float          -- 회사 위치 (카카오지도)
  longitude   float
  address     text           -- 주소 텍스트
  created_by  text           -- 방장 닉네임
  created_at  timestamptz

-- 참여자
participants
  id          uuid (PK)
  room_id     uuid (FK → rooms)
  nickname    text
  joined_at   timestamptz

-- 투표 세션 (매일 새로 생성)
vote_sessions
  id          uuid (PK)
  room_id     uuid (FK → rooms)
  status      text           -- 'recommending' | 'voting' | 'closed'
  deadline    timestamptz    -- 마감 시간
  created_at  timestamptz

-- AI 추천 식당
recommendations
  id             uuid (PK)
  session_id     uuid (FK → vote_sessions)
  place_name     text        -- 식당명
  place_id       text        -- 카카오 장소 ID
  category       text        -- "한식", "중식" 등
  address        text
  latitude       float
  longitude      float
  distance       int         -- 미터
  ai_reason      text        -- AI 추천 이유
  ai_comment     text        -- AI 한마디

-- 투표
votes
  id               uuid (PK)
  session_id       uuid (FK → vote_sessions)
  recommendation_id uuid (FK → recommendations)
  participant_id   uuid (FK → participants)
  voted_at         timestamptz
  UNIQUE(session_id, participant_id)  -- 1인 1표
```

## AI 추천 로직

### 페르소나: 안성재 셰프 스타일

Claude API에 안성재 셰프 스타일의 시스템 프롬프트를 적용:
- 식재료와 조리법에 대한 전문적 코멘트
- 따뜻하고 다정한 어조
- 음식의 본질에 집중하는 철학적 관점
- '~거든요', '~잖아요' 같은 친근한 종결어미

### Tool Use 구성

1. **search_restaurants**: 카카오 로컬 API로 주변 식당 검색
2. **get_weather**: 날씨 API 호출
3. **get_vote_history**: Supabase에서 최근 투표 이력 조회

### 추천 기준

- 최근 3일 내 먹은 메뉴 제외
- 날씨 반영 (비오면 가까운 곳 우선)
- 거리 500m 이내 우선
- 카테고리 다양성 확보

### AI 코멘트 예시

- "비 오는 날엔 뜨끈한 국물이 몸을 감싸주잖아요. 이 순두부집은 간수 없는 두부를 직접 만드는 곳이거든요."
- "이번 주 한식이 세 번이었죠? 오늘은 쌀국수 어떠세요. 좋은 쌀국수는 육수에서 결정되거든요."
- "가성비도 중요하지만, 결국 좋은 재료가 좋은 음식을 만들잖아요. 여기 정식이 8천 원인데, 제철 나물을 직접 다듬어 쓰는 곳이에요."

## 주요 페이지

1. **홈** (`/`) - 투표방 생성
2. **투표방** (`/room/[code]`) - 카카오지도 + AI 추천 + 투표 UI
3. **결과** - 투표 결과 + 당선 식당 지도 표시
4. **이력** - 과거 투표 기록
