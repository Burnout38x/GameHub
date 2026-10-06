import './dom-environment';
import React, { act } from 'react';
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { render, fireEvent, cleanup, type RenderResult } from '@testing-library/react';
import Code from '../src/app/games/local/code-crackers/page';
import Partner from '../src/app/games/local/know-your-partner/page';
import MathDuel from '../src/app/games/local/mental-math-duel/page';
import Mystery from '../src/app/games/local/mystery-card/page';
import Reverse from '../src/app/games/local/reverse-definition/page';
import Rule from '../src/app/games/local/rule-discoverer/page';
import Memories from '../src/app/games/local/who-remembers/page';
import Chain from '../src/app/games/local/word-chain/page';
import { MYSTERY_QUESTIONS } from '../src/lib/local-games/mystery-questions';
import { REVERSE_CLUES } from '../src/lib/local-games/reverse-definition-bank';
import { RULES } from '../src/lib/local-games/rule-bank';

// Exercise real React DOM components through DOM events; no browser or live database.
class DomNode {
  constructor(readonly element: Element) {}
  get type() { return this.element.tagName.toLowerCase(); }
  get props(): Record<string, unknown> {
    return {
      ...Object.fromEntries(Array.from(this.element.attributes).map((attribute) => [attribute.name, attribute.value])),
      className: this.element.getAttribute('class') ?? '',
      disabled: 'disabled' in this.element && Boolean((this.element as HTMLButtonElement).disabled),
    };
  }
  get children(): (DomNode | string)[] {
    return Array.from(this.element.childNodes).flatMap<DomNode | string>((node) => node.nodeType === 1 ? [new DomNode(node as Element)] : node.nodeType === 3 ? [node.textContent ?? ''] : []);
  }
  get parent(): DomNode | null { return this.element.parentElement ? new DomNode(this.element.parentElement) : null; }
  findAllByType(type: string) { return Array.from(this.element.querySelectorAll(type)).map((element) => new DomNode(element)); }
  findAll(predicate: (node: DomNode) => boolean) { return this.findAllByType('*').filter(predicate); }
  findByType(type: string) {
    const matches = this.findAllByType(type);
    assert.equal(matches.length, 1, `Expected exactly one ${type}`);
    return matches[0];
  }
}
function text(node: DomNode | string | number): string {
  return typeof node === 'object' ? node.element.textContent ?? '' : String(node);
}
function harness(t: TestContext, Page: React.ComponentType) {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; callback: () => void; interval: number }>();
  const schedule = (callback: () => void, delay: number = 0, interval = 0) => {
    const id = nextId++;
    timers.set(id, { at: now + delay, callback, interval });
    return id;
  };
  t.mock.method(globalThis, 'setTimeout', (callback: () => void, delay?: number) => schedule(callback, delay));
  t.mock.method(globalThis, 'setInterval', (callback: () => void, delay: number) => schedule(callback, delay, delay));
  t.mock.method(globalThis, 'clearTimeout', (id: number) => { timers.delete(id); });
  t.mock.method(globalThis, 'clearInterval', (id: number) => { timers.delete(id); });
  let seed = 777;
  t.mock.method(Math, 'random', () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
  const renderer: RenderResult = render(<Page />);
  t.after(() => { renderer.unmount(); cleanup(); });
  const root = () => new DomNode(renderer.container);
  const buttons = () => root().findAllByType('button');
  const clickNode = (node: DomNode) => {
    assert.ok(!node.props.disabled, `Button disabled: ${text(node)}`);
    fireEvent.click(node.element);
  };
  const click = (label: string) => {
    const button = buttons().find((b) => text(b) === label || text(b).includes(label));
    assert.ok(button, `Missing button: ${label}; screen: ${text(root())}`);
    clickNode(button);
  };
  const change = (id: string, value: string) => {
    const input = root().findAll((node) => ['input', 'select', 'textarea'].includes(String(node.type)) && (node.props.id === id || node.props['aria-label'] === id))[0];
    assert.ok(input, `Missing control ${id}`);
    fireEvent.change(input.element, { target: { value } });
  };
  const tick = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      now = timer.at;
      if (timer.interval) timer.at += timer.interval; else timers.delete(id);
      act(() => timer.callback());
    }
    now = end;
  };
  const submitForm = () => fireEvent.submit(root().findByType('form').element);
  const screen = () => text(root());
  return { root, buttons, click, clickNode, change, tick, screen, submitForm, timers, renderer };
}

