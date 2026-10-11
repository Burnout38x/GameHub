import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('geography');

export const GEOGRAPHY: BowlQuestion[] = [
  // Level 1: warm-up
  q('geo-01', 1, 'What is the capital city of Kenya?', ['Nairobi', 'Mombasa', 'Kampala', 'Addis Ababa'], 'Nairobi grew from an 1899 railway depot on the Uganda Railway.'),
  q('geo-02', 1, 'What is the longest river in Africa?', ['Nile', 'Congo', 'Niger', 'Zambezi'], 'The Nile flows north and empties into the Mediterranean Sea.'),
  q('geo-03', 1, 'What is the largest hot desert in the world?', ['Sahara', 'Kalahari', 'Arabian', 'Gobi'], 'The Sahara covers roughly 9 million km² across North Africa.'),
  q('geo-04', 1, 'What is the largest ocean on Earth?', ['Pacific', 'Atlantic', 'Indian', 'Arctic'], 'The Pacific covers about a third of the planet’s surface.'),
  q('geo-05', 1, 'What is the capital city of Ghana?', ['Accra', 'Kumasi', 'Lomé', 'Tamale'], 'Ghana, formerly the Gold Coast, won independence from Britain in March 1957.'),
  q('geo-06', 1, 'What is the highest mountain on Earth above sea level?', ['Mount Everest', 'K2', 'Kangchenjunga', 'Mont Blanc'], 'Everest sits on the border between Nepal and China.'),
  q('geo-07', 1, 'In which city would you find the Eiffel Tower?', ['Paris', 'Rome', 'London', 'Madrid'], 'The tower was built for the 1889 World’s Fair.'),
  q('geo-08', 1, 'Which is the largest continent by area?', ['Asia', 'Africa', 'North America', 'Europe'], 'Asia covers about 30% of Earth’s land area.'),
  q('geo-09', 1, 'What is the official language of Brazil?', ['Portuguese', 'Spanish', 'French', 'Italian'], 'Brazil is the largest Portuguese-speaking country in the world.'),
  q('geo-10', 1, 'Mount Kilimanjaro is in which country?', ['Tanzania', 'Kenya', 'Uganda', 'Ethiopia'], 'At 5,895 m, Kilimanjaro is Africa’s highest mountain.'),

  // Level 2: contender
  q('geo-11', 2, 'What is the capital city of Australia?', ['Canberra', 'Sydney', 'Melbourne', 'Perth'], 'Canberra was purpose-built as a compromise between Sydney and Melbourne.'),
  q('geo-12', 2, 'What is the capital city of Canada?', ['Ottawa', 'Toronto', 'Montreal', 'Vancouver'], 'Queen Victoria chose Ottawa as the capital in 1857.'),
  q('geo-13', 2, 'Which country’s flag features an AK-47 rifle?', ['Mozambique', 'Angola', 'Zimbabwe', 'Eritrea'], 'Alongside the rifle on the flag are a hoe and an open book.'),
  q('geo-14', 2, 'Which country’s flag is a red disc on a bottle-green field?', ['Bangladesh', 'Pakistan', 'Sri Lanka', 'Nepal'], 'The disc sits slightly towards the pole so it looks centred when flying.'),
  q('geo-15', 2, 'Victoria Falls lies on which river?', ['Zambezi', 'Limpopo', 'Orange', 'Congo'], 'Locals call the falls Mosi-oa-Tunya, ‘the smoke that thunders’.'),
  q('geo-16', 2, 'What is the currency of South Africa?', ['Rand', 'Kwacha', 'Cedi', 'Shilling'], 'It is named after the Witwatersrand, the ridge where gold was found in 1886.'),
  q('geo-17', 2, 'What is Africa’s largest lake by area?', ['Lake Victoria', 'Lake Tanganyika', 'Lake Malawi', 'Lake Chad'], 'Lake Victoria is shared by Uganda, Kenya and Tanzania.'),
  q('geo-18', 2, 'Which city hosts the headquarters of the African Union?', ['Addis Ababa', 'Nairobi', 'Johannesburg', 'Abuja'], 'Addis Ababa means ‘new flower’ in Amharic.'),
  q('geo-19', 2, 'Which strait separates Spain from Morocco?', ['Strait of Gibraltar', 'Strait of Hormuz', 'Bosporus', 'Strait of Malacca'], 'At its narrowest the strait is only about 14 km wide.'),
  q('geo-20', 2, 'What is the smallest country in the world by area?', ['Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'], 'Vatican City covers about 0.44 km², entirely inside Rome.'),
  q('geo-21', 2, 'Which country is completely surrounded by South Africa?', ['Lesotho', 'Eswatini', 'Botswana', 'Malawi'], 'Lesotho’s lowest point is about 1,400 m up, the highest low point of any country.'),
  q('geo-22', 2, 'What is the capital city of Morocco?', ['Rabat', 'Casablanca', 'Marrakesh', 'Fez'], 'Casablanca is Morocco’s biggest city, but Rabat is its capital.'),

  // Level 3: champion
  q('geo-23', 3, 'What is the capital city of Burkina Faso?', ['Ouagadougou', 'Bamako', 'Niamey', 'Bobo-Dioulasso'], 'It hosts FESPACO, a famous pan-African film festival held every two years.'),
  q('geo-24', 3, 'What is the deepest lake in the world?', ['Lake Baikal', 'Lake Tanganyika', 'Lake Superior', 'Lake Victoria'], 'Siberia’s Lake Baikal is more than 1,600 m deep.'),
  q('geo-25', 3, 'Which West African country was called Dahomey until 1975?', ['Benin', 'Togo', 'Burkina Faso', 'Ghana'], 'Dahomey’s Agojie women warriors inspired the film ‘The Woman King’.'),
  q('geo-26', 3, 'Which African country has Spanish as an official language?', ['Equatorial Guinea', 'Gabon', 'Cameroon', 'Guinea-Bissau'], 'Equatorial Guinea was a Spanish colony until independence in 1968.'),
  q('geo-27', 3, 'Which is Africa’s second-longest river?', ['Congo', 'Niger', 'Zambezi', 'Orange'], 'The Congo is also the world’s deepest river, over 220 m in places.'),
  q('geo-28', 3, 'What is Africa’s largest country by area?', ['Algeria', 'DR Congo', 'Sudan', 'Libya'], 'Algeria took the title when South Sudan split from Sudan in 2011.'),
  q('geo-29', 3, 'Which north–south mountain range is the traditional boundary between Europe and Asia?', ['Ural Mountains', 'Caucasus Mountains', 'Carpathian Mountains', 'Altai Mountains'], 'The Urals stretch about 2,500 km through western Russia.'),
  q('geo-30', 3, 'Botswana’s currency, the pula, is named after what?', ['Rain', 'Diamonds', 'Cattle', 'Sunshine'], '‘Pula!’ is also Botswana’s national motto.'),
  q('geo-31', 3, 'Which African country is home to more ancient pyramids than Egypt?', ['Sudan', 'Ethiopia', 'Libya', 'Algeria'], 'Sudan’s 200-plus Nubian pyramids were built by the Kingdom of Kush.'),
  q('geo-32', 3, 'Lake Assal, the lowest point in Africa, is in which country?', ['Djibouti', 'Ethiopia', 'Eritrea', 'Egypt'], 'The salty lake lies about 155 m below sea level.'),
];
