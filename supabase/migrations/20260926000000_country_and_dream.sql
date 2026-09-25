-- Optional "dream destination" per response, and a country on each
-- destination (all India for now) for the country -> city picker.
alter table public.destinations
  add column if not exists country text not null default 'India';

alter table public.responses
  add column if not exists dream_destination text references public.destinations(id);

create index if not exists responses_dream_destination_idx on public.responses(dream_destination);
