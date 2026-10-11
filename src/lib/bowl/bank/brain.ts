import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('brain');

export const BRAIN: BowlQuestion[] = [
  // Level 1: warm-up
  q('brn-01', 1, 'What comes next: 2, 4, 8, 16, …?', ['32', '24', '20', '18'], 'Each number doubles: 16 × 2 = 32.'),
  q('brn-02', 1, 'How many months of the year have 28 days?', ['All 12', '1', '4', '7'], 'Every month has at least 28 days; February just stops there.'),
  q('brn-03', 1, 'There are 3 apples on a table and you take away 2. How many apples do you have?', ['2', '1', '3', '5'], 'You took 2, so you have 2. One is still on the table.'),
  q('brn-04', 1, 'A farmer has 17 goats. All but 9 run away. How many goats are left?', ['9', '8', '17', '0'], '“All but 9” means 9 stayed.'),
  q('brn-05', 1, 'What comes next: 1, 1, 2, 3, 5, 8, …?', ['13', '11', '12', '16'], 'Add the last two numbers: 5 + 8 = 13 (the Fibonacci sequence).'),
  q('brn-06', 1, 'A dozen eggs cost ₦2,400. How much do 3 eggs cost?', ['₦600', '₦800', '₦300', '₦720'], 'One egg is ₦2,400 ÷ 12 = ₦200, so 3 eggs cost ₦600.'),
  q('brn-07', 1, 'Which word is always spelled incorrectly in a dictionary?', ['Incorrectly', 'Misspelled', 'Dictionary', 'Wrongly'], 'It’s a word trick: the word “incorrectly” is always spelled that way.'),
  q('brn-08', 1, 'What has keys but cannot open locks?', ['A piano', 'A door', 'A safe', 'A car'], 'A piano’s keys make music, not open doors.'),
  q('brn-09', 1, 'How many sides do a triangle and a square have altogether?', ['7', '6', '8', '5'], 'A triangle has 3 sides and a square has 4: 3 + 4 = 7.'),
  q('brn-10', 1, 'If today is Monday, what day of the week will it be in 10 days?', ['Thursday', 'Wednesday', 'Friday', 'Tuesday'], '7 days brings you back to Monday; 3 more days is Thursday.'),

  // Level 2: contender
  q('brn-11', 2, 'A bat and a ball cost ₦110 in total. The bat costs ₦100 more than the ball. How much is the ball?', ['₦5', '₦10', '₦15', '₦20'], 'Ball ₦5 + bat ₦105 = ₦110. A ₦10 ball makes the total ₦120.'),
  q('brn-12', 2, 'What comes next: 2, 6, 12, 20, 30, …?', ['42', '40', '36', '44'], 'The gaps grow by 2 (4, 6, 8, 10, 12): 30 + 12 = 42.'),
  q('brn-13', 2, 'If 5 machines make 5 widgets in 5 minutes, how long would 100 machines take to make 100 widgets?', ['5 minutes', '100 minutes', '20 minutes', '1 minute'], 'Each machine makes 1 widget in 5 minutes, however many machines there are.'),
  q('brn-14', 2, 'A patch of lilies doubles in size every day. It covers the whole pond on day 48. On which day did it cover half the pond?', ['Day 47', 'Day 24', 'Day 46', 'Day 12'], 'It doubles overnight, so it was half the size one day earlier.'),
  q('brn-15', 2, 'Mary’s father has five daughters: Nana, Nene, Nini and Nono. What is the fifth daughter’s name?', ['Mary', 'Nunu', 'Nina', 'Nana'], 'The question opens with her name: Mary.'),
  q('brn-16', 2, 'What comes next: 1, 4, 9, 16, 25, …?', ['36', '30', '35', '49'], 'They are square numbers: 6 × 6 = 36.'),
  q('brn-17', 2, 'What is 25% of 80% of 200?', ['40', '50', '60', '160'], '80% of 200 is 160, and a quarter of 160 is 40.'),
  q('brn-18', 2, 'A brick weighs 1 kg plus half a brick. How much does one whole brick weigh?', ['2 kg', '1.5 kg', '1 kg', '3 kg'], 'If 1 kg is half the brick, the whole brick is 2 kg.'),
  q('brn-19', 2, 'What letter comes next: J, F, M, A, M, J, …?', ['J', 'A', 'S', 'M'], 'They are the months’ first letters; after June comes July.'),
  q('brn-20', 2, 'Two fathers and two sons go fishing. Each catches one fish, yet only 3 fish are caught. How many people went fishing?', ['3', '4', '2', '5'], 'A grandfather, his son and his grandson: two fathers and two sons.'),
  q('brn-21', 2, 'A bus leaves at 10:45 and the journey takes 2 hours 35 minutes. What time does it arrive?', ['13:20', '13:10', '12:20', '13:30'], '10:45 + 2 h = 12:45, then + 35 min = 13:20.'),
  q('brn-22', 2, 'What comes next: 3, 6, 11, 18, 27, …?', ['38', '36', '37', '40'], 'The gaps are odd numbers 3, 5, 7, 9, so add 11: 27 + 11 = 38.'),

  // Level 3: champion
  q('brn-23', 3, 'A clock takes 5 seconds to strike 6 o’clock. How long does it take to strike 12 o’clock?', ['11 seconds', '10 seconds', '12 seconds', '6 seconds'], '6 strikes have 5 one-second gaps; 12 strikes have 11 gaps.'),
  q('brn-24', 3, 'Which of these numbers is prime?', ['97', '91', '87', '51'], '91 = 7 × 13, 87 = 3 × 29 and 51 = 3 × 17. Only 97 is prime.'),
  q('brn-25', 3, 'If you write every whole number from 1 to 100, how many times do you write the digit 9?', ['20', '10', '19', '11'], '10 in the units (9, 19 … 99) plus 10 in the tens (90 … 99) = 20.'),
  q('brn-26', 3, 'A snail climbs 3 m up a 10 m wall each day and slips back 2 m each night. On which day does it reach the top?', ['Day 8', 'Day 10', 'Day 7', 'Day 9'], 'After 7 nights it is at 7 m; on day 8 it climbs 3 m to the top.'),
  q('brn-27', 3, 'What comes next: 1, 11, 21, 1211, 111221, …?', ['312211', '1112221', '111222', '122111'], 'Read the last term aloud: three 1s, two 2s, one 1 = 312211.'),
  q('brn-28', 3, 'A boy has as many brothers as sisters. Each of his sisters has twice as many brothers as sisters. How many children are there?', ['7', '5', '6', '9'], '4 boys and 3 girls: each boy sees 3 and 3; each girl sees 4 and 2.'),
  q('brn-29', 3, 'Rearrange the letters of “LISTEN” to make a word that means quiet.', ['SILENT', 'TINSEL', 'ENLIST', 'INLETS'], 'All four use the same letters, but only “silent” means quiet.'),
  q('brn-30', 3, 'What is the smallest whole number that divides exactly by 2, 3, 4, 5 and 6?', ['60', '30', '120', '720'], '4 × 3 × 5 = 60 covers every factor. 30 fails because it is not divisible by 4.'),
  q('brn-31', 3, 'A shop cuts a price by 20%, then raises the new price by 20%. Overall, how has the price changed?', ['4% lower', 'No change', '4% higher', '2% lower'], '₦100 → ₦80 → ₦96, so it ends 4% below where it started.'),
  q('brn-32', 3, 'What comes next: 1, 2, 6, 24, 120, …?', ['720', '240', '600', '144'], 'Multiply by 2, 3, 4, 5, then 6: 120 × 6 = 720.'),
];
