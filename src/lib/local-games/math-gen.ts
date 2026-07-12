import { shuffle } from '@/lib/game-utils';

export interface MathProblem {
  type: string;
  text: string;
  answer: number;
  options: number[];
}

function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function uniqueOptions(answer: number, spread = 10): number[] {
  const set = new Set([answer]);
  while (set.size < 4) {
    const v = answer + rand(-spread, spread);
    if (v !== answer && v >= -999) set.add(v);
  }
  return shuffle(Array.from(set));
}

export function makeProblem(level: string): MathProblem {
  const mode = level === 'mixed' ? ['easy', 'medium', 'hard'][rand(0, 2)] : level;
  if (mode === 'easy') {
    const op = ['+', '−', '×'][rand(0, 2)];
    let a = rand(2, 25);
    let b = rand(2, 15);
    let ans: number;
    if (op === '+') ans = a + b;
    else if (op === '×') {
      a = rand(2, 12);
      b = rand(2, 12);
      ans = a * b;
    } else {
      if (b > a) [a, b] = [b, a];
      ans = a - b;
    }
    return { type: 'Easy arithmetic', text: `${a} ${op} ${b} = ?`, answer: ans, options: uniqueOptions(ans, 8) };
  }
  if (mode === 'medium') {
    if (Math.random() < 0.5) {
      const a = rand(10, 40);
      const b = rand(2, 9);
      const c = rand(2, 12);
      const ans = a + b * c;
      return { type: 'Order of operations', text: `${a} + ${b} × ${c} = ?`, answer: ans, options: uniqueOptions(ans, 15) };
    }
    const start = rand(2, 12);
    const step = rand(2, 9);
    const seq = [start, start + step, start + step * 2, start + step * 3];
    const ans = start + step * 4;
    return { type: 'Number sequence', text: `${seq.join(', ')}, ?`, answer: ans, options: uniqueOptions(ans, 12) };
  }
  const choice = rand(0, 2);
  if (choice === 0) {
    const a = rand(12, 35);
    const b = rand(3, 12);
    const c = rand(2, 8);
    const ans = (a - b) * c;
    return { type: 'Multi-step arithmetic', text: `(${a} − ${b}) × ${c} = ?`, answer: ans, options: uniqueOptions(ans, 24) };
  }
  if (choice === 1) {
    const n = rand(8, 20);
    const ans = (n * (n + 1)) / 2;
    return { type: 'Pattern sum', text: `1 + 2 + 3 + … + ${n} = ?`, answer: ans, options: uniqueOptions(ans, 30) };
  }
  const base = rand(3, 8);
  const exp = rand(2, 3);
  const ans = Math.pow(base, exp);
  return { type: 'Powers', text: `${base}${exp === 2 ? '²' : '³'} = ?`, answer: ans, options: uniqueOptions(ans, 18) };
}
