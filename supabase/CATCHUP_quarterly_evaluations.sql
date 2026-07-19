-- Adds the quarterly_evaluations table to an already-live database. Idempotent — safe to
-- paste into the Supabase SQL Editor even if already applied.
create table if not exists quarterly_evaluations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  team text not null check (team in ('creative', 'production')),
  quarter text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  year integer not null,

  ratings jsonb not null default '{}',
  total integer not null default 0,
  percentage numeric(5,2) not null default 0,

  submitted_at timestamptz default now(),

  unique (employee_id, quarter, year)
);

alter table quarterly_evaluations enable row level security;

drop policy if exists "Allow public insert" on quarterly_evaluations;
create policy "Allow public insert" on quarterly_evaluations
  for insert to anon with check (true);

drop policy if exists "Allow public read" on quarterly_evaluations;
create policy "Allow public read" on quarterly_evaluations
  for select to anon using (true);
