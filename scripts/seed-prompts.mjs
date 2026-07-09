/**
 * Seeds the prompts table from the original GameHub HTML games + new authored content.
 *
 * Usage:
 *   1. Put NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   2. Optionally set SOURCE_HTML_DIR to the folder holding the original .html games
 *      (defaults to the parent folder of this repo).
 *   3. node scripts/seed-prompts.mjs
 *
 * Safe to re-run: it wipes and re-inserts prompts per game.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// ---------- env ----------
const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// ---------- html extraction ----------
const SRC_CANDIDATES = [
  process.env.SOURCE_HTML_DIR,
  path.join(process.cwd(), '..', 'web Games'),
  path.join(process.cwd(), '..', '..', 'web Games'),
  path.join(process.cwd(), '..'),
  path.join(process.cwd(), 'original-games'),
].filter(Boolean);
const SRC =
  SRC_CANDIDATES.find((d) => existsSync(path.join(d, 'doctor_dash_quiz_app.html'))) ||
  SRC_CANDIDATES[0];

function fixMojibake(s) {
  // Files saved as UTF-8 but read as Latin-1 show as "ð¦ð". Round-trip repairs it.
  if (!/[ÃðÂâ][-¿]/.test(s)) return s;
  try {
    const repaired = Buffer.from(s, 'latin1').toString('utf8');
    return repaired.includes('�') ? s : repaired;
  } catch {
    return s;
  }
}

function extractArray(file, varName) {
  const p = path.join(SRC, file);
  if (!existsSync(p)) {
    console.warn(`  ! ${file} not found in ${SRC} — skipping (set SOURCE_HTML_DIR to fix)`);
    return null;
  }
  let html = readFileSync(p, 'utf8');
  html = fixMojibake(html);
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = html.match(re);
  if (!m) {
    console.warn(`  ! could not find ${varName} in ${file}`);
    return null;
  }
  // The arrays in the source files are JSON-compatible.
  return JSON.parse(m[1]);
}

// ---------- difficulty heuristics ----------
const HARD_MEDICAL = /alveol|atria|ventricle|larynx|villi|patella|cerebellum|thyroid|spleen|tendon|ligament|aorta|13%|marrow|diaphragm|esophagus|trachea|enamel/i;
const HARD_NHIE_CATEGORIES = new Set(['Spicy but Clean', 'Relationship']);
const HARD_CHALLENGE_CATEGORIES = new Set(['Performance', 'Act It Out', 'Mystery']);

// ---------- new authored content ----------
const WOULD_YOU_RATHER = [
  ['easy', 'Would you rather always be 10 minutes late or always 20 minutes early?', 'Always late', 'Always early'],
  ['easy', 'Would you rather give up pizza or give up ice cream forever?', 'Give up pizza', 'Give up ice cream'],
  ['easy', 'Would you rather only text or only call for the rest of your life?', 'Only text', 'Only call'],
  ['easy', 'Would you rather have a rewind button or a pause button for your life?', 'Rewind button', 'Pause button'],
  ['easy', 'Would you rather live without music or live without movies?', 'No music', 'No movies'],
  ['easy', 'Would you rather always sing instead of speak or dance everywhere you walk?', 'Always sing', 'Always dance'],
  ['easy', 'Would you rather have breakfast food forever or dinner food forever?', 'Breakfast forever', 'Dinner forever'],
  ['easy', 'Would you rather be able to talk to animals or speak every human language?', 'Talk to animals', 'Every language'],
  ['easy', 'Would you rather never wait in a queue again or never sit in traffic again?', 'No queues', 'No traffic'],
  ['easy', 'Would you rather have unlimited flights or free food at any restaurant?', 'Unlimited flights', 'Free restaurants'],
  ['easy', 'Would you rather your partner picks all your outfits or all your meals?', 'They pick outfits', 'They pick meals'],
  ['easy', 'Would you rather have a beach date or a mountain cabin date?', 'Beach date', 'Mountain cabin'],
  ['easy', 'Would you rather rewatch one favourite movie forever or always watch new ones you might hate?', 'One favourite forever', 'Always new ones'],
  ['easy', 'Would you rather cook together every night or order in together every night?', 'Cook together', 'Order in'],
  ['easy', 'Would you rather video call every day for an hour or meet in person once a month?', 'Daily video calls', 'Monthly visits'],
  ['hard', 'Would you rather know how every argument ends or never argue but never resolve anything?', 'Know how it ends', 'Never argue'],
  ['hard', 'Would you rather your partner reads your mind for a day or you read theirs?', 'They read yours', 'You read theirs'],
  ['hard', 'Would you rather relive your best memory once a year or erase your worst one forever?', 'Relive the best', 'Erase the worst'],
  ['hard', 'Would you rather be famous but always apart, or unknown but always together?', 'Famous but apart', 'Unknown but together'],
  ['hard', 'Would you rather always say exactly what you think or never be able to lie for kindness?', 'Say what you think', 'Never soft-lie'],
  ['hard', 'Would you rather your partner forgets your anniversary or your birthday?', 'Forgets anniversary', 'Forgets birthday'],
  ['hard', 'Would you rather love your job and be far from family, or dislike your job and be near them?', 'Dream job, far away', 'Meh job, close by'],
  ['hard', 'Would you rather know all the secrets your partner keeps or keep all of yours safe?', 'Know theirs', 'Keep yours'],
  ['hard', 'Would you rather move to their city tomorrow or have them move to yours in a year?', 'You move tomorrow', 'They move in a year'],
  ['hard', 'Would you rather have one perfect week together per year or one ordinary hour together per day?', 'Perfect week yearly', 'Ordinary hour daily'],
];

const TRUTH_OR_DARE = [
  ['easy', 'Truth: What was your honest first impression of the other player?', 'Truth'],
  ['easy', 'Truth: What is the most embarrassing song you secretly love?', 'Truth'],
  ['easy', 'Truth: What is one thing you pretend to hate but actually enjoy?', 'Truth'],
  ['easy', 'Truth: What is the silliest reason you have ever cried?', 'Truth'],
  ['easy', 'Truth: Who was your first crush and what happened?', 'Truth'],
  ['easy', 'Truth: What is one text you regret sending?', 'Truth'],
  ['easy', 'Truth: What is your worst habit that you know about?', 'Truth'],
  ['easy', 'Truth: What is the last thing you searched for on your phone?', 'Truth'],
  ['easy', 'Dare: Send the other player a voice note singing any chorus.', 'Dare'],
  ['easy', 'Dare: Do your best impression of the other player for 20 seconds.', 'Dare'],
  ['easy', 'Dare: Show the last photo in your camera roll (if it is safe!).', 'Dare'],
  ['easy', 'Dare: Talk in an accent until your next turn.', 'Dare'],
  ['easy', 'Dare: Post nothing — but type a dramatic status and show it before deleting.', 'Dare'],
  ['easy', 'Dare: Do 10 jumping jacks right now on camera.', 'Dare'],
  ['easy', 'Dare: Let the other player pick your profile picture for one day.', 'Dare'],
  ['hard', 'Truth: What is one thing you have never told the other player?', 'Truth'],
  ['hard', 'Truth: What is your biggest fear about the future?', 'Truth'],
  ['hard', 'Truth: When were you most jealous and never admitted it?', 'Truth'],
  ['hard', 'Truth: What is one thing you would change about how you argue?', 'Truth'],
  ['hard', 'Truth: What moment made you realise you really liked the other player?', 'Truth'],
  ['hard', 'Truth: What is the hardest part of long distance for you, honestly?', 'Truth'],
  ['hard', 'Dare: Write a 4-line poem about the other player and read it out loud.', 'Dare'],
  ['hard', 'Dare: Recreate your favourite photo of the two of you, solo, right now.', 'Dare'],
  ['hard', 'Dare: Give a 30-second wedding-style toast about the other player.', 'Dare'],
  ['hard', 'Dare: Let the other player send one message from your phone (they dictate, you type, you show proof).', 'Dare'],
];

const MOVIE_TRIVIA = [
  ['easy', 'Which movie features a ship called the RMS Titanic?', 'Titanic', ['Titanic', 'Poseidon', 'The Perfect Storm', 'Life of Pi']],
  ['easy', 'In The Lion King, what is Simba’s father called?', 'Mufasa', ['Mufasa', 'Scar', 'Rafiki', 'Zazu']],
  ['easy', 'Which movie says the line "May the Force be with you"?', 'Star Wars', ['Star Wars', 'Star Trek', 'Dune', 'Guardians of the Galaxy']],
  ['easy', 'What kind of fish is Nemo in Finding Nemo?', 'Clownfish', ['Clownfish', 'Goldfish', 'Angelfish', 'Pufferfish']],
  ['easy', 'In Frozen, who builds the snowman Olaf?', 'Elsa', ['Elsa', 'Anna', 'Kristoff', 'Sven']],
  ['easy', 'Which superhero is known as the "web-slinger"?', 'Spider-Man', ['Spider-Man', 'Batman', 'Iron Man', 'The Flash']],
  ['easy', 'What toy cowboy is the main character of Toy Story?', 'Woody', ['Woody', 'Buzz', 'Rex', 'Slinky']],
  ['easy', 'In Home Alone, what is the boy’s name?', 'Kevin', ['Kevin', 'Marv', 'Buzz', 'Harry']],
  ['easy', 'Which movie features a fast blue hedgehog?', 'Sonic the Hedgehog', ['Sonic the Hedgehog', 'Detective Pikachu', 'The Smurfs', 'Rio']],
  ['easy', 'What is the name of the wizard school in Harry Potter?', 'Hogwarts', ['Hogwarts', 'Narnia', 'Rivendell', 'Brakebills']],
  ['easy', 'In Shrek, what animal is Shrek’s best friend?', 'Donkey', ['Donkey', 'Cat', 'Dragon', 'Horse']],
  ['easy', 'Which movie is about a rat who becomes a chef in Paris?', 'Ratatouille', ['Ratatouille', 'Chef', 'Luca', 'Coco']],
  ['easy', 'Black Panther is the king of which fictional nation?', 'Wakanda', ['Wakanda', 'Zamunda', 'Genovia', 'Latveria']],
  ['hard', 'Who directed Inception, Interstellar and The Dark Knight?', 'Christopher Nolan', ['Christopher Nolan', 'Steven Spielberg', 'Denis Villeneuve', 'Ridley Scott']],
  ['hard', 'Which 1994 film features Vincent Vega and Jules Winnfield?', 'Pulp Fiction', ['Pulp Fiction', 'Reservoir Dogs', 'Goodfellas', 'Se7en']],
  ['hard', 'In The Matrix, which pill does Neo take?', 'The red pill', ['The red pill', 'The blue pill', 'Both pills', 'Neither pill']],
  ['hard', 'What is the highest-grossing film of all time (unadjusted)?', 'Avatar', ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars: The Force Awakens']],
  ['hard', 'Which actor played the Joker in the 2019 film Joker?', 'Joaquin Phoenix', ['Joaquin Phoenix', 'Heath Ledger', 'Jared Leto', 'Jack Nicholson']],
  ['hard', 'Parasite (2019) won Best Picture. What country is it from?', 'South Korea', ['South Korea', 'Japan', 'China', 'Thailand']],
  ['hard', 'In The Godfather, what "offer" is famously made?', 'One he can’t refuse', ['One he can’t refuse', 'A truce', 'A partnership', 'A pardon']],
  ['hard', 'Which film features the fictional hotel run by Gustave H.?', 'The Grand Budapest Hotel', ['The Grand Budapest Hotel', 'Hotel Rwanda', 'The Shining', '1408']],
  ['hard', 'What was the first fully computer-animated feature film?', 'Toy Story', ['Toy Story', 'Shrek', 'A Bug’s Life', 'Antz']],
  ['hard', 'In Titanic, what does Rose promise Jack?', 'She’ll never let go', ['She’ll never let go', 'She’ll find him', 'She’ll wait forever', 'She’ll remember the ship']],
  ['hard', 'Which composer scored The Lion King (1994)?', 'Hans Zimmer', ['Hans Zimmer', 'John Williams', 'Danny Elfman', 'Alan Menken']],
];

const EASY_RIDDLES = [
  ['What has to be broken before you can use it?', 'An egg', ['An egg', 'A promise', 'A window', 'A record']],
  ['I’m tall when I’m young and short when I’m old. What am I?', 'A candle', ['A candle', 'A tree', 'A pencil', 'A shadow']],
  ['What month of the year has 28 days?', 'All of them', ['All of them', 'February', 'January', 'None']],
  ['What is full of holes but still holds water?', 'A sponge', ['A sponge', 'A net', 'A bucket', 'A cloud']],
  ['What goes up and down but never moves?', 'A staircase', ['A staircase', 'An elevator', 'A yo-yo', 'The sun']],
  ['What gets bigger the more you take away from it?', 'A hole', ['A hole', 'A debt', 'A shadow', 'An echo']],
  ['I follow you everywhere but disappear in the dark. What am I?', 'Your shadow', ['Your shadow', 'Your phone', 'A dog', 'The moon']],
  ['What has legs but doesn’t walk?', 'A table', ['A table', 'A snake', 'A fish', 'A wheel']],
  ['What kind of band never plays music?', 'A rubber band', ['A rubber band', 'A boy band', 'A headband', 'A wristband']],
  ['What has ears but cannot hear?', 'Corn', ['Corn', 'A wall', 'A cup', 'A book']],
];

// ---------- build rows ----------
async function main() {
  const { data: games, error } = await supabase.from('games').select('id, slug');
  if (error) throw error;
  const bySlug = Object.fromEntries(games.map((g) => [g.slug, g.id]));
  const rows = [];
  const add = (slug, difficulty, content) => {
    if (!bySlug[slug]) return console.warn(`  ! game ${slug} missing — run schema.sql first`);
    rows.push({ game_id: bySlug[slug], difficulty, content });
  };

  console.log('Extracting from original HTML files in:', SRC);

  const doctor = extractArray('doctor_dash_quiz_app.html', 'originalQuestions') || [];
  for (const q of doctor)
    add('doctor-dash', HARD_MEDICAL.test(q.question + ' ' + q.answer) ? 'hard' : 'easy', q);

  const riddles = extractArray('riddle_rush_app.html', 'originalRiddles') || [];
  for (const r of riddles) add('riddle-rush', 'hard', r);
  for (const [question, answer, options] of EASY_RIDDLES)
    add('riddle-rush', 'easy', { question, answer, options });

  const movies = extractArray('emoji_movie_guess_app.html', 'originalMovies') || [];
  for (const [i, m] of movies.entries())
    add('emoji-movie', i % 3 === 2 ? 'hard' : 'easy', {
      question: 'Guess the movie', emoji: m.emoji, answer: m.answer, options: m.options, hint: m.hint,
    });

  const nhie = extractArray('never_have_i_ever_app.html', 'originalPrompts') || [];
  for (const p of nhie)
    add('never-have-i-ever', HARD_NHIE_CATEGORIES.has(p.category) ? 'hard' : 'easy', p);

  const challenges = extractArray('two_minute_challenge_app.html', 'originalChallenges') || [];
  for (const c of challenges)
    add('two-minute-challenge', HARD_CHALLENGE_CATEGORIES.has(c.category) ? 'hard' : 'easy', c);

  for (const [difficulty, text, a, b] of WOULD_YOU_RATHER)
    add('would-you-rather', difficulty, { text, category: 'Would You Rather', choices: [a, b] });

  for (const [difficulty, text, category] of TRUTH_OR_DARE)
    add('truth-or-dare', difficulty, { text, category });

  for (const [difficulty, question, answer, options] of MOVIE_TRIVIA)
    add('movie-trivia', difficulty, { question, answer, options });

  // wipe + insert per game we touched
  const touched = [...new Set(rows.map((r) => r.game_id))];
  for (const gid of touched) {
    const del = await supabase.from('prompts').delete().eq('game_id', gid);
    if (del.error) throw del.error;
  }
  for (let i = 0; i < rows.length; i += 200) {
    const ins = await supabase.from('prompts').insert(rows.slice(i, i + 200));
    if (ins.error) throw ins.error;
  }

  const counts = {};
  for (const r of rows) {
    const slug = Object.keys(bySlug).find((s) => bySlug[s] === r.game_id);
    counts[slug] = (counts[slug] || 0) + 1;
  }
  console.log('Seeded prompts:', counts);
  console.log(`Total: ${rows.length} prompts ✔`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
