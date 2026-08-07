-- Applicant screening: a biodata form sent to applicants as a one-off invite link,
-- filled in without any login, and reviewed by HR from /admin/applicants.
--
-- SECURITY NOTE — this deliberately breaks from the "Allow public insert/read" pattern
-- used by every other table in this schema. Those policies grant the anon role, whose key
-- ships inside the public JavaScript bundle, full read access. That is acceptable for an
-- overtime request; it is not for applicant biodata (home city, mobile, salary history,
-- expected salary). So these three tables enable RLS and define NO anon policies at all:
-- the anon role can neither read nor write them. Every access goes through the server
-- using the service-role key, after the request's invite token has been validated
-- (lib/applicants-server.ts). The token is the applicant's only credential — no account
-- is created for them, and nothing is added to the shared Penfix OS `users` table.

-- Invites: one row per link HR generates. The token IS the URL segment, so it must stay
-- unguessable — hence a uuid rather than anything sequential.
create table if not exists applicant_invites (
  token uuid primary key default gen_random_uuid(),
  label text not null,                 -- who HR sent it to, e.g. "Juan dela Cruz - designer"
  created_by text not null,            -- admin email from getAdminSession()
  created_at timestamptz not null default now(),
  expires_at timestamptz,              -- null = never expires
  used_at timestamptz                  -- set on submit; a used invite cannot be reused
);

create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  invite_token uuid not null references applicant_invites(token),

  -- Personal
  full_name text not null,
  nickname text,
  date_of_birth date,
  mobile text not null,
  email text not null,
  city text not null,

  -- Applying for
  position_applied text not null,
  team text not null check (team in ('creative', 'production')),
  -- Expected salary is a RANGE (min/max); past salary on each experience row is a single
  -- figure, since that one is a fact rather than a negotiating position.
  expected_salary_min numeric(12,2) not null,
  expected_salary_max numeric(12,2) not null,
  expected_salary_basis text not null check (expected_salary_basis in ('Monthly', 'Daily')),
  earliest_start_date date,
  heard_about_us text,

  -- Skills
  skills text[] not null default '{}',
  software text[] not null default '{}',
  years_experience numeric(4,1),

  -- Education
  highest_education text,
  school text,
  course text,
  year_graduated int,

  -- Expectations
  expectations text,                   -- what the applicant wants from Penfix
  portfolio_url text,
  notes text,

  -- HR workflow
  status text not null default 'New' check (status in ('New', 'Shortlisted', 'Rejected', 'Hired')),
  submitted_at timestamptz not null default now(),

  constraint applicants_salary_range_valid check (expected_salary_max >= expected_salary_min)
);

create index if not exists applicants_status_idx on applicants (status, submitted_at desc);

-- Added after the table was first created on staging: `create table if not exists` is a
-- no-op on an existing table, so a new column needs its own ALTER for this file to be
-- correct both on a fresh database and on one created from an earlier version of it.
alter table applicants add column if not exists expectations text;

-- Employment AND freelance/OJT history in one table, distinguished by experience_type,
-- rather than separate tables that would carry identical columns.
create table if not exists applicant_experience (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  experience_type text not null check (experience_type in ('Employment', 'Freelance', 'Internship/OJT')),
  company text not null,
  position text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  salary_rate numeric(12,2),
  salary_basis text check (salary_basis in ('Monthly', 'Daily')),
  reason_for_leaving text,
  sort_order int not null default 0
);

create index if not exists applicant_experience_applicant_idx
  on applicant_experience (applicant_id, sort_order);

-- RLS on, no policies: denies the anon and authenticated roles outright. The service-role
-- key used by the server bypasses RLS by design, which is the only intended access path.
alter table applicant_invites enable row level security;
alter table applicants enable row level security;
alter table applicant_experience enable row level security;
