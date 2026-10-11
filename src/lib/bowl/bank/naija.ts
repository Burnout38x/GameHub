import { bankFor, type BowlQuestion } from '../types';

const q = bankFor('naija');

export const NAIJA: BowlQuestion[] = [
  // Level 1: warm-up
  q('nai-01', 1, 'In what year did Nigeria gain independence?', ['1960', '1963', '1957', '1966'], 'Independence came on 1 October 1960, celebrated every year since.'),
  q('nai-02', 1, 'What colours make up the Nigerian flag?', ['Green and white', 'Green, white and red', 'Green and yellow', 'Green, white and black'], 'Green stands for the nation’s agriculture and white for peace and unity.'),
  q('nai-03', 1, 'Who became the first Black African to win the Nobel Prize in Literature, in 1986?', ['Wole Soyinka', 'Chinua Achebe', 'Ben Okri', 'Chimamanda Adichie'], 'Soyinka is also a celebrated playwright, poet and activist.'),
  q('nai-04', 1, 'Who wrote the classic novel ‘Things Fall Apart’?', ['Chinua Achebe', 'Cyprian Ekwensi', 'Buchi Emecheta', 'Flora Nwapa'], 'Its title comes from W. B. Yeats’s poem ‘The Second Coming’.'),
  q('nai-05', 1, 'What is the nickname of Nigeria’s men’s national football team?', ['Super Eagles', 'Black Stars', 'Indomitable Lions', 'Super Falcons'], 'Before they became the Super Eagles, the team was called the Green Eagles.'),
  q('nai-06', 1, 'What is the name of Nigeria’s currency?', ['Naira', 'Cedi', 'Leone', 'Shilling'], 'The naira replaced the Nigerian pound in 1973; 100 kobo make one naira.'),
  q('nai-07', 1, 'After six new states were created in 1996, how many states did Nigeria have?', ['36', '30', '35', '40'], 'Abuja’s Federal Capital Territory sits outside the 36 states.'),
  q('nai-08', 1, 'Which spicy one-pot rice dish fuels a friendly rivalry between Nigeria and Ghana?', ['Jollof rice', 'Fried rice', 'Ofada rice', 'Coconut rice'], 'Its name comes from the old Wolof (Jolof) Empire of Senegambia.'),
  q('nai-09', 1, 'Which river gave Nigeria its name?', ['River Niger', 'River Benue', 'Ogun River', 'Cross River'], 'Journalist Flora Shaw coined the name ‘Nigeria’ in an 1897 newspaper article.'),
  q('nai-10', 1, 'Which Nigerian state’s slogan is ‘Centre of Excellence’?', ['Lagos', 'Oyo', 'Rivers', 'Kano'], 'Lagos is Nigeria’s smallest state by land area.'),

  // Level 2: contender
  q('nai-11', 2, 'In what year did Nigeria become a republic?', ['1963', '1960', '1966', '1979'], 'Nnamdi Azikiwe became the first President on 1 October 1963.'),
  q('nai-12', 2, 'In what year did Abuja officially replace Lagos as Nigeria’s capital?', ['1991', '1976', '1987', '1999'], 'Abuja was chosen back in 1976 for its central location.'),
  q('nai-13', 2, 'At which town do the Rivers Niger and Benue meet?', ['Lokoja', 'Onitsha', 'Makurdi', 'Jebba'], 'Lokoja, at the confluence, is the capital of Kogi State.'),
  q('nai-14', 2, 'Zuma Rock, the giant monolith near Abuja, appears on which naira note?', ['₦100', '₦50', '₦200', '₦1,000'], 'Zuma Rock is in Niger State, just beyond the FCT boundary.'),
  q('nai-15', 2, 'The famous Argungu Fishing Festival takes place in which state?', ['Kebbi', 'Sokoto', 'Kano', 'Niger'], 'Fishermen race into the river with nets and gourds to land the biggest catch.'),
  q('nai-16', 2, 'In which city is the Eyo Festival, with its white-robed masquerades, held?', ['Lagos', 'Ibadan', 'Abeokuta', 'Osogbo'], 'Eyo masquerades wear flowing white robes and wide-brimmed hats.'),
  q('nai-17', 2, 'Who designed Nigeria’s green-white-green flag?', ['Taiwo Akinkunmi', 'Ben Enwonwu', 'Benedict Odiase', 'Herbert Macaulay'], 'He designed it in 1958 while studying in London.'),
  q('nai-18', 2, 'Obudu Mountain Resort, the former Obudu Cattle Ranch, is in which state?', ['Cross River', 'Plateau', 'Taraba', 'Benue'], 'The resort sits more than 1,500 m up on the Obudu Plateau, near Cameroon.'),
  q('nai-19', 2, 'Yankari Game Reserve is in which state?', ['Bauchi', 'Gombe', 'Plateau', 'Kaduna'], 'Its Wikki Warm Springs are a favourite with visitors.'),
  q('nai-20', 2, 'Which Nigerian city is nicknamed the ‘Coal City’?', ['Enugu', 'Jos', 'Port Harcourt', 'Kaduna'], 'Coal was found near Udi in 1909, and mining began at Enugu in 1915.'),
  q('nai-21', 2, 'Which animals support the shield on Nigeria’s coat of arms?', ['Two white horses', 'Two lions', 'Two eagles', 'Two antelopes'], 'The white Y on the black shield represents the Niger and Benue rivers.'),
  q('nai-22', 2, 'In what year were Nigeria’s Northern and Southern Protectorates amalgamated?', ['1914', '1900', '1922', '1906'], 'Frederick Lugard became the first Governor-General of the united Nigeria.'),

  // Level 3: champion
  q('nai-23', 3, 'Who scored Nigeria’s winning goal in the 2013 AFCON final against Burkina Faso?', ['Sunday Mba', 'Emmanuel Emenike', 'John Obi Mikel', 'Victor Moses'], 'It was Nigeria’s third AFCON title, after 1980 and 1994.'),
  q('nai-24', 3, 'What is the capital of Bayelsa State?', ['Yenagoa', 'Brass', 'Ogbia', 'Nembe'], 'Bayelsa was carved out of Rivers State in 1996.'),
  q('nai-25', 3, 'Which Scottish explorer died at the Bussa rapids on the River Niger in 1806?', ['Mungo Park', 'Hugh Clapperton', 'Richard Lander', 'David Livingstone'], 'The old Bussa site was later submerged by the lake behind Kainji Dam.'),
  q('nai-26', 3, 'Which ancient culture, over 2,000 years old, made Nigeria’s oldest known terracotta sculptures?', ['Nok', 'Igbo-Ukwu', 'Ife', 'Benin'], 'The culture is named after the village in Kaduna State where finds were first made.'),
  q('nai-27', 3, 'Chappal Waddi, Nigeria’s highest peak, is in which state?', ['Taraba', 'Adamawa', 'Plateau', 'Cross River'], 'The mountain rises about 2,400 m near the border with Cameroon.'),
  q('nai-28', 3, 'Who moved the 1953 motion calling for Nigerian self-government in 1956?', ['Anthony Enahoro', 'Obafemi Awolowo', 'Nnamdi Azikiwe', 'Ahmadu Bello'], 'The motion did not pass then, but independence followed in 1960.'),
  q('nai-29', 3, 'Sukur Cultural Landscape, Nigeria’s first UNESCO World Heritage Site, is in which state?', ['Adamawa', 'Borno', 'Taraba', 'Gombe'], 'Sukur was listed in 1999; the Osun-Osogbo Sacred Grove followed in 2005.'),
  q('nai-30', 3, 'Which national anthem did Nigeria adopt in 1978, replacing ‘Nigeria, We Hail Thee’?', ['Arise, O Compatriots', 'Land of Our Birth', 'One Nigeria, One Nation', 'Hail Nigeria, Our Land'], 'In 2024 Nigeria restored ‘Nigeria, We Hail Thee’ as its national anthem.'),
  q('nai-31', 3, 'Who became Nigeria’s first female state governor, in Anambra in 2006?', ['Virginia Etiaba', 'Dora Akunyili', 'Ngozi Okonjo-Iweala', 'Margaret Ekpo'], 'She served for about three months after Governor Peter Obi was impeached.'),
  q('nai-32', 3, 'Which writer and activist was executed in 1995 with eight other Ogoni leaders?', ['Ken Saro-Wiwa', 'Dele Giwa', 'Gani Fawehinmi', 'Tai Solarin'], 'The executions led to Nigeria’s suspension from the Commonwealth.'),
];