function replay(h: ReturnType<typeof harness>, title: string) {
  h.click('Play again');
  assert.ok(h.screen().includes(title));
  assert.ok(h.buttons().some((b) => text(b).startsWith('Start')));
}

test('Code Crackers completes three rounds, rotates starter, scores and replays', (t) => {
  const h = harness(t, Code);
  t.mock.method(Math, 'random', () => 0);
  h.change('dupes', 'yes');
  h.click('Start game');
  for (let round = 0; round < 3; round++) {
    assert.ok(h.screen().includes(`Player ${round % 2 + 1}'s turn`));
    for (let digit = 0; digit < 4; digit++) h.clickNode(h.buttons().find((b) => text(b) === '0')!);
    h.click('Submit guess');
    assert.ok(h.screen().includes('cracked it! +190 points'));
    h.tick(1500);
  }
  assert.ok(h.screen().includes('380 points'));
  replay(h, 'Code Crackers');
});

test('Know Your Partner protects handoffs and reveals every answer after each role', (t) => {
  const h = harness(t, Partner);
  h.change('count', '5');
  h.click('Start game');
  for (let role = 0; role < 2; role++) {
    const saved: string[] = [];
    for (let question = 0; question < 5; question++) {
      const button = h.buttons().find((b) => String(b.props.className).includes('option-btn'))!;
      saved.push(text(button));
      h.clickNode(button);
    }
    assert.ok(h.screen().includes('Private answers saved'));
    for (const answer of saved) assert.ok(!h.screen().includes(answer), 'private answer leaked on handoff');
    h.click("I'm ready");
    for (const answer of saved) h.click(answer);
    assert.ok(h.screen().includes('guessed 5 of 5'));
    assert.equal(h.root().findAllByType('p').filter((p) => text(p).includes(' answered: ')).length, 5);
    h.click(role === 0 ? 'Switch roles' : 'See final result');
  }
  assert.ok(h.screen().includes('Combined accuracy: 100%'));
  replay(h, 'Know Your Partner');
});

function mathAnswer(h: ReturnType<typeof harness>) {
  const exprNode = h.root().findAllByType('div').find((n) => n.children.length === 1 && typeof n.children[0] === 'string' && / = \?$/.test(n.children[0]));
  assert.ok(exprNode);
  const expr = text(exprNode).replace(' = ?', '').replaceAll('×', '*').replaceAll('−', '-');
  assert.match(expr, /^[\d\s()+*\-]+$/);
  return Number(Function(`return (${expr})`)());
}

test('Mental Math prevents stale locks crossing rounds and completes a duel', (t) => {
  const h = harness(t, MathDuel);
  h.change('difficulty', 'easy'); h.change('rounds', '10'); h.click('Start duel');
  let answer = mathAnswer(h);
  const choices = () => h.buttons().filter((b) => String(b.props.className).includes('option-btn'));
  h.clickNode(choices().slice(0, 4).find((b) => Number(text(b)) !== answer)!);
  h.tick(200);
  h.clickNode(choices().slice(4).find((b) => Number(text(b)) === answer)!);
  h.tick(1100);
  answer = mathAnswer(h);
  h.tick(200);
  h.clickNode(choices().slice(0, 4).find((b) => Number(text(b)) !== answer)!);
  h.tick(1500); // Prior round's old unlock would have fired now.
  assert.ok(choices().slice(0, 4).every((b) => b.props.disabled));
  h.tick(1500);
  assert.ok(choices().slice(0, 4).every((b) => !b.props.disabled));
  for (let round = 1; round < 10; round++) {
    answer = mathAnswer(h);
    h.clickNode(choices().find((b) => Number(text(b)) === answer)!);
    h.tick(1100);
  }
  assert.ok(h.screen().includes('Duel complete'));
  replay(h, 'Mental Math Duel');
});

test('Mystery Card race locks wrong players, scores winner, finishes and replays', (t) => {
  const h = harness(t, Mystery);
  h.change('rounds', '5'); h.click('Start game');
  for (let round = 0; round < 5; round++) {
    const q = MYSTERY_QUESTIONS.find((q) => h.screen().includes(q.clue))!;
    assert.ok(q);
    const playerButtons = () => h.buttons().filter((b) => text(b) === 'Player 1');
    const wrong = playerButtons().find((b) => !text(b.parent!.parent!).includes(q.answer))!;
    if (round === 0) {
      h.clickNode(wrong);
      assert.ok(playerButtons().every((b) => b.props.disabled));
    }
    const player = round === 0 ? 'Player 2' : 'Player 1';
    h.clickNode(h.buttons().find((b) => text(b) === player && text(b.parent!.parent!).includes(q.answer))!);
    assert.ok(h.screen().includes('wins the round!'));
    h.tick(1500);
  }
  assert.ok(h.screen().includes('Game complete'));
  replay(h, 'Mystery Card');
});

