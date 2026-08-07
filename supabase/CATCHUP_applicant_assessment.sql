-- Penfix psychological assessment: the exam an applicant sits AFTER the biodata screening
-- form, sent as its own one-off invite link and reviewed by HR from /admin/assessments.
--
-- Rebuilt from the Google Form "PENFIX PSYCHOLOGICAL ASSESSMENT EXAM For Applicant:
-- Graphic Artist / Client Frontliner / Sales Encoder", with three changes the form could
-- not do: per-role branching, server-side auto-scoring, and an HR-only rubric.
--
-- SECURITY NOTE — same posture as CATCHUP_applicant_screening.sql, and for the same
-- reason: these rows hold an outsider's answers to integrity questions plus their
-- contact details. RLS is enabled with NO policies, so anon (whose key ships in the
-- public bundle) can neither read nor write. Every access goes through the server with
-- the service-role key after the invite token has been validated
-- (lib/assessment-server.ts). Scores in particular must never be readable by the
-- applicant — the answer keys live server-side and the results page is admin-only.

-- ---------------------------------------------------------------------------
-- Invites: reuse applicant_invites rather than a parallel table, so HR has one place
-- that lists every link it has ever issued. `kind` distinguishes the two flows.
-- ---------------------------------------------------------------------------

-- Existing rows predate this column and are all screening links, hence the default.
alter table applicant_invites
  add column if not exists kind text not null default 'screening';

-- Added separately from the column itself: `add column if not exists` is a no-op on an
-- existing column, so a database created before this file would otherwise never get the
-- constraint. Dropped first so re-running this file is safe.
alter table applicant_invites drop constraint if exists applicant_invites_kind_valid;
alter table applicant_invites
  add constraint applicant_invites_kind_valid check (kind in ('screening', 'assessment'));

-- The role being tested. HR picks it when generating the link rather than letting the
-- applicant choose, so nobody can self-select into the shorter module. Null for
-- screening invites, required for assessment ones.
alter table applicant_invites
  add column if not exists role text;

alter table applicant_invites drop constraint if exists applicant_invites_role_valid;
alter table applicant_invites
  add constraint applicant_invites_role_valid check (
    (kind = 'screening' and role is null)
    or (kind = 'assessment' and role in ('Graphic Artist', 'Client Frontliner', 'Sales Encoder'))
  );

-- Optional back-link to the biodata submission, set when HR generates the exam link from
-- an existing applicant row. Nullable because an exam can also be sent standalone (e.g. a
-- walk-in who filled the biodata on paper).
alter table applicant_invites
  add column if not exists applicant_id uuid references applicants(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Submissions
-- ---------------------------------------------------------------------------

create table if not exists applicant_assessments (
  id uuid primary key default gen_random_uuid(),
  invite_token uuid not null references applicant_invites(token),
  applicant_id uuid references applicants(id) on delete set null,

  -- Re-collected on the exam itself even when applicant_id is set: the exam may be sent
  -- standalone, and HR wants the answers to identify themselves without a join.
  full_name text not null,
  email text not null,
  phone text not null,

  role text not null check (role in ('Graphic Artist', 'Client Frontliner', 'Sales Encoder')),

  -- One object keyed by question id: { "s1_deadline": "Focus completely…", … }. Stored as
  -- jsonb rather than ~60 columns because the question bank is expected to keep changing
  -- (lib/assessment.ts is the source of truth), and a schema migration per reworded
  -- question would be untenable. Essays and the values ranking live in here too.
  answers jsonb not null default '{}'::jsonb,

  -- Auto-score, computed server-side at submit time from the answer keys. Stored rather
  -- than recomputed on read so a later edit to the question bank cannot silently restate
  -- what a past applicant scored.
  auto_score int not null default 0,
  auto_max int not null default 0,
  -- Question ids whose chosen answer is a documented integrity/effort concern. Surfaced
  -- to the reviewer instead of hard-failing the applicant, per the build spec.
  flags text[] not null default '{}',
  -- Snapshot of which question ids were actually asked, so a reviewer reading an old
  -- submission can tell "not asked" apart from "left blank".
  asked_ids text[] not null default '{}',

  -- HR rubric over the essays (Honesty, Composure, Self-awareness, Culture fit, Growth
  -- orientation), each 1-5. Null until a reviewer scores it.
  rubric jsonb,
  reviewer_notes text,
  reviewed_by text,
  reviewed_at timestamptz,

  submitted_at timestamptz not null default now()
);

create index if not exists applicant_assessments_submitted_idx
  on applicant_assessments (submitted_at desc);
create index if not exists applicant_assessments_applicant_idx
  on applicant_assessments (applicant_id);

-- RLS on, no policies: denies anon and authenticated outright. The service-role key used
-- by the server bypasses RLS by design, which is the only intended access path.
alter table applicant_assessments enable row level security;
