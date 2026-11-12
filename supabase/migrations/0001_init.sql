-- Escape the Compiler — schema
--
-- Four tables, one event at a time. Run this in the Supabase SQL editor, or
-- with `supabase db push` if you use the CLI.
--
-- Row Level Security is ON with no policies on purpose: the browser never
-- talks to the database. Only the backend, using the service_role key,
-- reads and writes. A leaked anon key can therefore read nothing.

create extension if not exists pgcrypto;

-- ── events ────────────────────────────────────────────────────────────────

create table if not exists public.events (
    id             uuid primary key default gen_random_uuid(),
    slug           text not null unique,
    name           text not null,
    passcode_hash  text not null,
    total_seconds  integer not null default 5400 check (total_seconds > 0),
    room_seconds   integer not null default 900 check (room_seconds > 0),
    starts_at      timestamptz,
    ends_at        timestamptz,
    is_active      boolean not null default true,
    created_at     timestamptz not null default now()
);

-- ── teams ─────────────────────────────────────────────────────────────────

create table if not exists public.teams (
    id             uuid primary key default gen_random_uuid(),
    event_id       uuid not null references public.events (id) on delete cascade,
    code           text not null,
    name           text not null,
    pin_hash       text,
    members        text[] not null default '{}',
    started_at     timestamptz,
    finished_at    timestamptz,
    escaped        boolean not null default false,
    status         text not null default 'racing'
                   check (status in ('racing', 'escaped', 'expired')),
    final_attempts integer not null default 0,
    created_at     timestamptz not null default now(),
    unique (event_id, code)
);

create index if not exists teams_event_status_idx on public.teams (event_id, status);

-- ── progress ──────────────────────────────────────────────────────────────
-- One row per (team, room). A missing row means the room was never opened.

create table if not exists public.room_progress (
    team_id    uuid not null references public.teams (id) on delete cascade,
    room_id    text not null,
    opened_at  timestamptz,
    solved_at  timestamptz,
    hints_used integer not null default 0 check (hints_used >= 0),
    timed_out  boolean not null default false,
    primary key (team_id, room_id)
);

create index if not exists room_progress_team_idx on public.room_progress (team_id);

-- ── submissions ───────────────────────────────────────────────────────────
-- Every test run, kept for the organizer console and post-event review.

create table if not exists public.submissions (
    id           bigint generated always as identity primary key,
    team_id      uuid not null references public.teams (id) on delete cascade,
    room_id      text not null,
    code         text not null,
    passed       boolean not null,
    tests_passed integer not null,
    tests_total  integer not null,
    error        text,
    created_at   timestamptz not null default now()
);

create index if not exists submissions_team_room_idx
    on public.submissions (team_id, room_id, created_at desc);

create index if not exists submissions_created_idx
    on public.submissions (created_at desc);

-- ── access control ────────────────────────────────────────────────────────

alter table public.events        enable row level security;
alter table public.teams         enable row level security;
alter table public.room_progress enable row level security;
alter table public.submissions   enable row level security;

-- No policies are created. `anon` and `authenticated` can do nothing.
-- `service_role` bypasses RLS, and that key only exists on the server.
