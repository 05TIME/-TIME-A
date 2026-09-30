-- Clutter standalone Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'seller' check (role in ('seller','agent','manager','admin','buyer')),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id),
  assigned_agent_id uuid references public.profiles(id),
  title text not null,
  category text not null,
  description text default '',
  condition text default '',
  location text default '',
  seller_asking_price numeric(12,2),
  proposed_buy_price numeric(12,2),
  approved_buy_price numeric(12,2),
  resale_price numeric(12,2),
  status text not null default 'submitted'
    check (status in ('submitted','needs_media','under_review','approved','purchased','listed','reserved','sold','rejected')),
  verification_notes text default '',
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
  item_id uuid not null references public.items(id) on delete cascade,
  type text not null check (type in ('purchase','sale','expense')),
  amount numeric(12,2) not null check (amount >= 0),
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.item_media enable row level security;
alter table public.transactions enable row level security;

-- Seller owns their submissions; authenticated staff can operate workflow.
create policy "seller creates own item" on public.items for insert to authenticated
with check ((select auth.uid()) = seller_id);

create policy "seller reads own items" on public.items for select to authenticated
using ((select auth.uid()) = seller_id);

create policy "staff reads items" on public.items for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')));

create policy "staff updates items" on public.items for update to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')));

create policy "users read own profile" on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "staff reads profiles" on public.profiles for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')));

create policy "item media read by staff" on public.item_media for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')));

create policy "item media insert by staff" on public.item_media for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')));

create policy "staff reads transactions" on public.transactions for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')));

create policy "staff creates transactions" on public.transactions for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('agent','manager','admin')));

-- Storage bucket setup should be created in the Supabase Storage UI/API:
-- bucket: clutter-media (private)
