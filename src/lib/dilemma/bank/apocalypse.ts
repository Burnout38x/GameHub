import { bankFor, type Dilemma } from '../types';

const d = bankFor('apocalypse');

export const APOCALYPSE: Dilemma[] = [
  d('apo-01', 'Zombies have overrun Lagos. Your cousin was bitten an hour ago, says he feels fine, and begs to stay in your locked flat. What do you do?', [
    'Let him stay and watch him closely',
    'Lock him in a separate room',
    'Send him away with food and water',
    'Leave the flat to him and run',
  ]),
  d('apo-02', 'A nationwide blackout has lasted three weeks. Your neighbour’s generator is the only one on the street, and he’s charging people a fortune to use it. What do you do?', [
    'Pay up and keep your phone alive',
    'Organise the street to share fuel costs',
    'Quietly siphon his fuel at night',
    'Go fully off-grid and stop needing it',
  ]),
  d('apo-03', 'You have the last seat on the final evacuation plane. Your elderly mother can’t come, but your best friend’s pregnant wife can take the seat instead. What do you do?', [
    'Take the seat yourself',
    'Give it to the pregnant woman',
    'Stay behind with your mother',
    'Try to bribe your way to a second seat',
  ]),
  d('apo-04', 'Aliens land in the middle of a football field and ask, through a translator, for one human volunteer to come aboard. Nobody steps forward. What do you do?', [
    'Volunteer, this is history',
    'Run home and lock the doors',
    'Film everything and go viral',
    'Nominate the loudest person present',
  ]),
  d('apo-05', 'Floodwater is rising through your estate. You can save your car, your important documents or your neighbour’s three goats before the road closes. What do you save?', [
    'The car, it cost everything',
    'The documents, paperwork is life',
    'The goats, your neighbour is stuck abroad',
    'Nothing, just get yourself out',
  ]),
  d('apo-06', 'Your bunker holds ten people for a year. Twelve are inside and two must leave. The group wants a vote. How do you handle it?', [
    'Accept the vote, whatever happens',
    'Volunteer to leave yourself',
    'Insist on drawing lots instead',
    'Ration harder so all twelve stay',
  ]),
  d('apo-07', 'Scientists confirm an asteroid hits in 30 days. Banks are still open and nobody is checking loans anymore. What do you do?', [
    'Borrow big and live like a king',
    'Go home to family and change nothing',
    'Bet on the scientists being wrong',
    'Spend it all helping strangers',
  ]),
  d('apo-08', 'A family arrives at your barricaded gate at midnight. They have a sick child and nothing to trade. Your supplies are already tight. What do you do?', [
    'Let them all in',
    'Take in only the child',
    'Give them supplies and send them away',
    'Keep the gate shut and stay quiet',
  ]),
  d('apo-09', 'During a pandemic lockdown, your sister sneaks out every night to see her boyfriend, risking the whole household. Your parents don’t know. What do you do?', [
    'Tell your parents everything',
    'Confront her and threaten to tell',
    'Cover for her, love is love',
    'Make her quarantine in her room',
  ]),
  d('apo-10', 'Your survivor group finds a fully stocked supermarket guarded by an armed, friendly old man who says it’s his. What’s your move?', [
    'Trade fairly with him',
    'Invite him to join your group',
    'Wait until he sleeps and take some',
    'Leave him alone and keep searching',
  ]),
  d('apo-11', 'The zombie horde is coming. You can blow the only bridge to save your camp, but a group of survivors is still crossing it. What do you do?', [
    'Blow it now',
    'Wait for the survivors and risk it',
    'Run onto the bridge to hurry them',
    'Let someone else make the call',
  ]),
  d('apo-12', 'The internet is gone forever. Your group must choose one skill to master first. Which do you champion?', [
    'Farming and food',
    'Medicine and first aid',
    'Defence and weapons',
    'Engineering and power',
  ]),
  d('apo-13', 'Your group’s leader is calm and fair but slowly hoarding all the medicine for herself. Without her, the group would likely fall apart. What do you do?', [
    'Expose her to everyone',
    'Confront her privately',
    'Secretly take some medicine back',
    'Say nothing, order matters more',
  ]),
  d('apo-14', 'A radio broadcast promises a safe zone 400km away with food, power and doctors. It could be real, or a trap. What do you do?', [
    'Pack up and go immediately',
    'Send two scouts first',
    'Stay put, you’re surviving here',
    'Broadcast back and ask for proof',
  ]),
  d('apo-15', 'A stranger in your camp has a cure for the virus, but only one dose. He offers it to whoever gives him the most supplies. What do you do?', [
    'Outbid everyone for it',
    'Push for the group to choose who gets it',
    'Steal it and give it to the sickest',
    'Walk away, it could be fake',
  ]),
  d('apo-16', 'After months alone in the apocalypse, you meet a group that seems kind but has strict rules: no phones, no questions, total obedience. What do you do?', [
    'Join them, safety first',
    'Join and plan an exit quietly',
    'Politely decline and go solo',
    'Try to recruit a few to leave with you',
  ]),
  d('apo-17', 'The sun has gone dim and crops are failing. A rich man offers your family a place in his sealed dome, but you must work for him for life. Do you accept?', [
    'Accept for your family’s sake',
    'Refuse and take your chances outside',
    'Accept, then try to free others later',
    'Send your family in, stay out yourself',
  ]),
  d('apo-18', 'You’re hiding from robots that hunt by sound. Your friend’s phone is about to ring loudly and they’re asleep across the room. What do you do?', [
    'Dive across the room for it',
    'Throw something to knock it away',
    'Run in the opposite direction',
    'Freeze and pray it’s on silent',
  ]),
  d('apo-19', 'You can freeze yourself in a cryo pod and wake up in 100 years when the planet has healed. Your family can’t come. What do you do?', [
    'Go, someone has to survive',
    'Stay with family till the end',
    'Give the pod to your child instead',
    'Sell the pod for supplies everyone needs',
  ]),
  d('apo-20', 'Your group finally reaches a safe island, but the residents will only take people who bring a useful skill. Your oldest friend has none. What do you do?', [
    'Lie about their skills to get them in',
    'Stay behind with them',
    'Go in and promise to come back',
    'Teach them a skill fast on the boat',
  ]),
];
