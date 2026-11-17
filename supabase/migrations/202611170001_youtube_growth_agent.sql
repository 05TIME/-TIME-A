-- TIMEŒ YouTube Growth Agent initial schema
create extension if not exists pgcrypto;

create table if not exists public.youtube_channels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  channel_id text not null,
  handle text not null default '@theafricanrecordtv',
  channel_title text,
  channel_url text not null default 'https://youtube.com/@theafricanrecordtv',
  timezone text not null default 'Africa/Lagos',
  connection_status text not null default 'PENDING' check (connection_status in ('PENDING','CONNECTED','REVOKED','ERROR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, channel_id)
);

-- Store only encrypted token material here; never expose this table to browser roles.
create table if not exists public.youtube_oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null unique references public.youtube_channels(id) on delete cascade,
  encrypted_refresh_token text not null,
  granted_scopes text[] not null default '{}',
  token_key_version text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.youtube_content_ideas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  channel_id uuid references public.youtube_channels(id) on delete set null,
  pillar text not null,
  topic text not null,
  audience_promise text,
  research jsonb not null default '[]'::jsonb,
  score numeric(4,2),
  status text not null default 'IDEA',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.youtube_content_packages (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.youtube_content_ideas(id) on delete cascade,
  version integer not null default 1,
  format text not null check (format in ('SHORT','LONG','LIVE','PODCAST')),
  script text,
  title_variants jsonb not null default '[]'::jsonb,
  description text,
  thumbnail_brief text,
  tags text[] not null default '{}',
  asset_refs jsonb not null default '[]'::jsonb,
  editorial_checks jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  unique (idea_id, version)
);

create table if not exists public.youtube_content_approvals (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.youtube_content_packages(id) on delete cascade,
  package_version integer not null,
  action text not null check (action in ('CONTENT_APPROVAL','PUBLISH_APPROVAL','COMMENT_REPLY_APPROVAL')),
  decision text not null check (decision in ('APPROVED','REJECTED')),
  approver_id uuid not null references auth.users(id),
  notes text,
  decided_at timestamptz not null default now()
);

create table if not exists public.youtube_publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.youtube_content_packages(id) on delete cascade,
  channel_id uuid not null references public.youtube_channels(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  scheduled_at timestamptz,
  youtube_video_id text,
  status text not null default 'DRAFT' check (status in ('DRAFT','UPLOADED_PRIVATE','SCHEDULED','PUBLISHED','FAILED')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.youtube_community_items (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.youtube_channels(id) on delete cascade,
  youtube_comment_id text not null unique,
  youtube_video_id text,
  comment_text text not null,
  classification text,
  reply_draft text,
  approval_status text not null default 'PENDING',
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.youtube_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.youtube_channels(id) on delete cascade,
  youtube_video_id text,
  captured_at timestamptz not null default now(),
  impressions bigint,
  ctr numeric(8,5),
  views bigint,
  watch_time_minutes numeric(14,2),
  average_view_duration_seconds numeric(12,2),
  average_percentage_viewed numeric(8,5),
  subscribers_gained bigint,
  returning_viewer_share numeric(8,5),
  source_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.youtube_agent_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  source text not null,
  external_event_id text not null unique,
  event_type text not null,
  occurred_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists youtube_ideas_business_created_idx on public.youtube_content_ideas(business_id, created_at desc);
create index if not exists youtube_packages_idea_version_idx on public.youtube_content_packages(idea_id, version desc);
create index if not exists youtube_jobs_status_schedule_idx on public.youtube_publishing_jobs(status, scheduled_at);
create index if not exists youtube_analytics_channel_captured_idx on public.youtube_analytics_snapshots(channel_id, captured_at desc);

alter table public.youtube_channels enable row level security;
alter table public.youtube_oauth_credentials enable row level security;
alter table public.youtube_content_ideas enable row level security;
alter table public.youtube_content_packages enable row level security;
alter table public.youtube_content_approvals enable row level security;
alter table public.youtube_publishing_jobs enable row level security;
alter table public.youtube_community_items enable row level security;
alter table public.youtube_analytics_snapshots enable row level security;
alter table public.youtube_agent_events enable row level security;

-- Read access is scoped to authenticated TIMEŒ business members.
do $$
declare t text;
begin
  foreach t in array array['youtube_channels','youtube_content_ideas','youtube_content_packages','youtube_content_approvals','youtube_publishing_jobs','youtube_community_items','youtube_analytics_snapshots','youtube_agent_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_member_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (exists (select 1 from public.memberships m where m.business_id = %I.business_id and m.user_id = auth.uid()))', t || '_member_read', t, t);
  end loop;
end $$;

-- OAuth credentials intentionally have no authenticated policy: service-role server code only.
