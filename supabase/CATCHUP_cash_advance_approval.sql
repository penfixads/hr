-- Adds a reason field and an approval workflow to cash_advance_requests — per
-- GENERAL POLICY.docx, cash advances are effectively "emergency loans," which
-- already require management approval before release. Mirrors the exact pattern
-- used in penfixads-OS's Pending Approval page (migration 005_credit_line_request.sql
-- + historical_unlock_requests): a status column with Pending/Approved/Rejected,
-- plus who resolved it and when. Idempotent — safe to run even if already applied.
alter table cash_advance_requests add column if not exists reason text;

alter table cash_advance_requests add column if not exists status text not null default 'Pending'
  check (status in ('Pending', 'Approved', 'Rejected'));
alter table cash_advance_requests add column if not exists approved_by text;
alter table cash_advance_requests add column if not exists resolved_at timestamptz;
alter table cash_advance_requests add column if not exists reject_note text;
