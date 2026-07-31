-- Adds the cash_advance_requests table to an already-live database. Idempotent — safe to
-- paste into the Supabase SQL Editor even if already applied. Rebuilds the legacy
-- "PENFIX CASH ADVANCE FORM" Google Form (Name, Date, Amount — all required) as a proper
-- table tied to the employees table instead of a free-text name.
create table if not exists cash_advance_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  request_date date not null,
  amount numeric(10,2) not null check (amount > 0),

  submitted_at timestamptz default now()
);

alter table cash_advance_requests enable row level security;

drop policy if exists "Allow public insert" on cash_advance_requests;
create policy "Allow public insert" on cash_advance_requests
  for insert to anon with check (true);

drop policy if exists "Allow public read" on cash_advance_requests;
create policy "Allow public read" on cash_advance_requests
  for select to anon using (true);
