-- =====================================================
-- MAGI BUDGET · SUPABASE SCHEMA
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- =====================================================

-- Drop if re-running (safe, only drops your tables)
drop table if exists public.income cascade;
drop table if exists public.expenses cascade;
drop table if exists public.savings cascade;
drop table if exists public.goals cascade;

-- ===== INCOME =====
create table public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label text not null,
  amount numeric(10,2) not null check (amount > 0),
  type text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ===== EXPENSES =====
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label text not null,
  amount numeric(10,2) not null check (amount > 0),
  category text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ===== SAVINGS TRANSFERS =====
create table public.savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ===== GOAL (one row per user, upsertable) =====
create table public.goals (
  user_id uuid primary key references auth.users,
  savings_goal numeric(10,2) default 0 check (savings_goal >= 0),
  updated_at timestamptz default now()
);

-- ===== INDEXES =====
create index income_user_date_idx on public.income(user_id, date desc);
create index expenses_user_date_idx on public.expenses(user_id, date desc);
create index savings_user_date_idx on public.savings(user_id, date desc);

-- ===== ROW-LEVEL SECURITY =====
-- Locks every row to its owner. Without this, anyone with the
-- anon key could read everyone's data. DO NOT SKIP.
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.savings enable row level security;
alter table public.goals enable row level security;

create policy "own_income"   on public.income   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_expenses" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_savings"  on public.savings  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_goals"    on public.goals    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================
-- FUTURE: SHARING (don't run this now, keep for later)
-- =====================================================
-- create table public.collaborators (
--   owner_id uuid references auth.users not null,
--   guest_id uuid references auth.users not null,
--   created_at timestamptz default now(),
--   primary key (owner_id, guest_id)
-- );
-- Then update RLS policies to also allow guests via this join table.
