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
