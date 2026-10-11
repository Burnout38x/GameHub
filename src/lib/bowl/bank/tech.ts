import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('tech');

export const TECH: BowlQuestion[] = [
  // Level 1: warm-up
  q('tec-01', 1, 'What does “www” stand for in a web address?', ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'], 'Tim Berners-Lee proposed the Web at CERN in 1989.'),
  q('tec-02', 1, 'What does “USB” stand for?', ['Universal Serial Bus', 'Universal System Bus', 'Unified Serial Bus', 'Universal Signal Board'], 'USB was introduced in 1996 to replace a tangle of different ports.'),
  q('tec-03', 1, 'Which company makes the iPhone?', ['Apple', 'Samsung', 'Google', 'Nokia'], 'Steve Jobs unveiled the first iPhone in January 2007.'),
  q('tec-04', 1, 'Who co-founded Microsoft with Paul Allen?', ['Bill Gates', 'Steve Jobs', 'Larry Page', 'Mark Zuckerberg'], 'Microsoft was founded in 1975.'),
  q('tec-05', 1, 'What does “CPU” stand for?', ['Central Processing Unit', 'Central Program Utility', 'Computer Personal Unit', 'Core Processing Unit'], 'The CPU is often called the “brain” of a computer.'),
  q('tec-06', 1, 'Which social network did Mark Zuckerberg launch from his Harvard dorm in 2004?', ['Facebook', 'Twitter', 'Instagram', 'MySpace'], 'It started as “TheFacebook”, open only to Harvard students.'),
  q('tec-07', 1, 'What does “GPS” stand for?', ['Global Positioning System', 'General Positioning Satellite', 'Global Pathfinding System', 'Geo Position Signal'], 'GPS was built by the US military and opened to civilians.'),
  q('tec-08', 1, 'In computing, what does “RAM” stand for?', ['Random Access Memory', 'Read Access Memory', 'Rapid Access Memory', 'Run-time Allocated Memory'], 'RAM is short-term memory: it is wiped when the power goes off.'),
  q('tec-09', 1, 'Which keyboard shortcut copies selected text on a Windows PC?', ['Ctrl + C', 'Ctrl + V', 'Ctrl + X', 'Ctrl + P'], 'Ctrl + V pastes, Ctrl + X cuts and Ctrl + P prints.'),
  q('tec-10', 1, 'Which company owns WhatsApp?', ['Meta', 'Google', 'Microsoft', 'Apple'], 'Facebook (now Meta) bought WhatsApp in 2014 for about $19 billion.'),

  // Level 2: contender
  q('tec-11', 2, 'What does “HTML” stand for?', ['HyperText Markup Language', 'HyperText Machine Language', 'High-Level Text Markup Language', 'Hyperlink Text Making Language'], 'HTML is the language that structures every web page.'),
  q('tec-12', 2, 'Who founded Amazon in 1994?', ['Jeff Bezos', 'Elon Musk', 'Larry Ellison', 'Jack Ma'], 'Amazon began as an online bookshop run from Bezos’s garage near Seattle.'),
  q('tec-13', 2, 'How is the decimal number 5 written in binary?', ['101', '110', '011', '111'], '101 means 1×4 + 0×2 + 1×1 = 5.'),
  q('tec-14', 2, 'How many bits make up one byte?', ['8', '4', '10', '16'], 'Four bits are sometimes called a “nibble”.'),
  q('tec-15', 2, 'What pseudonym was used by the unknown creator of Bitcoin?', ['Satoshi Nakamoto', 'Vitalik Buterin', 'Hal Finney', 'Elon Musk'], 'The Bitcoin white paper appeared in 2008.'),
  q('tec-16', 2, 'Which programming language shares its name with an Indonesian island?', ['Java', 'Python', 'Ruby', 'Swift'], 'Java was released by Sun Microsystems in 1995.'),
  q('tec-17', 2, 'Who designed the Analytical Engine and is often called the “father of the computer”?', ['Charles Babbage', 'Alan Turing', 'John von Neumann', 'Thomas Edison'], 'Ada Lovelace wrote what is often called the first program for it.'),
  q('tec-18', 2, 'Which video game hero first appeared as “Jumpman” in Donkey Kong (1981)?', ['Mario', 'Luigi', 'Sonic', 'Link'], 'Mario was created by Shigeru Miyamoto at Nintendo.'),
  q('tec-19', 2, 'In “https://”, what does the final “s” stand for?', ['Secure', 'Server', 'Session', 'Standard'], 'HTTPS encrypts the data between your browser and the website.'),
  q('tec-20', 2, 'Which company developed the PlayStation games console?', ['Sony', 'Nintendo', 'Sega', 'Microsoft'], 'The original PlayStation launched in Japan in December 1994.'),
  q('tec-21', 2, 'Larry Page and Sergey Brin started Google while PhD students at which university?', ['Stanford', 'Harvard', 'MIT', 'Oxford'], 'Google was incorporated in 1998.'),
  q('tec-22', 2, 'What does “SIM” in “SIM card” stand for?', ['Subscriber Identity Module', 'Subscriber Information Memory', 'System Identity Module', 'Secure Identity Mobile'], 'The SIM stores the details that identify you to your mobile network.'),

  // Level 3: champion
  q('tec-23', 3, 'What was the name of the US network, first connected in 1969, that was a forerunner of the internet?', ['ARPANET', 'ETHERNET', 'USENET', 'INTRANET'], 'Its first message, in October 1969, was “LO”: the system crashed while typing “LOGIN”.'),
  q('tec-24', 3, 'The theoretical “universal machine” described in a 1936 paper is named after which mathematician?', ['Alan Turing', 'John von Neumann', 'Charles Babbage', 'Claude Shannon'], 'Turing later helped break German codes at Bletchley Park.'),
  q('tec-25', 3, 'Who wrote the first networked email program in 1971 and chose the @ sign for addresses?', ['Ray Tomlinson', 'Vint Cerf', 'Tim Berners-Lee', 'Steve Wozniak'], 'He picked @ because it never appears in people’s names.'),
  q('tec-26', 3, 'What does “JPEG” stand for?', ['Joint Photographic Experts Group', 'Joint Picture Encoding Group', 'Japanese Photo Exchange Group', 'Joint Pixel Engineering Group'], 'The format is named after the committee that created it.'),
  q('tec-27', 3, 'In which year was NigeriaSat-1, Nigeria’s first satellite, launched?', ['2003', '1999', '2007', '2011'], 'NigComSat-1 followed in 2007 and NigeriaSat-2 in 2011.'),
  q('tec-28', 3, 'Moore’s law says the number of transistors on a chip doubles roughly every…', ['Two years', 'Six months', 'Five years', 'Ten years'], 'Intel co-founder Gordon Moore settled on two years in 1975.'),
  q('tec-29', 3, 'The Python programming language was named after what?', ['Monty Python’s Flying Circus', 'The python snake', 'A comic book villain', 'Its creator’s pet'], 'Guido van Rossum was a fan of the British comedy show.'),
  q('tec-30', 3, 'Which video game was created by Soviet engineer Alexey Pajitnov in 1984?', ['Tetris', 'Pac-Man', 'Space Invaders', 'Pong'], 'It became a worldwide hit on Nintendo’s Game Boy in 1989.'),
  q('tec-31', 3, 'How is the decimal number 255 written in hexadecimal?', ['FF', 'EE', 'F0', '100'], 'FF = 15×16 + 15 = 255; hex 100 would be 256.'),
  q('tec-32', 3, 'Which company released the first commercial microprocessor, the 4004, in 1971?', ['Intel', 'IBM', 'Texas Instruments', 'Motorola'], 'The 4004 was first designed for a Japanese calculator maker.'),
];
