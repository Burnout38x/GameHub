'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPocketRun, placePocketTile, pocketOffers, pocketNeighbors, POCKET_GATE, POCKET_MEDALS, POCKET_LABELS, scorePocketBoard, validatePocketSave, type PocketMode, type PocketRun, type PocketTile } from '@/lib/pocket-paradise';
import styles from './PocketParadise.module.css';

const SAVE_KEY = 'gamehub:pocket-paradise:v1';
/** Original low-poly miniatures, rendered sharply without a WebGL dependency. */
function PocketTileArt({ tile }: { tile: PocketTile }) {
  return <svg className={styles.miniature} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
    {tile === 'home' && <>
      <path d="M15 38 40 25 65 38 65 64 40 77 15 64Z" fill="#fff0cf" />
      <path d="M40 51 65 38 65 64 40 77Z" fill="#ce985e" />
      <path d="M9 38 35 8 71 38 40 54Z" fill="#c95255" />
      <path d="M35 8 71 38 40 54Z" fill="#963e49" />
      <path d="M23 51 31 55 31 64 23 60Z" fill="#69b9c6" />
      <path d="M47 58 55 54 55 69 47 73Z" fill="#724a41" />
    </>}
    {tile === 'stall' && <>
      <path d="M15 40 40 27 65 40 65 65 40 77 15 65Z" fill="#e990a9" />
      <path d="M40 52 65 40 65 65 40 77Z" fill="#a75173" />
      <path d="M8 38 32 16 72 34 48 56Z" fill="#fff0be" />
      <path d="M18 29 25 23 65 41 58 47Z M36 18 44 21 19 43 12 40Z" fill="#c95879" />
      <path d="M20 51 34 58 34 65 20 58Z" fill="#543d54" />
      <path d="M47 59 60 53 60 60 47 67Z" fill="#ffe6a2" />
      <circle cx="24" cy="52" r="3" fill="#ffbf62" /><circle cx="30" cy="55" r="3" fill="#92dbaa" />
    </>}
    {tile === 'park' && <>
      <ellipse cx="40" cy="68" rx="25" ry="8" fill="#277953" opacity=".28" />
      <path d="M36 41 45 41 45 69 36 69Z" fill="#855e42" />
      <path d="M40 4 65 37 52 58 22 49 15 28Z" fill="#459c64" />
      <path d="M40 4 40 43 15 28Z" fill="#8cda85" />
      <path d="M40 43 65 37 52 58 22 49Z" fill="#277750" />
      <path d="M40 4 65 37 40 43Z" fill="#5ebd76" />
      <circle cx="62" cy="67" r="4" fill="#f7d579" />
    </>}
    {tile === 'path' && <>
      <path d="M7 41 40 24 73 41 73 53 40 70 7 53Z" fill="#6b8797" />
      <path d="M7 41 40 24 73 41 40 58Z" fill="#d1e2df" />
      <path d="M15 41 40 29 65 41 40 53Z" fill="#a4bbbc" />
      <path d="M23 35 56 46 M23 46 56 35" stroke="#edf0d8" strokeWidth="5" />
      <path d="M40 58 73 41 73 53 40 70Z" fill="#547583" />
    </>}
  </svg>;
}
const DEMO: PocketTile[] = ['stall', 'home', 'park', 'home', 'stall', 'path', 'path', 'home', 'path', 'path', 'home', 'path', 'path', 'path', 'home', 'park', 'home', 'stall', 'home', 'park'];
const HELP: Record<PocketTile, string> = {
  path: 'Paths carry access from the west gate. One connected path can serve several buildings. Keep room for a park beside each home.',
  park: 'A park makes neighboring homes happy when those homes also touch a connected path. One park can serve several homes.',
  home: 'A happy home touches both a park and a path connected to the west gate. Happy homes bring customers to neighboring stalls.',
  stall: 'An open stall touches both a connected path and a happy home. Reserve a plot that can reach both.',
};
function tileState(board: (PocketTile | null)[], cell: number, score: ReturnType<typeof scorePocketBoard>) {
  if (board[cell] === 'home') return score.happyHomes.includes(cell) ? 'Happy' : 'Needs park + access';
  if (board[cell] === 'stall') return score.openStalls.includes(cell) ? 'Open' : 'Needs happy home + access';
  if (board[cell] === 'path') return score.connected.includes(cell) ? 'Connected' : 'Disconnected';
  return 'Park';
}
export default function PocketParadise() {
  const [run, setRun] = useState<PocketRun | null>(null);
  const [ready, setReady] = useState(false);
  const [offer, setOffer] = useState(0);
  const [cell, setCell] = useState<number | null>(null);
  const [flat, setFlat] = useState(false);
  const [message, setMessage] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const attempted = useRef('');
  const saveAttempt = useRef(0);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        let restored: PocketRun | null = null;
        try { restored = validatePocketSave(JSON.parse(raw)); } catch { /* Invalid JSON is not a storage failure. */ }
        if (restored) { setRun(restored); setMessage('Your neighborhood is ready to continue.'); }
        else setStorageWarning('The old save could not be restored. Start a fresh neighborhood.');
      }
      setFlat(localStorage.getItem('gamehub:pocket-flat') === 'true');
    } catch { setStorageWarning('Browser storage is unavailable. Keep this page open to finish your run.'); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !run) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch { setStorageWarning('Your run cannot be saved on this browser. Keep this page open.'); }
  }, [run, ready]);
  /* eslint-enable react-hooks/set-state-in-effect */
  async function record(completed: PocketRun) {
    const attempt = ++saveAttempt.current;
    if (completed.mode === 'practice') { setSaveStatus('Practice stays on this device. Your postcard is yours to keep.'); return; }
    setSaving(true); setSaveStatus('Saving this completed challenge…');
    try {
      const response = await fetch('/api/pocket-paradise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed: completed.seed, mode: completed.mode, moves: completed.moves, rulesVersion: completed.rulesVersion ?? 1 }) });
      if (attempt !== saveAttempt.current) return;
      if (response.status === 401) { setSaveStatus('Sign in to save this game to your progress, then return here and retry.'); return; }
      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      if (attempt !== saveAttempt.current) return;
      setSaveStatus(data.recorded ? 'Completion saved to your player progress.' : 'This challenge already has a saved completion. Replays do not replace it.');
    } catch { if (attempt !== saveAttempt.current) return; setSaveStatus('Your town is safe on this device. Account progress could not be saved yet. You can retry.'); }
    finally { if (attempt === saveAttempt.current) setSaving(false); }
  }
  useEffect(() => {
    const key = run ? `${run.rulesVersion ?? 1}:${run.mode}:${run.seed}` : '';
    if (run?.moves.length === 20 && attempted.current !== key) { attempted.current = key; void record(run); }
  }, [run]);
  function start(mode: PocketMode, sameChallenge = false) {
    if (run && run.moves.length > 0 && run.moves.length < 20 && !window.confirm('Replace your unfinished neighborhood? This will erase its saved board.')) return;
    saveAttempt.current++; setSaving(false);
    const seed = sameChallenge && run ? run.seed : mode === 'daily' ? new Date().toISOString().slice(0, 10) : crypto.randomUUID();
    setRun(createPocketRun(seed, mode, sameChallenge && run ? run.rulesVersion ?? 1 : 2));
    setCell(null); setOffer(0); setMessage('Begin with a path at the west gate, or leave that plot free for later.'); setSaveStatus(''); attempted.current = '';
  }
  function toggleFlat() { const next = !flat; setFlat(next); try { localStorage.setItem('gamehub:pocket-flat', String(next)); } catch { /* Visual preference still works. */ } }
  const version = run?.rulesVersion ?? 1;
  const score = run ? scorePocketBoard(run.board, run.seed, version) : null;
  const done = run?.moves.length === 20;
  const offers = run ? pocketOffers(run.seed, run.moves.length, version) : [];
  const preview = run && !done && cell !== null ? placePocketTile(run, { cell, offer }) : null;
  const previewScore = preview ? scorePocketBoard(preview.board, preview.seed, version) : null;
  const previewDelta = previewScore && score ? previewScore.total - score.total : 0;
  const board = preview?.board ?? run?.board ?? DEMO;
  const displayScore = previewScore ?? score ?? scorePocketBoard(DEMO, 'demo', 2);
  const legacy = !!run && version === 1;
  function confirm() {
    if (!preview || cell === null || !previewScore || !score) return;
    const services = version === 2 ? ` ${previewScore.happyHomes.length - score.happyHomes.length} new happy homes, ${previewScore.openStalls.length - score.openStalls.length} new open stalls.` : '';
    setRun(preview); setCell(null); setOffer(0); setMessage(`${POCKET_LABELS[preview.board[cell]!]} built. +${previewDelta} points.${services}`);
  }
  function postcard(completed: PocketRun) {
    const result = scorePocketBoard(completed.board, completed.seed, completed.rulesVersion ?? 1);
    const stamp = completed.rulesVersion === 2 ? result.won ? `${result.medal.toUpperCase()} CHARTER` : 'WORK IN PROGRESS' : 'CLASSIC NEIGHBORHOOD';
    const colors = { home: '#f1bb81', stall: '#e9a0ad', park: '#87bd80', path: '#c6c7af' };
    const plots = completed.board.map((tile, i) => {
      const svgArt = document.querySelector(`[data-pocket-cell="${i}"] svg`)?.innerHTML ?? '';
      return `<g transform="translate(${66 + i % 5 * 69} ${165 + Math.floor(i / 5) * 73})"><rect width="63" height="66" rx="9" fill="${colors[tile!]}"/><svg x="5" y="-4" width="52" height="57" viewBox="0 0 80 80">${svgArt}</svg><text x="31" y="61" text-anchor="middle" font-size="9" fill="#243e35">${tile === 'stall' ? 'Stall' : POCKET_LABELS[tile!]}</text></g>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="590" viewBox="0 0 480 590"><rect width="480" height="590" rx="20" fill="#f5efd9"/><text x="35" y="48" font-family="Georgia,serif" font-size="30" fill="#274f40">Pocket Paradise</text><text x="35" y="78" font-family="sans-serif" font-size="12" fill="#47634c">A little town, made by me · ${result.total} points</text><rect x="35" y="97" width="410" height="42" rx="6" fill="${result.won ? '#d7b258' : '#a4b1a0'}"/><text x="240" y="124" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#253e32">${stamp}</text><path d="M23 270H64" stroke="#a08b64" stroke-width="14"/>${plots}<text x="35" y="492" font-family="sans-serif" font-size="13" fill="#274f40">${result.happyHomes.length} happy homes · ${result.openStalls.length} open stalls · ${result.connected.length} connected paths</text><text x="35" y="521" font-family="sans-serif" font-size="10" fill="#47634c">${completed.mode} · ${completed.seed} · rules ${completed.rulesVersion ?? 1}</text><text x="35" y="558" font-family="Georgia,serif" font-size="15" fill="#274f40">Wish you were here. — GameHub</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a'); a.href = url; a.download = `pocket-paradise-${result.medal === 'none' ? 'town' : result.medal}.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const boardScene = <div className={`${styles.scene} ${flat ? styles.flat : ''}`}>
    <div className={styles.landscape}><span>WILLOW MEADOW</span><span>{run ? `${20 - run.moves.length} plots to grow` : 'A town that works together'}</span></div>
    <div className={styles.map}>
      {!legacy && <div className={styles.gate} aria-label="West entry gate leads to row 2 column 1"><span>GATE</span><b>→</b></div>}
      <div className={styles.board} role="group" aria-label="Neighborhood: four rows and five columns. West gate enters row 2, column 1.">
        {board.map((tile, i) => {
          const selected = cell === i;
          const active = displayScore.happyHomes.includes(i) || displayScore.openStalls.includes(i) || displayScore.connected.includes(i);
          return <button key={i} data-pocket-cell={i} type="button" disabled={!run || !!run.board[i] || done} aria-pressed={selected} aria-label={`Row ${Math.floor(i / 5) + 1}, column ${i % 5 + 1}: ${tile ? `${POCKET_LABELS[tile]}${!legacy ? `, ${tileState(board, i, displayScore)}` : ''}${selected ? ', preview' : ''}` : `empty plot${i === POCKET_GATE && !legacy ? ', gate entrance: build a path here' : ''}`}`} className={`${styles.plot} ${tile ? styles[tile] : ''} ${selected ? styles.selected : ''} ${active && !legacy ? styles.served : ''} ${i === POCKET_GATE && !legacy ? styles.entryPlot : ''}`} onClick={() => setCell(i)}>
            {tile ? <>
              {tile === 'path' && !legacy && <span className={styles.roadLines} aria-hidden="true">{pocketNeighbors(i).filter(n => board[n] === 'path').map(n => <i key={n} className={n === i - 5 ? styles.north : n === i + 5 ? styles.south : n === i - 1 ? styles.west : styles.east} />)}{i === POCKET_GATE && <i className={styles.west} />}</span>}
              <span key={selected ? 'preview' : 'built'} className={`${styles.building} ${selected ? styles.ghost : ''}`}><PocketTileArt tile={tile} /></span>
              <span className={styles.tileLabel}>{tile === 'stall' ? 'Stall' : POCKET_LABELS[tile]}</span>
              {!legacy && tile !== 'park' && <span key={String(active)} className={`${styles.service} ${active ? styles.serviceOn : ''}`} aria-hidden="true">{active ? '✓' : '·'}</span>}
            </> : <span aria-hidden="true" className={styles.empty}>{i === POCKET_GATE && !legacy ? '→' : '+'}</span>}
          </button>;
        })}
      </div>
    </div>
    <div className={styles.boardLegend}><span><i />{legacy ? 'Classic adjacency rules' : '✓ Happy · open · connected'}</span><span>Edges count. Diagonals don’t.</span></div>
  </div>;
  return <section aria-label="Pocket Paradise" className={styles.page}>
    <Link href="/games" className={styles.back}>← All games</Link>
    <header className={styles.header}><div><span className={styles.eyebrow}>A LITTLE TOWN. A CLEVER PLAN.</span><h1>Pocket Paradise</h1><p>Bring a sleepy meadow to life, one little building at a time.</p></div><span className={styles.edition}>20 plots<br />No timer</span></header>
    {storageWarning && <p role="status" className={styles.notice}>{storageWarning}</p>}
    {!ready ? <p role="status">Opening your neighborhood…</p> : !run ? <div className={styles.intro}>
      {boardScene}<section className={styles.welcome}><span className={styles.eyebrow}>YOUR OPENING-DAY CHARTER</span><h2>Make room<br />for everyone.</h2><p>Connect paths to the gate. Give homes a park and access. Open stalls beside happy homes and connected paths.</p><div className={styles.goalSummary}><strong>4 happy homes</strong><strong>2 open stalls</strong><strong>36+ points</strong></div><p>Meet all three in 20 placements to earn a bronze charter. Reach 46 for silver, 56 for gold.</p><button className={styles.primary} onClick={() => start('standard')}>Build my neighborhood →</button><div className={styles.buttonRow}><button className={styles.secondary} onClick={() => start('daily')}>Today’s challenge</button><button className={styles.secondary} onClick={() => start('practice')}>Practice</button></div><small>Daily offers are shared and refresh at midnight UTC. Practice uses the same rules and stays on this device.</small></section>
    </div> : <>
      {legacy && <p className={styles.notice}>Classic save · Your original rules and score are preserved. Finish this town, or choose a fresh neighborhood below to try opening-day charters.</p>}
      <div className={styles.toolbar}><span>{run.mode === 'daily' ? `Daily · ${run.seed}` : run.mode === 'practice' ? 'Practice meadow' : 'Your neighborhood'}</span><strong>{run.moves.length}/20 built</strong><strong>{score!.total} pts</strong><button aria-pressed={flat} onClick={toggleFlat}>{flat ? 'Flat pieces' : 'Miniatures'}</button></div>
      <div className={styles.playLayout}>
        <div className={styles.boardColumn}>
          {!legacy && <section className={styles.charter} aria-label="Opening-day charter"><div><span className={styles.eyebrow}>OPENING-DAY CHARTER</span><strong>{score!.won ? `${score!.medal} pace` : 'Earn your first stamp'}</strong></div><div className={styles.progressRow}>{score!.requests.map(r => <div key={r.text}><span>{r.text}</span><b>{r.current}/{r.target} {r.complete ? '✓' : ''}</b><progress value={Math.min(r.current, r.target)} max={r.target} /></div>)}<div><span>36 points</span><b>{score!.total}/36 {score!.total >= 36 ? '✓' : ''}</b><progress value={Math.min(score!.total, 36)} max={36} /></div></div></section>}
          {boardScene}
          {!done && <section className={styles.tray} aria-label="Build a tile">
            <div className={styles.trayHeading}><h2>Choose your next little piece</h2><span>Turn {run.moves.length + 1}/20</span></div>
            <div className={styles.offers}>{offers.map((tile, i) => <button key={tile} aria-pressed={offer === i} className={`${styles.offer} ${offer === i ? styles.activeOffer : ''}`} onClick={() => setOffer(i)}><PocketTileArt tile={tile} /><span>{POCKET_LABELS[tile]}</span></button>)}</div>
            <p className={styles.contextHelp}>{legacy ? 'Homes earn 2 per neighboring park; stalls earn 2 per neighboring path. Park pairs and path pairs earn 1.' : HELP[offers[offer]]}</p>
            <div className={styles.preview} aria-live="polite">{cell !== null ? <><strong>{POCKET_LABELS[offers[offer]]} · row {Math.floor(cell / 5) + 1}, column {cell % 5 + 1} · +{previewDelta} pts</strong>{!legacy && <span>{previewScore!.connected.length - score!.connected.length} new connected paths · {previewScore!.happyHomes.length - score!.happyHomes.length} new happy homes · {previewScore!.openStalls.length - score!.openStalls.length} new open stalls</span>}{!legacy && cell === POCKET_GATE && offers[offer] !== 'path' && <b className={styles.warning}>This blocks the only gate. The charter will become unreachable.</b>}{!legacy && previewScore!.isolated.includes(cell) && <span>Not served yet. Leave space for its missing neighbors.</span>}</> : <span>Tap an empty plot to preview. Your town changes only when you build.</span>}</div>
            <div className={styles.buildActions}><button className={styles.primary} disabled={cell === null} onClick={confirm}>{cell === null ? 'Choose a plot above' : `Build ${POCKET_LABELS[offers[offer]].toLowerCase()} · +${previewDelta}`}</button>{cell !== null && <button className={styles.secondary} onClick={() => setCell(null)}>Cancel</button>}</div>
            {run.moves.length < 19 && <p className={styles.forecast}>Next delivery: {pocketOffers(run.seed, run.moves.length + 1, version).map(t => POCKET_LABELS[t]).join(' · ')}</p>}
            <p className={styles.announcement} role="status">{message}</p>
          </section>}
        </div>
        <aside className={styles.sidebar}>
          {done ? <section className={`${styles.result} ${!legacy && score!.won ? styles.earned : ''}`}><span className={styles.eyebrow}>{legacy ? 'CLASSIC TOWN COMPLETE' : 'OPENING-DAY INSPECTION'}</span><div className={styles.stamp} aria-hidden="true">{legacy ? '⌂' : score!.won ? '✦' : '⌂'}</div><h2>{legacy ? 'Your town is complete' : score!.won ? `${score!.medal[0].toUpperCase()}${score!.medal.slice(1)} charter earned` : 'Opening delayed'}</h2><p>{legacy ? `Your classic neighborhood earned ${score!.total} points under its original rules.` : score!.won ? `Your neighborhood works together: ${score!.happyHomes.length} happy homes, ${score!.openStalls.length} open stalls and ${score!.total} points. Your earned stamp is on the postcard.` : `The town is built, but it hasn’t earned a charter. ${score!.requests.filter(r => !r.complete).map(r => `You need ${r.target - r.current} more ${r.tile === 'home' ? 'happy home(s)' : 'open stall(s)'}.`).join(' ')}${score!.total < 36 ? ` You need ${36 - score!.total} more points.` : ''}`}</p>{!legacy && !score!.won && <p className={styles.hint}>{run.board[POCKET_GATE] !== 'path' ? 'The gate is blocked. Begin your next plan with a path at row 2, column 1.' : `${score!.isolated.length} buildings are missing neighbors or gate access. Keep path corridors open, then fit parks and homes together.`}</p>}<button className={styles.primary} onClick={() => postcard(run)}>{!legacy && score!.won ? `Keep my ${score!.medal} postcard` : 'Keep my town postcard'}</button><button className={styles.secondary} onClick={() => start(run.mode, true)}>Retry this exact challenge</button><p role="status" className={styles.saveStatus}>{saveStatus}</p>{run.mode !== 'practice' && <div className={styles.buttonRow}><button className={styles.textButton} disabled={saving} onClick={() => void record(run)}>{saving ? 'Saving…' : 'Retry account save'}</button>{saveStatus.startsWith('Sign in') && <Link className={styles.textButton} href="/login?next=%2Fplay%2Fpocket-paradise">Sign in</Link>}</div>}</section> : <section className={styles.fieldNotes}><span className={styles.eyebrow}>THE TOWN PLANNER’S NOTEBOOK</span><h2>{legacy ? 'Classic neighborhood' : 'A path is a promise.'}</h2><p>{legacy ? 'Keep pairing neighboring tiles to build your original score.' : 'Every road takes a plot away from a building, but can give access to several neighbors. Keep the gate clear and plan before filling the corners.'}</p>{!legacy && <ol><li><b>Paths → gate.</b> Trace an unbroken route from the west entrance.</li><li><b>Home → park + path.</b> Both must share an edge with the home.</li><li><b>Stall → happy home + path.</b> Both must share an edge with the stall.</li></ol>}</section>}
          <section className={styles.breakdown}><h2>Where your points grow</h2><dl><div><dt>{legacy ? 'Home–park edges' : `${score!.happyHomes.length} happy homes × 6`}</dt><dd>{score!.homes}</dd></div><div><dt>{legacy ? 'Stall–path edges' : `${score!.openStalls.length} open stalls × 5`}</dt><dd>{score!.stalls}</dd></div><div><dt>{legacy ? 'Path pairs' : `${score!.connected.length} connected paths × 1`}</dt><dd>{score!.paths}</dd></div><div><dt>Park pairs × 1</dt><dd>{score!.parks}</dd></div>{legacy && <div><dt>Request bonuses</dt><dd>{score!.bonuses}</dd></div>}<div className={styles.total}><dt>Total</dt><dd>{score!.total}</dd></div></dl>{!legacy && <><p className={styles.hint}>Unhappy homes, closed stalls and disconnected paths earn 0. Every park pair counts once.</p><div className={styles.medals}>{Object.entries(POCKET_MEDALS).map(([name, target]) => <span key={name} className={score!.charterComplete && score!.total >= target ? styles.medalReached : ''}>✦ {name}<b>{target} pts</b></span>)}</div><small>All medals also require 4 happy homes and 2 open stalls. Your stamp is awarded after plot 20.</small></>}{legacy && <ul>{score!.requests.map(r => <li key={r.text}>{r.text}: {r.current}/{r.target} {r.complete ? '✓' : ''}</li>)}</ul>}</section>
        </aside>
      </div>
      <details className={styles.restart}><summary>{done ? 'Grow a different neighborhood' : 'Start over'}</summary><p>A new neighborhood replaces this device’s board. Keep your postcard first if this town is finished.</p><div className={styles.buttonRow}><button className={styles.secondary} onClick={() => start('standard')}>New neighborhood</button><button className={styles.secondary} onClick={() => start('daily')}>Today’s challenge</button><button className={styles.secondary} onClick={() => start('practice')}>Practice</button></div></details>
    </>}
  </section>;
}
