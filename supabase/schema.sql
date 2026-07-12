-- GameHub schema. Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 24),
  role text not null default 'player' check (role in ('player', 'admin')),
  games_played int not null default 0,
  games_won int not null default 0,
  total_points int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  created_at timestamptz not null default now()
);

-- Display names are unique case-insensitively ("Blaze" and "blaze" are the same name).
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- Auto-create a profile on signup; the very first user becomes admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'player_' || left(new.id::text, 6)),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'player' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent players from promoting themselves to admin.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    if (select role from public.profiles where id = auth.uid()) <> 'admin' then
      raise exception 'Only admins can change roles';
    end if;
  end if;
  return new;
end $$;

create trigger protect_role before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ============ GAMES ============
-- Every game is a row. type drives which engine the UI uses:
--   quiz   = question + multiple choice options (Doctor Dash, Riddle Rush, Emoji Movie Guess, Movie Trivia)
--   prompt = a prompt with 2 reaction choices, optional timer (Never Have I Ever, Would You Rather, Truth or Dare, 2-Minute Challenge)
--   memory = matching-pairs board (Memory Match)
--   guess  = number guess battle (no prompts needed)
create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  emoji text not null default '🎮',
  type text not null check (type in ('quiz', 'prompt', 'memory', 'guess', 'predict', 'code', 'rule', 'chain')),
  -- type-specific settings, e.g. prompt games: {"choices":["I Have","Never"],"timerSeconds":0}
  -- memory: {"themes":{"Love":[["❤️","Heart"],...]}} ; guess: {"min":1,"max":100}
  config jsonb not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

-- ============ PROMPTS ============
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'hard')),
  -- quiz:   {"question":"...","answer":"...","options":[...],"fact":"...","emoji":"🦁👑","hint":"..."}
  -- prompt: {"text":"...","category":"Funny"}
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index prompts_game_difficulty_idx on public.prompts (game_id, difficulty);

-- ============ ROOMS ============
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id),
  difficulty text not null default 'mixed' check (difficulty in ('easy', 'hard', 'mixed')),
  mode text not null default 'classic' check (mode in ('classic', 'spotlight')),
  is_public boolean not null default false,
  answer_seconds int check (answer_seconds is null or answer_seconds between 5 and 120),
  total_rounds int not null default 10 check (total_rounds between 1 and 100),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  current_round int not null default 0,     -- 0-based index into prompt_ids
  turn_player_id uuid,                      -- whose turn (prompt/memory/guess games)
  prompt_ids uuid[] not null default '{}',  -- shuffled prompt order, fixed at start
  round_state jsonb not null default '{}',  -- per-game shared state (memory board, guess history...)
  round_phase text not null default 'answering' check (round_phase in ('answering', 'revealed')),
  winner_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index rooms_code_idx on public.rooms (code);
create index rooms_browser_idx on public.rooms (is_public, status, created_at desc);

-- Secrets clients must never read (number-guess target). No select policy on purpose.
create table public.room_secrets (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  secret jsonb not null
);

create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  score int not null default 0,
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, profile_id)
);
create index room_players_room_idx on public.room_players (room_id);

create table public.round_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_index int not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  answer jsonb not null,
  is_correct boolean,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, round_index, profile_id)
);
create index round_answers_room_round_idx on public.round_answers (room_id, round_index);

-- ============ HISTORY / META ============
create table public.match_history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  score int not null default 0,
  won boolean not null default false,
  played_at timestamptz not null default now()
);
create index match_history_profile_idx on public.match_history (profile_id, played_at desc);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  emoji text not null default '🏆'
);

