-- Adds overtime_requests, leave_requests, undertime_requests to an already-live database.
-- Idempotent — safe to paste into the Supabase SQL Editor even if already applied.
-- Rebuilds the 3 remaining legacy Google Forms (Overtime, Leave, Undertime — see
-- hr_forms_schema memory / conversation for the original field lists).

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

drop policy if exists "Allow public insert" on overtime_requests;
create policy "Allow public insert" on overtime_requests
  for insert to anon with check (true);

drop policy if exists "Allow public read" on overtime_requests;
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

drop policy if exists "Allow public insert" on leave_requests;
create policy "Allow public insert" on leave_requests
  for insert to anon with check (true);

drop policy if exists "Allow public read" on leave_requests;
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

drop policy if exists "Allow public insert" on undertime_requests;
create policy "Allow public insert" on undertime_requests
  for insert to anon with check (true);

drop policy if exists "Allow public read" on undertime_requests;
create policy "Allow public read" on undertime_requests
  for select to anon using (true);
