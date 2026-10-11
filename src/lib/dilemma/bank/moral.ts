import { bankFor, type Dilemma } from '../types';

const d = bankFor('moral');

export const MORAL: Dilemma[] = [
  d('mor-01', 'You find ₦500,000 in an envelope in a taxi. There’s no name, but a receipt inside shows it was meant for someone’s hospital bill. What do you do?', [
    'Hand it to the police',
    'Try to find the owner yourself',
    'Keep it, finders keepers',
    'Pay the hospital bill directly',
  ]),
  d('mor-02', 'Your best friend is about to marry a man you saw kissing someone else last month. The wedding is next Saturday. What do you do?', [
    'Tell her everything right now',
    'Confront him first',
    'Stay out of it',
    'Drop anonymous hints',
  ]),
  d('mor-03', 'The final exam questions are leaked in your class WhatsApp group the night before. Everyone else is studying them. What do you do?', [
    'Study them too, everyone is',
    'Ignore them and read your notes',
    'Report the leak to the school',
    'Look once, just to compare',
  ]),
  d('mor-04', 'Your manager is quietly stealing from the company. If you report it, you could lose your job; if you don’t, you could be blamed later. What do you do?', [
    'Report it to the top',
    'Confront your manager privately',
    'Gather evidence and wait',
    'Keep your head down',
  ]),
  d('mor-05', 'Your friend cooks for you with love, but the food is truly terrible. She’s about to open a restaurant with her life savings. What do you do?', [
    'Tell her the honest truth',
    'Suggest she takes a cooking course',
    'Hype her up, it’s her dream',
    'Invest a little and stay quiet',
  ]),
  d('mor-06', 'A runaway truck is heading for five workers. You can swerve your car to block it, wrecking your new car but saving them. Nobody would blame you either way. What do you do?', [
    'Block it, cars can be replaced',
    'Honk and pray they hear',
    'Do nothing and call for help',
    'Swerve but jump out first',
  ]),
  d('mor-07', 'Your younger brother failed his exams and begs you to help forge his result before your father sees it. What do you do?', [
    'Help him forge it',
    'Refuse and tell your father',
    'Refuse but keep his secret',
    'Help him confess and stand with him',
  ]),
  d('mor-08', 'A cashier gives you ₦20,000 too much change. You only notice when you get home. The shop is 30 minutes away. What do you do?', [
    'Drive back and return it now',
    'Return it next time you pass',
    'Keep it, their mistake',
    'Give it to charity instead',
  ]),
  d('mor-09', 'Your close friend is cheating in your group’s football betting pool, winning money from everyone including you. What do you do?', [
    'Expose them in the group chat',
    'Confront them one-on-one',
    'Leave the pool quietly',
    'Demand a cut to stay quiet',
  ]),
  d('mor-10', 'Your grandmother is dying and asks if your parents have reconciled. They haven’t; they’re barely speaking. What do you tell her?', [
    'Lie and say yes, let her rest',
    'Tell her the truth gently',
    'Change the subject',
    'Get your parents in the room to answer',
  ]),
  d('mor-11', 'You can get your dream job if you claim a degree you didn’t finish. The company never checks. What do you do?', [
    'Claim the degree',
    'Tell the truth and risk it',
    'Say it’s “in progress”',
    'Pass and find another opening',
  ]),
  d('mor-12', 'A colleague takes credit for your idea in a big meeting. Your boss loves it and promotes the colleague. What do you do?', [
    'Call it out in the next meeting',
    'Tell the boss privately',
    'Let it go and do better next time',
    'Steal one of their ideas back',
  ]),
  d('mor-13', 'You witness a friend’s minor car accident. He was at fault and asks you to tell the police the other driver caused it. What do you do?', [
    'Back up his story',
    'Tell the truth',
    'Say you didn’t really see it',
    'Refuse to talk to the police',
  ]),
  d('mor-14', 'You discover the charity your church supports is mostly paying the founder’s bills. Exposing it might shut down the little good it does. What do you do?', [
    'Expose it publicly',
    'Tell the pastor privately',
    'Stop donating and say nothing',
    'Push for reform from the inside',
  ]),
  d('mor-15', 'Your landlord accidentally deposits a full year’s rent refund into your account. He’s rich and probably won’t notice. What do you do?', [
    'Return it immediately',
    'Wait to see if he notices',
    'Keep half, return half',
    'Keep it and say nothing',
  ]),
  d('mor-16', 'Your friend shares a secret: she’s planning to quit her job and move abroad. Her boss, who is also your friend, asks you directly if she’s leaving. What do you say?', [
    'Lie and say no',
    'Say “ask her yourself”',
    'Tell the boss the truth',
    'Warn your friend, then dodge',
  ]),
  d('mor-17', 'You can save your company ₦50 million by laying off ten people, including a single mother of three who works hard. What do you do?', [
    'Lay off all ten',
    'Spare the single mother only',
    'Cut everyone’s pay a little instead',
    'Take a pay cut yourself first',
  ]),
  d('mor-18', 'Your sibling is a struggling musician. A popular blogger offers to promote him if you write a fake glowing review of the blogger’s restaurant. What do you do?', [
    'Write the review',
    'Refuse outright',
    'Eat there first, then decide',
    'Ask your sibling what he wants',
  ]),
  d('mor-19', 'You see a classmate shoplifting baby formula. They look desperate. Security hasn’t noticed. What do you do?', [
    'Report them to security',
    'Pay for it yourself',
    'Look away and walk on',
    'Talk to them outside',
  ]),
  d('mor-20', 'You accidentally scratch a parked car. No one saw, and you’re already late for an interview. What do you do?', [
    'Leave a note with your number',
    'Wait for the owner, miss the interview',
    'Drive off, nobody saw',
    'Snap a photo and decide later',
  ]),
];