test('Reverse Definition handles expired buzz, other player win and full 15-question game', (t) => {
  const h = harness(t, Reverse);
  h.change('difficulty', 'expert'); h.change('count', '15'); h.click('Start game');
  for (let round = 0; round < 15; round++) {
    const q = REVERSE_CLUES.find((q) => h.screen().includes(q.clue))!;
    assert.ok(q);
    h.click('🔔 Player 1');
    if (round === 0) {
      h.tick(8000);
      assert.ok(h.buttons().find((b) => text(b) === '🔔 Player 1')!.props.disabled);
      h.click('🔔 Player 2');
    }
    h.clickNode(h.buttons().find((b) => text(b).endsWith('. ' + q.answer))!);
    assert.ok(h.screen().includes('Correct!'));
    h.tick(1300);
  }
  assert.ok(h.screen().includes('Definitions decoded'));
  replay(h, 'Reverse Definition');
});

test('Rule Discoverer rotates after testing evidence, scores correct guesses and replays', (t) => {
  const h = harness(t, Rule);
  t.mock.method(Math, 'random', () => 0);
  h.change('type', 'number'); h.click('Start game');
  for (let round = 0; round < 3; round++) {
    const rule = RULES.filter((r) => r.kind === 'number')[round];
    h.change('Example to test against the rule', rule.examples[0]); h.submitForm();
    assert.ok(h.screen().includes('is accepted'));
    h.tick(900);
    h.click('Guess the rule');
    h.clickNode(h.buttons().find((b) => text(b).startsWith(rule.name))!);
    assert.ok(h.screen().includes('+100 points'));
    h.tick(1400);
  }
  assert.ok(h.screen().includes('100 points'));
  replay(h, 'Rule Discoverer');
});

test('Who Remembers keeps private answers hidden and lets players reject fuzzy matches', (t) => {
  const h = harness(t, Memories);
  h.change('count', '5'); h.click('Start game');
  for (let round = 0; round < 5; round++) {
    h.change('Your private answer', round === 0 ? 'cinema' : 'Paris'); h.click('Save private answer');
    assert.ok(h.screen().includes('Answer hidden'));
    assert.ok(!h.screen().includes(round === 0 ? 'cinema' : 'Paris'));
    h.click("I'm ready");
    h.change('Your private answer', round === 0 ? 'cinemma' : 'Paris'); h.click('Save private answer');
    if (round === 0) {
      assert.ok(h.screen().includes('look similar'));
      h.click('Different memories');
    } else h.tick(1500);
    if (round < 4) h.click("I'm ready");
  }
  assert.ok(h.screen().includes('4/5'));
  replay(h, 'Who Remembers It Better?');
});

test('Word Chain resolves a final-word challenge, reverses the award and replays', (t) => {
  const h = harness(t, Chain);
  h.change('turns', '15'); h.click('Start game');
  const words = ['apple','banana','carrot','donkey','eagle','forest','grape','house','island','jungle','kite','lemon','mountain','nest','orange'];
  for (const word of words) {
    h.change('Your connected word', word); h.submitForm(); h.tick(400);
  }
  assert.ok(h.screen().includes('Final word:'));
  h.click('Challenge last word');
  h.click('Weak connection');
  assert.ok(h.screen().includes('Challenge succeeds'));
  h.tick(1300);
  assert.ok(h.screen().includes('Chain complete'));
  assert.ok(h.screen().includes('120 points')); // Player 1: 5×22 +10 challenge.
  assert.ok(h.screen().includes('88 points')); // Player 3: final 22-point award removed.
  replay(h, 'Word Association Chain');
});

