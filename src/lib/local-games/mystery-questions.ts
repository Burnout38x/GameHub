export type MysteryDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface MysteryQuestion {
  difficulty: MysteryDifficulty;
  category: 'living' | 'nonliving';
  clue: string;
  answer: string;
  options: string[];
}

export const MYSTERY_QUESTIONS: MysteryQuestion[] = [
  { difficulty: 'easy', category: 'living', clue: 'I have a mane, roar loudly, and am often called the king of the jungle.', answer: 'Lion', options: ['Lion', 'Dolphin', 'Parrot', 'Horse'] },
  { difficulty: 'easy', category: 'living', clue: 'I have a long trunk, very large ears, and I am the biggest land animal.', answer: 'Elephant', options: ['Elephant', 'Giraffe', 'Rhino', 'Hippo'] },
  { difficulty: 'easy', category: 'living', clue: 'I live in water, have eight arms, and can squirt ink.', answer: 'Octopus', options: ['Octopus', 'Shark', 'Crab', 'Jellyfish'] },
  { difficulty: 'easy', category: 'living', clue: 'I am a tall plant with a wooden trunk, branches, and leaves.', answer: 'Tree', options: ['Tree', 'Mushroom', 'Grass', 'Flower'] },
  { difficulty: 'easy', category: 'living', clue: 'I am a small insect that makes honey and lives in a hive.', answer: 'Bee', options: ['Bee', 'Ant', 'Fly', 'Butterfly'] },
  { difficulty: 'easy', category: 'living', clue: 'I am a black-and-white bird that cannot fly and often lives in very cold places.', answer: 'Penguin', options: ['Penguin', 'Eagle', 'Ostrich', 'Duck'] },
  { difficulty: 'easy', category: 'nonliving', clue: 'I have hands and a face but no arms or eyes. I tell you the time.', answer: 'Clock', options: ['Clock', 'Mirror', 'Phone', 'Calendar'] },
  { difficulty: 'easy', category: 'nonliving', clue: 'I have four wheels and carry people along roads.', answer: 'Car', options: ['Car', 'Boat', 'Train', 'Bicycle'] },
  { difficulty: 'easy', category: 'nonliving', clue: 'You open me to enter a room and close me for privacy.', answer: 'Door', options: ['Door', 'Window', 'Curtain', 'Gate'] },
  { difficulty: 'easy', category: 'nonliving', clue: 'I keep food cold and usually stand in a kitchen.', answer: 'Refrigerator', options: ['Refrigerator', 'Oven', 'Microwave', 'Toaster'] },
  { difficulty: 'easy', category: 'nonliving', clue: 'I have pages, words, and a cover. People read me.', answer: 'Book', options: ['Book', 'Notebook', 'Television', 'Poster'] },
  { difficulty: 'easy', category: 'nonliving', clue: 'I shine in a dark room when electricity passes through me.', answer: 'Light bulb', options: ['Light bulb', 'Candle', 'Flashlight', 'Television'] },
  { difficulty: 'medium', category: 'living', clue: 'I sleep upside down, navigate in darkness, and am the only mammal capable of true flight.', answer: 'Bat', options: ['Bat', 'Flying squirrel', 'Owl', 'Moth'] },
  { difficulty: 'medium', category: 'living', clue: 'I carry my home on my back, move slowly, and may live on land or in water.', answer: 'Turtle', options: ['Turtle', 'Snail', 'Crab', 'Armadillo'] },
  { difficulty: 'medium', category: 'living', clue: 'I change colour to blend in, move my eyes separately, and catch insects with a long tongue.', answer: 'Chameleon', options: ['Chameleon', 'Gecko', 'Iguana', 'Salamander'] },
  { difficulty: 'medium', category: 'living', clue: 'I am not a plant, yet I grow from spores and often appear after rain.', answer: 'Mushroom', options: ['Mushroom', 'Moss', 'Fern', 'Cactus'] },
  { difficulty: 'medium', category: 'living', clue: 'I am a marine mammal, breathe air, and use clicks and whistles to communicate.', answer: 'Dolphin', options: ['Dolphin', 'Tuna', 'Shark', 'Swordfish'] },
  { difficulty: 'medium', category: 'living', clue: 'I can regrow a lost arm and usually move using hundreds of tiny tube feet.', answer: 'Starfish', options: ['Starfish', 'Octopus', 'Sea urchin', 'Jellyfish'] },
  { difficulty: 'medium', category: 'nonliving', clue: 'I show places, roads, and borders, but I am not the land itself.', answer: 'Map', options: ['Map', 'Globe', 'Compass', 'Atlas'] },
  { difficulty: 'medium', category: 'nonliving', clue: 'I can be struck, plucked, or bowed to create music, and my sound comes from vibrating strings.', answer: 'String instrument', options: ['String instrument', 'Drum', 'Flute', 'Speaker'] },
  { difficulty: 'medium', category: 'nonliving', clue: 'I have teeth but cannot bite. I help two edges stay together.', answer: 'Zipper', options: ['Zipper', 'Comb', 'Saw', 'Gear'] },
  { difficulty: 'medium', category: 'nonliving', clue: 'I can be cracked, made, told, and played, but I am not always funny.', answer: 'Joke', options: ['Joke', 'Promise', 'Story', 'Secret'] },
  { difficulty: 'medium', category: 'nonliving', clue: 'I use a needle but do not sew. I help you find north.', answer: 'Compass', options: ['Compass', 'Clock', 'Thermometer', 'Scale'] },
  { difficulty: 'medium', category: 'nonliving', clue: 'I hold water even though I am full of holes.', answer: 'Sponge', options: ['Sponge', 'Net', 'Basket', 'Strainer'] },
  { difficulty: 'hard', category: 'living', clue: 'I look like a tiny bear, survive extreme radiation and dehydration, and have eight short legs.', answer: 'Tardigrade', options: ['Tardigrade', 'Mite', 'Water flea', 'Rotifer'] },
  { difficulty: 'hard', category: 'living', clue: 'I am a mammal that lays eggs, has a bill, and detects electric signals underwater.', answer: 'Platypus', options: ['Platypus', 'Echidna', 'Beaver', 'Otter'] },
  { difficulty: 'hard', category: 'living', clue: 'I am a living organism formed by a partnership between a fungus and an alga or cyanobacterium.', answer: 'Lichen', options: ['Lichen', 'Moss', 'Mold', 'Coral'] },
  { difficulty: 'hard', category: 'living', clue: 'I am a bird that can hover, fly backward, and beat my wings dozens of times each second.', answer: 'Hummingbird', options: ['Hummingbird', 'Swift', 'Kingfisher', 'Sunbird'] },
  { difficulty: 'hard', category: 'living', clue: 'I resemble a plant, but I am an animal attached to the seafloor and filter food from water.', answer: 'Sea sponge', options: ['Sea sponge', 'Seaweed', 'Coral', 'Anemone'] },
  { difficulty: 'hard', category: 'living', clue: 'I am an amphibian that keeps juvenile features into adulthood and can regenerate limbs.', answer: 'Axolotl', options: ['Axolotl', 'Newt', 'Mudpuppy', 'Olm'] },
  { difficulty: 'hard', category: 'nonliving', clue: 'I have keys, a space, and an enter, but I open no physical doors.', answer: 'Keyboard', options: ['Keyboard', 'Piano', 'Keycard', 'Typewriter'] },
  { difficulty: 'hard', category: 'nonliving', clue: 'I am lighter than air when filled, yet I may carry people across the sky without wings.', answer: 'Hot-air balloon', options: ['Hot-air balloon', 'Glider', 'Parachute', 'Airship'] },
  { difficulty: 'hard', category: 'nonliving', clue: 'I measure something you cannot see directly by comparing how strongly the air pushes.', answer: 'Barometer', options: ['Barometer', 'Thermometer', 'Hygrometer', 'Altimeter'] },
  { difficulty: 'hard', category: 'nonliving', clue: 'I am a bridge made of light that carries information through thin strands of glass.', answer: 'Fiber-optic cable', options: ['Fiber-optic cable', 'Copper wire', 'Laser pointer', 'Radio antenna'] },
  { difficulty: 'hard', category: 'nonliving', clue: 'I copy a three-dimensional object layer by layer from a digital design.', answer: '3D printer', options: ['3D printer', 'CNC mill', 'Scanner', 'Laser cutter'] },
  { difficulty: 'hard', category: 'nonliving', clue: 'I let one electrical signal control another without any moving mechanical parts.', answer: 'Transistor', options: ['Transistor', 'Resistor', 'Capacitor', 'Transformer'] },
  { difficulty: 'expert', category: 'living', clue: 'I have no brain, yet I can solve simple mazes by expanding toward food and withdrawing from dead ends.', answer: 'Slime mold', options: ['Slime mold', 'Fungus gnat', 'Amoeba', 'Mycelium'] },
  { difficulty: 'expert', category: 'living', clue: 'I am a colony of specialized animals that often looks and behaves like one floating creature.', answer: "Portuguese man o' war", options: ["Portuguese man o' war", 'Box jellyfish', 'Comb jelly', 'Sea salp'] },
  { difficulty: 'expert', category: 'living', clue: 'I am a desert plant that opens my pores mostly at night to reduce water loss.', answer: 'CAM plant', options: ['CAM plant', 'C4 grass', 'Mangrove', 'Epiphyte'] },
  { difficulty: 'expert', category: 'living', clue: 'I am a fish with no jaws, a round suction mouth, and an ancient body plan.', answer: 'Lamprey', options: ['Lamprey', 'Hagfish', 'Eel', 'Remora'] },
  { difficulty: 'expert', category: 'living', clue: "I am a mammal whose fingerprints can be extremely similar to a human's, despite spending much of my life in trees.", answer: 'Koala', options: ['Koala', 'Sloth', 'Lemur', 'Panda'] },
  { difficulty: 'expert', category: 'living', clue: 'I am neither a true ant nor a true lion, but my larva builds sand traps for insects.', answer: 'Antlion', options: ['Antlion', 'Trap-jaw ant', 'Assassin bug', 'Sand wasp'] },
  { difficulty: 'expert', category: 'nonliving', clue: 'I become shorter the longer I work, and my usefulness depends on slowly destroying myself.', answer: 'Candle', options: ['Candle', 'Battery', 'Pencil', 'Eraser'] },
  { difficulty: 'expert', category: 'nonliving', clue: 'I store energy by separating electric charge across two surfaces, then release it rapidly.', answer: 'Capacitor', options: ['Capacitor', 'Battery', 'Inductor', 'Resistor'] },
  { difficulty: 'expert', category: 'nonliving', clue: 'I am a number with no quantity, yet placing me correctly can make another number ten times larger.', answer: 'Zero', options: ['Zero', 'Decimal point', 'One', 'Infinity'] },
  { difficulty: 'expert', category: 'nonliving', clue: 'I can be broken without being touched, repaired without tools, and lost through one dishonest act.', answer: 'Trust', options: ['Trust', 'Silence', 'Balance', 'Focus'] },
  { difficulty: 'expert', category: 'nonliving', clue: 'I am a repeating pattern that can look similar no matter how far you zoom in.', answer: 'Fractal', options: ['Fractal', 'Mosaic', 'Spiral', 'Tessellation'] },
  { difficulty: 'expert', category: 'nonliving', clue: 'I preserve information by arranging tiny magnetic regions, but I have no ink and no pages.', answer: 'Hard disk drive', options: ['Hard disk drive', 'Optical disc', 'Solid-state drive', 'Punch card'] },
];
