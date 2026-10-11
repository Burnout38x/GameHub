import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('sports');

export const SPORTS: BowlQuestion[] = [
  // Level 1: warm-up
  q('spo-01', 1, 'How many players does a football team have on the pitch?', ['11', '10', '12', '9'], 'Teams need at least seven players for a match to continue.'),
  q('spo-02', 1, 'Which country became the first to win five men’s FIFA World Cups?', ['Brazil', 'Germany', 'Italy', 'Argentina'], 'Brazil won their fifth title in 2002, at the tournament in Japan and South Korea.'),
  q('spo-03', 1, 'In which sport would you perform a slam dunk?', ['Basketball', 'Volleyball', 'Handball', 'Netball'], 'James Naismith invented basketball in 1891, using peach baskets as goals.'),
  q('spo-04', 1, 'How many interlocking rings appear on the Olympic flag?', ['Five', 'Four', 'Six', 'Seven'], 'Pierre de Coubertin designed the flag in 1913; it first flew at the 1920 Games.'),
  q('spo-05', 1, 'Which sprinter set the 100 m world record of 9.58 seconds in 2009?', ['Usain Bolt', 'Yohan Blake', 'Asafa Powell', 'Tyson Gay'], 'Bolt ran 9.58 at the World Championships in Berlin.'),
  q('spo-06', 1, 'How many players does each basketball team have on the court at once?', ['5', '6', '7', '4'], 'Basketball allows unlimited substitutions during stoppages in play.'),
  q('spo-07', 1, 'In tennis, what is a score of zero called?', ['Love', 'Nil', 'Duck', 'Blank'], 'A game won without the opponent scoring a point is called a love game.'),
  q('spo-08', 1, 'Which chess piece can only ever move diagonally?', ['Bishop', 'Rook', 'Knight', 'Queen'], 'Each side starts with one bishop on light squares and one on dark squares.'),
  q('spo-09', 1, 'Which city hosted the first modern Olympic Games in 1896?', ['Athens', 'Paris', 'London', 'Rome'], 'Women first competed at the next Games, in Paris in 1900.'),
  q('spo-10', 1, 'Muhammad Ali became a legend in which sport?', ['Boxing', 'Wrestling', 'Athletics', 'Judo'], 'He promised to “float like a butterfly, sting like a bee”.'),

  // Level 2: contender
  q('spo-11', 2, 'At which Olympics did Nigeria win gold in men’s football?', ['Atlanta 1996', 'Sydney 2000', 'Barcelona 1992', 'Beijing 2008'], 'Emmanuel Amunike scored the late winner as Nigeria beat Argentina 3–2 in the final.'),
  q('spo-12', 2, 'Which country hosted the first FIFA World Cup in 1930?', ['Uruguay', 'Brazil', 'Italy', 'France'], 'Uruguay also won it, beating Argentina 4–2 in the final in Montevideo.'),
  q('spo-13', 2, 'In which year did Nigeria win their first Africa Cup of Nations?', ['1980', '1994', '1976', '1988'], 'As hosts, Nigeria beat Algeria 3–0 in the final in Lagos.'),
  q('spo-14', 2, 'Who scored the infamous “Hand of God” goal at the 1986 World Cup?', ['Diego Maradona', 'Pelé', 'Michel Platini', 'Gary Lineker'], 'Minutes later against England he scored the “Goal of the Century”.'),
  q('spo-15', 2, 'Which country was the first in Africa to host the FIFA World Cup?', ['South Africa', 'Egypt', 'Morocco', 'Nigeria'], 'Spain won that 2010 tournament, beating the Netherlands 1–0 in the final.'),
  q('spo-16', 2, 'Which club won the first European Cup, now the Champions League, in 1956?', ['Real Madrid', 'Benfica', 'AC Milan', 'Reims'], 'Real Madrid won the first five editions in a row, from 1956 to 1960.'),
  q('spo-17', 2, 'Who was the first driver to win seven Formula One world championships?', ['Michael Schumacher', 'Ayrton Senna', 'Juan Manuel Fangio', 'Alain Prost'], 'Schumacher clinched his seventh in 2004; Lewis Hamilton equalled the record in 2020.'),
  q('spo-18', 2, 'Which tennis Grand Slam tournament is played on clay courts?', ['French Open', 'Wimbledon', 'US Open', 'Australian Open'], 'It is held at Stade Roland-Garros in Paris.'),
  q('spo-19', 2, 'In chess, what is the move where the king and a rook move together?', ['Castling', 'En passant', 'Promotion', 'Fianchetto'], 'It is the only move in which a player moves two of their own pieces.'),
  q('spo-20', 2, 'Which heavyweight boxer was nicknamed “Iron Mike”?', ['Mike Tyson', 'Michael Spinks', 'Mike Weaver', 'Michael Moorer'], 'In 1986, aged 20, he became the youngest heavyweight world champion.'),
  q('spo-21', 2, 'Which Lagos-born NBA legend, nicknamed “The Dream”, won two titles with Houston?', ['Hakeem Olajuwon', 'Dikembe Mutombo', 'Manute Bol', 'Patrick Ewing'], 'He was the first pick in the 1984 NBA Draft, ahead of Michael Jordan.'),
  q('spo-22', 2, 'What is the official distance of a marathon?', ['42.195 km', '40.125 km', '38.6 km', '45.2 km'], 'The odd distance traces back to the course of the 1908 London Olympics.'),

  // Level 3: champion
  q('spo-23', 3, 'Who scored Nigeria’s first ever goal at a FIFA World Cup, in 1994?', ['Rashidi Yekini', 'Daniel Amokachi', 'Emmanuel Amunike', 'Finidi George'], 'Nigeria beat Bulgaria 3–0, and Yekini’s tearful celebration in the net became iconic.'),
  q('spo-24', 3, 'Which country won the first FIFA Women’s World Cup in 1991?', ['United States', 'Norway', 'Germany', 'China'], 'The tournament was held in China; the USA beat Norway 2–1 in the final.'),
  q('spo-25', 3, 'Who became the first official world chess champion in 1886?', ['Wilhelm Steinitz', 'Emanuel Lasker', 'José Raúl Capablanca', 'Paul Morphy'], 'Steinitz won the title by beating Johannes Zukertort in a match in the USA.'),
  q('spo-26', 3, 'Who was the first Black man to win the Wimbledon men’s singles title?', ['Arthur Ashe', 'Yannick Noah', 'James Blake', 'MaliVai Washington'], 'Ashe beat Jimmy Connors in the 1975 final.'),
  q('spo-27', 3, 'In which city did Ali and Foreman fight the 1974 “Rumble in the Jungle”?', ['Kinshasa', 'Lagos', 'Accra', 'Nairobi'], 'Ali regained the heavyweight title with an eighth-round knockout.'),
  q('spo-28', 3, 'Which country hosted the very first Formula One World Championship race in 1950?', ['United Kingdom', 'Italy', 'Monaco', 'France'], 'The race was held at Silverstone on 13 May 1950.'),
  q('spo-29', 3, 'Which country won the first Africa Cup of Nations in 1957?', ['Egypt', 'Ethiopia', 'Sudan', 'Ghana'], 'Only three teams took part in that first tournament, held in Khartoum.'),
  q('spo-30', 3, 'Which coach led the Super Eagles to their first World Cup, in 1994?', ['Clemens Westerhof', 'Bora Milutinović', 'Jo Bonfrère', 'Philippe Troussier'], 'The Dutchman also guided Nigeria to the 1994 Africa Cup of Nations title.'),
  q('spo-31', 3, 'Who was the first Nigerian to win an Olympic gold medal?', ['Chioma Ajunwa', 'Mary Onyali', 'Falilat Ogunkoya', 'Blessing Okagbare'], 'She won long jump gold at Atlanta 1996, having also played for the Super Falcons.'),
  q('spo-32', 3, 'A standard Ayò board, the Yoruba seed-sowing game, has how many playing pits?', ['12', '10', '14', '16'], 'Each pit starts with four seeds, making 48 in all, just like Ghana’s Oware.'),
];
