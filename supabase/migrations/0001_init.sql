-- Construction-AI MVP schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) for project nmufxelukboqamknwvpd.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Projects: one row per byggeplads/typehusprojekt
-- ─────────────────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text,
  camera_label text,          -- friendly name of the camera on this site, e.g. "Kamera 1 - Indkørsel"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Plan milestones: the project's actual, real tidsplan — what
-- trade is expected on site, in which window, with how many people.
-- This is what the AI's observations get compared against.
-- ─────────────────────────────────────────────────────────────
create table if not exists plan_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  trade text not null,                 -- e.g. "Maler", "Tømrer", "VVS"
  expected_start date not null,
  expected_end date not null,
  expected_workers int not null default 1,
  rate_payment_dkk numeric,            -- optional: size of the rate/aconto tied to this milestone
  notes text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Snapshots: one row per image received from the camera
-- ─────────────────────────────────────────────────────────────
create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  storage_path text not null,          -- path inside the "snapshots" storage bucket
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Observations: the AI's structured read of a snapshot.
-- Deliberately NO name/identity fields — headcount + trade only.
-- ─────────────────────────────────────────────────────────────
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references snapshots (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  trades_detected text[] not null default '{}',
  person_count int not null default 0,
  confidence numeric not null default 0,   -- 0.0 - 1.0
  matches_plan boolean,                    -- null until compared against a milestone
  raw_model_output jsonb,
  reviewed boolean not null default false,
  reviewer_verdict text,                   -- 'confirmed' | 'rejected' | null
  created_at timestamptz not null default now()
);

create index if not exists idx_plan_milestones_project on plan_milestones (project_id);
create index if not exists idx_snapshots_project on snapshots (project_id, captured_at);
create index if not exists idx_observations_project on observations (project_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: a bygherre only ever sees their own projects
-- and everything hanging off them. The ingest API route uses the
-- service role key and bypasses RLS entirely (it runs server-side,
-- authenticated with a shared secret, not a logged-in user).
-- ─────────────────────────────────────────────────────────────
alter table projects enable row level security;
alter table plan_milestones enable row level security;
alter table snapshots enable row level security;
alter table observations enable row level security;

create policy "owner can manage own projects" on projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owner can manage own plan_milestones" on plan_milestones
  for all using (
    exists (select 1 from projects p where p.id = plan_milestones.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = plan_milestones.project_id and p.owner_id = auth.uid())
  );

create policy "owner can read own snapshots" on snapshots
  for select using (
    exists (select 1 from projects p where p.id = snapshots.project_id and p.owner_id = auth.uid())
  );

create policy "owner can manage own observations" on observations
  for all using (
    exists (select 1 from projects p where p.id = observations.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = observations.project_id and p.owner_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Storage bucket for the raw snapshot images
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('snapshots', 'snapshots', false)
on conflict (id) do nothing;

create policy "owner can read own snapshot images" on storage.objects
  for select using (
    bucket_id = 'snapshots'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1]
      and p.owner_id = auth.uid()
    )
  );
