'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { createPocketRun, placePocketTile, pocketOffers, POCKET_LABELS, scorePocketBoard, validatePocketSave, type PocketMode, type PocketRun, type PocketTile } from '@/lib/pocket-paradise';
import styles from './PocketParadise.module.css';

const SAVE_KEY = 'gamehub:pocket-paradise:v1';
const SYMBOLS: Record<PocketTile, string> = { home: '⌂', stall: '▤', park: '♣', path: '⋯' };
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
  const boardRef = useRef<HTMLElement>(null);
  // Restore browser-owned storage after hydration; the server cannot read it.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        let restored: PocketRun | null = null;
        try { restored = validatePocketSave(JSON.parse(raw)); } catch { /* Corrupt JSON is distinct from unavailable browser storage. */ }
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
    if (completed.mode === 'practice') { setSaveStatus('Practice complete. This relaxed run does not update account statistics.'); return; }
    setSaving(true); setSaveStatus('Saving your completed game…');
    try {
      const response = await fetch('/api/pocket-paradise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed: completed.seed, mode: completed.mode, moves: completed.moves }) });
      if (attempt !== saveAttempt.current) return;
      if (response.status === 401) { setSaveStatus('Sign in to save this game to your progress, then return here and retry.'); return; }
      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      if (attempt !== saveAttempt.current) return;
      setSaveStatus(data.recorded ? 'Saved to your player progress.' : 'This game is already saved to your progress.');
    } catch { if (attempt !== saveAttempt.current) return; setSaveStatus('Your neighborhood is safe on this device. Progress could not be saved yet—try again.'); }
    finally { if (attempt === saveAttempt.current) setSaving(false); }
  }
  useEffect(() => {
    if (run?.moves.length === 20 && attempted.current !== run.seed) { attempted.current = run.seed; void record(run); }
  }, [run]);
  function start(mode: PocketMode) {
    saveAttempt.current++; setSaving(false);
    const seed = mode === 'daily' ? new Date().toISOString().slice(0, 10) : crypto.randomUUID();
    setRun(createPocketRun(seed, mode)); setCell(null); setOffer(0); setMessage('Choose a tile, then tap an empty plot.'); setSaveStatus(''); attempted.current = '';
  }
  function chooseOffer(index: number) {
    setOffer(index);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      // On a phone, the choices sit below the board. Bring the full board back
      // into view instead of leaving a rotated plot half-hidden at the top edge.
      boardRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
      boardRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }
  function toggleFlat() { const next = !flat; setFlat(next); try { localStorage.setItem('gamehub:pocket-flat', String(next)); } catch { /* The board remains usable without storage. */ } }
  function confirm() {
    if (!run || cell === null) return;
    const next = placePocketTile(run, { cell, offer }); const delta = scorePocketBoard(next.board, next.seed).total - scorePocketBoard(run.board, run.seed).total;
    setRun(next); setCell(null); setOffer(0); setMessage(`${POCKET_LABELS[next.board[cell]!]} placed. ${delta} points added.`);
  }
  function postcard(completed: PocketRun) {
    const colors = { home: '#f4b77b', stall: '#ef99ac', park: '#7fd0ab', path: '#91bedf' };
    const plots = completed.board.map((tile, i) => `<rect x="${40 + i % 5 * 68}" y="${120 + Math.floor(i / 5) * 68}" width="60" height="60" rx="12" fill="${colors[tile!]}"/><text x="${70 + i % 5 * 68}" y="${157 + Math.floor(i / 5) * 68}" text-anchor="middle" font-size="12" fill="#18232c">${POCKET_LABELS[tile!]}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="412" height="480" viewBox="0 0 412 480"><rect width="412" height="480" rx="24" fill="#18232c"/><text x="40" y="54" font-family="sans-serif" font-size="26" fill="#fff4e5">Pocket Paradise</text><text x="40" y="88" font-family="sans-serif" font-size="16" fill="#9cddd2">My tiny neighborhood · ${scorePocketBoard(completed.board, completed.seed).total} points</text>${plots}<text x="40" y="440" font-family="sans-serif" font-size="16" fill="#fff4e5">Made with GameHub</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); const a = document.createElement('a'); a.href = url; a.download = 'my-pocket-paradise.svg'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const score = run ? scorePocketBoard(run.board, run.seed) : null;
  const done = run?.moves.length === 20;
  const offers = run ? pocketOffers(run.seed, run.moves.length) : [];
  const preview = run && !done && cell !== null ? placePocketTile(run, { cell, offer }) : null;
  const previewDelta = preview && score ? scorePocketBoard(preview.board, preview.seed).total - score.total : null;
  return <div className={`mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 ${cell !== null ? styles.hasPreview : ''}`}>
    <Link href="/games" className="text-sm text-white/70 hover:text-white">← All games</Link>
    <header className="my-6"><span className="pill">Solo · Cozy strategy</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Pocket Paradise</h1><p className="mt-3 max-w-2xl text-white/70">Twenty little plots. One happy neighborhood. Pair homes with parks and help food stalls find their path.</p></header>
    {storageWarning && <p role="status" className="glass-sm mb-4 p-4">{storageWarning}</p>}
    {!ready ? <p role="status">Opening your neighborhood…</p> : !run ? <section className="glass p-5 sm:p-8"><h2 className="text-2xl font-bold">Make a little room for joy</h2><p className="my-4 text-white/70">No timer. Choose one of three tiles each turn, preview its points, then place it. All 20 plots will become your own miniature neighborhood.</p><div className="grid gap-3 sm:grid-cols-3"><button className="btn" onClick={() => start('standard')}>Build a neighborhood</button><button className="btn-secondary" onClick={() => start('daily')}>Today’s neighborhood</button><button className="btn-secondary" onClick={() => start('practice')}>Relaxed practice</button></div><p className="mt-4 text-sm text-white/60">Daily runs share the same offers for everyone, changing at midnight UTC. Standard and daily completions can count toward your signed-in progress. Practice stays on this device.</p></section> : <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-3"><span className="pill">{run.mode === 'daily' ? `Daily · ${run.seed}` : run.mode === 'practice' ? 'Practice' : 'Your neighborhood'}</span><span className="pill">{run.moves.length}/20 plots</span><strong className="pill" aria-label={`${score!.total} points`}>{score!.total} points</strong></div><button className="btn-secondary !w-auto" aria-pressed={flat} onClick={toggleFlat}>{flat ? 'Flat board · on' : 'Dimensional board'}</button></div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section ref={boardRef} className={`glass p-3 sm:p-5 ${styles.scene}`} aria-label="Your neighborhood">
          <div className={`${styles.board} ${flat ? styles.flat : ''}`}>
            {run.board.map((tile, i) => <button key={i} type="button" disabled={!!tile || done} aria-pressed={!tile && cell === i} aria-label={`Row ${Math.floor(i / 5) + 1}, column ${i % 5 + 1}: ${tile ? POCKET_LABELS[tile] : `empty plot${cell === i ? ', selected' : ''}`}`} className={`${styles.plot} ${tile ? styles[tile] : ''} ${cell === i ? styles.selected : ''}`} onClick={() => setCell(i)}>
              {tile ? <><span className={styles.building}><PocketTileArt tile={tile} /></span><span className={styles.tileLabel}>{tile === 'stall' ? 'Stall' : POCKET_LABELS[tile]}</span></> : <span aria-hidden="true" className={styles.empty}>{cell === i ? SYMBOLS[offers[offer]] : '+'}</span>}
            </button>)}
          </div><p className="mt-5 text-center text-xs text-white/60">Neighbors share an edge. Diagonals do not count.</p>
        </section>
        <div className="space-y-4">{done ? <section className="glass p-5"><span className="text-sm text-white/60">Neighborhood complete</span><h2 className="mt-2 text-3xl font-black">A little paradise ✨</h2><p className="my-4">You made a place of your own, with <strong>{score!.total} points</strong> and {score!.requests.filter(r => r.complete).length} of 2 resident requests fulfilled.</p><button className="btn" onClick={() => postcard(run)}>Download your postcard</button><p role="status" className="my-4 text-sm text-white/70">{saveStatus}</p>{run.mode !== 'practice' && <div className="flex flex-wrap gap-3"><button className="btn-secondary !w-auto" disabled={saving} onClick={() => void record(run)}>{saving ? 'Saving…' : 'Retry progress save'}</button>{saveStatus.startsWith('Sign in') && <Link className="btn-secondary !w-auto" href="/login?next=%2Fplay%2Fpocket-paradise">Sign in</Link>}</div>}</section> : <section className="glass p-5"><h2 className="text-xl font-bold">1. Pick a tile</h2><div className="my-4 grid grid-cols-3 gap-2">{offers.map((tile, i) => <button key={tile} aria-pressed={offer === i} className={`${styles.offer} ${offer === i ? styles.activeOffer : ''}`} onClick={() => chooseOffer(i)}><span aria-hidden="true" className="text-3xl">{SYMBOLS[tile]}</span><span>{POCKET_LABELS[tile]}</span></button>)}</div><h2 className="text-xl font-bold">2. Choose an empty plot</h2><p className="my-3 min-h-12 text-sm text-white/70" aria-live="polite">{cell !== null ? `${POCKET_LABELS[offers[offer]]} in row ${Math.floor(cell / 5) + 1}, column ${cell % 5 + 1}. Preview: +${previewDelta} points, including any new request bonuses.` : 'Tap a + on the board. Nothing is placed until you confirm.'}</p><button className="btn" disabled={cell === null} onClick={confirm}>{cell === null ? 'Choose a plot to continue' : 'Place this tile'}</button>{cell !== null && createPortal(<div className={styles.confirmDock}><button className="btn" onClick={confirm}>Confirm placement · +{previewDelta}</button><button className="btn-secondary" onClick={() => setCell(null)}>Cancel preview</button></div>, document.body)}<p role="status" className="mt-3 text-sm text-white/70">{message}</p></section>}
          <section className="glass p-5"><h2 className="text-xl font-bold">Resident requests</h2><ul className="mt-3 space-y-3">{score!.requests.map(r => <li key={r.text} className="glass-sm p-3"><div className="flex items-start justify-between gap-2"><span>{r.complete ? '✓ ' : ''}{r.text}</span><strong className="shrink-0">+{r.bonus}</strong></div><span className="text-sm text-white/60">{r.complete ? 'Fulfilled' : `${r.current}/${r.target}`}</span></li>)}</ul></section>
        </div>
      </div>
      <section className="glass mt-5 p-5"><h2 className="text-xl font-bold">Every point has a place</h2><dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt>Home ↔ park: <strong>2 per shared edge</strong></dt><dd className="text-sm text-white/60">{score!.homes} points</dd></div><div><dt>Stall ↔ path: <strong>2 per shared edge</strong></dt><dd className="text-sm text-white/60">{score!.stalls} points</dd></div><div><dt>Park ↔ park: <strong>1 per shared edge</strong></dt><dd className="text-sm text-white/60">{score!.parks} points</dd></div><div><dt>Path ↔ path: <strong>1 per shared edge</strong></dt><dd className="text-sm text-white/60">{score!.paths} points</dd></div></dl><p className="mt-3 text-sm text-white/60">Resident requests: {score!.bonuses} bonus points. Each edge is counted once; bonuses are awarded once.</p></section>
      <details className="glass mt-5 p-5"><summary className="cursor-pointer font-bold">{done ? 'Build another neighborhood' : 'Start a fresh neighborhood'}</summary><p className="my-4 text-sm text-white/70">{done ? 'Your next neighborhood replaces this device’s saved board. Download your postcard first if you want to keep it.' : 'Starting again replaces your saved neighborhood. This cannot be undone.'}</p><div className="grid gap-3 sm:grid-cols-3"><button className="btn-secondary" onClick={() => start('standard')}>New standard run</button><button className="btn-secondary" onClick={() => start('daily')}>Daily neighborhood</button><button className="btn-secondary" onClick={() => start('practice')}>New practice run</button></div></details>
    </>}
  </div>;
}