test('Code Crackers exhausts the guess limit and reports tied scores', (t) => {
  const h = harness(t, Code);
  t.mock.method(Math, 'random', () => 0);
  h.change('dupes', 'yes'); h.change('rounds', '1'); h.change('turns', '12'); h.click('Start game');
  for (let turn = 0; turn < 12; turn++) {
    for (let digit = 0; digit < 4; digit++) h.clickNode(h.buttons().find((b) => text(b) === '1')!);
    h.click('Submit guess');
  }
  assert.ok(h.screen().includes('No one cracked it. The code was 0000.'));
  h.tick(1800);
  assert.equal(h.root().findAllByType('div').filter((d) => d.children.length === 1 && d.children[0] === 'Joint winner').length, 2);
});

test('Mystery Card player-by-player mode gives both players equal turns', (t) => {
  const h = harness(t, Mystery);
  h.click('Player by player'); h.change('rounds', '2'); h.click('Start game');
  for (let round = 0; round < 4; round++) {
    assert.ok(h.screen().includes(`Player ${round % 2 + 1}'s turn`));
    const q = MYSTERY_QUESTIONS.find((q) => h.screen().includes(q.clue))!;
    h.clickNode(h.buttons().find((b) => text(b).endsWith('. ' + q.answer))!);
    h.tick(1500);
  }
  assert.ok(h.screen().includes('Game complete'));
  assert.equal(h.root().findAllByType('div').filter((d) => text(d) === '260 points').length, 2);
});

test('Partner instant reveal locks answers until feedback completes', (t) => {
  const h = harness(t, Partner);
  h.change('count', '5'); h.change('reveal', 'instant'); h.click('Start game');
  const answers: string[] = [];
  for (let q = 0; q < 5; q++) {
    const choice = h.buttons().find((b) => String(b.props.className).includes('option-btn'))!;
    answers.push(text(choice)); h.clickNode(choice);
  }
  h.click("I'm ready");
  for (const answer of answers) {
    h.click(answer);
    assert.ok(h.screen().includes('Correct guess!'));
    assert.ok(h.buttons().filter((b) => String(b.props.className).includes('option-btn')).every((b) => b.props.disabled));
    h.tick(1300);
  }
  assert.ok(h.screen().includes('guessed 5 of 5'));
});

test('Reverse Definition advances after every player misses without double scoring', (t) => {
  const h = harness(t, Reverse);
  h.click('Start game');
  const q = REVERSE_CLUES.find((q) => h.screen().includes(q.clue))!;
  for (let player = 1; player <= 3; player++) {
    h.click(`🔔 Player ${player}`);
    h.clickNode(h.buttons().find((b) => String(b.props.className).includes('option-btn') && !text(b).endsWith('. ' + q.answer))!);
  }
  assert.ok(h.screen().includes('No one solved it.'));
  h.tick(1500);
  assert.ok(h.screen().includes('Question 2 of 15'));
  assert.ok(h.buttons().filter((b) => text(b).startsWith('🔔')).every((b) => !b.props.disabled));
});

test('Word Chain rejects repeats, applies timeout penalties and ends cleanly', (t) => {
  const h = harness(t, Chain);
  h.change('turns', '15'); h.change('timer', '8'); h.click('Start game');
  h.change('Your connected word', 'kumquat'); h.submitForm(); h.tick(400);
  h.change('Your connected word', 'kumquat'); h.submitForm();
  assert.ok(h.screen().includes('already been used'));
  for (let turn = 1; turn < 15; turn++) h.tick(9000);
  assert.ok(h.screen().includes('Chain complete'));
  assert.ok(h.screen().includes('0 points'));
});

test('Mental Math advances expired puzzles and does not award timeout points', (t) => {
  const h = harness(t, MathDuel);
  h.change('rounds', '10'); h.change('timer', '10'); h.click('Start duel');
  for (let round = 0; round < 10; round++) {
    h.tick(10000);
    assert.ok(h.screen().includes('Time is up. The answer was'));
    h.tick(1200);
  }
  assert.ok(h.screen().includes('Duel complete'));
  assert.equal(h.root().findAllByType('div').filter((d) => text(d) === '0 points').length, 2);
});

test('Game transition callbacks are removed on unmount', (t) => {
  const h = harness(t, Rule);
  h.click('Start game');
  h.change('Example to test against the rule', 'test'); h.submitForm();
  const turnTimers = Array.from(h.timers).filter(([, timer]) => timer.at === 900).map(([id]) => id);
  assert.equal(turnTimers.length, 1, 'the pending turn transition is scheduled');
  act(() => h.renderer.unmount());
  assert.ok(turnTimers.every((id) => !h.timers.has(id)), 'the game transition is cancelled; DOM idle work is unrelated');
});
