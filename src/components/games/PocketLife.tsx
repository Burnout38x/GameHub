'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { pocketLife } from '@/lib/pocket-life';
import type { PocketTile } from '@/lib/pocket-paradise';
import styles from './PocketLife.module.css';

/** A few finite journeys, derived from committed tiles. No timer or rendering loop. */
export default function PocketLife({ board, previewing, lastCell }: { board: (PocketTile | null)[]; previewing: boolean; lastCell?: number }) {
  const life = useMemo(() => {
    const previous = [...board];
    if (lastCell !== undefined) previous[lastCell] = null;
    return pocketLife(board, previous);
  }, [board, lastCell]);
  const layer = useRef<HTMLDivElement>(null);
  const [replay, setReplay] = useState(0);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const root = layer.current;
    if (!root || previewing || !enabled) return;
    const map = root.parentElement!;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let animations: Animation[] = [];
    const cancel = () => { animations.forEach(a => a.cancel()); animations = []; };
    function present(animate: boolean) {
      cancel();
      const origin = root!.getBoundingClientRect();
      life.journeys.forEach((journey, index) => {
        const actor = root!.querySelector<HTMLElement>(`[data-resident="${index}"]`);
        if (!actor) return;
        const points = journey.cells.map(cell => {
          const rect = map.querySelector(`[data-pocket-cell="${cell}"]`)!.getBoundingClientRect();
          return { x: rect.left + rect.width / 2 - origin.left, y: rect.top + rect.height / 2 - origin.top };
        });
        const last = points.length - 1;
        // Stop on the doorstep, before the building artwork, rather than walking through it.
        points[last] = { x: points[last - 1].x + (points[last].x - points[last - 1].x) * .65, y: points[last - 1].y + (points[last].y - points[last - 1].y) * .65 };
        const at = (p: { x: number; y: number }) => `translate(${p.x}px, ${p.y}px)`;
        actor.style.transform = at(points[last]);
        actor.style.opacity = '1';
        actor.dataset.walking = 'false';
        const bubble = actor.querySelector<HTMLElement>('[data-action]')!;
        bubble.style.opacity = '1';
        if (!animate || media.matches) return;
        actor.dataset.walking = 'true';
        const travel = Math.min(6200, (points.length - 1) * 650);
        const duration = travel + 1600;
        const distance = points.map((p, i) => i ? Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0);
        const total = distance.reduce((sum, n) => sum + n, 0);
        let covered = 0;
        const frames: Keyframe[] = points.map((p, i) => {
          covered += distance[i];
          return { transform: at(p), opacity: 1, offset: total ? covered / total * travel / duration : 0 };
        });
        frames.push({ transform: at(points[last]), opacity: 1, offset: 1 });
        const walk = actor.animate(frames, { duration, delay: index * 240, easing: 'linear', fill: 'backwards' });
        const action = bubble.animate([{ opacity: 0, transform: 'translateY(3px)', offset: 0 }, { opacity: 0, transform: 'translateY(3px)', offset: travel / duration }, { opacity: 1, transform: 'translateY(0)', offset: Math.min(.99, (travel + 260) / duration) }, { opacity: 1, transform: 'translateY(0)' }], { duration, delay: index * 240, fill: 'backwards' });
        const gait = actor.querySelector<SVGElement>('[data-body]')!.animate([{ transform: 'translateY(0) rotate(-3deg)' }, { transform: 'translateY(-1.5px) rotate(3deg)' }, { transform: 'translateY(0) rotate(-3deg)' }], { duration: 340, iterations: Math.ceil(travel / 340), delay: index * 240 });
        const legs = [...actor.querySelectorAll<SVGElement>('[data-leg]')].map((leg, side) => leg.animate([{ transform: `rotate(${side ? 18 : -18}deg)` }, { transform: `rotate(${side ? -18 : 18}deg)` }, { transform: `rotate(${side ? 18 : -18}deg)` }], { duration: 340, iterations: Math.ceil(travel / 340), delay: index * 240 }));
        const arm = actor.querySelector<SVGElement>('[data-arm]')!.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-35deg)' }, { transform: 'rotate(0deg)' }], { duration: 500, iterations: 2, delay: index * 240 + travel });
        walk.onfinish = () => { actor.dataset.walking = 'false'; };
        animations.push(walk, action, gait, arm, ...legs);
      });
    }
    const visibility = () => { if (document.hidden) { cancel(); root.style.visibility = 'hidden'; } else { root.style.visibility = ''; present(false); } };
    const reduced = () => present(false);
    const boardElement = map.querySelector('[role="group"]')!;
    let size = boardElement.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      const next = boardElement.getBoundingClientRect();
      if (Math.abs(next.width - size.width) < .1 && Math.abs(next.height - size.height) < .1) return;
      size = next; present(false);
    });
    observer.observe(boardElement);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', reduced);
    if (!document.hidden) present(true);
    else root.style.visibility = 'hidden';
    return () => { cancel(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', reduced); root.style.visibility = ''; };
  }, [life, replay, previewing, enabled]);
  return <>
    <div ref={layer} className={styles.layer} aria-hidden="true" hidden={!enabled || previewing}>
      {life.journeys.map((journey, index) => <div className={styles.resident} key={journey.id} data-resident={index} data-destination={journey.destination}>
        <span className={styles.action} data-action>{journey.tile === 'home' ? '♥' : '✓'}</span>
        <svg viewBox="0 0 24 36" width="24" height="36" focusable="false">
          <ellipse cx="12" cy="32" rx="7" ry="2.5" fill="#254c3d" opacity=".24" />
          <g data-body className={styles.body}>
            <path data-leg className={styles.leg} d="M9 24 8 31" stroke="#293f42" strokeWidth="3" strokeLinecap="round" /><path data-leg className={styles.leg} d="M15 24 16 31" stroke="#293f42" strokeWidth="3" strokeLinecap="round" />
            <path d="M7 16Q12 12 17 16L17 25H7Z" fill={['#b24c48', '#326d83', '#815aa4'][index]} />
            <path d="M7 17 4 23" stroke="#bf865e" strokeWidth="3" strokeLinecap="round" />
            <path data-arm className={styles.arm} d="M17 17 20 23" stroke="#bf865e" strokeWidth="3" strokeLinecap="round" />
            <circle cx="12" cy="9" r="5" fill={['#c99065', '#885335', '#d9ab84'][index]} />
            <path d="M7 8Q7 2 12 3Q18 3 17 9L15 6 9 6Z" fill="#3f332e" />
            {journey.tile === 'stall' && <path d="M18 23H23V29H18Z" fill="#eac980" stroke="#92673c" strokeWidth=".8" />}
          </g>
        </svg>
      </div>)}
    </div>
    <section className={styles.panel} aria-label="Neighborhood life">
      <div className={styles.heading}><strong>Life in your neighborhood</strong><button type="button" aria-pressed={enabled} onClick={() => setEnabled(!enabled)}>{enabled ? 'Residents on' : 'Residents off'}</button></div>
      <p>{previewing ? 'Placement preview — residents wait for you to build.' : life.journeys.length ? 'Residents follow gate-connected paths. A wave means home is happy; a shopping bag means the stall is open.' : 'Your first residents arrive when a home touches both a park and a path connected to the gate.'}</p>
      {life.journeys.length > 0 && <button className={styles.replay} type="button" disabled={previewing || !enabled} onClick={() => setReplay(n => n + 1)}>Watch neighborhood life ↻</button>}
      {life.issues.length > 0 && <details className={styles.issues}><summary>{life.issues.length} {life.issues.length === 1 ? 'plot needs' : 'plots need'} attention</summary><ul>{life.issues.map(issue => <li key={issue.cell}><b>Row {Math.floor(issue.cell / 5) + 1}, column {issue.cell % 5 + 1}</b><span>{issue.message}</span></li>)}</ul></details>}
    </section>
  </>;
}
