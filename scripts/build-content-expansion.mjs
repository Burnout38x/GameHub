import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const medical = JSON.parse(readFileSync('scripts/content/doctor-dash-hard.json', 'utf8'));
const afterDark = JSON.parse(readFileSync('scripts/content/after-dark.json', 'utf8'));
assert.equal(medical.length, 30);
assert.equal(afterDark.length, 40);
assert.equal(new Set(medical.map(p => p.question)).size, medical.length);
assert.equal(new Set(afterDark.map(p => p.text)).size, afterDark.length);
for (const p of medical) {
  assert(p.question && p.fact && p.answer);
  assert.equal(p.options.length, 4);
  assert.equal(new Set(p.options).size, 4);
  assert.equal(p.options.filter(option => option === p.answer).length, 1);
}
for (const p of afterDark) {
  assert(['easy', 'hard'].includes(p.difficulty));
  assert(/^(Truth|Dare): /.test(p.text));
  assert(p.category.startsWith(p.text.split(':')[0]));
}
const quote = text => `'${text.replaceAll("'", "''")}'`;
let sql = `-- Additive content release. Safe to rerun; existing prompts and active rooms remain intact.
do $$ begin
  if not exists(select 1 from public.games where slug='doctor-dash') then
    raise exception 'Doctor Dash must exist before adding its question pack';
  end if;
end $$;
insert into public.games(slug,name,description,emoji,type,config,sort_order)
values ('truth-or-dare-after-dark','Truth or Dare: After Dark (18+)','A bolder, flirty date-night pack for adults. Non-graphic truths and playful dares; agree on boundaries and skip anytime.','🌙','prompt','{"choices":["Completed","Skipped"],"scoreChoice":"Completed","adultsOnly":true}',71)
on conflict (slug) do nothing;
`;
for (const [slug, rows] of [['doctor-dash', medical.map(content => ({ difficulty: 'hard', content }))], ['truth-or-dare-after-dark', afterDark.map(({ difficulty, ...content }) => ({ difficulty, content }))]]) {
  for (const { difficulty, content } of rows) {
    const key = slug === 'doctor-dash' ? 'question' : 'text';
    const tagged = { ...content, pack: '2026-10-content-expansion' };
    sql += `insert into public.prompts(game_id,difficulty,content) select g.id,${quote(difficulty)},${quote(JSON.stringify(tagged))}::jsonb from public.games g where g.slug=${quote(slug)} and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>${quote(key)}=${quote(content[key])});\n`;
  }
}
writeFileSync('supabase/migrations/20261007001332_doctor_dash_after_dark_content.sql', sql);
console.log('Validated 30 hard medical questions and 40 After Dark prompts; generated additive migration.');
