import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('science');

export const SCIENCE: BowlQuestion[] = [
  // Level 1: warm-up
  q('sci-01', 1, 'Which planet is known as the Red Planet?', ['Mars', 'Venus', 'Jupiter', 'Mercury'], 'Iron oxide (rust) in its soil gives Mars its colour.'),
  q('sci-02', 1, 'What is the chemical symbol for gold?', ['Au', 'Ag', 'Gd', 'Go'], 'Au comes from aurum, the Latin word for gold.'),
  q('sci-03', 1, 'How many bones are in the typical adult human body?', ['206', '186', '226', '306'], 'Babies are born with more bones; many of them fuse together as we grow.'),
  q('sci-04', 1, 'Which gas do plants take in from the air to make food by photosynthesis?', ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'], 'Plants give off oxygen as a by-product of photosynthesis.'),
  q('sci-05', 1, 'What is the largest planet in our solar system?', ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], 'More than 1,300 Earths could fit inside Jupiter.'),
  q('sci-06', 1, 'What is the largest organ of the human body?', ['Skin', 'Liver', 'Brain', 'Lungs'], 'Skin is the body’s largest organ by both surface area and weight.'),
  q('sci-07', 1, 'What is the fastest land animal?', ['Cheetah', 'Lion', 'Pronghorn', 'Greyhound'], 'A cheetah can top 100 km/h, but only in short bursts.'),
  q('sci-08', 1, 'What is the closest star to Earth?', ['The Sun', 'Proxima Centauri', 'Sirius', 'Polaris'], 'After the Sun, the next closest star, Proxima Centauri, is about 4.2 light-years away.'),
  q('sci-09', 1, 'Which insect spreads malaria to humans?', ['Female Anopheles mosquito', 'Tsetse fly', 'Housefly', 'Blackfly'], 'Only female mosquitoes bite: they need blood to develop their eggs.'),
  q('sci-10', 1, 'Which vitamin does your skin make when exposed to sunlight?', ['Vitamin D', 'Vitamin A', 'Vitamin C', 'Vitamin K'], 'Vitamin D helps the body absorb calcium for strong bones.'),

  // Level 2: contender
  q('sci-11', 2, 'Which mineral scores a perfect 10 on the Mohs hardness scale?', ['Diamond', 'Corundum', 'Topaz', 'Quartz'], 'Diamond is pure carbon, the same element as the graphite in pencils.'),
  q('sci-12', 2, 'Which gas makes up most of Earth’s atmosphere?', ['Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide'], 'Nitrogen is about 78% of the air; oxygen is only about 21%.'),
  q('sci-13', 2, 'Which part of a cell is nicknamed its “powerhouse”?', ['Mitochondrion', 'Ribosome', 'Nucleus', 'Golgi apparatus'], 'Mitochondria carry their own DNA, which you inherit from your mother.'),
  q('sci-14', 2, 'Which blood type is known as the universal donor for red blood cells?', ['O negative', 'AB positive', 'A negative', 'B positive'], 'O-negative red cells lack A, B and RhD antigens, so most patients can receive them.'),
  q('sci-15', 2, 'Roughly how fast does light travel in a vacuum?', ['About 300,000 km/s', 'About 30,000 km/s', 'About 3,000,000 km/s', 'About 150,000 km/s'], 'In one second, light could circle Earth about 7.5 times.'),
  q('sci-16', 2, 'Which organ produces the hormone insulin?', ['Pancreas', 'Liver', 'Kidney', 'Spleen'], 'Insulin is made by beta cells in clusters called the islets of Langerhans.'),
  q('sci-17', 2, 'What is the only mammal capable of true powered flight?', ['Bat', 'Flying squirrel', 'Sugar glider', 'Colugo'], 'A bat’s wing is skin stretched over very long finger bones.'),
  q('sci-18', 2, 'Who wrote “On the Origin of Species”, published in 1859?', ['Charles Darwin', 'Gregor Mendel', 'Jean-Baptiste Lamarck', 'Louis Pasteur'], 'Darwin’s ideas were shaped by his five-year voyage on HMS Beagle.'),
  q('sci-19', 2, 'Which element has the chemical symbol Na?', ['Sodium', 'Nitrogen', 'Neon', 'Nickel'], 'Na comes from natrium, the Latin name for sodium.'),
  q('sci-20', 2, 'What is the smallest bone in the human body?', ['Stapes', 'Incus', 'Malleus', 'Hyoid'], 'The stapes sits in the middle ear and is only about 3 mm long.'),
  q('sci-21', 2, 'What does a light-year measure?', ['Distance', 'Time', 'Brightness', 'Speed'], 'One light-year is about 9.46 trillion kilometres.'),
  q('sci-22', 2, 'Roughly how long does sunlight take to reach Earth?', ['About 8 minutes', 'About 8 seconds', 'About 1 hour', 'About 1 day'], 'So you always see the Sun as it was about 8 minutes ago.'),

  // Level 3: champion
  q('sci-23', 3, 'Which planet spins on its side, with an axial tilt of about 98 degrees?', ['Uranus', 'Neptune', 'Saturn', 'Venus'], 'Each of Uranus’s poles gets about 42 years of continuous sunlight.'),
  q('sci-24', 3, 'What is the chemical symbol for tungsten?', ['W', 'Tu', 'Tg', 'Tn'], 'W comes from “wolfram”; tungsten has the highest melting point of any metal.'),
  q('sci-25', 3, 'What is the boundary around a black hole beyond which not even light can escape?', ['Event horizon', 'Photon sphere', 'Singularity', 'Accretion disc'], 'Events inside it can never be seen from outside, hence the name.'),
  q('sci-26', 3, 'Which gland is often called the body’s “master gland”?', ['Pituitary', 'Thyroid', 'Adrenal', 'Pineal'], 'About the size of a pea, it sits at the base of the brain.'),
  q('sci-27', 3, 'Absolute zero is approximately what temperature in degrees Celsius?', ['−273 °C', '−100 °C', '−460 °C', '−373 °C'], 'Absolute zero is 0 kelvin, the coldest temperature possible.'),
  q('sci-28', 3, 'Which German scientist proposed the theory of continental drift in 1912?', ['Alfred Wegener', 'Charles Lyell', 'James Hutton', 'Arthur Holmes'], 'Few accepted it until plate tectonics was confirmed in the 1960s.'),
  q('sci-29', 3, 'What is the most abundant element in Earth’s crust by mass?', ['Oxygen', 'Silicon', 'Aluminium', 'Iron'], 'Oxygen makes up nearly half of the crust, mostly locked inside rocks.'),
  q('sci-30', 3, 'How many pairs of chromosomes do humans normally have?', ['23', '22', '24', '46'], 'The 23rd pair, the sex chromosomes, is usually XX or XY.'),
  q('sci-31', 3, 'Which animal has three hearts and blue blood?', ['Octopus', 'Seahorse', 'Starfish', 'Jellyfish'], 'Its blood is blue because it carries oxygen with copper-based haemocyanin.'),
  q('sci-32', 3, 'Who developed the first successful vaccine, against smallpox, in 1796?', ['Edward Jenner', 'Louis Pasteur', 'Joseph Lister', 'Robert Koch'], 'He used cowpox; “vaccine” comes from vacca, the Latin for cow.'),
];