create table public.profile_achievements (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.prompts enable row level security;
alter table public.rooms enable row level security;
alter table public.room_secrets enable row level security;
alter table public.room_players enable row level security;
alter table public.round_answers enable row level security;
alter table public.match_history enable row level security;
alter table public.achievements enable row level security;
alter table public.profile_achievements enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

-- profiles: readable by everyone (leaderboard), self-editable
create policy "profiles readable" on public.profiles for select using (true);
create policy "profiles self update" on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- games: readable by all, writable by admin
create policy "games readable" on public.games for select using (true);
create policy "games admin write" on public.games for all
  using (public.is_admin()) with check (public.is_admin());

-- prompts: readable by signed-in users, writable by admin
create policy "prompts readable" on public.prompts for select using (auth.uid() is not null);
create policy "prompts admin write" on public.prompts for all
  using (public.is_admin()) with check (public.is_admin());

-- rooms / players / answers: readable by signed-in users (needed for realtime + code lookup).
-- All writes go through server API routes using the service role, so no write policies here.
create policy "rooms readable" on public.rooms for select using (auth.uid() is not null);
create policy "room_players readable" on public.room_players for select using (auth.uid() is not null);
create policy "round_answers readable" on public.round_answers for select using (auth.uid() is not null);
-- room_secrets: NO policies at all -> only the service role can touch it.

create policy "match_history readable" on public.match_history for select using (true);
create policy "achievements readable" on public.achievements for select using (true);
create policy "profile_achievements readable" on public.profile_achievements for select using (true);

-- ============ REALTIME ============
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.round_answers;

-- ============ SEED: ACHIEVEMENTS ============
insert into public.achievements (slug, name, description, emoji) values
  ('first-game', 'First Steps', 'Play your first game', '👶'),
  ('first-win', 'Winner Winner', 'Win your first game', '🥇'),
  ('five-wins', 'On a Roll', 'Win 5 games', '🎯'),
  ('streak-3', 'Hat Trick', 'Win 3 games in a row', '🔥'),
  ('perfect-game', 'Flawless', 'Get every answer right in a game', '💎'),
  ('night-owl', 'Marathon', 'Play 10 games', '🌙'),
  ('social', 'Party Starter', 'Host a room with 3+ players', '🎉');

-- ============ SEED: GAMES ============
insert into public.games (slug, name, description, emoji, type, config, sort_order) values
  ('doctor-dash', 'Doctor Dash', 'Hospital, liver and human-body trivia. See who has the sharper medical brain.', '🩺', 'quiz', '{"showFact": true}', 10),
  ('riddle-rush', 'Riddle Rush', 'Hard riddles under pressure. Survive the brain strain.', '🧠', 'quiz', '{}', 20),
  ('emoji-movie', 'Emoji Movie Guess', 'Guess the movie from emojis. Hints included for the stuck.', '🎬', 'quiz', '{"emojiQuestion": true, "showHint": true}', 30),
  ('movie-trivia', 'Movie Trivia', 'Classic movie knowledge, from blockbusters to cult favourites.', '🍿', 'quiz', '{}', 40),
  ('never-have-i-ever', 'Never Have I Ever', 'Clean, couple-friendly confessions. The app counts your "I Have"s.', '🙈', 'prompt', '{"choices": ["I Have", "Never"], "countLabel": "I Have"}', 50),
  ('would-you-rather', 'Would You Rather', 'Impossible choices. Pick a side and defend it.', '🤔', 'prompt', '{"choices": ["Option A", "Option B"], "optionsFromContent": true}', 60),
  ('truth-or-dare', 'Truth or Dare', 'Answer honestly or do the dare. Completed = 1 point.', '😈', 'prompt', '{"choices": ["Completed", "Skipped"], "scoreChoice": "Completed"}', 70),
  ('two-minute-challenge', '2-Minute Challenge', 'Quick random challenges with a timer. Complete them to score.', '⏱️', 'prompt', '{"choices": ["Completed", "Failed"], "scoreChoice": "Completed", "timerSeconds": 120}', 80),
  ('memory-match', 'Memory Match', 'Flip cards and find pairs. Match to keep your turn.', '🃏', 'memory', '{"pairs": 8, "themes": {"Love": [["❤️","Heart"],["🌹","Rose"],["💍","Ring"],["💌","Love Letter"],["🧸","Teddy"],["🍫","Chocolate"],["🎁","Gift"],["🕯️","Candle"],["🥰","Smile"],["💐","Bouquet"],["🌙","Moon"],["⭐","Star"],["🎶","Music"],["🍓","Strawberry"],["☕","Coffee"],["🍿","Movie"],["📸","Photo"],["🫶","Hands"],["✨","Sparkle"],["🏖️","Beach"]], "Food": [["🍕","Pizza"],["🍔","Burger"],["🍟","Fries"],["🌮","Taco"],["🍣","Sushi"],["🍩","Donut"],["🍰","Cake"],["🍦","Ice Cream"],["🍗","Chicken"],["🥞","Pancakes"],["🍝","Pasta"],["🥗","Salad"],["🍪","Cookie"],["🍜","Noodles"],["🥐","Croissant"],["🍇","Grapes"],["🍉","Watermelon"],["🍌","Banana"],["🥭","Mango"],["☕","Coffee"]], "Animals": [["🐶","Dog"],["🐱","Cat"],["🦁","Lion"],["🐯","Tiger"],["🐵","Monkey"],["🐼","Panda"],["🐸","Frog"],["🦊","Fox"],["🐻","Bear"],["🐰","Rabbit"],["🐨","Koala"],["🐷","Pig"],["🐮","Cow"],["🐔","Chicken"],["🐧","Penguin"],["🦋","Butterfly"],["🐢","Turtle"],["🐬","Dolphin"],["🦓","Zebra"],["🦒","Giraffe"]], "Movie Night": [["🎬","Movie"],["🍿","Popcorn"],["🎟️","Ticket"],["📽️","Projector"],["🎭","Drama"],["🦸","Hero"],["🧙","Wizard"],["👻","Ghost"],["🤖","Robot"],["👽","Alien"],["🦖","Dinosaur"],["🏴‍☠️","Pirate"],["👑","King"],["🕵️","Detective"],["🚀","Space"],["🔥","Action"],["❤️","Romance"],["😂","Comedy"],["😱","Horror"],["🏆","Award"]]}}', 90),
  ('number-guess', 'Number Guess Battle', 'A secret number between 1 and 100. Take turns; fewest guesses wins.', '🔢', 'guess', '{"min": 1, "max": 100}', 100),
  ('mystery-card', 'Mystery Card', 'A hidden living or non-living thing is described — identify it before the timer runs out.', '🕵️', 'quiz', '{}', 110),
  ('reverse-definition', 'Reverse Definition', 'Ordinary words described in strange, indirect ways. Decode the definition first.', '🔎', 'quiz', '{}', 120),
  ('mental-math-duel', 'Mental Math', 'Generated arithmetic, sequences and powers. The fastest brains take the round.', '⚡', 'quiz', '{}', 130),
  ('know-your-partner', 'Know Your Partner', 'Answer privately, then see how accurately your partner predicts your choices. Roles alternate.', '💞', 'predict', '{}', 140),
  ('who-remembers', 'Who Remembers It Better?', 'Both partners answer the same memory question privately — matching answers score for you both.', '📸', 'predict', '{"freeText": true}', 150),
  ('code-crackers', 'Code Crackers', 'Take turns testing a secret digit code. Exact and misplaced clues — first to crack it scores.', '🔐', 'code', '{"maxTurns": 18}', 160),
  ('rule-discoverer', 'Rule Discoverer', 'A secret word or number rule. Test examples, study the evidence, identify it first.', '🧩', 'rule', '{}', 170),
  ('word-chain', 'Word Association Chain', 'Keep the chain alive — repeats are blocked and weak connections can be challenged to a vote.', '🔗', 'chain', '{"starters": ["ocean","music","school","fire","dream","coffee","moon","travel","garden","money","movie","family","summer","phone","rain"]}', 180);
-- Their prompts are loaded by: npx tsx scripts/seed-online-ports.ts (or npm run seed:online)
