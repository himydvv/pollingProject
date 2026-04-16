create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 10 and 160),
  description text,
  share_code text not null unique check (share_code = upper(share_code)),
  status text not null default 'active' check (status in ('active', 'closed', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  position integer not null check (position >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (poll_id, position)
);

create table if not exists public.poll_results (
  poll_id uuid primary key references public.polls(id) on delete cascade,
  final_status text not null check (final_status in ('closed', 'expired')),
  total_votes integer not null default 0 check (total_votes >= 0),
  winner_option_id uuid references public.poll_options(id) on delete set null,
  finished_at timestamptz not null,
  results_json jsonb not null default '[]'::jsonb
);

create index if not exists idx_polls_share_code on public.polls (share_code);
create index if not exists idx_polls_owner_created_at on public.polls (owner_id, created_at desc);
create index if not exists idx_poll_options_poll_position on public.poll_options (poll_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_polls_set_updated_at on public.polls;
create trigger trg_polls_set_updated_at
before update on public.polls
for each row
execute function public.set_updated_at();

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_results enable row level security;

drop policy if exists "Public read polls" on public.polls;
create policy "Public read polls"
on public.polls
for select
using (true);

drop policy if exists "Public read poll options" on public.poll_options;
create policy "Public read poll options"
on public.poll_options
for select
using (true);

drop policy if exists "Public read poll results" on public.poll_results;
create policy "Public read poll results"
on public.poll_results
for select
using (true);

create or replace function public.create_poll_with_options(
  p_owner_id uuid,
  p_question text,
  p_description text,
  p_share_code text,
  p_expires_at timestamptz,
  p_option_labels text[]
)
returns table (poll_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll_id uuid;
  v_option_label text;
  v_position integer := 0;
  v_option_count integer := coalesce(array_length(p_option_labels, 1), 0);
begin
  if p_owner_id is null then
    raise exception 'owner_id is required';
  end if;

  if char_length(trim(coalesce(p_question, ''))) < 10 then
    raise exception 'question must be at least 10 characters';
  end if;

  if v_option_count < 2 or v_option_count > 6 then
    raise exception 'option count must be between 2 and 6';
  end if;

  if p_expires_at <= timezone('utc', now()) then
    raise exception 'expires_at must be in the future';
  end if;

  insert into public.polls (
    owner_id,
    question,
    description,
    share_code,
    status,
    expires_at
  )
  values (
    p_owner_id,
    trim(p_question),
    nullif(trim(coalesce(p_description, '')), ''),
    upper(trim(p_share_code)),
    'active',
    p_expires_at
  )
  returning id into v_poll_id;

  foreach v_option_label in array p_option_labels loop
    if char_length(trim(coalesce(v_option_label, ''))) = 0 then
      raise exception 'option labels must not be empty';
    end if;

    insert into public.poll_options (
      poll_id,
      label,
      position
    )
    values (
      v_poll_id,
      trim(v_option_label),
      v_position
    );

    v_position := v_position + 1;
  end loop;

  return query select v_poll_id;
end;
$$;

revoke all on function public.create_poll_with_options(uuid, text, text, text, timestamptz, text[]) from public;
grant execute on function public.create_poll_with_options(uuid, text, text, text, timestamptz, text[]) to authenticated;
