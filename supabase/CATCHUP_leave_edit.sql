-- Leave self-edit — run this once against the project (Supabase SQL editor), same as the
-- other CATCHUP_*.sql files here.
--
-- Employees kept filing a one-day leave as a two-day range (e.g. "Aug 31 - Sep 1" meaning
-- Aug 31 only), which silently burns a second credit and exempts a day they actually
-- worked from the absent-day count. There is no approval workflow on leave_requests to
-- reopen, so the fix is letting the employee correct their own filing from MyHR
-- (app/api/leave-edit/route.ts).
--
-- edited_at records that a filing was changed AFTER it was submitted; submitted_at stays
-- the original filing time, because that is what the 3-days-notice / 3-days-after-return
-- policy checks are measured from (filed_late is recomputed against submitted_at, never
-- against the edit time — otherwise editing a typo could erase a genuine late flag).
alter table leave_requests add column if not exists edited_at timestamptz;

-- No RLS policy is added on purpose. The edit goes through the service-role key in the
-- API route, which resolves the employee from their Penfix OS session and scopes the
-- update to their own employee_id. A public update policy here would let anyone holding
-- the (public, browser-shipped) anon key rewrite anybody's leave.
