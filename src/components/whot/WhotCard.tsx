import type { Shape, Suit } from '@/lib/whot/cards';
import { cardById, powerOf, POWER_NAMES, SHAPE_NAMES } from '@/lib/whot/cards';

/** Classic Nigerian Whot cards: maroon shapes on cream, drawn as SVG so they stay crisp at any size. */

const INK = '#7a1420';
/** Short labels that fit the ribbon between the big shape and the corner index. */
const RIBBON: Record<Exclude<ReturnType<typeof powerOf>, null>, string> = { hold: 'HOLD ON', pick2: 'PICK 2', pick3: 'PICK 3', suspend: 'SUSPEND', market: 'MARKET', whot: 'WHOT' };

export function ShapeGlyph({ shape, size = 24, color = INK }: { shape: Suit; size?: number; color?: string }) {
  const common = { fill: color };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {shape === 'circle' && <circle cx="12" cy="12" r="10" {...common} />}
      {shape === 'triangle' && <path d="M12 2 L22.5 21 H1.5 Z" {...common} />}
      {shape === 'cross' && <path d="M8.5 2 h7 v6.5 H22 v7 h-6.5 V22 h-7 v-6.5 H2 v-7 h6.5 Z" {...common} />}
      {shape === 'square' && <rect x="2.5" y="2.5" width="19" height="19" rx="1.5" {...common} />}
      {shape === 'star' && <path d="M12 1.5 l3.1 6.9 7.4.7-5.6 5 1.7 7.4L12 17.7 5.4 21.5l1.7-7.4-5.6-5 7.4-.7Z" {...common} />}
      {shape === 'whot' && <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="900" fill={color}>W</text>}
    </svg>
  );
}

export function cardLabel(id: number): string {
  const card = cardById(id);
  if (card.suit === 'whot') return 'Whot 20 (wild)';
  const power = powerOf(card);
  return `${SHAPE_NAMES[card.suit]} ${card.value}${power ? ` (${POWER_NAMES[power]})` : ''}`;
}

/** A face-up card. Width drives everything; the height follows the 5:7 card ratio. */
export function CardFace({ id, width = 72 }: { id: number; width?: number }) {
  const card = cardById(id);
  const whot = card.suit === 'whot';
  const power = powerOf(card);
  return (
    <svg width={width} height={width * 1.4} viewBox="0 0 100 140" role="img" aria-label={cardLabel(id)}>
      <defs>
        <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#f3e7cf" /></linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="97" height="137" rx="9" fill="url(#cream)" stroke="#d6c4a1" strokeWidth="2" />
      <rect x="6" y="6" width="88" height="128" rx="6" fill="none" stroke={INK} strokeOpacity=".18" strokeWidth="1.2" />
      {/* Corners */}
      <text x="10" y="24" fontSize="19" fontWeight="900" fill={INK}>{card.value}</text>
      <g transform="translate(10 28) scale(0.55)"><Glyph suit={card.suit} /></g>
      <g transform="rotate(180 50 70)">
        <text x="10" y="24" fontSize="19" fontWeight="900" fill={INK}>{card.value}</text>
        <g transform="translate(10 28) scale(0.55)"><Glyph suit={card.suit} /></g>
      </g>
      {whot ? (
        <g>
          <circle cx="50" cy="70" r="27" fill={INK} />
          <text x="50" y="66" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fde68a" letterSpacing="1">WHOT</text>
          <text x="50" y="86" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff">20</text>
        </g>
      ) : (
        <g transform="translate(26 46) scale(2)"><Glyph suit={card.suit} /></g>
      )}
      {power && power !== 'whot' && (
        <g>
          <rect x="20" y="99" width="54" height="15" rx="7.5" fill={INK} />
          <text x="47" y="110" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fde68a" letterSpacing=".3">{RIBBON[power]}</text>
        </g>
      )}
    </svg>
  );
}

function Glyph({ suit }: { suit: Suit }) {
  if (suit === 'circle') return <circle cx="12" cy="12" r="10" fill={INK} />;
  if (suit === 'triangle') return <path d="M12 2 L22.5 21 H1.5 Z" fill={INK} />;
  if (suit === 'cross') return <path d="M8.5 2 h7 v6.5 H22 v7 h-6.5 V22 h-7 v-6.5 H2 v-7 h6.5 Z" fill={INK} />;
  if (suit === 'square') return <rect x="2.5" y="2.5" width="19" height="19" rx="1.5" fill={INK} />;
  if (suit === 'star') return <path d="M12 1.5 l3.1 6.9 7.4.7-5.6 5 1.7 7.4L12 17.7 5.4 21.5l1.7-7.4-5.6-5 7.4-.7Z" fill={INK} />;
  return <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="900" fill={INK}>W</text>;
}

/** The maroon back every Whot player knows. */
export function CardBack({ width = 72 }: { width?: number }) {
  return (
    <svg width={width} height={width * 1.4} viewBox="0 0 100 140" aria-hidden="true">
      <defs>
        <pattern id="weave" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#7a1420" /><rect width="5" height="10" fill="#8f1d2b" />
        </pattern>
      </defs>
      <rect x="1.5" y="1.5" width="97" height="137" rx="9" fill="url(#weave)" stroke="#4c0b14" strokeWidth="2" />
      <rect x="9" y="9" width="82" height="122" rx="6" fill="none" stroke="#fde68a" strokeOpacity=".55" strokeWidth="1.5" />
      <ellipse cx="50" cy="70" rx="30" ry="16" fill="#4c0b14" stroke="#fde68a" strokeWidth="1.5" />
      <text x="50" y="76" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fde68a" letterSpacing="2">WHOT</text>
    </svg>
  );
}

export const SHAPE_EMOJI: Record<Shape, string> = { circle: '⚪', triangle: '🔺', cross: '✚', square: '🟥', star: '⭐' };
