-- Clutter standalone MVP schema
-- Keep this database separate from TIMEŒ production data.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('seller','agent','manager','admin','buyer')),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id),
  assigned_agent_id uuid references public.profiles(id),
  title text not null,
  category text not null,
  description text,
  condition text,
  location text,
  seller_asking_price numeric(12,2),
  proposed_buy_price numeric(12,2),
  approved_buy_price numeric(12,2),
  resale_price numeric(12,2),
  status text not null default 'submitted' check (status in ('submitted','needs_media','under_review','approved','purchased','listed','reserved','sold','rejected')),
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('photo','video')),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  type text not null check (type in ('purchase','sale','expense')),
  amount numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.item_media enable row level security;
alter table public.transactions enable row level security;

-- Starter policies: authenticated staff can operate the MVP.
create policy "authenticated profiles read" on public.profiles for select to authenticated using (true);
create policy "authenticated items read" on public.items for select to authenticated using (true);
create policy "authenticated items insert" on public.items for insert to authenticated with check (true);
create policy "authenticated items update" on public.items for update to authenticated using (true) with check (true);
create policy "authenticated media read" on public.item_media for select to authenticated using (true);
create policy "authenticated media insert" on public.item_media for insert to authenticated with check (true);
create policy "authenticated transactions read" on public.transactions for select to authenticated using (true);
create policy "authenticated transactions insert" on public.transactions for insert to authenticated with check (true);
