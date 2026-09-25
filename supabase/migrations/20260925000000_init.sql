-- Group Trip Decider schema.
-- All access goes through Next.js server routes using the service role key.
-- RLS is enabled on every table with NO policies, so the anon/authenticated
-- keys can't read or write anything directly.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Destination catalog ------------------------------------------------------
create table public.destinations (
  id          text primary key,
  name        text not null,
  state       text not null,
  types       text[] not null check (types <@ array['beach','hills','city','adventure']::text[] and cardinality(types) > 0),
  cost_min    integer not null check (cost_min > 0),
  cost_max    integer not null,
  best_months smallint[] not null,
  -- { "Bengaluru": { "hours": 6, "flight": false }, ... }
  travel      jsonb not null,
  has_treks   boolean not null default false,
  blurb       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (cost_max >= cost_min)
);

-- Trips ----------------------------------------------------------------------
create table public.trips (
  id                     text primary key,           -- short random id used in URLs
  name                   text not null check (char_length(name) between 1 and 80),
  window_start           date not null,
  window_end             date not null,
  trip_length            integer not null check (trip_length between 1 and 14),
  deadline               timestamptz not null,
  organizer_key_hash     text not null,              -- sha256 of the organizer key
  is_demo                boolean not null default false,
  decided_destination_id text references public.destinations(id),
  decided_start          date,
  decided_end            date,
  decided_at             timestamptz,
  explanations           jsonb,                      -- cached AI explainer output
  explanations_key       text,                       -- hash of the results it explains
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (window_end >= window_start),
  check (window_end - window_start <= 90)
);

-- Participants (named by the organizer; token issued on first submit) ------
create table public.participants (
  id          uuid primary key default gen_random_uuid(),
  trip_id     text not null references public.trips(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  position    integer not null,
  token_hash  text unique,                           -- sha256 of the personal edit token
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (trip_id, name)
);
create index participants_trip_id_idx on public.participants(trip_id);

-- Responses (one per participant) ------------------------------------------
create table public.responses (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null unique references public.participants(id) on delete cascade,
  trip_id         text not null references public.trips(id) on delete cascade,
  home_city       text not null,
  available_dates date[] not null,
  max_budget      integer not null check (max_budget between 1000 and 500000),
  type_ranking    text[] not null check (type_ranking <@ array['beach','hills','city','adventure']::text[]),
  dealbreakers    text[] not null default '{}' check (dealbreakers <@ array['flights','long_travel','treks']::text[]),
  wont_go         text[] not null default '{}',
  note            text check (char_length(note) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index responses_trip_id_idx on public.responses(trip_id);

-- Votes (one per participant, changeable until the decision is locked) -----
create table public.votes (
  id              uuid primary key default gen_random_uuid(),
  trip_id         text not null references public.trips(id) on delete cascade,
  participant_id  uuid not null unique references public.participants(id) on delete cascade,
  destination_id  text not null references public.destinations(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index votes_trip_id_idx on public.votes(trip_id);
create index votes_destination_id_idx on public.votes(destination_id);
create index trips_decided_destination_id_idx on public.trips(decided_destination_id);

-- updated_at triggers --------------------------------------------------------
create trigger destinations_updated_at before update on public.destinations for each row execute function public.set_updated_at();
create trigger trips_updated_at        before update on public.trips        for each row execute function public.set_updated_at();
create trigger participants_updated_at before update on public.participants for each row execute function public.set_updated_at();
create trigger responses_updated_at    before update on public.responses    for each row execute function public.set_updated_at();
create trigger votes_updated_at        before update on public.votes        for each row execute function public.set_updated_at();

-- Row level security: on, with no public policies ---------------------------
alter table public.destinations enable row level security;
alter table public.trips        enable row level security;
alter table public.participants enable row level security;
alter table public.responses    enable row level security;
alter table public.votes        enable row level security;
