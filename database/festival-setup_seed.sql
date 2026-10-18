-- ============================================================
-- FESTIVAL TREASURE HUNTS
-- ============================================================
-- A hunt is live between its start and end dates (Singapore time). The player captures words from
-- the event's list; each find pays points = the word's stroke count, as coins and XP. Finding every
-- word pays the event's bonus once. The words themselves are in database/festival_seed.sql.

create table if not exists festival_events (
  id          text primary key,                          -- e.g. 'halloween', 'cny2027'
  language    varchar(10) not null default 'zh' check (language in ('zh', 'ms', 'ta')),
  name        text not null,                             -- English name
  name_native text not null default '',                  -- name in the language (shown beside it)
  blurb       text not null default '',
  icon        text not null default 'pumpkin',           -- pumpkin | lantern | boat | moon
  starts_on   date not null,
  ends_on     date not null,
  bonus       integer not null default 50 check (bonus >= 0),   -- coins and XP for finding every word
  check (ends_on >= starts_on)
);

create table if not exists festival_words (
  event_id text not null references festival_events (id) on delete cascade,
  word     text not null,
  pinyin   text not null default '',
  meaning  text not null,
  chars    jsonb not null default '[]'::jsonb,           -- [{ "c": "南", "py": "nán", "m": "south", "s": 9 }, ...]
  strokes  integer not null check (strokes > 0),         -- total strokes = the points for finding it
  sort     integer not null default 0,
  primary key (event_id, word)
);

create table if not exists festival_finds (
  user_id  uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  word     text not null,
  points   integer not null,
  found_at timestamptz not null default now(),
  primary key (user_id, event_id, word),
  foreign key (event_id, word) references festival_words (event_id, word) on delete cascade
);

create table if not exists festival_spotted (
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_id   text not null,
  word       text not null,
  spotted_at timestamptz not null default now(),
  primary key (user_id, event_id, word),
  foreign key (event_id, word) references festival_words (event_id, word) on delete cascade
);
-- A word is "spotted" when its photo passed the check. It is only "found" (festival_finds, points paid)
-- once the player also gives its Chinese word. Spotted rows are written by the festival-verify function only.

alter table festival_events enable row level security;
alter table festival_words  enable row level security;
alter table festival_finds  enable row level security;
alter table festival_spotted enable row level security;

drop policy if exists "festival events readable" on festival_events;
drop policy if exists "festival words readable"  on festival_words;
drop policy if exists "festival finds select own" on festival_finds;
drop policy if exists "festival spotted select own" on festival_spotted;
create policy "festival events readable" on festival_events for select to authenticated using (true);
create policy "festival words readable"  on festival_words  for select to authenticated using (true);
create policy "festival finds select own" on festival_finds for select to authenticated using (auth.uid() = user_id);
create policy "festival spotted select own" on festival_spotted for select to authenticated using (auth.uid() = user_id);
-- there is no insert policy on festival_finds: finds are only made by festival_claim() below, which checks the dates and the word list.

-- festival_claim(user, event, words): the festival-verify Edge Function calls this AFTER Claude has checked a photo.
-- Players cannot call it themselves (only the service role can), so a word can only be claimed with a photo.
-- Returns what was new and what it paid:  { found: [{ word, points }], points, bonus, total_found, total_words }
drop function if exists festival_claim(text, text[]);
create or replace function festival_claim(p_user uuid, p_event text, p_words text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare ev festival_events%rowtype;
        today date;
        w record;
        finds jsonb := '[]'::jsonb;
        pts integer := 0;
        bonus_paid integer := 0;
        paid integer;
        n_before integer; n_after integer; n_total integer;
        inserted integer;
begin
  if p_user is null then raise exception 'no user'; end if;
  select * into ev from festival_events where id = p_event;
  if not found then raise exception 'unknown event'; end if;
  today := (now() at time zone 'Asia/Singapore')::date;
  if today < ev.starts_on or today > ev.ends_on then raise exception 'event is not live'; end if;
  if coalesce(array_length(p_words, 1), 0) > 60 then raise exception 'too many words'; end if;

  select count(*) into n_total  from festival_words where event_id = p_event;
  select count(*) into n_before from festival_finds  where user_id = p_user and event_id = p_event;

  for w in select fw.word, fw.strokes from festival_words fw
            where fw.event_id = p_event and fw.word = any (coalesce(p_words, '{}'::text[])) order by fw.sort loop
    insert into festival_finds (user_id, event_id, word, points) values (p_user, p_event, w.word, w.strokes)
    on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
      finds := finds || jsonb_build_array(jsonb_build_object('word', w.word, 'points', w.strokes));
      pts := pts + w.strokes;
    end if;
  end loop;

  select count(*) into n_after from festival_finds where user_id = p_user and event_id = p_event;
  if n_total > 0 and n_before < n_total and n_after >= n_total then bonus_paid := ev.bonus; end if;

  paid := least(pts + bonus_paid, 500);   -- same cap as add_rewards; paid as XP and as island coins for the event's language
  if paid > 0 then
    update profiles set xp = xp + paid where user_id = p_user;
    insert into island_progress (user_id, language, coins) values (p_user, ev.language, paid)
    on conflict (user_id, language) do update set coins = island_progress.coins + paid;
  end if;
  return jsonb_build_object('found', finds, 'points', pts, 'bonus', bonus_paid, 'total_found', n_after, 'total_words', n_total);
end $$;
revoke all on function festival_claim(uuid, text, text[]) from public, anon, authenticated;
grant execute on function festival_claim(uuid, text, text[]) to service_role;