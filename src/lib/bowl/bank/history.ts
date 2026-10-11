import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('history');

export const HISTORY: BowlQuestion[] = [
  // Level 1: warm-up
  q('his-01', 1, 'Who became the first person to travel into space, in 1961?', ['Yuri Gagarin', 'Neil Armstrong', 'Alan Shepard', 'John Glenn'], 'Gagarin orbited Earth once aboard Vostok 1 on 12 April 1961.'),
  q('his-02', 1, 'Who was the first President of the United States?', ['George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'John Adams'], 'Washington took office in 1789 and served two terms.'),
  q('his-03', 1, 'Who became South Africa’s first Black president in 1994?', ['Nelson Mandela', 'Thabo Mbeki', 'Desmond Tutu', 'Jacob Zuma'], 'Mandela was elected after spending 27 years in prison.'),
  q('his-04', 1, 'Which ancient civilisation built the pyramids of Giza?', ['Ancient Egyptians', 'Ancient Greeks', 'The Romans', 'The Persians'], 'The Great Pyramid was the tallest human-made structure for over 3,800 years.'),
  q('his-05', 1, 'In which year did World War II end?', ['1945', '1939', '1918', '1950'], 'It ended in Europe in May and in Asia in September 1945.'),
  q('his-06', 1, 'Which liner sank on its maiden voyage in 1912 after striking an iceberg?', ['Titanic', 'Lusitania', 'Britannic', 'Olympic'], 'More than 1,500 people died when it sank in the North Atlantic.'),
  q('his-07', 1, 'Who was the first person to walk on the Moon?', ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'Michael Collins'], 'Armstrong stepped out of Apollo 11’s lunar module, Eagle, in July 1969.'),
  q('his-08', 1, 'Which Roman city was buried by the eruption of Mount Vesuvius in AD 79?', ['Pompeii', 'Carthage', 'Sparta', 'Troy'], 'The nearby town of Herculaneum was buried by the same eruption.'),
  q('his-09', 1, 'Which international organisation was founded in 1945 to keep world peace?', ['United Nations', 'League of Nations', 'NATO', 'European Union'], 'Its charter came into force on 24 October 1945, now marked as UN Day.'),
  q('his-10', 1, 'Which wall, dividing a European city, was opened in November 1989?', ['Berlin Wall', 'Hadrian’s Wall', 'Western Wall', 'Walls of Benin'], 'It had divided East and West Berlin since 1961.'),

  // Level 2: contender
  q('his-11', 2, 'Who was Nigeria’s Prime Minister from independence until the 1966 coup?', ['Abubakar Tafawa Balewa', 'Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello'], 'He led Nigeria from independence until he was killed in the January 1966 coup.'),
  q('his-12', 2, 'Kwame Nkrumah led which country to independence in 1957?', ['Ghana', 'Nigeria', 'Kenya', 'Senegal'], 'It was the Gold Coast; Ghana took its name from an ancient West African empire.'),
  q('his-13', 2, 'Who co-wrote “The Communist Manifesto” with Friedrich Engels?', ['Karl Marx', 'Vladimir Lenin', 'Leon Trotsky', 'Joseph Stalin'], 'The Communist Manifesto was first published in 1848.'),
  q('his-14', 2, 'Mansa Musa, famed as one of history’s richest people, ruled which empire?', ['Mali Empire', 'Songhai Empire', 'Ghana Empire', 'Kanem-Bornu Empire'], 'His lavish 1324 pilgrimage to Mecca reportedly lowered the value of gold in Cairo.'),
  q('his-15', 2, 'In which year did the French Revolution begin?', ['1789', '1776', '1815', '1848'], 'The storming of the Bastille, on 14 July 1789, is now France’s national day.'),
  q('his-16', 2, 'Which civilisation built Machu Picchu high in the Andes?', ['Inca', 'Aztec', 'Maya', 'Olmec'], 'Built in the 15th century, it sits about 2,400 m up in the mountains of Peru.'),
  q('his-17', 2, 'Who was the first Roman emperor?', ['Augustus', 'Julius Caesar', 'Nero', 'Caligula'], 'Julius Caesar was never emperor; his adopted heir Octavian became Augustus in 27 BC.'),
  q('his-18', 2, 'The Nigerian Civil War (1967–1970) was fought against which breakaway state?', ['Biafra', 'Katanga', 'Darfur', 'Cabinda'], 'Biafra declared independence in May 1967; the war ended in January 1970.'),
  q('his-19', 2, 'Johannes Gutenberg is famous for developing what in the 1400s?', ['Printing press', 'Telescope', 'Steam engine', 'Mechanical clock'], 'His Bible, printed in the 1450s, was Europe’s first major book printed with metal movable type.'),
  q('his-20', 2, 'Which country gave the Statue of Liberty to the United States?', ['France', 'United Kingdom', 'Spain', 'Italy'], 'It was dedicated in New York Harbor in 1886.'),
  q('his-21', 2, 'Whose expedition made the first voyage around the world, completed in 1522?', ['Ferdinand Magellan', 'Christopher Columbus', 'Vasco da Gama', 'Francis Drake'], 'Magellan was killed in the Philippines; Juan Sebastián Elcano finished the voyage.'),
  q('his-22', 2, 'The 1884–85 conference that set rules for Europe’s carve-up of Africa was held in which city?', ['Berlin', 'Paris', 'London', 'Brussels'], 'No African ruler was invited to the conference.'),

  // Level 3: champion
  q('his-23', 3, 'Who became the world’s first elected female prime minister, in 1960?', ['Sirimavo Bandaranaike', 'Indira Gandhi', 'Golda Meir', 'Margaret Thatcher'], 'She led Ceylon, the country now called Sri Lanka.'),
  q('his-24', 3, 'Which activist led the Abeokuta Women’s Union tax protests of the 1940s?', ['Funmilayo Ransome-Kuti', 'Margaret Ekpo', 'Queen Amina', 'Moremi Ajasoro'], 'She was the mother of Afrobeat legend Fela Kuti.'),
  q('his-25', 3, 'Who was the first Secretary-General of the United Nations?', ['Trygve Lie', 'Dag Hammarskjöld', 'U Thant', 'Kurt Waldheim'], 'Lie, a Norwegian politician, served from 1946 to 1952.'),
  q('his-26', 3, 'At the Battle of Adwa in 1896, Ethiopia defeated which European power?', ['Italy', 'Britain', 'France', 'Portugal'], 'The victory kept Ethiopia free of colonial rule during the Scramble for Africa.'),
  q('his-27', 3, 'Which 1648 peace settlement ended the Thirty Years’ War?', ['Peace of Westphalia', 'Treaty of Utrecht', 'Treaty of Versailles', 'Congress of Vienna'], 'It is often seen as the birth of the modern idea of state sovereignty.'),
  q('his-28', 3, 'Who launched the 1804 jihad that founded the Sokoto Caliphate?', ['Usman dan Fodio', 'Ahmadu Bello', 'Muhammad Bello', 'Muhammad al-Amin al-Kanemi'], 'His descendants still hold the title Sultan of Sokoto.'),
  q('his-29', 3, 'Constantinople was the capital of which empire until its fall in 1453?', ['Byzantine Empire', 'Ottoman Empire', 'Holy Roman Empire', 'Persian Empire'], 'Ottoman Sultan Mehmed II captured the city after a siege of about 53 days.'),
  q('his-30', 3, 'In which year was the Organisation of African Unity (OAU) founded?', ['1963', '1957', '1960', '1975'], 'Its founding date, 25 May, is marked as Africa Day; the AU replaced it in 2002.'),
  q('his-31', 3, 'Which queen mother led the Ashanti War of the Golden Stool against Britain in 1900?', ['Yaa Asantewaa', 'Queen Nzinga', 'Queen Amina', 'Nana Asma’u'], 'She was queen mother of Ejisu, part of the Ashanti Empire in today’s Ghana.'),
  q('his-32', 3, 'Which scholar announced the decipherment of Egyptian hieroglyphs in 1822?', ['Jean-François Champollion', 'Howard Carter', 'Flinders Petrie', 'Heinrich Schliemann'], 'The Rosetta Stone, with the same text in three scripts, was his key.'),
];
