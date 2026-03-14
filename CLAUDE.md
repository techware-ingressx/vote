# 점심식사 투표앱 - 오늘 뭐 먹지?

## 프로젝트 개요
AI(안성재 셰프 스타일)가 주변 식당을 추천하고, 팀원들이 실시간 투표로 점심을 결정하는 PWA 웹앱

## 기술 스택
- **프레임워크**: Next.js 16 (App Router, TypeScript, Turbopack)
- **UI**: Tailwind CSS v4 + shadcn/ui
- **DB/실시간**: Supabase (PostgreSQL + Realtime)
- **AI**: Vercel AI SDK v6 + OpenAI API (GPT-4o, Tool Use)
- **지도**: 카카오맵 JS SDK + 카카오 로컬 API
- **패키지 매니저**: npm

## 명령어
```bash
npm run dev       # 개발 서버 (Turbopack)
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
npx tsc --noEmit  # 타입 체크
```

## 환경변수
`.env.local`에 설정 필요 (`.env.local.example` 참조):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_KAKAO_JS_KEY` / `KAKAO_REST_API_KEY`

## 프로젝트 구조
```
app/
  page.tsx                    # 홈 (투표방 생성)
  layout.tsx                  # 루트 레이아웃 + 카카오맵 SDK
  not-found.tsx               # 404
  actions/
    room.ts                   # 투표방 생성 Server Action
    participant.ts            # 참여자 입장 Server Action
    vote.ts                   # 투표/마감 Server Actions
  api/recommend/route.ts      # AI 추천 API (OpenAI GPT-4o Tool Use)
  room/[code]/
    page.tsx                  # 투표방 메인
    history/page.tsx          # 투표 이력
components/
  create-room-form.tsx        # 투표방 생성 폼
  join-room-form.tsx          # 닉네임 입력 폼
  vote-room.tsx               # 투표방 메인 UI (Realtime)
  recommendation-card.tsx     # 추천 식당 카드
  vote-history.tsx            # 투표 이력 목록
  kakao-map.tsx               # 카카오맵 위치 선택 (방 생성용)
  kakao-map-viewer.tsx        # 카카오맵 뷰어 (핀 표시용)
  ui/                         # shadcn/ui 컴포넌트
lib/
  types.ts                    # 타입 정의
  ai/
    system-prompt.ts          # 안성재 셰프 시스템 프롬프트
    tools.ts                  # AI Tool 정의 (식당검색/이력)
  supabase/
    client.ts                 # 브라우저 클라이언트
    server.ts                 # 서버 클라이언트
  utils/
    invite-code.ts            # 초대 코드 생성 (nanoid)
supabase/
  schema.sql                  # DB 스키마 (Supabase SQL Editor에서 실행)
```

## DB 스키마
5개 테이블: `rooms`, `participants`, `vote_sessions`, `recommendations`, `votes`
- RLS 활성화 (anon 전체 허용 — 인증 없는 앱)
- Realtime: `votes`, `vote_sessions`, `recommendations` 테이블

## 주요 흐름
1. 방장: 투표방 생성 → 카카오지도로 위치 설정 → 초대 링크 공유
2. 팀원: 링크 클릭 → 닉네임 입력 → 입장
3. 방장: "AI 추천 받기" → GPT-4o가 식당검색+이력 종합 → 3~5개 추천
4. 팀원: 투표 (Supabase Realtime 실시간 반영)
5. 방장: 마감 → 결과 공개

## 설계 문서
- `docs/plans/2026-03-14-lunch-vote-design.md` — 설계 문서 (승인됨)
- `docs/plans/2026-03-14-lunch-vote-plan.md` — 구현 계획

## 현재 상태
- 코드 구현 완료, 빌드 통과
- 환경변수 설정 + Supabase 스키마 적용 + 로컬 테스트 + 배포 필요
