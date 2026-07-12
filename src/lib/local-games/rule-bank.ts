import { normalize } from './logic';

export interface HiddenRule {
  id: string;
  kind: 'number' | 'word';
  name: string;
  desc: string;
  examples: string[];
  rejects: string[];
}

export const RULES: HiddenRule[] = [
  { kind: 'number', name: 'Even numbers', desc: 'The number is divisible by 2.', examples: ['2', '18', '44'], rejects: ['3', '17', '41'], id: 'even' },
  { kind: 'number', name: 'Multiples of 3', desc: 'The number is divisible by 3.', examples: ['3', '21', '48'], rejects: ['10', '22', '50'], id: 'm3' },
  { kind: 'number', name: 'Numbers ending in 5', desc: 'The final digit is 5.', examples: ['5', '35', '105'], rejects: ['15.2', '54', '100'], id: 'end5' },
  { kind: 'number', name: 'Numbers containing 7', desc: 'At least one digit is 7.', examples: ['7', '27', '704'], rejects: ['16', '28', '400'], id: 'has7' },
  { kind: 'number', name: 'Perfect squares', desc: 'The number is an integer multiplied by itself.', examples: ['4', '25', '144'], rejects: ['8', '20', '145'], id: 'square' },
  { kind: 'number', name: 'Prime numbers', desc: 'A whole number greater than 1 with exactly two divisors.', examples: ['2', '17', '43'], rejects: ['1', '21', '49'], id: 'prime' },
  { kind: 'number', name: 'Digit sum equals 10', desc: 'All digits add up to 10.', examples: ['19', '55', '109'], rejects: ['29', '44', '101'], id: 'sum10' },
  { kind: 'number', name: 'Even numbers greater than 50', desc: 'The number is even and above 50.', examples: ['52', '88', '104'], rejects: ['48', '51', '77'], id: 'even50' },
  { kind: 'number', name: 'Two-digit palindromes', desc: 'A two-digit number reads the same backward.', examples: ['11', '44', '99'], rejects: ['12', '101', '9'], id: 'pal2' },
  { kind: 'number', name: 'Triangular numbers', desc: 'The number can be written as 1+2+...+n.', examples: ['3', '10', '21'], rejects: ['4', '12', '22'], id: 'tri' },
  { kind: 'number', name: 'Powers of two', desc: 'The number is 2 multiplied by itself repeatedly.', examples: ['2', '8', '64'], rejects: ['6', '24', '60'], id: 'pow2' },
  { kind: 'number', name: 'Numbers with exactly three digits', desc: 'The absolute whole number has three digits.', examples: ['100', '450', '999'], rejects: ['99', '1000', '8'], id: 'three' },
  { kind: 'word', name: 'Words containing E', desc: 'The word contains the letter e.', examples: ['tree', 'planet', 'game'], rejects: ['cloud', 'music', 'rain'], id: 'hasE' },
  { kind: 'word', name: 'Words longer than six letters', desc: 'The word has at least seven letters.', examples: ['journey', 'picture', 'diamond'], rejects: ['school', 'river', 'orange'], id: 'long6' },
  { kind: 'word', name: 'Words with exactly two vowels', desc: 'The word contains exactly two vowel letters.', examples: ['planet', 'music', 'table'], rejects: ['sky', 'banana', 'cat'], id: 'twoV' },
  { kind: 'word', name: 'Palindromes', desc: 'The word reads the same forward and backward.', examples: ['level', 'radar', 'civic'], rejects: ['river', 'paper', 'house'], id: 'pal' },
  { kind: 'word', name: 'Words starting and ending with the same letter', desc: 'The first and last letters match.', examples: ['level', 'radar', 'agenda'], rejects: ['table', 'music', 'cloud'], id: 'sameEnds' },
  { kind: 'word', name: 'Words with a double letter', desc: 'The word contains the same letter twice in a row.', examples: ['coffee', 'letter', 'balloon'], rejects: ['planet', 'river', 'music'], id: 'double' },
  { kind: 'word', name: 'Words beginning with S', desc: 'The first letter is s.', examples: ['school', 'summer', 'stone'], rejects: ['music', 'cloud', 'river'], id: 'startsS' },
  { kind: 'word', name: 'Words ending in ING', desc: 'The final three letters are ing.', examples: ['running', 'thinking', 'building'], rejects: ['runner', 'thought', 'build'], id: 'ing' },
  { kind: 'word', name: 'Words with no letter A', desc: 'The word does not contain the letter a.', examples: ['music', 'river', 'phone'], rejects: ['planet', 'game', 'table'], id: 'noA' },
  { kind: 'word', name: 'Five-letter words', desc: 'The word contains exactly five letters.', examples: ['house', 'river', 'cloud'], rejects: ['tree', 'planet', 'school'], id: 'five' },
  { kind: 'word', name: 'Words with three or more vowels', desc: 'The word contains at least three vowel letters.', examples: ['banana', 'education', 'beautiful'], rejects: ['plant', 'music', 'tree'], id: 'threeV' },
  { kind: 'word', name: 'Words in alphabetical letter order', desc: 'Each letter is the same as or later than the previous letter alphabetically.', examples: ['almost', 'billowy', 'chintz'], rejects: ['zebra', 'river', 'table'], id: 'alpha' },
];

export function ruleAccepts(rule: HiddenRule, val: string): boolean {
  const raw = String(val).trim();
  const w = normalize(raw);
  const n = Number(raw);
  switch (rule.id) {
    case 'even': return Number.isInteger(n) && n % 2 === 0;
    case 'm3': return Number.isInteger(n) && n % 3 === 0;
    case 'end5': return Number.isInteger(n) && Math.abs(n) % 10 === 5;
    case 'has7': return Number.isFinite(n) && raw.includes('7');
    case 'square': return Number.isInteger(n) && n >= 0 && Number.isInteger(Math.sqrt(n));
    case 'prime': {
      if (!Number.isInteger(n) || n < 2) return false;
      for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
      return true;
    }
    case 'sum10':
      return Number.isFinite(n) && raw.replace(/\D/g, '').split('').reduce((s, d) => s + Number(d), 0) === 10;
    case 'even50': return Number.isInteger(n) && n > 50 && n % 2 === 0;
    case 'pal2': return /^([1-9])\1$/.test(raw);
    case 'tri': {
      if (!Number.isInteger(n) || n < 1) return false;
      return Number.isInteger((Math.sqrt(8 * n + 1) - 1) / 2);
    }
    case 'pow2': return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
    case 'three': return Number.isInteger(n) && Math.abs(n) >= 100 && Math.abs(n) <= 999;
    case 'hasE': return w.includes('e');
    case 'long6': return /^[a-z]+$/.test(w) && w.length >= 7;
    case 'twoV': return (w.match(/[aeiou]/g) || []).length === 2;
    case 'pal': return w.length > 1 && w === w.split('').reverse().join('');
    case 'sameEnds': return w.length > 1 && w[0] === w[w.length - 1];
    case 'double': return /(.)\1/.test(w);
    case 'startsS': return w.startsWith('s');
    case 'ing': return w.endsWith('ing');
    case 'noA': return /^[a-z]+$/.test(w) && !w.includes('a');
    case 'five': return /^[a-z]+$/.test(w) && w.length === 5;
    case 'threeV': return (w.match(/[aeiou]/g) || []).length >= 3;
    case 'alpha':
      return /^[a-z]+$/.test(w) && w.split('').every((c, i) => i === 0 || w.charCodeAt(i) >= w.charCodeAt(i - 1));
  }
  return false;
}
