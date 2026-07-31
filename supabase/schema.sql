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

-- Quarterly Evaluations — Penfix's "15-Point Quarterly Evaluation" self-rated by the
-- employee each quarter (see lib/fifteenPoint.ts for the actual criteria, transcribed from
-- the manual Evaluation 2026.xlsx sheets). One row per employee per quarter, so history
-- accumulates instead of a single evaluation getting overwritten each time.
create table if not exists quarterly_evaluations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  team text not null check (team in ('creative', 'production')),
  quarter text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  year integer not null,

  -- Ratings (JSON: { "qualification text": 1-10 })
  ratings jsonb not null default '{}',
  total integer not null default 0,
  percentage numeric(5,2) not null default 0,

  submitted_at timestamptz default now(),

  unique (employee_id, quarter, year)
);

alter table quarterly_evaluations enable row level security;

create policy "Allow public insert" on quarterly_evaluations
  for insert to anon with check (true);

create policy "Allow public read" on quarterly_evaluations
  for select to anon using (true);

-- Cash Advance Requests — rebuilds the legacy "PENFIX CASH ADVANCE FORM" Google Form
-- (Name, Date, Amount — all required) as a proper table tied to employees instead of
-- a free-text name.
create table if not exists cash_advance_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  request_date date not null,
  amount numeric(10,2) not null check (amount > 0),

  submitted_at timestamptz default now()
);

alter table cash_advance_requests enable row level security;

create policy "Allow public insert" on cash_advance_requests
  for insert to anon with check (true);

create policy "Allow public read" on cash_advance_requests
  for select to anon using (true);

-- Overtime — filed_late is computed client-side at submission time: true when submitted
-- more than 3 days after ot_date, per GENERAL POLICY.docx ("Filing of overtime must be
-- within 3 days after the time rendered for overtime, else it would not be considered paid").
create table if not exists overtime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  ot_date date not null,
  start_time time not null,
  end_time time not null,
  reason text not null,
  filed_late boolean not null default false,

  submitted_at timestamptz default now()
);

alter table overtime_requests enable row level security;

create policy "Allow public insert" on overtime_requests
  for insert to anon with check (true);

create policy "Allow public read" on overtime_requests
  for select to anon using (true);

-- Leave — days_requested is inclusive (end_date - start_date + 1). filed_late means:
-- Vacation Leave filed with fewer than 3 days' notice before start_date, or Sick Leave
-- filed more than 3 days after end_date, per GENERAL POLICY.docx.
create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  team text not null check (team in ('creative', 'production')),
  leave_type text not null check (leave_type in ('Sick Leave', 'Vacation Leave')),
  start_date date not null,
  end_date date not null,
  reason text,
  days_requested integer not null check (days_requested > 0),
  filed_late boolean not null default false,

  submitted_at timestamptz default now(),

  check (end_date >= start_date)
);

alter table leave_requests enable row level security;

create policy "Allow public insert" on leave_requests
  for insert to anon with check (true);

create policy "Allow public read" on leave_requests
  for select to anon using (true);

-- Undertime — no policy-driven validation rules specified for this one (unlike
-- Overtime/Leave), so it's a plain log, same shape as the legacy form.
create table if not exists undertime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  undertime_date date not null,
  time_in time,
  time_out time,
  reason text not null,

  submitted_at timestamptz default now()
);

alter table undertime_requests enable row level security;

create policy "Allow public insert" on undertime_requests
  for insert to anon with check (true);

create policy "Allow public read" on undertime_requests
  for select to anon using (true);
