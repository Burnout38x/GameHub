import { bankFor, type Dilemma } from '../types';

const d = bankFor('money');

export const MONEY: Dilemma[] = [
  d('mon-01', 'Your boss takes credit for your project in front of the CEO, right after you stayed up three nights finishing it. What do you do?', [
    'Correct them politely in the meeting',
    'Email the CEO your contributions later',
    'Confront your boss privately',
    'Let it go and start job hunting',
  ]),
  d('mon-02', 'You receive ₦5 million by mistake into your account. The bank hasn’t noticed after a week. What do you do?', [
    'Report it to the bank immediately',
    'Wait and see if anyone asks',
    'Move it to savings, just in case',
    'Spend a little, it might be fate',
  ]),
  d('mon-03', 'You get two job offers: one pays ₦1.2m monthly with a toxic boss, the other ₦600k with a great team and remote work. What do you do?', [
    'Take the ₦1.2m and endure',
    'Take the ₦600k and peace',
    'Use one offer to negotiate the other',
    'Take the ₦1.2m and plan your exit',
  ]),
  d('mon-04', 'Your business partner has been quietly taking extra money from the account to “cover expenses.” Business is good otherwise. What do you do?', [
    'Confront them with the records',
    'Bring in an accountant first',
    'Dissolve the partnership',
    'Quietly start doing the same',
  ]),
  d('mon-05', 'A colleague who just got fired asks you to share company client contacts with them. They’re a close friend. What do you do?', [
    'Share them, friends help friends',
    'Refuse, it’s against policy',
    'Share only public information',
    'Tell them to ask HR officially',
  ]),
  d('mon-06', 'You win ₦50 million in a lottery. Nobody knows yet. What do you do first?', [
    'Tell no one, ever',
    'Tell only your closest family',
    'Quit your job right away',
    'Invest it all before telling anyone',
  ]),
  d('mon-07', 'Your side hustle is making more than your 9-to-5. Your company policy bans side businesses. What do you do?', [
    'Quit and go full-time on the hustle',
    'Keep both quietly',
    'Tell HR and ask for permission',
    'Slow the hustle until you’re ready',
  ]),
  d('mon-08', 'A recruiter offers you a japa job in the UK, but your current employer just promised you a big promotion next month. What do you do?', [
    'Take the UK offer, japa time',
    'Wait for the promotion',
    'Use the offer to push for more pay',
    'Ask for a year’s sabbatical instead',
  ]),
  d('mon-09', 'Your boss asks you to backdate some documents for an audit. They promise it’s “just this once.” What do you do?', [
    'Refuse firmly',
    'Do it this once',
    'Do it but keep records for protection',
    'Report it anonymously',
  ]),
  d('mon-10', 'A friend invites you into an investment promising 40% monthly returns. Two people you know already got paid. What do you do?', [
    'Invest a small amount to test',
    'Stay far away, it’s a Ponzi',
    'Invest big while it’s still paying',
    'Warn everyone you know about it',
  ]),
  d('mon-11', 'You discover a coworker doing the same job earns ₦300,000 more than you monthly. What do you do?', [
    'Ask your boss for a raise',
    'Start looking for another job',
    'Ask HR for a salary review',
    'Work less until it’s fixed',
  ]),
  d('mon-12', 'Your manager offers you a promotion if you help push out a struggling teammate. What do you do?', [
    'Accept the deal',
    'Refuse and warn the teammate',
    'Refuse and report the manager',
    'Accept but quietly help the teammate',
  ]),
  d('mon-13', 'You owe a friend ₦200,000 and finally have the money, but you also need ₦200,000 for an urgent rent increase. What do you do?', [
    'Pay the friend first',
    'Pay the rent and explain to your friend',
    'Split it between both',
    'Borrow from someone else for one',
  ]),
  d('mon-14', 'Your landlord increases rent by 100% overnight. You have two months to decide. What do you do?', [
    'Pay it, moving is stressful',
    'Negotiate hard with the landlord',
    'Move farther out to save money',
    'Get a roommate to split it',
  ]),
  d('mon-15', 'A big client offers you a huge contract if you send a “thank you” bonus to their personal account. What do you do?', [
    'Pay it, that’s how business works',
    'Decline the contract',
    'Negotiate a smaller “thank you”',
    'Report it to their company',
  ]),
  d('mon-16', 'Your company announces layoffs. You’re safe, but your work bestie isn’t. You heard it before they did. What do you do?', [
    'Warn them secretly right away',
    'Stay silent and let HR tell them',
    'Hint they should update their CV',
    'Fight to save their job',
  ]),
  d('mon-17', 'You’ve saved ₦10 million. Your choices: buy land, start a business, or invest abroad. What do you do?', [
    'Buy land, land never loses value',
    'Start your own business',
    'Invest in dollars abroad',
    'Keep it and wait for the right time',
  ]),
  d('mon-18', 'Your boss calls at 11pm asking you to fix something urgently, but you’re at your best friend’s birthday dinner. What do you do?', [
    'Leave and fix it right away',
    'Fix it from your phone at the table',
    'Ignore the call till morning',
    'Promise to fix it first thing tomorrow',
  ]),
  d('mon-19', 'You’re offered a ₦20 million deal to sell your small business. It’s your baby, but the money is life-changing. What do you do?', [
    'Sell and enjoy life',
    'Refuse, it’s worth more to you',
    'Sell part and stay on as a partner',
    'Counteroffer for double',
  ]),
  d('mon-20', 'Your new startup boss offers equity instead of half your salary. They promise you’ll be rich in five years. What do you do?', [
    'Take the equity gamble',
    'Insist on full salary',
    'Negotiate a mix of both',
    'Walk away from the offer',
  ]),
];
