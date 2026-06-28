-- Penfix HR Portal — Supabase Schema
-- Run this in the Supabase SQL editor

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),

  -- Personal Info
  full_name text not null,
  employee_number text not null,
  nickname text,
  date_of_birth date,
  position text not null,
  department text not null,
  employment_status text not null,
  date_joined date,
  address text not null,
  mobile text not null,
  telephone text,
  email text not null,

  -- Government Numbers
  sss_number text,
  pagibig_number text,
  philhealth_number text,

  -- Emergency Contact
  emergency_name text not null,
  emergency_relationship text not null,
  emergency_mobile text not null,
  emergency_alt text,

  -- Team
  team text not null check (team in ('creative', 'production')),

  -- Skill Ratings (JSON: { "skill name": 1-5 })
  skills_self_rating jsonb default '{}',
  skills_boss_rating jsonb default null,

  submitted_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table employees enable row level security;

-- Allow anyone to insert (employees submit without login)
create policy "Allow public insert" on employees
  for insert to anon with check (true);

-- Allow anyone to read (admin dashboard reads via anon key — secure via password)
create policy "Allow public read" on employees
  for select to anon using (true);

-- Allow updates (for boss ratings via API)
create policy "Allow public update" on employees
  for update to anon using (true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger employees_updated_at
  before update on employees
  for each row execute function update_updated_at();
