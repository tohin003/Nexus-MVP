-- NEXUS real-user phase 1 schema (idempotent)
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  username text not null unique,
  name text not null,
  city text not null default '',
  avatar text not null default '',
  roles text[] not null default '{}',
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  needs text[] not null default '{}',
  availability text not null default 'flexible',
  experience text not null default 'beginner',
  privacy jsonb not null default '{"discoverable":true,"whoCanMessage":"anyone","showCity":true,"showInLocalSuggestions":true}'::jsonb,
  is_admin boolean not null default false,
  is_demo boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz
);

create table if not exists intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  original_text text not null,
  title text not null,
  details text not null default '',
  interpretation jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','matched','completed','archived')),
  visibility text not null default 'public' check (visibility in ('public','private')),
  expires_at timestamptz,
  interested_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists intents_user_idx on intents (user_id, created_at desc);
create index if not exists intents_public_idx on intents (status, created_at desc) where visibility = 'public';

create table if not exists intent_interest (
  intent_id uuid not null references intents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (intent_id, user_id)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('share','ask','collaborate','teach','challenge','meet')),
  title text not null,
  body text not null,
  photo_url text,
  tags text[] not null default '{}',
  circle_id uuid,
  structured jsonb,
  created_at timestamptz not null default now()
);
create index if not exists posts_feed_idx on posts (created_at desc);

create table if not exists post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  reaction text not null check (reaction in ('useful','interesting','lets-do-it','support')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null check (length(body) <= 3000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_idx on post_comments (post_id, created_at);

create table if not exists post_help (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  photo_url text not null,
  caption text not null default '' check (length(caption) <= 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists stories_expiry_idx on stories (expires_at);

create table if not exists story_views (
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table if not exists circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose text not null,
  emoji text not null default '◎',
  description text not null default '',
  category text not null default 'Creative',
  privacy text not null default 'open' check (privacy in ('open','invite','closed')),
  city text,
  member_limit int not null default 20 check (member_limit between 2 and 500),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table if not exists circle_members (
  circle_id uuid not null references circles(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table if not exists connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references users(id) on delete cascade,
  to_user uuid not null references users(id) on delete cascade,
  why text not null,
  status text not null default 'pending' check (status in ('pending','connected','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user <> to_user),
  unique (from_user, to_user, status)
);

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  a_user uuid not null references users(id) on delete cascade,
  b_user uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (a_user < b_user),
  unique (a_user, b_user)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  a_user uuid not null references users(id) on delete cascade,
  b_user uuid not null references users(id) on delete cascade,
  connection_id uuid references connections(id) on delete set null,
  created_at timestamptz not null default now(),
  check (a_user < b_user),
  unique (a_user, b_user)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null check (length(body) <= 5000),
  kind text not null default 'text',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, created_at);

create table if not exists blocks (
  user_id uuid not null references users(id) on delete cascade,
  blocked_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create table if not exists mutes (
  user_id uuid not null references users(id) on delete cascade,
  muted_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_user_id),
  check (user_id <> muted_user_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  actor_user_id uuid references users(id) on delete set null,
  body text not null,
  meta jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  target_kind text not null check (target_kind in ('user','post','message','intent')),
  target_id uuid not null,
  target_label text not null default '',
  reason text not null check (length(reason) <= 200),
  detail text not null default '' check (length(detail) <= 5000),
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  action text not null default 'none' check (action in ('none','dismissed','warned','suspended')),
  action_note text,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on reports (status, created_at);
