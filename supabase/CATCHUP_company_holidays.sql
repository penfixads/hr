-- Admin-editable Philippine holidays, so a proclamation that moves a date (e.g. a
-- movable Islamic holiday only announced weeks ahead) or declares a new special
-- non-working day doesn't require a code change + redeploy — an Admin can add/remove
-- it straight from the Holidays calendar (app/admin/holidays, app/admin dashboard).
-- Idempotent — safe to paste into the Supabase SQL Editor even if already applied.
--
-- NOTE: lib/ph-holidays.ts's PH_HOLIDAYS constant (used by lib/payday.ts to shift payday
-- off a holiday, and lib/attendance-shared.ts to exclude holidays from Absent Days) is NOT
-- wired to this table yet — it still reads the hardcoded list. This table only drives the
-- Holidays calendar display for now. If an Admin moves/adds a holiday here that should also
-- affect payday-shifting or Absent Days, lib/ph-holidays.ts needs the matching manual edit.
create table if not exists company_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  type text not null check (type in ('regular', 'special')),
  created_at timestamptz default now()
);

alter table company_holidays enable row level security;

-- Same access model as the rest of this app: no RLS-level admin check (the anon key is
-- shared by every client), access is enforced by middleware.ts gating /admin/* to the
-- Admin role — see the comment on getEmployeeRecords in lib/employee-records.ts.
drop policy if exists "Allow public read" on company_holidays;
create policy "Allow public read" on company_holidays
  for select to anon using (true);

drop policy if exists "Allow public insert" on company_holidays;
create policy "Allow public insert" on company_holidays
  for insert to anon with check (true);

drop policy if exists "Allow public delete" on company_holidays;
create policy "Allow public delete" on company_holidays
  for delete to anon using (true);

-- Seed with the same 2026 entries already shipped in lib/ph-holidays.ts, so the calendar
-- has data immediately instead of starting empty.
insert into company_holidays (holiday_date, name, type) values
  ('2026-01-01', 'New Year''s Day', 'regular'),
  ('2026-02-17', 'Chinese New Year', 'special'),
  ('2026-04-02', 'Maundy Thursday', 'regular'),
  ('2026-04-03', 'Good Friday', 'regular'),
  ('2026-04-04', 'Black Saturday', 'special'),
  ('2026-04-09', 'Araw ng Kagitingan', 'regular'),
  ('2026-05-01', 'Labor Day', 'regular'),
  ('2026-06-12', 'Independence Day', 'regular'),
  ('2026-08-21', 'Ninoy Aquino Day', 'special'),
  ('2026-08-31', 'National Heroes Day', 'regular'),
  ('2026-11-01', 'All Saints'' Day', 'special'),
  ('2026-11-02', 'All Souls'' Day', 'special'),
  ('2026-11-30', 'Bonifacio Day', 'regular'),
  ('2026-12-08', 'Feast of the Immaculate Conception', 'special'),
  ('2026-12-24', 'Christmas Eve', 'special'),
  ('2026-12-25', 'Christmas Day', 'regular'),
  ('2026-12-30', 'Rizal Day', 'regular'),
  ('2026-12-31', 'Last Day of the Year', 'special')
on conflict (holiday_date) do nothing;
