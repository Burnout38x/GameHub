import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('screen');

export const SCREEN: BowlQuestion[] = [
  // Level 1: warm-up
  q('scr-01', 1, 'Who directed the 1993 dinosaur blockbuster “Jurassic Park”?', ['Steven Spielberg', 'James Cameron', 'George Lucas', 'Ridley Scott'], 'The film was based on Michael Crichton’s 1990 novel.'),
  q('scr-02', 1, 'In “The Lion King” (1994), what is the name of Simba’s father?', ['Mufasa', 'Scar', 'Rafiki', 'Zazu'], 'Mufasa was voiced by James Earl Jones, also the voice of Darth Vader.'),
  q('scr-03', 1, 'Which singer is widely known as the “King of Pop”?', ['Michael Jackson', 'Elvis Presley', 'Prince', 'Lionel Richie'], 'His 1982 album “Thriller” is widely cited as the best-selling album of all time.'),
  q('scr-04', 1, 'Which Nigerian musician created the Afrobeat genre?', ['Fela Kuti', 'King Sunny Adé', 'Ebenezer Obey', 'Victor Olaiya'], 'Fela blended highlife, jazz, funk and Yoruba rhythms into long, political grooves.'),
  q('scr-05', 1, 'Which Disney animated film features the song “Let It Go”?', ['Frozen', 'Moana', 'Tangled', 'Encanto'], 'Sung by Elsa (Idina Menzel), it won the 2014 Oscar for Best Original Song.'),
  q('scr-06', 1, 'Which Hogwarts house is Harry Potter sorted into?', ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'], 'The Sorting Hat considered placing Harry in Slytherin.'),
  q('scr-07', 1, 'What is the name of the cowboy doll in “Toy Story”?', ['Woody', 'Buzz', 'Rex', 'Andy'], '“Toy Story” (1995) was the first fully computer-animated feature film.'),
  q('scr-08', 1, 'Which Nigerian star released the 2022 global hit “Calm Down”?', ['Rema', 'Burna Boy', 'Wizkid', 'Davido'], 'Its remix with Selena Gomez reached No. 3 on the US Billboard Hot 100.'),
  q('scr-09', 1, 'Which film saga features the famous line “May the Force be with you”?', ['Star Wars', 'Star Trek', 'The Matrix', 'Dune'], 'George Lucas’s first “Star Wars” film was released in 1977.'),
  q('scr-10', 1, 'Who played Captain Jack Sparrow in “Pirates of the Caribbean”?', ['Johnny Depp', 'Orlando Bloom', 'Brad Pitt', 'Keanu Reeves'], 'The 2003 role earned Depp an Oscar nomination for Best Actor.'),

  // Level 2: contender
  q('scr-11', 2, 'Which early-1990s home video is credited with sparking the Nollywood boom?', ['Living in Bondage', 'Osuofia in London', 'Glamour Girls', 'The Wedding Party'], 'Kenneth Okonkwo starred as Andy Okeke, who sacrifices his wife for wealth.'),
  q('scr-12', 2, 'Burna Boy’s first Grammy, for Best Global Music Album, was for which album?', ['Twice as Tall', 'African Giant', 'Love, Damini', 'Outside'], '“African Giant” was nominated earlier, when the category was Best World Music Album.'),
  q('scr-13', 2, 'Wizkid won a Grammy for Best Music Video for which song with Beyoncé?', ['Brown Skin Girl', 'Essence', 'Ojuelegba', 'Come Closer'], 'He shared the 2021 award with Beyoncé, Blue Ivy Carter and Saint Jhn.'),
  q('scr-14', 2, 'Which composer wrote the scores for “Star Wars”, “Jaws” and “Jurassic Park”?', ['John Williams', 'Hans Zimmer', 'Ennio Morricone', 'Howard Shore'], 'Williams has received more than 50 Oscar nominations.'),
  q('scr-15', 2, 'Who directed “The Godfather” (1972)?', ['Francis Ford Coppola', 'Martin Scorsese', 'Stanley Kubrick', 'Brian De Palma'], 'Marlon Brando won Best Actor as Vito Corleone but declined the Oscar.'),
  q('scr-16', 2, 'Which classic film features the line “Here’s looking at you, kid”?', ['Casablanca', 'Gone with the Wind', 'Citizen Kane', 'The Maltese Falcon'], 'Humphrey Bogart says it to Ingrid Bergman in the 1942 film.'),
  q('scr-17', 2, 'Which TV series is set in the land of Westeros?', ['Game of Thrones', 'The Witcher', 'Vikings', 'The Last Kingdom'], 'It adapted George R. R. Martin’s novels and ran on HBO from 2011 to 2019.'),
  q('scr-18', 2, 'Which English city did The Beatles come from?', ['Liverpool', 'Manchester', 'London', 'Birmingham'], 'They honed their act at Liverpool’s Cavern Club and in the clubs of Hamburg.'),
  q('scr-19', 2, 'In the sitcom “Friends”, what is the name of the gang’s favourite coffee shop?', ['Central Perk', 'Java Joe’s', 'Monk’s Café', 'The Grind'], '“Friends” ran for ten seasons, from 1994 to 2004.'),
  q('scr-20', 2, 'Which reggae legend sang “No Woman, No Cry”?', ['Bob Marley', 'Peter Tosh', 'Jimmy Cliff', 'Burning Spear'], 'Its best-known version was recorded live at London’s Lyceum Theatre in 1975.'),
  q('scr-21', 2, 'Which 1994 film features the line “Life is like a box of chocolates”?', ['Forrest Gump', 'Pulp Fiction', 'The Shawshank Redemption', 'Philadelphia'], 'Tom Hanks won Best Actor for “Philadelphia” and “Forrest Gump” in consecutive years.'),
  q('scr-22', 2, 'In “The Matrix” (1999), which colour pill does Neo choose to take?', ['Red', 'Blue', 'Green', 'White'], 'The film was written and directed by the Wachowskis.'),

  // Level 3: champion
  q('scr-23', 3, 'Which film won the very first Academy Award for Best Picture?', ['Wings', 'Metropolis', 'The Jazz Singer', 'Nosferatu'], '“Wings” was a silent First World War drama about fighter pilots.'),
  q('scr-24', 3, 'Which Hayao Miyazaki film won the 2003 Oscar for Best Animated Feature?', ['Spirited Away', 'Princess Mononoke', 'My Neighbor Totoro', 'Howl’s Moving Castle'], 'Miyazaki’s “The Boy and the Heron” won the same award in 2024.'),
  q('scr-25', 3, 'Which Genevieve Nnaji film was Nigeria’s first ever Oscar submission for International Feature?', ['Lionheart', 'The Wedding Party', 'King of Boys', 'Half of a Yellow Sun'], 'The Academy disqualified it in 2019 because most of its dialogue was in English.'),
  q('scr-26', 3, 'Which band is credited alongside Fela Kuti on his 1976 album “Zombie”?', ['Afrika 70', 'Egypt 80', 'Koola Lobitos', 'Cool Cats'], '“Zombie” mocked the military and provoked a brutal 1977 army raid on his Kalakuta Republic.'),
  q('scr-27', 3, 'Sade Adu, lead singer of the band Sade, was born in which Nigerian city?', ['Ibadan', 'Lagos', 'Enugu', 'Kano'], 'Sade won the Grammy for Best New Artist in 1986.'),
  q('scr-28', 3, 'Who directed “2001: A Space Odyssey” (1968)?', ['Stanley Kubrick', 'Ridley Scott', 'Steven Spielberg', 'Andrei Tarkovsky'], 'Kubrick developed the story with science-fiction writer Arthur C. Clarke.'),
  q('scr-29', 3, 'In which US city is the TV drama “Breaking Bad” set?', ['Albuquerque', 'Phoenix', 'El Paso', 'Las Vegas'], 'Chemistry teacher Walter White adopts the alias “Heisenberg”.'),
  q('scr-30', 3, 'Which South African singer was nicknamed “Mama Africa”?', ['Miriam Makeba', 'Brenda Fassie', 'Yvonne Chaka Chaka', 'Letta Mbulu'], 'Her song “Pata Pata” became a worldwide hit in 1967.'),
  q('scr-31', 3, 'Which Italian composer scored “The Good, the Bad and the Ugly” (1966)?', ['Ennio Morricone', 'Nino Rota', 'Riz Ortolani', 'Piero Piccioni'], 'Morricone won his only competitive Oscar for “The Hateful Eight” in 2016.'),
  q('scr-32', 3, 'Which 2018 Kemi Adetiba film follows businesswoman and power broker Eniola Salami?', ['King of Boys', 'Lionheart', 'Merry Men', 'Chief Daddy'], 'Veteran actress Sola Sobowale plays Eniola Salami.'),
];
