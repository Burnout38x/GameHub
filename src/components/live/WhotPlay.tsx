'use client';
import type { Shape } from '@/lib/whot/cards';
import type { WhotView } from '@/lib/whot/view';
import WhotTable from '@/components/whot/WhotTable';
import { useLiveRoom, secondsLeft } from './useLiveRoom';
import { useSfx } from './sfx';

interface Props { code: string; initial: WhotView; onFinished: () => void }

/** Online Whot!: the server deals and referees; this phone shows the table. */
export default function WhotPlay({ code, initial, onFinished }: Props) {
  const { view, now, busy, error, send } = useLiveRoom(code, initial, onFinished);
  const { play, muted, toggle } = useSfx();
  const move = (input: Record<string, unknown>) => void send({ ...input, step: view.step });
  const decided = Object.values(view.wins).some(wins => wins > view.hands / 2) || view.handNo >= view.hands;
  return (
    <WhotTable
      table={view} now={now} busy={busy} error={error} muted={muted} onToggleMute={toggle} play={play}
      onPlay={(card: number, call?: Shape) => move({ type: 'play', card, ...(call ? { call } : {}) })}
      onDraw={() => move({ type: 'draw' })}
      nextLabel={view.phase === 'between' ? (decided ? `Final result in ${secondsLeft(view.deadline, now, 9)}s…` : `Next hand in ${secondsLeft(view.deadline, now, 9)}s…`) : undefined}
    />
  );
}
