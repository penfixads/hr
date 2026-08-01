-- Adds the loan_requests table to an already-live database. Idempotent — safe to paste
-- into the Supabase SQL Editor even if already applied. Same shape as
-- cash_advance_requests (see CATCHUP_cash_advance.sql + CATCHUP_cash_advance_approval.sql),
-- but for a regular loan repaid in installments: payment_per_payday is how much the
-- employee commits to paying back each payday, with a 500 floor.
create table if not exists loan_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  request_date date not null,
  amount numeric(10,2) not null check (amount > 0),
  payment_per_payday numeric(10,2) not null check (payment_per_payday >= 500),
  reason text,

  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  approved_by text,
  resolved_at timestamptz,
  reject_note text,

  submitted_at timestamptz default now()
);

alter table loan_requests enable row level security;

drop policy if exists "Allow public insert" on loan_requests;
create policy "Allow public insert" on loan_requests
  for insert to anon with check (true);

drop policy if exists "Allow public read" on loan_requests;
create policy "Allow public read" on loan_requests
  for select to anon using (true);
