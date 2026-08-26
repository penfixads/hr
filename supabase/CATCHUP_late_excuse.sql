-- Late Excuse Requests — an employee files a specific late-login date with a reason (e.g.
-- "motorbike broke down"); once Approved by an Admin, payroll excludes that date from the
-- Late Sanction Count ladder (GENERAL POLICY.docx's reprimand escalation) instead of an
-- admin having to manually lower a payslip's Late Sanction Count number by hand every
-- period. Same Pending/Approved/Rejected shape as cash_advance_requests/loan_requests —
-- requires approval before it counts, so an employee can't self-exempt just by filing any
-- reason (2026-08-27 decision, see components/RequestApprovalActions.tsx and
-- app/api/request-approval/route.ts, which this plugs into via the existing TABLES map).
create table if not exists late_excuse_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  late_date date not null,
  reason text not null,

  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  approved_by text,
  resolved_at timestamptz,
  reject_note text,

  submitted_at timestamptz default now()
);

alter table late_excuse_requests enable row level security;

create policy "Allow public insert" on late_excuse_requests
  for insert to anon with check (true);

create policy "Allow public read" on late_excuse_requests
  for select to anon using (true);
