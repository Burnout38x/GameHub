// Dry-run test: verifies the seed script can extract + repair all original HTML content.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const SRC = process.env.SOURCE_HTML_DIR || path.join(process.cwd(), '..');

function fixMojibake(s) {
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
    console.log(`FAIL ${file}: not found in ${SRC}`);
    return null;
  }
  const html = fixMojibake(readFileSync(p, 'utf8'));
  const m = html.match(new RegExp(`const\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  if (!m) {
    console.log(`FAIL ${file}: ${varName} not found`);
    return null;
  }
  return JSON.parse(m[1]);
}

const sets = [
  ['doctor_dash_quiz_app.html', 'originalQuestions'],
  ['riddle_rush_app.html', 'originalRiddles'],
  ['emoji_movie_guess_app.html', 'originalMovies'],
  ['never_have_i_ever_app.html', 'originalPrompts'],
  ['two_minute_challenge_app.html', 'originalChallenges'],
];

let total = 0;
let failed = false;
for (const [f, v] of sets) {
  const arr = extractArray(f, v);
  if (!arr) {
    failed = true;
    continue;
  }
  total += arr.length;
  console.log(`OK   ${f} -> ${arr.length} items`);
}
const movies = extractArray('emoji_movie_guess_app.html', 'originalMovies');
if (movies) {
  console.log('emoji sample:', movies[0].emoji, '=', movies[0].answer, '|', movies[2].emoji, '=', movies[2].answer);
  const broken = movies.filter((m) => /[ÃðÂ]/.test(m.emoji));
  console.log(broken.length === 0 ? 'emoji repair: OK, no mojibake remains' : `emoji repair: FAIL, ${broken.length} still broken`);
  if (broken.length > 0) failed = true;
}
console.log(`TOTAL extracted: ${total}`);
process.exit(failed ? 1 : 0);
