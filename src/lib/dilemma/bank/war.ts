import { bankFor, type Dilemma } from '../types';

const d = bankFor('war');

export const WAR: Dilemma[] = [
  d('war-01', 'Your unit must cross a river at night. The only bridge might be rigged, and swimming means leaving the heavy radio behind. What do you do?', [
    'Risk the bridge with everything',
    'Swim and abandon the radio',
    'Send one scout over the bridge first',
    'Wait for daylight and lose the advantage',
  ]),
  d('war-02', 'Your squad has three days of food left and a week’s march to safety. A starving family begs you to share. What do you do?', [
    'Share equally and pray you make it',
    'Give them one day’s food, no more',
    'Refuse and keep marching',
    'Let the squad vote on it',
  ]),
  d('war-03', 'You capture a wounded enemy scout who says his unit will ambush your village at dawn. He could be lying to buy time. How do you play it?', [
    'Believe him and evacuate the village',
    'Treat his wounds and question him later',
    'Hand him to your commander and move on',
    'Set a counter-ambush using his tip',
  ]),
  d('war-04', 'Your best friend in the unit plans to desert tonight and asks you to cover for him at roll call. Getting caught means a court-martial for both of you. What do you do?', [
    'Cover for him without question',
    'Go with him',
    'Talk him out of it all night',
    'Quietly warn your sergeant',
  ]),
  d('war-05', 'You’re ordered to hold a hilltop until relief arrives. Ammo is nearly gone, relief is six hours late, and the enemy is regrouping below. What’s your call?', [
    'Hold the hill no matter what',
    'Retreat now while you still can',
    'Launch one bold attack to scatter them',
    'Send a runner and wait one more hour',
  ]),
  d('war-06', 'A rescue team can reach either a trapped school bus of children or your own wounded platoon, pinned down across town. There’s only time for one. Where do you send them?', [
    'The children, no debate',
    'Your platoon, they’re your people',
    'Split the team and risk failing both',
    'Go yourself to one and send the team to the other',
  ]),
  d('war-07', 'A smuggler offers to get your family across the border tonight for every naira you have. He’s known to sometimes take the money and vanish. What do you do?', [
    'Pay him and trust the gamble',
    'Pay half now, half on arrival',
    'Stay and wait for official evacuation',
    'Try to cross on foot by yourselves',
  ]),
  d('war-08', 'You find your commanding officer’s secret stash of rations while your men go hungry. He’s also the only one who knows the escape route. What do you do?', [
    'Share the stash with the men quietly',
    'Confront him in front of everyone',
    'Say nothing until you’re safe',
    'Use it as leverage for better orders',
  ]),
  d('war-09', 'An enemy soldier waves a white flag but his hands are hidden behind his back. Your orders say take prisoners when possible. What do you do?', [
    'Shout warnings and hold your fire',
    'Approach carefully to take him in',
    'Fire a warning shot at his feet',
    'Pull back and let him walk away',
  ]),
  d('war-10', 'Your village elders want to hand over a young man the militia is hunting, to save everyone else from reprisal. He swears he’s innocent. What do you do?', [
    'Hide him in your own house',
    'Go along with the elders',
    'Help him escape into the bush tonight',
    'Go and negotiate with the militia yourself',
  ]),
  d('war-11', 'You’re a medic with one dose of painkiller left. Your sergeant needs it to keep leading; a teenage recruit is screaming in agony. Who gets it?', [
    'The sergeant, the unit needs him',
    'The recruit, he’s suffering most',
    'Split the dose and hope it works',
    'Save it for whoever gets hit next',
  ]),
  d('war-12', 'A radio message claims a ceasefire starts at midnight. Your squad could take a key bridge at 11pm, but it might mean pointless deaths. What’s your call?', [
    'Attack before midnight as planned',
    'Hold off and wait for the ceasefire',
    'Take the bridge only if it’s lightly held',
    'Ask command to confirm first, whatever it costs',
  ]),
  d('war-13', 'A journalist hiding with your unit is filming everything, including a mistake that cost civilian lives. Your captain orders you to seize the footage. What do you do?', [
    'Seize it as ordered',
    'Warn the journalist to hide it',
    'Pretend you couldn’t find it',
    'Make a copy before handing it over',
  ]),
  d('war-14', 'Your convoy finds a stranger collapsed on the road, possibly bait for an ambush. Stopping is risky; driving past might leave him to die. What do you do?', [
    'Stop and help him immediately',
    'Drive past and radio for help',
    'Scan the area first, then decide',
    'Drop water and medicine without stopping',
  ]),
  d('war-15', 'You’re offered a safe desk job far from the front, but only if you leave your squad mid-deployment. They’ll be short a man. Do you take it?', [
    'Take it, survival comes first',
    'Refuse and stay with your squad',
    'Take it but push to bring them too',
    'Ask the squad what they think',
  ]),
  d('war-16', 'Your unit occupies a family’s house for the night. They have a well-stocked kitchen and you haven’t eaten properly in days. What do you do?', [
    'Eat and leave money behind',
    'Take only what you need, no payment',
    'Ask permission and accept a no',
    'Eat nothing and use your own rations',
  ]),
  d('war-17', 'Your lieutenant is clearly breaking down and giving reckless orders that will get people killed. Mutiny is a serious crime. What do you do?', [
    'Follow orders and hope for the best',
    'Rally the squad to relieve him',
    'Quietly ignore the worst orders',
    'Radio headquarters to report him',
  ]),
  d('war-18', 'The enemy offers to free twenty of your captured soldiers in exchange for one feared enemy commander you’re holding. What’s your advice?', [
    'Make the trade, bring them home',
    'Refuse, he’ll kill more than twenty',
    'Negotiate for more prisoners first',
    'Fake the exchange and attempt a rescue',
  ]),
  d('war-19', 'You and a stranger are hiding in a cellar as soldiers search above. Her baby starts to cry. What do you do?', [
    'Try to soothe the baby yourself',
    'Slip out and draw the soldiers away',
    'Stay perfectly still and hope',
    'Make a run for the back exit together',
  ]),
  d('war-20', 'After the war, you discover the hero everyone celebrates actually abandoned his post and let others take the blame. He now runs a charity helping veterans. What do you do?', [
    'Expose him publicly',
    'Confront him privately',
    'Let it go, the charity matters more',
    'Tell only the families affected',
  ]),
];
