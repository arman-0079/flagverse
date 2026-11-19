import type { Country } from '../types/game';

export const COUNTRIES: Country[] = [
  // ================= EUROPE (44) =================
  {
    code: 'al', numericId: '008', name: 'Albania', capital: 'Tirana', continent: 'Europe', region: 'Southern Europe',
    lat: 41.33, lng: 19.82, difficulty: 'medium', colors: ['red', 'black'], similarCodes: ['me', 'tr'],
    fact: 'Albania’s red flag features a black double-headed eagle inspired by the 15th-century seal of Skanderbeg.'
  },
  {
    code: 'ad', numericId: '020', name: 'Andorra', capital: 'Andorra la Vella', continent: 'Europe', region: 'Southern Europe',
    lat: 42.51, lng: 1.52, difficulty: 'hard', colors: ['blue', 'yellow', 'red'], similarCodes: ['ro', 'md', 'td'], isLandlocked: true,
    fact: 'Andorra la Vella sits at 1,023 meters elevation in the Pyrenees, making it Europe’s highest capital city.'
  },
  {
    code: 'at', numericId: '040', name: 'Austria', capital: 'Vienna', continent: 'Europe', region: 'Central Europe',
    lat: 48.21, lng: 16.37, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['lv', 'pe', 'pl'], isLandlocked: true,
    fact: 'Austria’s red-white-red triband dates back to the 13th century, making it one of the oldest national flag designs.'
  },
  {
    code: 'by', numericId: '112', name: 'Belarus', capital: 'Minsk', continent: 'Europe', region: 'Eastern Europe',
    lat: 53.90, lng: 27.57, difficulty: 'medium', colors: ['red', 'green', 'white'], similarCodes: ['mg', 'tm'], isLandlocked: true,
    fact: 'Belarus’s flag features a traditional vertical woven rushnyk ornament pattern along the hoist side.'
  },
  {
    code: 'be', numericId: '056', name: 'Belgium', capital: 'Brussels', continent: 'Europe', region: 'Western Europe',
    lat: 50.85, lng: 4.35, difficulty: 'easy', colors: ['black', 'yellow', 'red'], similarCodes: ['de', 'ro', 'td'],
    fact: 'Unlike most flags, Belgium’s official civil and state flag uses an unusual 13:15 near-square proportion.'
  },
  {
    code: 'ba', numericId: '070', name: 'Bosnia and Herzegovina', aliases: ['Bosnia'], capital: 'Sarajevo', continent: 'Europe', region: 'Southern Europe',
    lat: 43.86, lng: 18.41, difficulty: 'medium', colors: ['blue', 'yellow', 'white'], similarCodes: ['se', 'ua'],
    fact: 'The yellow triangle on Bosnia and Herzegovina’s flag represents the country’s approximate shape and three main peoples.'
  },
  {
    code: 'bg', numericId: '100', name: 'Bulgaria', capital: 'Sofia', continent: 'Europe', region: 'Eastern Europe',
    lat: 42.70, lng: 23.32, difficulty: 'medium', colors: ['white', 'green', 'red'], similarCodes: ['hu', 'ru', 'it'],
    fact: 'Adopted in 1879, Bulgaria’s green stripe symbolizes the country’s lush forests and agricultural fields.'
  },
  {
    code: 'hr', numericId: '191', name: 'Croatia', capital: 'Zagreb', continent: 'Europe', region: 'Southern Europe',
    lat: 45.81, lng: 15.98, difficulty: 'medium', colors: ['red', 'white', 'blue'], similarCodes: ['nl', 'py', 'rs', 'sk'],
    fact: 'Croatia’s coat of arms combines a red-and-white checkerboard with a crown of five historic regional shields.'
  },
  {
    code: 'cz', numericId: '203', name: 'Czechia', aliases: ['Czech Republic'], capital: 'Prague', continent: 'Europe', region: 'Central Europe',
    lat: 50.08, lng: 14.44, difficulty: 'medium', colors: ['white', 'red', 'blue'], similarCodes: ['ph', 'pl', 'cl'], isLandlocked: true,
    fact: 'The blue triangle was added to the white-and-red Bohemian banner in 1920 to distinguish it from Poland’s flag.'
  },
  {
    code: 'dk', numericId: '208', name: 'Denmark', capital: 'Copenhagen', continent: 'Europe', region: 'Northern Europe',
    lat: 55.68, lng: 12.57, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['no', 'ch', 'se', 'fi'],
    fact: 'Known as the Dannebrog, Denmark’s flag is the oldest continuously used national flag in the world.'
  },
  {
    code: 'ee', numericId: '233', name: 'Estonia', capital: 'Tallinn', continent: 'Europe', region: 'Northern Europe',
    lat: 59.44, lng: 24.75, difficulty: 'medium', colors: ['blue', 'black', 'white'], similarCodes: ['bw', 'fi', 'lv'],
    fact: 'Estonia’s striking blue-black-white tricolor evokes a winter Nordic landscape: sky, dark pine forests, and snow.'
  },
  {
    code: 'fi', numericId: '246', name: 'Finland', capital: 'Helsinki', continent: 'Europe', region: 'Northern Europe',
    lat: 60.17, lng: 24.94, difficulty: 'easy', colors: ['white', 'blue'], similarCodes: ['se', 'gr', 'is'],
    fact: 'Finland’s blue Nordic cross represents its more than 180,000 lakes and clear skies over winter snow.'
  },
  {
    code: 'fr', numericId: '250', name: 'France', capital: 'Paris', continent: 'Europe', region: 'Western Europe',
    lat: 48.86, lng: 2.35, difficulty: 'easy', colors: ['blue', 'white', 'red'], similarCodes: ['nl', 'ru', 'it', 'ro'],
    fact: 'The French Tricolore, adopted during the 1789 Revolution, inspired vertical tricolor flags around the globe.'
  },
  {
    code: 'de', numericId: '276', name: 'Germany', capital: 'Berlin', continent: 'Europe', region: 'Central Europe',
    lat: 52.52, lng: 13.40, difficulty: 'easy', colors: ['black', 'red', 'yellow'], similarCodes: ['be', 'ug'],
    fact: 'Germany’s black, red, and gold colors originated from early 19th-century uniforms of volunteers seeking German unity.'
  },
  {
    code: 'gr', numericId: '300', name: 'Greece', capital: 'Athens', continent: 'Europe', region: 'Southern Europe',
    lat: 37.98, lng: 23.73, difficulty: 'easy', colors: ['blue', 'white'], similarCodes: ['uy', 'fi', 'il'],
    fact: 'The nine horizontal stripes on Greece’s flag correspond to the nine syllables of the phrase “Eleftheria i Thanatos.”'
  },
  {
    code: 'hu', numericId: '348', name: 'Hungary', capital: 'Budapest', continent: 'Europe', region: 'Central Europe',
    lat: 47.50, lng: 19.04, difficulty: 'medium', colors: ['red', 'white', 'green'], similarCodes: ['bg', 'it', 'tj', 'ir'], isLandlocked: true,
    fact: 'In Hungary’s tricolor, red symbolizes strength, white stands for faithfulness, and green represents hope.'
  },
  {
    code: 'is', numericId: '352', name: 'Iceland', capital: 'Reykjavik', continent: 'Europe', region: 'Northern Europe',
    lat: 64.15, lng: -21.94, difficulty: 'medium', colors: ['blue', 'white', 'red'], similarCodes: ['no', 'gb', 'fi'], isIsland: true,
    fact: 'Iceland’s flag colors reflect the island’s geography: ocean blue, snowy glaciers, and volcanic fire.'
  },
  {
    code: 'ie', numericId: '372', name: 'Ireland', capital: 'Dublin', continent: 'Europe', region: 'Northern Europe',
    lat: 53.35, lng: -6.26, difficulty: 'easy', colors: ['green', 'white', 'orange'], similarCodes: ['ci', 'it', 'in'], isIsland: true,
    fact: 'Ireland’s green, white, and orange tricolor symbolizes peace (white) uniting green and orange traditions.'
  },
  {
    code: 'it', numericId: '380', name: 'Italy', capital: 'Rome', continent: 'Europe', region: 'Southern Europe',
    lat: 41.90, lng: 12.50, difficulty: 'easy', colors: ['green', 'white', 'red'], similarCodes: ['ie', 'mx', 'hu', 'bg'],
    fact: 'Italy’s green, white, and red Il Tricolore first appeared in Reggio Emilia in 1797.'
  },
  {
    code: 'lv', numericId: '428', name: 'Latvia', capital: 'Riga', continent: 'Europe', region: 'Northern Europe',
    lat: 56.95, lng: 24.11, difficulty: 'medium', colors: ['red', 'white'], similarCodes: ['at', 'qa', 'bh'],
    fact: 'Latvia uses a distinctive dark carmine-red shade with a narrower central white band in a 2:1:2 ratio.'
  },
  {
    code: 'li', numericId: '438', name: 'Liechtenstein', capital: 'Vaduz', continent: 'Europe', region: 'Central Europe',
    lat: 47.14, lng: 9.52, difficulty: 'hard', colors: ['blue', 'red', 'yellow'], similarCodes: ['ht', 'ph'], isLandlocked: true,
    fact: 'Liechtenstein added a gold crown to its flag in 1937 after noticing at the 1936 Olympics it matched Haiti’s.'
  },
  {
    code: 'lt', numericId: '440', name: 'Lithuania', capital: 'Vilnius', continent: 'Europe', region: 'Northern Europe',
    lat: 54.69, lng: 25.28, difficulty: 'medium', colors: ['yellow', 'green', 'red'], similarCodes: ['mm', 'bo', 'gh'],
    fact: 'Lithuania’s yellow, green, and red horizontal stripes represent golden fields, green forests, and courage.'
  },
  {
    code: 'lu', numericId: '442', name: 'Luxembourg', capital: 'Luxembourg', capitalAliases: ['Luxembourg City'], continent: 'Europe', region: 'Western Europe',
    lat: 49.61, lng: 6.13, difficulty: 'hard', colors: ['red', 'white', 'blue'], similarCodes: ['nl', 'py', 'hr'], isLandlocked: true,
    fact: 'Luxembourg’s flag uses a sky-blue bottom stripe and wider 3:5 proportions to distinguish it from the Netherlands.'
  },
  {
    code: 'mt', numericId: '470', name: 'Malta', capital: 'Valletta', continent: 'Europe', region: 'Southern Europe',
    lat: 35.90, lng: 14.51, difficulty: 'hard', colors: ['white', 'red'], similarCodes: ['pl', 'mc', 'id'], isIsland: true,
    fact: 'Malta’s flag bears the George Cross awarded to the island’s population for bravery during World War II.'
  },
  {
    code: 'md', numericId: '498', name: 'Moldova', capital: 'Chișinău', capitalAliases: ['Chisinau'], continent: 'Europe', region: 'Eastern Europe',
    lat: 47.01, lng: 28.86, difficulty: 'hard', colors: ['blue', 'yellow', 'red'], similarCodes: ['ro', 'ad', 'td'], isLandlocked: true,
    fact: 'Moldova’s flag shares Romania’s blue-yellow-red colors and adds a golden eagle carrying an olive branch and scepter.'
  },
  {
    code: 'mc', numericId: '492', name: 'Monaco', capital: 'Monaco', continent: 'Europe', region: 'Western Europe',
    lat: 43.73, lng: 7.42, difficulty: 'hard', colors: ['red', 'white'], similarCodes: ['id', 'pl', 'sg'],
    fact: 'Monaco’s red-over-white bicolour shares the same colors as Indonesia’s flag, though Monaco’s uses a 4:5 ratio.'
  },
  {
    code: 'me', numericId: '499', name: 'Montenegro', capital: 'Podgorica', continent: 'Europe', region: 'Southern Europe',
    lat: 42.44, lng: 19.26, difficulty: 'hard', colors: ['red', 'yellow'], similarCodes: ['al', 'kg', 'mk'],
    fact: 'Montenegro’s crimson banner is framed by a golden border and centered with a double-headed eagle and lion shield.'
  },
  {
    code: 'nl', numericId: '528', name: 'Netherlands', aliases: ['Holland'], capital: 'Amsterdam', continent: 'Europe', region: 'Western Europe',
    lat: 52.37, lng: 4.90, difficulty: 'easy', colors: ['red', 'white', 'blue'], similarCodes: ['lu', 'fr', 'ru', 'hr'],
    fact: 'The Dutch red-white-blue flag evolved from the 16th-century orange-white-blue Prince’s Flag and inspired Russia’s.'
  },
  {
    code: 'mk', numericId: '807', name: 'North Macedonia', aliases: ['Macedonia'], capital: 'Skopje', continent: 'Europe', region: 'Southern Europe',
    lat: 42.00, lng: 21.43, difficulty: 'medium', colors: ['red', 'yellow'], similarCodes: ['kg', 'me', 'jp'], isLandlocked: true,
    fact: 'North Macedonia’s flag depicts a golden rising sun with eight broadening rays stretching across a crimson field.'
  },
  {
    code: 'no', numericId: '578', name: 'Norway', capital: 'Oslo', continent: 'Europe', region: 'Northern Europe',
    lat: 59.91, lng: 10.75, difficulty: 'easy', colors: ['red', 'white', 'blue'], similarCodes: ['is', 'dk', 'se', 'fi'],
    fact: 'Designed in 1821, Norway’s flag combines Denmark’s red-and-white design with a dark blue cross.'
  },
  {
    code: 'pl', numericId: '616', name: 'Poland', capital: 'Warsaw', continent: 'Europe', region: 'Central Europe',
    lat: 52.23, lng: 21.01, difficulty: 'easy', colors: ['white', 'red'], similarCodes: ['id', 'mc', 'cz', 'sg'],
    fact: 'Poland’s white-over-red bicolour derives from the white eagle on a red shield used since the 13th century.'
  },
  {
    code: 'pt', numericId: '620', name: 'Portugal', capital: 'Lisbon', continent: 'Europe', region: 'Southern Europe',
    lat: 38.72, lng: -9.14, difficulty: 'easy', colors: ['green', 'red', 'yellow'], similarCodes: ['es', 'by', 'it'],
    fact: 'Portugal’s flag features an armillary sphere—an ancient astronomical navigation tool honoring the Age of Discovery.'
  },
  {
    code: 'ro', numericId: '642', name: 'Romania', capital: 'Bucharest', continent: 'Europe', region: 'Eastern Europe',
    lat: 44.43, lng: 26.10, difficulty: 'medium', colors: ['blue', 'yellow', 'red'], similarCodes: ['td', 'md', 'ad', 'be'],
    fact: 'Romania and Chad share near-identical blue-yellow-red vertical tricolors; Romania’s blue is slightly lighter.'
  },
  {
    code: 'ru', numericId: '643', name: 'Russia', aliases: ['Russian Federation'], capital: 'Moscow', continent: 'Europe', region: 'Eastern Europe',
    lat: 55.76, lng: 37.62, difficulty: 'easy', colors: ['white', 'blue', 'red'], similarCodes: ['nl', 'sk', 'si', 'rs'],
    fact: 'Russia’s white-blue-red tricolor was introduced by Peter the Great in the late 17th century and inspired Pan-Slavic flags.'
  },
  {
    code: 'sm', numericId: '674', name: 'San Marino', capital: 'San Marino', continent: 'Europe', region: 'Southern Europe',
    lat: 43.94, lng: 12.46, difficulty: 'expert', colors: ['white', 'blue'], similarCodes: ['ee', 'fi', 'ar'], isLandlocked: true,
    fact: 'San Marino’s coat of arms shows three stone towers perched atop Monte Titano, symbolizing the world’s oldest republic.'
  },
  {
    code: 'rs', numericId: '688', name: 'Serbia', capital: 'Belgrade', continent: 'Europe', region: 'Southern Europe',
    lat: 44.79, lng: 20.45, difficulty: 'medium', colors: ['red', 'blue', 'white'], similarCodes: ['ru', 'sk', 'si', 'hr'], isLandlocked: true,
    fact: 'Serbia’s red-blue-white tricolor displays a crowned double-headed white eagle on a red shield.'
  },
  {
    code: 'sk', numericId: '703', name: 'Slovakia', capital: 'Bratislava', continent: 'Europe', region: 'Central Europe',
    lat: 48.15, lng: 17.11, difficulty: 'medium', colors: ['white', 'blue', 'red'], similarCodes: ['si', 'ru', 'rs', 'hr'], isLandlocked: true,
    fact: 'Slovakia’s shield depicts a white double cross atop three blue mountain peaks representing the Tatra, Fatra, and Matra ranges.'
  },
  {
    code: 'si', numericId: '705', name: 'Slovenia', capital: 'Ljubljana', continent: 'Europe', region: 'Southern Europe',
    lat: 46.05, lng: 14.51, difficulty: 'medium', colors: ['white', 'blue', 'red'], similarCodes: ['sk', 'ru', 'rs'],
    fact: 'Slovenia’s coat of arms features Mount Triglav—its highest peak—below three six-pointed golden stars.'
  },
  {
    code: 'es', numericId: '724', name: 'Spain', capital: 'Madrid', continent: 'Europe', region: 'Southern Europe',
    lat: 40.42, lng: -3.70, difficulty: 'easy', colors: ['red', 'yellow'], similarCodes: ['pt', 'me'],
    fact: 'Spain’s wide central yellow stripe was originally chosen in 1785 so naval ships could spot the banner clearly at sea.'
  },
  {
    code: 'se', numericId: '752', name: 'Sweden', capital: 'Stockholm', continent: 'Europe', region: 'Northern Europe',
    lat: 59.33, lng: 18.07, difficulty: 'easy', colors: ['blue', 'yellow'], similarCodes: ['fi', 'ua', 'dk', 'no'],
    fact: 'Sweden’s golden Nordic cross on a blue field has been a royal and national symbol since the 16th century.'
  },
  {
    code: 'ch', numericId: '756', name: 'Switzerland', capital: 'Bern', continent: 'Europe', region: 'Central Europe',
    lat: 46.95, lng: 7.45, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['dk', 'to', 'ge'], aspectRatio: '1:1', isLandlocked: true,
    fact: 'Switzerland is one of only two sovereign nations—alongside Vatican City—with an official 1:1 square national flag.'
  },
  {
    code: 'ua', numericId: '804', name: 'Ukraine', capital: 'Kyiv', capitalAliases: ['Kiev'], continent: 'Europe', region: 'Eastern Europe',
    lat: 50.45, lng: 30.52, difficulty: 'easy', colors: ['blue', 'yellow'], similarCodes: ['se', 'pw', 'kz'],
    fact: 'Ukraine’s blue-over-yellow flag evokes blue skies stretching over golden wheat fields.'
  },
  {
    code: 'gb', numericId: '826', name: 'United Kingdom', aliases: ['UK', 'Britain', 'Great Britain'], capital: 'London', continent: 'Europe', region: 'Northern Europe',
    lat: 51.51, lng: -0.13, difficulty: 'easy', colors: ['blue', 'red', 'white'], similarCodes: ['au', 'nz', 'fj', 'is'], isIsland: true,
    fact: 'The Union Jack overlays the crosses of St. George (England), St. Andrew (Scotland), and St. Patrick (Ireland).'
  },
  {
    code: 'va', numericId: '336', name: 'Vatican City', aliases: ['Vatican', 'Holy See'], capital: 'Vatican City', continent: 'Europe', region: 'Southern Europe',
    lat: 41.90, lng: 12.45, difficulty: 'medium', colors: ['yellow', 'white'], similarCodes: ['ch', 'sm'], aspectRatio: '1:1', isLandlocked: true,
    fact: 'Vatican City is both the world’s smallest country by area and one of two sovereign states with a square 1:1 flag.'
  },

  // ================= ASIA (48) =================
  {
    code: 'af', numericId: '004', name: 'Afghanistan', capital: 'Kabul', continent: 'Asia', region: 'South Asia',
    lat: 34.53, lng: 69.17, difficulty: 'medium', colors: ['black', 'red', 'green', 'white'], similarCodes: ['ly', 'iq', 'ke'], isLandlocked: true,
    fact: 'Kabul sits in a high mountain valley over 1,790 meters above sea level in the Hindu Kush range.'
  },
  {
    code: 'am', numericId: '051', name: 'Armenia', capital: 'Yerevan', continent: 'Asia', region: 'Western Asia',
    lat: 40.18, lng: 44.51, difficulty: 'medium', colors: ['red', 'blue', 'orange'], similarCodes: ['co', 'ec', 've'], isLandlocked: true,
    fact: 'Armenia’s flag replaces the more common yellow stripe with bright apricot-orange at the bottom.'
  },
  {
    code: 'az', numericId: '031', name: 'Azerbaijan', capital: 'Baku', continent: 'Asia', region: 'Western Asia',
    lat: 40.41, lng: 49.87, difficulty: 'medium', colors: ['blue', 'red', 'green', 'white'], similarCodes: ['uz', 'tr', 'tm'],
    fact: 'Baku lies 28 meters below sea level on the Caspian Sea, making it the lowest-lying national capital in the world.'
  },
  {
    code: 'bh', numericId: '048', name: 'Bahrain', capital: 'Manama', continent: 'Asia', region: 'Western Asia',
    lat: 26.23, lng: 50.59, difficulty: 'hard', colors: ['red', 'white'], similarCodes: ['qa', 'lv'], isIsland: true,
    fact: 'Bahrain’s flag features five white serrated triangles representing the five pillars of Islam.'
  },
  {
    code: 'bd', numericId: '050', name: 'Bangladesh', capital: 'Dhaka', continent: 'Asia', region: 'South Asia',
    lat: 23.81, lng: 90.41, difficulty: 'easy', colors: ['green', 'red'], similarCodes: ['jp', 'pw'],
    fact: 'The red disc on Bangladesh’s green flag is offset slightly toward the hoist so it appears centered while waving.'
  },
  {
    code: 'bt', numericId: '064', name: 'Bhutan', capital: 'Thimphu', continent: 'Asia', region: 'South Asia',
    lat: 27.47, lng: 89.64, difficulty: 'medium', colors: ['yellow', 'orange', 'white'], similarCodes: ['lk', 'pg'], isLandlocked: true,
    fact: 'Bhutan’s flag depicts Druk, the Thunder Dragon, clutching jewels in its claws to symbolize national wealth.'
  },
  {
    code: 'bn', numericId: '096', name: 'Brunei', capital: 'Bandar Seri Begawan', continent: 'Asia', region: 'Southeast Asia',
    lat: 4.90, lng: 114.94, difficulty: 'hard', colors: ['yellow', 'white', 'black', 'red'], similarCodes: ['bt', 'my'],
    fact: 'Brunei’s yellow flag features diagonal white and black bands and a red state crest with upturned hands.'
  },
  {
    code: 'kh', numericId: '116', name: 'Cambodia', capital: 'Phnom Penh', continent: 'Asia', region: 'Southeast Asia',
    lat: 11.56, lng: 104.92, difficulty: 'medium', colors: ['blue', 'red', 'white'], similarCodes: ['la', 'th'],
    fact: 'Cambodia is one of only a handful of national flags worldwide to feature a real monument—Angkor Wat—at its center.'
  },
  {
    code: 'cn', numericId: '156', name: 'China', aliases: ["People's Republic of China", 'PRC'], capital: 'Beijing', continent: 'Asia', region: 'East Asia',
    lat: 39.90, lng: 116.41, difficulty: 'easy', colors: ['red', 'yellow'], similarCodes: ['vn', 'tr', 'kg'],
    fact: 'China’s Five-starred Red Flag displays one large golden star surrounded by four smaller stars in an arc.'
  },
  {
    code: 'cy', numericId: '196', name: 'Cyprus', capital: 'Nicosia', continent: 'Asia', region: 'Western Asia',
    lat: 35.19, lng: 33.38, difficulty: 'medium', colors: ['white', 'orange', 'green'], similarCodes: ['va'], isIsland: true,
    fact: 'Cyprus is one of the very few sovereign countries to display a silhouette map of its own territory on its flag.'
  },
  {
    code: 'ge', numericId: '268', name: 'Georgia', capital: 'Tbilisi', continent: 'Asia', region: 'Western Asia',
    lat: 41.72, lng: 44.78, difficulty: 'medium', colors: ['white', 'red'], similarCodes: ['ch', 'dk', 'gb'],
    fact: 'Georgia’s Five Cross Flag combines a large central St. George cross with four smaller Bolnisi crosses.'
  },
  {
    code: 'in', numericId: '356', name: 'India', capital: 'New Delhi', continent: 'Asia', region: 'South Asia',
    lat: 28.61, lng: 77.21, difficulty: 'easy', colors: ['orange', 'white', 'green', 'blue'], similarCodes: ['ne', 'ie', 'hu'],
    fact: 'At the center of India’s Tiranga sits the 24-spoke navy blue Ashoka Chakra wheel representing law and motion.'
  },
  {
    code: 'id', numericId: '360', name: 'Indonesia', capital: 'Jakarta', continent: 'Asia', region: 'Southeast Asia',
    lat: -6.21, lng: 106.85, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['mc', 'pl', 'sg'], isIsland: true,
    fact: 'Known as Sang Saka Merah Putih, Indonesia’s red-over-white flag has a 2:3 ratio, wider than Monaco’s 4:5.'
  },
  {
    code: 'ir', numericId: '364', name: 'Iran', capital: 'Tehran', continent: 'Asia', region: 'Western Asia',
    lat: 35.69, lng: 51.39, difficulty: 'medium', colors: ['green', 'white', 'red'], similarCodes: ['tj', 'hu', 'it'],
    fact: 'Iran’s green, white, and red stripes are edged with stylized Kufic script repeating 22 times along the borders.'
  },
  {
    code: 'iq', numericId: '368', name: 'Iraq', capital: 'Baghdad', continent: 'Asia', region: 'Western Asia',
    lat: 33.31, lng: 44.37, difficulty: 'medium', colors: ['red', 'white', 'black', 'green'], similarCodes: ['ye', 'eg', 'sy'],
    fact: 'Iraq shares the Pan-Arab red, white, and black horizontal bands with green Arabic calligraphy in the center.'
  },
  {
    code: 'il', numericId: '376', name: 'Israel', capital: 'Jerusalem', continent: 'Asia', region: 'Western Asia',
    lat: 31.77, lng: 35.21, difficulty: 'easy', colors: ['white', 'blue'], similarCodes: ['gr', 'fi', 'hn'],
    fact: 'Israel’s flag takes inspiration from the traditional tallit prayer shawl, featuring blue stripes and the Star of David.'
  },
  {
    code: 'jp', numericId: '392', name: 'Japan', capital: 'Tokyo', continent: 'Asia', region: 'East Asia',
    lat: 35.68, lng: 139.77, difficulty: 'easy', colors: ['white', 'red'], similarCodes: ['bd', 'pw', 'kr'], isIsland: true,
    fact: 'Called the Nisshoki or Hinomaru (“circle of the sun”), Japan’s flag centers a crimson sun on pure white.'
  },
  {
    code: 'jo', numericId: '400', name: 'Jordan', capital: 'Amman', continent: 'Asia', region: 'Western Asia',
    lat: 31.95, lng: 35.93, difficulty: 'medium', colors: ['black', 'white', 'green', 'red'], similarCodes: ['ps', 'sd', 'kw', 'ae'],
    fact: 'The white seven-pointed star on Jordan’s red triangle distinguishes it from Palestine’s otherwise similar banner.'
  },
  {
    code: 'kz', numericId: '398', name: 'Kazakhstan', capital: 'Astana', continent: 'Asia', region: 'Central Asia',
    lat: 51.17, lng: 71.47, difficulty: 'medium', colors: ['blue', 'yellow'], similarCodes: ['ua', 'pw', 'kg'], isLandlocked: true,
    fact: 'Kazakhstan is the world’s largest landlocked country; its sky-blue flag displays a golden sun, steppe eagle, and ornament.'
  },
  {
    code: 'kw', numericId: '414', name: 'Kuwait', capital: 'Kuwait City', continent: 'Asia', region: 'Western Asia',
    lat: 29.38, lng: 47.98, difficulty: 'hard', colors: ['green', 'white', 'red', 'black'], similarCodes: ['ae', 'jo', 'ps', 'sd'],
    fact: 'Kuwait’s flag places a black trapezoid at the hoist meeting green, white, and red horizontal stripes.'
  },
  {
    code: 'kg', numericId: '417', name: 'Kyrgyzstan', capital: 'Bishkek', continent: 'Asia', region: 'Central Asia',
    lat: 42.87, lng: 74.59, difficulty: 'hard', colors: ['red', 'yellow'], similarCodes: ['mk', 'cn', 'vn'], isLandlocked: true,
    fact: 'The emblem on Kyrgyzstan’s crimson flag depicts a golden sun framing the tunduk crown of a traditional yurt.'
  },
  {
    code: 'la', numericId: '418', name: 'Laos', capital: 'Vientiane', continent: 'Asia', region: 'Southeast Asia',
    lat: 17.97, lng: 102.63, difficulty: 'medium', colors: ['red', 'blue', 'white'], similarCodes: ['th', 'kh', 'pw'], isLandlocked: true,
    fact: 'Laos is the only landlocked country in Southeast Asia; its flag’s white circle represents the full moon over the Mekong.'
  },
  {
    code: 'lb', numericId: '422', name: 'Lebanon', capital: 'Beirut', continent: 'Asia', region: 'Western Asia',
    lat: 33.89, lng: 35.50, difficulty: 'easy', colors: ['red', 'white', 'green'], similarCodes: ['at', 'ca', 'pe'],
    fact: 'Lebanon’s flag centers a green Lebanon Cedar tree, an ancient symbol of resilience mentioned throughout history.'
  },
  {
    code: 'my', numericId: '458', name: 'Malaysia', capital: 'Kuala Lumpur', continent: 'Asia', region: 'Southeast Asia',
    lat: 3.14, lng: 101.69, difficulty: 'easy', colors: ['red', 'white', 'blue', 'yellow'], similarCodes: ['us', 'lr'],
    fact: 'Malaysia’s Jalur Gemilang (“Stripes of Glory”) features 14 alternating stripes and a 14-point star for its states and federal territories.'
  },
  {
    code: 'mv', numericId: '462', name: 'Maldives', capital: 'Malé', capitalAliases: ['Male'], continent: 'Asia', region: 'South Asia',
    lat: 4.18, lng: 73.51, difficulty: 'hard', colors: ['red', 'green', 'white'], similarCodes: ['mr', 'dz', 'pk'], isIsland: true,
    fact: 'With an average elevation of just 1.5 meters, the Maldives is the lowest-lying nation on Earth.'
  },
  {
    code: 'mn', numericId: '496', name: 'Mongolia', capital: 'Ulaanbaatar', continent: 'Asia', region: 'East Asia',
    lat: 47.89, lng: 106.91, difficulty: 'medium', colors: ['red', 'blue', 'yellow'], similarCodes: ['kz', 'kg'], isLandlocked: true,
    fact: 'Mongolia’s flag displays the golden Soyombo emblem representing fire, sun, moon, earth, water, and yin-yang harmony.'
  },
  {
    code: 'mm', numericId: '104', name: 'Myanmar', aliases: ['Burma'], capital: 'Naypyidaw', continent: 'Asia', region: 'Southeast Asia',
    lat: 19.76, lng: 96.08, difficulty: 'hard', colors: ['yellow', 'green', 'red', 'white'], similarCodes: ['lt', 'gh', 'bo'],
    fact: 'Myanmar moved its administrative capital from Yangon to the planned city of Naypyidaw in 2005.'
  },
  {
    code: 'np', numericId: '524', name: 'Nepal', capital: 'Kathmandu', continent: 'Asia', region: 'South Asia',
    lat: 27.72, lng: 85.32, difficulty: 'easy', colors: ['red', 'blue', 'white'], similarCodes: ['bt'], aspectRatio: 'pennant', isLandlocked: true,
    fact: 'Nepal is the only country in the world whose national flag is non-rectangular, formed by two stacked crimson pennants.'
  },
  {
    code: 'kp', numericId: '408', name: 'North Korea', capital: 'Pyongyang', continent: 'Asia', region: 'East Asia',
    lat: 39.04, lng: 125.76, difficulty: 'medium', colors: ['blue', 'red', 'white'], similarCodes: ['kr', 'cr', 'th'],
    fact: 'North Korea’s flag features a red star inside a white disc set on a wide crimson central stripe bordered by blue.'
  },
  {
    code: 'om', numericId: '512', name: 'Oman', capital: 'Muscat', continent: 'Asia', region: 'Western Asia',
    lat: 23.59, lng: 58.38, difficulty: 'hard', colors: ['white', 'red', 'green'], similarCodes: ['ae', 'by', 'mg'],
    fact: 'Oman’s national emblem in the top-left canton shows two crossed swords behind a traditional curved khanjar dagger.'
  },
  {
    code: 'pk', numericId: '586', name: 'Pakistan', capital: 'Islamabad', continent: 'Asia', region: 'South Asia',
    lat: 33.68, lng: 73.05, difficulty: 'easy', colors: ['green', 'white'], similarCodes: ['dz', 'mr', 'tr'],
    fact: 'The white vertical stripe along the hoist of Pakistan’s flag represents the country’s religious minorities.'
  },
  {
    code: 'ps', numericId: '275', name: 'Palestine', capital: 'Ramallah', capitalAliases: ['Jerusalem', 'East Jerusalem'], continent: 'Asia', region: 'Western Asia',
    lat: 31.90, lng: 35.20, difficulty: 'medium', colors: ['black', 'white', 'green', 'red'], similarCodes: ['jo', 'sd', 'eh'],
    fact: 'Palestine’s flag combines the three horizontal Pan-Arab stripes of black, white, and green with a red hoist triangle.'
  },
  {
    code: 'ph', numericId: '608', name: 'Philippines', capital: 'Manila', continent: 'Asia', region: 'Southeast Asia',
    lat: 14.60, lng: 120.98, difficulty: 'easy', colors: ['blue', 'red', 'white', 'yellow'], similarCodes: ['cz', 'cu', 'pr'], isIsland: true,
    fact: 'The Philippines’ flag is unique because flipping it with red on top officially signals a state of war.'
  },
  {
    code: 'qa', numericId: '634', name: 'Qatar', capital: 'Doha', continent: 'Asia', region: 'Western Asia',
    lat: 25.29, lng: 51.53, difficulty: 'medium', colors: ['red', 'white'], similarCodes: ['bh', 'lv'],
    fact: 'Qatar’s maroon-and-white flag has nine serrated points and an unusually elongated 11:28 aspect ratio.'
  },
  {
    code: 'sa', numericId: '682', name: 'Saudi Arabia', capital: 'Riyadh', continent: 'Asia', region: 'Western Asia',
    lat: 24.71, lng: 46.68, difficulty: 'easy', colors: ['green', 'white'], similarCodes: ['pk', 'mr'],
    fact: 'Saudi Arabia’s flag is manufactured to read identically on both sides so the Arabic script and sword never appear reversed.'
  },
  {
    code: 'sg', numericId: '702', name: 'Singapore', capital: 'Singapore', continent: 'Asia', region: 'Southeast Asia',
    lat: 1.35, lng: 103.82, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['id', 'mc', 'pl'], isIsland: true,
    fact: 'Singapore’s five white stars stand for democracy, peace, progress, justice, and equality.'
  },
  {
    code: 'kr', numericId: '410', name: 'South Korea', aliases: ['Republic of Korea'], capital: 'Seoul', continent: 'Asia', region: 'East Asia',
    lat: 37.57, lng: 126.98, difficulty: 'easy', colors: ['white', 'red', 'blue', 'black'], similarCodes: ['jp', 'kp'],
    fact: 'South Korea’s Taegeukgi centers a red-and-blue Taegeuk circle flanked by four black trigrams representing heaven, water, fire, and earth.'
  },
  {
    code: 'lk', numericId: '144', name: 'Sri Lanka', capital: 'Sri Jayawardenepura Kotte', capitalAliases: ['Colombo'], continent: 'Asia', region: 'South Asia',
    lat: 6.89, lng: 79.92, difficulty: 'medium', colors: ['yellow', 'red', 'green', 'orange'], similarCodes: ['bt'], isIsland: true,
    fact: 'Known as the Lion Flag, Sri Lanka’s banner depicts a golden lion holding a kastane sword framed by four bo leaves.'
  },
  {
    code: 'sy', numericId: '760', name: 'Syria', capital: 'Damascus', continent: 'Asia', region: 'Western Asia',
    lat: 33.51, lng: 36.28, difficulty: 'hard', colors: ['red', 'white', 'black', 'green'], similarCodes: ['iq', 'ye', 'eg'],
    fact: 'Damascus is among the oldest continuously inhabited capital cities in the world.'
  },
  {
    code: 'tj', numericId: '762', name: 'Tajikistan', capital: 'Dushanbe', continent: 'Asia', region: 'Central Asia',
    lat: 38.56, lng: 68.79, difficulty: 'hard', colors: ['red', 'white', 'green', 'yellow'], similarCodes: ['ir', 'hu', 'uz'], isLandlocked: true,
    fact: 'Tajikistan’s flag features a golden crown topped by an arc of seven stars across a wide central white stripe.'
  },
  {
    code: 'th', numericId: '764', name: 'Thailand', capital: 'Bangkok', continent: 'Asia', region: 'Southeast Asia',
    lat: 13.76, lng: 100.50, difficulty: 'easy', colors: ['red', 'white', 'blue'], similarCodes: ['cr', 'kp', 'la'],
    fact: 'Thailand’s five horizontal stripes—the Thong Trairong—symbolize nation, religion, and the monarchy.'
  },
  {
    code: 'tl', numericId: '626', name: 'Timor-Leste', aliases: ['East Timor'], capital: 'Dili', continent: 'Asia', region: 'Southeast Asia',
    lat: -8.56, lng: 125.56, difficulty: 'expert', colors: ['red', 'yellow', 'black', 'white'], similarCodes: ['mz', 'st', 'zw'], isIsland: true,
    fact: 'Timor-Leste became the first new sovereign nation of the 21st century in May 2002.'
  },
  {
    code: 'tr', numericId: '792', name: 'Turkey', aliases: ['Türkiye'], capital: 'Ankara', continent: 'Asia', region: 'Western Asia',
    lat: 39.93, lng: 32.86, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['tn', 'az', 'al'],
    fact: 'Turkey spans both Southeastern Europe and Western Asia; its capital Ankara sits in central Anatolia.'
  },
  {
    code: 'tm', numericId: '795', name: 'Turkmenistan', capital: 'Ashgabat', continent: 'Asia', region: 'Central Asia',
    lat: 37.96, lng: 58.33, difficulty: 'hard', colors: ['green', 'red', 'white', 'yellow'], similarCodes: ['uz', 'by', 'az'], isLandlocked: true,
    fact: 'Turkmenistan’s flag displays the most intricate pattern of any national flag, featuring five traditional carpet guls.'
  },
  {
    code: 'ae', numericId: '784', name: 'United Arab Emirates', aliases: ['UAE'], capital: 'Abu Dhabi', continent: 'Asia', region: 'Western Asia',
    lat: 24.45, lng: 54.38, difficulty: 'easy', colors: ['red', 'green', 'white', 'black'], similarCodes: ['kw', 'jo', 'ps', 'sd'],
    fact: 'The UAE’s flag combines the four Pan-Arab colors, placing a bold vertical red band at the hoist.'
  },
  {
    code: 'uz', numericId: '860', name: 'Uzbekistan', capital: 'Tashkent', continent: 'Asia', region: 'Central Asia',
    lat: 41.30, lng: 69.24, difficulty: 'hard', colors: ['blue', 'white', 'green', 'red'], similarCodes: ['az', 'sl', 'dj'], isLandlocked: true,
    fact: 'Uzbekistan is one of only two doubly landlocked countries on Earth—surrounded entirely by other landlocked states.'
  },
  {
    code: 'vn', numericId: '704', name: 'Vietnam', capital: 'Hanoi', continent: 'Asia', region: 'Southeast Asia',
    lat: 21.03, lng: 105.85, difficulty: 'easy', colors: ['red', 'yellow'], similarCodes: ['cn', 'ma', 'kg'],
    fact: 'The five points of Vietnam’s golden star represent intellectuals, farmers, workers, traders, and soldiers.'
  },
  {
    code: 'ye', numericId: '887', name: 'Yemen', capital: "Sana'a", capitalAliases: ['Sanaa'], continent: 'Asia', region: 'Western Asia',
    lat: 15.37, lng: 44.19, difficulty: 'hard', colors: ['red', 'white', 'black'], similarCodes: ['eg', 'iq', 'sy', 'sd'],
    fact: 'Yemen’s plain red-white-black tricolor is the simplest among the Pan-Arab flags, containing no emblems or stars.'
  },

  // ================= AFRICA (54) =================
  {
    code: 'dz', numericId: '012', name: 'Algeria', capital: 'Algiers', continent: 'Africa', region: 'Northern Africa',
    lat: 36.75, lng: 3.06, difficulty: 'medium', colors: ['green', 'white', 'red'], similarCodes: ['pk', 'tn', 'mr'],
    fact: 'Algeria is Africa’s largest country by land area, spanning from the Mediterranean coast deep into the Sahara.'
  },
  {
    code: 'ao', numericId: '024', name: 'Angola', capital: 'Luanda', continent: 'Africa', region: 'Middle Africa',
    lat: -8.84, lng: 13.23, difficulty: 'medium', colors: ['red', 'black', 'yellow'], similarCodes: ['mz', 'pg', 'zw'],
    fact: 'Angola’s central emblem pairs half a cogwheel with a machete and star symbolizing industry and agriculture.'
  },
  {
    code: 'bj', numericId: '204', name: 'Benin', capital: 'Porto-Novo', continent: 'Africa', region: 'Western Africa',
    lat: 6.50, lng: 2.63, difficulty: 'hard', colors: ['green', 'yellow', 'red'], similarCodes: ['mg', 'gn', 'ml', 'cg'],
    fact: 'Benin uses a vertical green hoist band paired with yellow-over-red horizontal stripes in classic Pan-African colors.'
  },
  {
    code: 'bw', numericId: '072', name: 'Botswana', capital: 'Gaborone', continent: 'Africa', region: 'Southern Africa',
    lat: -24.63, lng: 25.92, difficulty: 'medium', colors: ['blue', 'black', 'white'], similarCodes: ['ee', 'sl'], isLandlocked: true,
    fact: 'Botswana’s sky-blue flag symbolizes life-giving water—a precious resource reflected in its national motto “Pula” (Rain).'
  },
  {
    code: 'bf', numericId: '854', name: 'Burkina Faso', capital: 'Ouagadougou', continent: 'Africa', region: 'Western Africa',
    lat: 12.37, lng: -1.52, difficulty: 'hard', colors: ['red', 'green', 'yellow'], similarCodes: ['cm', 'sn', 'gh'], isLandlocked: true,
    fact: 'Burkina Faso’s flag splits horizontally into red over green with a five-pointed yellow star in the middle.'
  },
  {
    code: 'bi', numericId: '108', name: 'Burundi', capital: 'Gitega', continent: 'Africa', region: 'Eastern Africa',
    lat: -3.43, lng: 29.93, difficulty: 'hard', colors: ['red', 'green', 'white'], similarCodes: ['jm', 'sc'], isLandlocked: true,
    fact: 'Burundi moved its political capital from Bujumbura to central Gitega in 2019; its three stars signify unity, work, and progress.'
  },
  {
    code: 'cv', numericId: '132', name: 'Cabo Verde', aliases: ['Cape Verde'], capital: 'Praia', continent: 'Africa', region: 'Western Africa',
    lat: 14.93, lng: -23.51, difficulty: 'hard', colors: ['blue', 'white', 'red', 'yellow'], similarCodes: ['ba', 'cr', 'nr'], isIsland: true,
    fact: 'The ring of ten golden stars on Cabo Verde’s flag represents the ten main islands of the Atlantic archipelago.'
  },
  {
    code: 'cm', numericId: '120', name: 'Cameroon', capital: 'Yaoundé', capitalAliases: ['Yaounde'], continent: 'Africa', region: 'Middle Africa',
    lat: 3.85, lng: 11.50, difficulty: 'medium', colors: ['green', 'red', 'yellow'], similarCodes: ['sn', 'ml', 'gn', 'gh'],
    fact: 'Cameroon’s green, red, and yellow vertical tricolor features a single yellow star in the central red band.'
  },
  {
    code: 'cf', numericId: '140', name: 'Central African Republic', aliases: ['CAR'], capital: 'Bangui', continent: 'Africa', region: 'Middle Africa',
    lat: 4.39, lng: 18.56, difficulty: 'hard', colors: ['blue', 'white', 'green', 'yellow', 'red'], similarCodes: ['mu', 'sc'], isLandlocked: true,
    fact: 'The Central African Republic’s flag uniquely merges four horizontal stripes with a vertical red band running down the center.'
  },
  {
    code: 'td', numericId: '148', name: 'Chad', capital: "N'Djamena", capitalAliases: ['Ndjamena'], continent: 'Africa', region: 'Middle Africa',
    lat: 12.13, lng: 15.06, difficulty: 'hard', colors: ['blue', 'yellow', 'red'], similarCodes: ['ro', 'ad', 'md'], isLandlocked: true,
    fact: 'Chad’s vertical tricolor of indigo, gold, and red is nearly identical to Romania’s, using a slightly deeper shade of blue.'
  },
  {
    code: 'km', numericId: '174', name: 'Comoros', capital: 'Moroni', continent: 'Africa', region: 'Eastern Africa',
    lat: -11.70, lng: 43.26, difficulty: 'expert', colors: ['yellow', 'white', 'red', 'blue', 'green'], similarCodes: ['sc', 'mu', 'dj'], isIsland: true,
    fact: 'Comoros’s four horizontal stripes and four white stars stand for the four islands of the archipelago.'
  },
  {
    code: 'cg', numericId: '178', name: 'Congo', aliases: ['Republic of the Congo', 'Congo-Brazzaville'], capital: 'Brazzaville', continent: 'Africa', region: 'Middle Africa',
    lat: -4.27, lng: 15.24, difficulty: 'hard', colors: ['green', 'yellow', 'red'], similarCodes: ['cd', 'bj', 'ml'],
    fact: 'Brazzaville and Kinshasa—capitals of the two Congos—face each other directly across the Congo River.'
  },
  {
    code: 'cd', numericId: '180', name: 'DR Congo', aliases: ['Democratic Republic of the Congo', 'DRC'], capital: 'Kinshasa', continent: 'Africa', region: 'Middle Africa',
    lat: -4.44, lng: 15.27, difficulty: 'medium', colors: ['blue', 'red', 'yellow'], similarCodes: ['cg', 'na', 'tz'],
    fact: 'A yellow-bordered crimson diagonal stripe slices across DR Congo’s sky-blue flag.'
  },
  {
    code: 'ci', numericId: '384', name: "Côte d'Ivoire", aliases: ['Ivory Coast', "Cote d'Ivoire"], capital: 'Yamoussoukro', continent: 'Africa', region: 'Western Africa',
    lat: 6.83, lng: -5.29, difficulty: 'medium', colors: ['orange', 'white', 'green'], similarCodes: ['ie', 'in', 'ne'],
    fact: 'Côte d’Ivoire’s vertical orange-white-green tricolor is the mirror reverse of Ireland’s green-white-orange flag.'
  },
  {
    code: 'dj', numericId: '262', name: 'Djibouti', capital: 'Djibouti', continent: 'Africa', region: 'Eastern Africa',
    lat: 11.59, lng: 43.15, difficulty: 'hard', colors: ['blue', 'green', 'white', 'red'], similarCodes: ['uz', 'sl', 'so'],
    fact: 'Located on the Horn of Africa, Djibouti’s flag pairs sky blue and green stripes with a white triangle and red star.'
  },
  {
    code: 'eg', numericId: '818', name: 'Egypt', capital: 'Cairo', continent: 'Africa', region: 'Northern Africa',
    lat: 30.04, lng: 31.24, difficulty: 'easy', colors: ['red', 'white', 'black', 'yellow'], similarCodes: ['iq', 'sy', 'ye', 'sd'],
    fact: 'Egypt’s golden Eagle of Saladin sits at the center of its red, white, and black horizontal bands.'
  },
  {
    code: 'gq', numericId: '226', name: 'Equatorial Guinea', capital: 'Malabo', continent: 'Africa', region: 'Middle Africa',
    lat: 3.75, lng: 8.78, difficulty: 'expert', colors: ['green', 'white', 'red', 'blue'], similarCodes: ['dj', 'km', 'hu'],
    fact: 'Equatorial Guinea’s coat of arms depicts a silk-cotton tree beneath six gold stars representing the mainland and five islands.'
  },
  {
    code: 'er', numericId: '232', name: 'Eritrea', capital: 'Asmara', continent: 'Africa', region: 'Eastern Africa',
    lat: 15.32, lng: 38.93, difficulty: 'hard', colors: ['green', 'red', 'blue', 'yellow'], similarCodes: ['gy', 'dj'],
    fact: 'Eritrea’s red triangle stretches all the way from the hoist to the fly edge, bearing a golden olive wreath.'
  },
  {
    code: 'sz', numericId: '748', name: 'Eswatini', aliases: ['Swaziland'], capital: 'Mbabane', continent: 'Africa', region: 'Southern Africa',
    lat: -26.31, lng: 31.13, difficulty: 'hard', colors: ['blue', 'yellow', 'red', 'black', 'white'], similarCodes: ['ke', 'ug'], isLandlocked: true,
    fact: 'Eswatini’s flag features a traditional Nguni oxhide shield and two spears symbolizing defense against enemies.'
  },
  {
    code: 'et', numericId: '231', name: 'Ethiopia', capital: 'Addis Ababa', continent: 'Africa', region: 'Eastern Africa',
    lat: 9.03, lng: 38.74, difficulty: 'medium', colors: ['green', 'yellow', 'red', 'blue'], similarCodes: ['gh', 'bo', 'cm'], isLandlocked: true,
    fact: 'Ethiopia’s green, yellow, and red colors inspired the Pan-African movement and flags across the continent.'
  },
  {
    code: 'ga', numericId: '266', name: 'Gabon', capital: 'Libreville', continent: 'Africa', region: 'Middle Africa',
    lat: 0.42, lng: 9.47, difficulty: 'hard', colors: ['green', 'yellow', 'blue'], similarCodes: ['sl', 'rw', 'uz'],
    fact: 'Gabon’s horizontal green, yellow, and blue stripes symbolize forests, the Equator’s sunlight, and the Atlantic Ocean.'
  },
  {
    code: 'gm', numericId: '270', name: 'Gambia', aliases: ['The Gambia'], capital: 'Banjul', continent: 'Africa', region: 'Western Africa',
    lat: 13.45, lng: -16.58, difficulty: 'hard', colors: ['red', 'blue', 'green', 'white'], similarCodes: ['na', 'bw', 'ga'],
    fact: 'The thin white lines bordering the blue stripe on Gambia’s flag symbolize the Gambia River flowing peacefully through the land.'
  },
  {
    code: 'gh', numericId: '288', name: 'Ghana', capital: 'Accra', continent: 'Africa', region: 'Western Africa',
    lat: 5.60, lng: -0.19, difficulty: 'easy', colors: ['red', 'yellow', 'green', 'black'], similarCodes: ['bo', 'et', 'sn', 'cm'],
    fact: 'In 1957, Ghana became the first sub-Saharan African nation after independence to adopt Pan-African colors with the Black Star.'
  },
  {
    code: 'gn', numericId: '324', name: 'Guinea', capital: 'Conakry', continent: 'Africa', region: 'Western Africa',
    lat: 9.64, lng: -13.58, difficulty: 'hard', colors: ['red', 'yellow', 'green'], similarCodes: ['ml', 'sn', 'cm', 'ro'],
    fact: 'Guinea’s red-yellow-green vertical tricolor reverses the exact color order of neighboring Mali’s flag.'
  },
  {
    code: 'gw', numericId: '624', name: 'Guinea-Bissau', capital: 'Bissau', continent: 'Africa', region: 'Western Africa',
    lat: 11.86, lng: -15.60, difficulty: 'hard', colors: ['red', 'yellow', 'green', 'black'], similarCodes: ['bj', 'mg', 'gh'],
    fact: 'Guinea-Bissau’s flag places a vertical red band with a black star alongside yellow and green horizontal stripes.'
  },
  {
    code: 'ke', numericId: '404', name: 'Kenya', capital: 'Nairobi', continent: 'Africa', region: 'Eastern Africa',
    lat: -1.29, lng: 36.82, difficulty: 'easy', colors: ['black', 'red', 'green', 'white'], similarCodes: ['ss', 'sz', 'mw'],
    fact: 'Kenya’s flag features a traditional Maasai shield and crossed spears representing readiness to defend freedom.'
  },
  {
    code: 'ls', numericId: '426', name: 'Lesotho', capital: 'Maseru', continent: 'Africa', region: 'Southern Africa',
    lat: -29.32, lng: 27.48, difficulty: 'hard', colors: ['blue', 'white', 'green', 'black'], similarCodes: ['sl', 'uz', 'dj'], isLandlocked: true,
    fact: 'Known as the “Kingdom in the Sky,” Lesotho is the only country completely above 1,000 meters elevation and features a mokorotlo hat on its flag.'
  },
  {
    code: 'lr', numericId: '430', name: 'Liberia', capital: 'Monrovia', continent: 'Africa', region: 'Western Africa',
    lat: 6.31, lng: -10.80, difficulty: 'medium', colors: ['red', 'white', 'blue'], similarCodes: ['us', 'my', 'cl'],
    fact: 'Liberia’s flag features 11 alternating red and white stripes and one white star in a blue canton.'
  },
  {
    code: 'ly', numericId: '434', name: 'Libya', capital: 'Tripoli', continent: 'Africa', region: 'Northern Africa',
    lat: 32.89, lng: 13.19, difficulty: 'medium', colors: ['red', 'black', 'green', 'white'], similarCodes: ['af', 'mw', 'ke'],
    fact: 'Libya’s wide central black stripe bears a white crescent and five-pointed star between narrower red and green bands.'
  },
  {
    code: 'mg', numericId: '450', name: 'Madagascar', capital: 'Antananarivo', continent: 'Africa', region: 'Eastern Africa',
    lat: -18.88, lng: 47.51, difficulty: 'medium', colors: ['white', 'red', 'green'], similarCodes: ['bj', 'om', 'by'], isIsland: true,
    fact: 'Madagascar is the world’s fourth-largest island; its flag places a white vertical band beside red and green bars.'
  },
  {
    code: 'mw', numericId: '454', name: 'Malawi', capital: 'Lilongwe', continent: 'Africa', region: 'Eastern Africa',
    lat: -13.96, lng: 33.77, difficulty: 'hard', colors: ['black', 'red', 'green'], similarCodes: ['ke', 'ly', 'af'], isLandlocked: true,
    fact: 'A red rising sun with 31 rays gleams on the top black band of Malawi’s flag, representing the dawn of freedom.'
  },
  {
    code: 'ml', numericId: '466', name: 'Mali', capital: 'Bamako', continent: 'Africa', region: 'Western Africa',
    lat: 12.64, lng: -8.00, difficulty: 'hard', colors: ['green', 'yellow', 'red'], similarCodes: ['gn', 'sn', 'cm', 'bj'], isLandlocked: true,
    fact: 'Mali’s plain green-yellow-red vertical tricolor differs from Guinea only by putting green at the hoist instead of red.'
  },
  {
    code: 'mr', numericId: '478', name: 'Mauritania', capital: 'Nouakchott', continent: 'Africa', region: 'Western Africa',
    lat: 18.07, lng: -15.96, difficulty: 'hard', colors: ['green', 'yellow', 'red'], similarCodes: ['pk', 'dz', 'mv'],
    fact: 'Mauritania added two horizontal red stripes in 2017 to honor those who defended the nation.'
  },
  {
    code: 'mu', numericId: '480', name: 'Mauritius', capital: 'Port Louis', continent: 'Africa', region: 'Eastern Africa',
    lat: -20.16, lng: 57.50, difficulty: 'hard', colors: ['red', 'blue', 'yellow', 'green'], similarCodes: ['cf', 'sc', 'km'], isIsland: true,
    fact: 'Mauritius uses four equal horizontal stripes—red, blue, yellow, and green—earning it the nickname the “Rainbow Flag.”'
  },
  {
    code: 'ma', numericId: '504', name: 'Morocco', capital: 'Rabat', continent: 'Africa', region: 'Northern Africa',
    lat: 34.02, lng: -6.84, difficulty: 'easy', colors: ['red', 'green'], similarCodes: ['vn', 'tn', 'tr'],
    fact: 'Morocco’s crimson flag is centered with an interwoven five-pointed green star called the Seal of Solomon.'
  },
  {
    code: 'mz', numericId: '508', name: 'Mozambique', capital: 'Maputo', continent: 'Africa', region: 'Eastern Africa',
    lat: -25.97, lng: 32.57, difficulty: 'medium', colors: ['green', 'black', 'yellow', 'red', 'white'], similarCodes: ['zw', 'za', 'ss'],
    fact: 'Mozambique’s flag emblem shows an open book, hoe, and rifle over a five-pointed yellow star.'
  },
  {
    code: 'na', numericId: '516', name: 'Namibia', capital: 'Windhoek', continent: 'Africa', region: 'Southern Africa',
    lat: -22.56, lng: 17.07, difficulty: 'medium', colors: ['blue', 'red', 'green', 'yellow', 'white'], similarCodes: ['cd', 'tz', 'kn'],
    fact: 'Namibia’s twelve-ray golden sun shines in the upper blue triangle above a white-edged red diagonal band.'
  },
  {
    code: 'ne', numericId: '562', name: 'Niger', capital: 'Niamey', continent: 'Africa', region: 'Western Africa',
    lat: 13.51, lng: 2.13, difficulty: 'hard', colors: ['orange', 'white', 'green'], similarCodes: ['in', 'ci', 'ie'], isLandlocked: true,
    fact: 'Niger’s horizontal orange-white-green flag places an orange sun disc in the center and uses a rare 6:7 proportion.'
  },
  {
    code: 'ng', numericId: '566', name: 'Nigeria', capital: 'Abuja', continent: 'Africa', region: 'Western Africa',
    lat: 9.08, lng: 7.40, difficulty: 'easy', colors: ['green', 'white'], similarCodes: ['pk', 'sa', 'nf'],
    fact: 'Designed by student Michael Taiwo Akinkunmi in 1959, Nigeria’s green-white-green flag represents forests and peace.'
  },
  {
    code: 'rw', numericId: '646', name: 'Rwanda', capital: 'Kigali', continent: 'Africa', region: 'Eastern Africa',
    lat: -1.94, lng: 30.06, difficulty: 'hard', colors: ['blue', 'yellow', 'green'], similarCodes: ['ga', 'co'], isLandlocked: true,
    fact: 'Rwanda’s sky-blue upper band takes up half the flag and bears a 24-ray golden sun in the upper right.'
  },
  {
    code: 'st', numericId: '678', name: 'São Tomé and Príncipe', aliases: ['Sao Tome and Principe'], capital: 'São Tomé', capitalAliases: ['Sao Tome'], continent: 'Africa', region: 'Middle Africa',
    lat: 0.34, lng: 6.73, difficulty: 'expert', colors: ['green', 'yellow', 'red', 'black'], similarCodes: ['gh', 'tl', 'gy'], isIsland: true,
    fact: 'The two black stars on São Tomé and Príncipe’s yellow central band represent the country’s two main islands.'
  },
  {
    code: 'sn', numericId: '686', name: 'Senegal', capital: 'Dakar', continent: 'Africa', region: 'Western Africa',
    lat: 14.72, lng: -17.47, difficulty: 'medium', colors: ['green', 'yellow', 'red'], similarCodes: ['cm', 'ml', 'gn', 'gh'],
    fact: 'Senegal’s flag is identical in stripes to Mali’s, distinguished by a green five-pointed star centered in the yellow band.'
  },
  {
    code: 'sc', numericId: '690', name: 'Seychelles', capital: 'Victoria', continent: 'Africa', region: 'Eastern Africa',
    lat: -4.62, lng: 55.45, difficulty: 'medium', colors: ['blue', 'yellow', 'red', 'white', 'green'], similarCodes: ['mu', 'km', 'mh'], isIsland: true,
    fact: 'Seychelles’s dynamic five-ray fan bursting from the bottom-left corner symbolizes a young nation moving into the future.'
  },
  {
    code: 'sl', numericId: '694', name: 'Sierra Leone', capital: 'Freetown', continent: 'Africa', region: 'Western Africa',
    lat: 8.47, lng: -13.23, difficulty: 'hard', colors: ['green', 'white', 'blue'], similarCodes: ['uz', 'ga', 'ls'],
    fact: 'Sierra Leone’s green, white, and blue horizontal stripes stand for agriculture, unity/justice, and Freetown’s natural harbor.'
  },
  {
    code: 'so', numericId: '706', name: 'Somalia', capital: 'Mogadishu', continent: 'Africa', region: 'Eastern Africa',
    lat: 2.05, lng: 45.32, difficulty: 'medium', colors: ['blue', 'white'], similarCodes: ['fm', 'vn', 'hn'],
    fact: 'The five points of Somalia’s white star on sky blue honor the five historical regions inhabited by Somali people.'
  },
  {
    code: 'za', numericId: '710', name: 'South Africa', capital: 'Pretoria', capitalAliases: ['Cape Town', 'Bloemfontein'], continent: 'Africa', region: 'Southern Africa',
    lat: -25.75, lng: 28.23, difficulty: 'easy', colors: ['green', 'yellow', 'black', 'red', 'blue', 'white'], similarCodes: ['jm', 'vu', 'gy'],
    fact: 'South Africa’s six-color Y-shaped flag, adopted in 1994, symbolizes diverse paths converging into unity; Pretoria is its executive capital.'
  },
  {
    code: 'ss', numericId: '728', name: 'South Sudan', capital: 'Juba', continent: 'Africa', region: 'Eastern Africa',
    lat: 4.86, lng: 31.57, difficulty: 'hard', colors: ['black', 'red', 'green', 'blue', 'yellow', 'white'], similarCodes: ['ke', 'sd', 'mz'], isLandlocked: true,
    fact: 'Founded in 2011, South Sudan is the world’s youngest UN member state, featuring a gold star in a blue hoist triangle.'
  },
  {
    code: 'sd', numericId: '729', name: 'Sudan', capital: 'Khartoum', continent: 'Africa', region: 'Northern Africa',
    lat: 15.50, lng: 32.56, difficulty: 'hard', colors: ['red', 'white', 'black', 'green'], similarCodes: ['ps', 'jo', 'kw', 'ss'],
    fact: 'Khartoum lies at the confluence where the Blue Nile and White Nile merge to form the Nile River.'
  },
  {
    code: 'tz', numericId: '834', name: 'Tanzania', capital: 'Dodoma', capitalAliases: ['Dar es Salaam'], continent: 'Africa', region: 'Eastern Africa',
    lat: -6.16, lng: 35.75, difficulty: 'medium', colors: ['green', 'yellow', 'black', 'blue'], similarCodes: ['na', 'cd', 'kn'],
    fact: 'Tanzania’s flag fuses the green and black of Tanganyika with the blue of Zanzibar across a gold-bordered diagonal.'
  },
  {
    code: 'tg', numericId: '768', name: 'Togo', capital: 'Lomé', capitalAliases: ['Lome'], continent: 'Africa', region: 'Western Africa',
    lat: 6.13, lng: 1.22, difficulty: 'hard', colors: ['green', 'yellow', 'red', 'white'], similarCodes: ['lr', 'my', 'gn'],
    fact: 'Togo’s flag follows the golden ratio (approx. 1:1.618) in its width-to-length proportions.'
  },
  {
    code: 'tn', numericId: '788', name: 'Tunisia', capital: 'Tunis', continent: 'Africa', region: 'Northern Africa',
    lat: 36.81, lng: 10.18, difficulty: 'medium', colors: ['red', 'white'], similarCodes: ['tr', 'dz', 'ma'],
    fact: 'Tunisia’s crimson banner places a red crescent and star inside a central white sun disc.'
  },
  {
    code: 'ug', numericId: '800', name: 'Uganda', capital: 'Kampala', continent: 'Africa', region: 'Eastern Africa',
    lat: 0.35, lng: 32.58, difficulty: 'medium', colors: ['black', 'yellow', 'red', 'white'], similarCodes: ['de', 'zw', 'sz'], isLandlocked: true,
    fact: 'Uganda’s six-striped flag centers a Grey Crowned Crane facing the hoist with one leg raised in forward motion.'
  },
  {
    code: 'zm', numericId: '894', name: 'Zambia', capital: 'Lusaka', continent: 'Africa', region: 'Eastern Africa',
    lat: -15.39, lng: 28.32, difficulty: 'hard', colors: ['green', 'red', 'black', 'orange'], similarCodes: ['zw', 'mz'], isLandlocked: true,
    fact: 'Zambia’s flag is predominantly emerald green, placing its red, black, and orange stripes and African fish eagle at the fly.'
  },
  {
    code: 'zw', numericId: '716', name: 'Zimbabwe', capital: 'Harare', continent: 'Africa', region: 'Eastern Africa',
    lat: -17.83, lng: 31.05, difficulty: 'medium', colors: ['green', 'yellow', 'red', 'black', 'white'], similarCodes: ['mz', 'ug', 'zm'], isLandlocked: true,
    fact: 'The carved soapstone Zimbabwe Bird on the flag’s white triangle echoes ancient sculptures found at Great Zimbabwe.'
  },

  // ================= NORTH AMERICA (23) =================
  {
    code: 'ag', numericId: '028', name: 'Antigua and Barbuda', capital: "St. John's", capitalAliases: ['Saint Johns'], continent: 'North America', region: 'Caribbean',
    lat: 17.12, lng: -61.85, difficulty: 'hard', colors: ['red', 'black', 'blue', 'white', 'yellow'], similarCodes: ['dm', 'gd', 'lc'], isIsland: true,
    fact: 'Designed by art teacher Reginald Samuel in 1967, the rising golden sun marks the dawn of a new era.'
  },
  {
    code: 'bs', numericId: '044', name: 'Bahamas', aliases: ['The Bahamas'], capital: 'Nassau', continent: 'North America', region: 'Caribbean',
    lat: 25.05, lng: -77.35, difficulty: 'medium', colors: ['blue', 'yellow', 'black'], similarCodes: ['bb', 'lc', 'cu'], isIsland: true,
    fact: 'The aquamarine stripes on the Bahamas flag symbolize its crystal-clear ocean waters framing golden sandy beaches.'
  },
  {
    code: 'bb', numericId: '052', name: 'Barbados', capital: 'Bridgetown', continent: 'North America', region: 'Caribbean',
    lat: 13.10, lng: -59.61, difficulty: 'medium', colors: ['blue', 'yellow', 'black'], similarCodes: ['bs', 'lc', 'vc'], isIsland: true,
    fact: 'The broken trident head on Barbados’s flag symbolizes breaking free from colonial rule while honoring the sea.'
  },
  {
    code: 'bz', numericId: '084', name: 'Belize', capital: 'Belmopan', continent: 'North America', region: 'Central America',
    lat: 17.25, lng: -88.77, difficulty: 'hard', colors: ['blue', 'red', 'white', 'green'], similarCodes: ['gt', 'ni', 'sv'],
    fact: 'Belize’s flag is famous for depicting two human workers—a Mestizo and a Creole—supporting a mahogany tree crest.'
  },
  {
    code: 'ca', numericId: '124', name: 'Canada', capital: 'Ottawa', continent: 'North America', region: 'Northern America',
    lat: 45.42, lng: -75.70, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['pe', 'at', 'lb'],
    fact: 'Adopted in 1965, Canada’s Maple Leaf flag features a stylized 11-pointed leaf centered inside a white square.'
  },
  {
    code: 'cr', numericId: '188', name: 'Costa Rica', capital: 'San José', capitalAliases: ['San Jose'], continent: 'North America', region: 'Central America',
    lat: 9.93, lng: -84.09, difficulty: 'medium', colors: ['blue', 'white', 'red'], similarCodes: ['th', 'kp', 'pa'],
    fact: 'Costa Rica abolished its standing military in 1948 and invests heavily in biodiversity conservation.'
  },
  {
    code: 'cu', numericId: '192', name: 'Cuba', capital: 'Havana', continent: 'North America', region: 'Caribbean',
    lat: 23.11, lng: -82.37, difficulty: 'easy', colors: ['blue', 'white', 'red'], similarCodes: ['pr', 'ph', 'cl'], isIsland: true,
    fact: 'Cuba’s “La Estrella Solitaria” features five blue-and-white stripes with a white star inside a red equilateral triangle.'
  },
  {
    code: 'dm', numericId: '212', name: 'Dominica', capital: 'Roseau', continent: 'North America', region: 'Caribbean',
    lat: 15.30, lng: -61.39, difficulty: 'expert', colors: ['green', 'yellow', 'black', 'white', 'red'], similarCodes: ['gd', 'ag', 'ni'], isIsland: true,
    fact: 'Dominica is one of only two sovereign flags in the world to feature the color purple—on its native Sisserou parrot.'
  },
  {
    code: 'do', numericId: '214', name: 'Dominican Republic', capital: 'Santo Domingo', continent: 'North America', region: 'Caribbean',
    lat: 18.49, lng: -69.93, difficulty: 'medium', colors: ['blue', 'red', 'white'], similarCodes: ['ht', 'pa', 'cu'], isIsland: true,
    fact: 'The Dominican Republic’s flag quarters red and blue rectangles with a centered white cross bearing an open Bible.'
  },
  {
    code: 'sv', numericId: '222', name: 'El Salvador', capital: 'San Salvador', continent: 'North America', region: 'Central America',
    lat: 13.69, lng: -89.22, difficulty: 'hard', colors: ['blue', 'white'], similarCodes: ['hn', 'ni', 'gt', 'ar'],
    fact: 'El Salvador’s central emblem displays five volcanoes rising out of the sea below a golden Phrygian cap and rainbow.'
  },
  {
    code: 'gd', numericId: '308', name: 'Grenada', capital: "St. George's", capitalAliases: ['Saint Georges'], continent: 'North America', region: 'Caribbean',
    lat: 12.06, lng: -61.75, difficulty: 'expert', colors: ['red', 'yellow', 'green'], similarCodes: ['dm', 'vc', 'ag'], isIsland: true,
    fact: 'Known as the “Isle of Spice,” Grenada features a nutmeg pod on the left green triangle of its flag.'
  },
  {
    code: 'gt', numericId: '320', name: 'Guatemala', capital: 'Guatemala City', continent: 'North America', region: 'Central America',
    lat: 14.63, lng: -90.51, difficulty: 'medium', colors: ['blue', 'white', 'green'], similarCodes: ['ar', 'hn', 'ni', 'sv'],
    fact: 'Guatemala’s vertical sky-blue stripes frame its coat of arms featuring the vibrant Resplendent Quetzal bird.'
  },
  {
    code: 'ht', numericId: '332', name: 'Haiti', capital: 'Port-au-Prince', continent: 'North America', region: 'Caribbean',
    lat: 18.59, lng: -72.31, difficulty: 'hard', colors: ['blue', 'red', 'white'], similarCodes: ['li', 'do'], isIsland: true,
    fact: 'Haiti’s blue-and-red bicolour centers a white panel bearing its coat of arms and the motto “L’Union Fait La Force.”'
  },
  {
    code: 'hn', numericId: '340', name: 'Honduras', capital: 'Tegucigalpa', continent: 'North America', region: 'Central America',
    lat: 14.07, lng: -87.19, difficulty: 'medium', colors: ['blue', 'white'], similarCodes: ['ni', 'sv', 'gt', 'ar'],
    fact: 'Five blue stars arranged in an H-like X pattern on Honduras’s flag honor the historic Federal Republic of Central America.'
  },
  {
    code: 'jm', numericId: '388', name: 'Jamaica', capital: 'Kingston', continent: 'North America', region: 'Caribbean',
    lat: 18.02, lng: -76.81, difficulty: 'easy', colors: ['green', 'black', 'yellow'], similarCodes: ['za', 'bi'], isIsland: true,
    fact: 'Jamaica is currently the only national flag in the world that contains neither red, white, nor blue.'
  },
  {
    code: 'mx', numericId: '484', name: 'Mexico', capital: 'Mexico City', continent: 'North America', region: 'Northern America',
    lat: 19.43, lng: -99.13, difficulty: 'easy', colors: ['green', 'white', 'red'], similarCodes: ['it', 'ie', 'hu'],
    fact: 'Mexico’s coat of arms depicts an eagle perched on a prickly pear cactus devouring a snake, echoing Aztec legend.'
  },
  {
    code: 'ni', numericId: '558', name: 'Nicaragua', capital: 'Managua', continent: 'North America', region: 'Central America',
    lat: 12.11, lng: -86.24, difficulty: 'hard', colors: ['blue', 'white'], similarCodes: ['sv', 'hn', 'gt', 'ar'],
    fact: 'Like Dominica’s parrot, Nicaragua’s flag features a tiny purple band inside its central rainbow emblem.'
  },
  {
    code: 'pa', numericId: '591', name: 'Panama', capital: 'Panama City', continent: 'North America', region: 'Central America',
    lat: 8.98, lng: -79.52, difficulty: 'medium', colors: ['white', 'red', 'blue'], similarCodes: ['do', 'cl', 'cr'],
    fact: 'Panama’s quartered flag pairs solid red and blue corners with opposite white quadrants holding blue and red stars.'
  },
  {
    code: 'kn', numericId: '659', name: 'Saint Kitts and Nevis', aliases: ['St. Kitts and Nevis'], capital: 'Basseterre', continent: 'North America', region: 'Caribbean',
    lat: 17.30, lng: -62.72, difficulty: 'expert', colors: ['green', 'red', 'black', 'yellow', 'white'], similarCodes: ['tz', 'na', 'tt'], isIsland: true,
    fact: 'Two white stars sit on a black diagonal stripe representing hope and liberty for the two-island Caribbean federation.'
  },
  {
    code: 'lc', numericId: '662', name: 'Saint Lucia', aliases: ['St. Lucia'], capital: 'Castries', continent: 'North America', region: 'Caribbean',
    lat: 14.01, lng: -60.99, difficulty: 'hard', colors: ['blue', 'yellow', 'black', 'white'], similarCodes: ['bs', 'bb'], isIsland: true,
    fact: 'The layered black and gold triangles on Saint Lucia’s cerulean flag depict its iconic twin volcanic Pitons rising from the sea.'
  },
  {
    code: 'vc', numericId: '670', name: 'Saint Vincent and the Grenadines', aliases: ['St. Vincent'], capital: 'Kingstown', continent: 'North America', region: 'Caribbean',
    lat: 13.16, lng: -61.22, difficulty: 'expert', colors: ['blue', 'yellow', 'green'], similarCodes: ['bb', 'gd'], isIsland: true,
    fact: 'Three green diamonds arranged in a “V” at the center of the flag earned Saint Vincent the nickname “The Gems of the Antilles.”'
  },
  {
    code: 'tt', numericId: '780', name: 'Trinidad and Tobago', capital: 'Port of Spain', continent: 'North America', region: 'Caribbean',
    lat: 10.66, lng: -61.51, difficulty: 'medium', colors: ['red', 'black', 'white'], similarCodes: ['kn', 'na', 'bn'], isIsland: true,
    fact: 'Trinidad and Tobago’s bold white-edged black diagonal band slashes across a crimson field from upper hoist to lower fly.'
  },
  {
    code: 'us', numericId: '840', name: 'United States', aliases: ['USA', 'United States of America', 'America'], capital: 'Washington, D.C.', capitalAliases: ['Washington DC', 'Washington'], continent: 'North America', region: 'Northern America',
    lat: 38.91, lng: -77.04, difficulty: 'easy', colors: ['red', 'white', 'blue'], similarCodes: ['my', 'lr', 'cl'],
    fact: 'The 50 stars on the U.S. flag represent the 50 states, while the 13 stripes honor the original 13 colonies.'
  },

  // ================= SOUTH AMERICA (12) =================
  {
    code: 'ar', numericId: '032', name: 'Argentina', capital: 'Buenos Aires', continent: 'South America', region: 'South America',
    lat: -34.60, lng: -58.38, difficulty: 'easy', colors: ['blue', 'white', 'yellow'], similarCodes: ['uy', 'gt', 'hn', 'sv'],
    fact: 'Argentina’s sky-blue and white stripes cradle the golden “Sun of May” with 32 alternating straight and wavy rays.'
  },
  {
    code: 'bo', numericId: '068', name: 'Bolivia', capital: 'Sucre', capitalAliases: ['La Paz'], continent: 'South America', region: 'South America',
    lat: -19.02, lng: -65.26, difficulty: 'medium', colors: ['red', 'yellow', 'green'], similarCodes: ['gh', 'lt', 'mm'], isLandlocked: true,
    fact: 'Sucre is Bolivia’s constitutional capital while La Paz serves as the seat of government—the highest administrative capital on Earth.'
  },
  {
    code: 'br', numericId: '076', name: 'Brazil', capital: 'Brasília', capitalAliases: ['Brasilia'], continent: 'South America', region: 'South America',
    lat: -15.79, lng: -47.88, difficulty: 'easy', colors: ['green', 'yellow', 'blue', 'white'], similarCodes: ['pt', 'ar'],
    fact: 'Brazil’s starry blue globe depicts the night sky over Rio de Janeiro on November 15, 1889, inscribed with “Ordem e Progresso.”'
  },
  {
    code: 'cl', numericId: '152', name: 'Chile', capital: 'Santiago', continent: 'South America', region: 'South America',
    lat: -33.45, lng: -70.67, difficulty: 'easy', colors: ['white', 'red', 'blue'], similarCodes: ['cz', 'us', 'cu'],
    fact: 'Adopted in 1817, Chile’s “La Estrella Solitaria” features a single white star symbolizing progress and honor.'
  },
  {
    code: 'co', numericId: '170', name: 'Colombia', capital: 'Bogotá', capitalAliases: ['Bogota'], continent: 'South America', region: 'South America',
    lat: 4.71, lng: -74.07, difficulty: 'easy', colors: ['yellow', 'blue', 'red'], similarCodes: ['ec', 've', 'am'],
    fact: 'Colombia’s top yellow stripe takes up half the flag’s height, twice as wide as the blue and red bands below it.'
  },
  {
    code: 'ec', numericId: '218', name: 'Ecuador', capital: 'Quito', continent: 'South America', region: 'South America',
    lat: -0.18, lng: -78.47, difficulty: 'medium', colors: ['yellow', 'blue', 'red'], similarCodes: ['co', 've', 'ad'],
    fact: 'Sitting near the Equator at 2,850 meters elevation, Quito is the highest constitutional capital in the world.'
  },
  {
    code: 'gy', numericId: '328', name: 'Guyana', capital: 'Georgetown', continent: 'South America', region: 'South America',
    lat: 6.80, lng: -58.16, difficulty: 'hard', colors: ['green', 'yellow', 'red', 'black', 'white'], similarCodes: ['er', 'za', 'st'],
    fact: 'Known as the Golden Arrowhead, Guyana’s flag features nested red and yellow triangles pointing across a green field.'
  },
  {
    code: 'py', numericId: '600', name: 'Paraguay', capital: 'Asunción', capitalAliases: ['Asuncion'], continent: 'South America', region: 'South America',
    lat: -25.26, lng: -57.58, difficulty: 'medium', colors: ['red', 'white', 'blue'], similarCodes: ['nl', 'hr', 'lu'], isLandlocked: true,
    fact: 'Paraguay is one of the very few national flags with two different emblems on its front (obverse) and back (reverse) sides.'
  },
  {
    code: 'pe', numericId: '604', name: 'Peru', capital: 'Lima', continent: 'South America', region: 'South America',
    lat: -12.05, lng: -77.04, difficulty: 'easy', colors: ['red', 'white'], similarCodes: ['ca', 'at', 'lb'],
    fact: 'Peru’s red-white-red vertical triband is said to have been inspired by crimson-and-white flamingos spotted in 1820.'
  },
  {
    code: 'sr', numericId: '740', name: 'Suriname', capital: 'Paramaribo', continent: 'South America', region: 'South America',
    lat: 5.85, lng: -55.20, difficulty: 'hard', colors: ['green', 'white', 'red', 'yellow'], similarCodes: ['gm', 'cr'],
    fact: 'Suriname is South America’s smallest sovereign country; a golden five-pointed star shines at the center of its red band.'
  },
  {
    code: 'uy', numericId: '858', name: 'Uruguay', capital: 'Montevideo', continent: 'South America', region: 'South America',
    lat: -34.90, lng: -56.16, difficulty: 'medium', colors: ['white', 'blue', 'yellow'], similarCodes: ['ar', 'gr'],
    fact: 'Uruguay’s nine alternating white and blue stripes represent the nine original departments of the nation.'
  },
  {
    code: 've', numericId: '862', name: 'Venezuela', capital: 'Caracas', continent: 'South America', region: 'South America',
    lat: 10.48, lng: -66.90, difficulty: 'medium', colors: ['yellow', 'blue', 'red', 'white'], similarCodes: ['co', 'ec', 'am'],
    fact: 'Venezuela’s central blue stripe features an arc of eight white stars honoring the provinces of independence.'
  },

  // ================= OCEANIA (14) =================
  {
    code: 'au', numericId: '036', name: 'Australia', capital: 'Canberra', continent: 'Oceania', region: 'Australia and New Zealand',
    lat: -35.28, lng: 149.13, difficulty: 'easy', colors: ['blue', 'red', 'white'], similarCodes: ['nz', 'fj', 'gb'],
    fact: 'Australia’s large seven-pointed Commonwealth Star sits below the Union Jack opposite the Southern Cross constellation.'
  },
  {
    code: 'fj', numericId: '242', name: 'Fiji', capital: 'Suva', continent: 'Oceania', region: 'Melanesia',
    lat: -18.14, lng: 178.44, difficulty: 'medium', colors: ['blue', 'red', 'white'], similarCodes: ['tv', 'au', 'nz'], isIsland: true,
    fact: 'Fiji uses a bright sky-blue field with the Union Jack in the canton and a shield depicting bananas, sugarcane, and a dove.'
  },
  {
    code: 'ki', numericId: '296', name: 'Kiribati', capital: 'South Tarawa', capitalAliases: ['Tarawa'], continent: 'Oceania', region: 'Micronesia',
    lat: 1.33, lng: 172.98, difficulty: 'expert', colors: ['red', 'yellow', 'blue', 'white'], similarCodes: ['fj', 'sb'], isIsland: true,
    fact: 'Kiribati is the only country in the world located in all four hemispheres; its flag shows a frigatebird flying over a rising sun.'
  },
  {
    code: 'mh', numericId: '584', name: 'Marshall Islands', capital: 'Majuro', continent: 'Oceania', region: 'Micronesia',
    lat: 7.12, lng: 171.18, difficulty: 'expert', colors: ['blue', 'orange', 'white'], similarCodes: ['sc', 'nr'], isIsland: true,
    fact: 'The 24-point white star on the Marshall Islands flag represents the nation’s 24 municipalities across the Pacific.'
  },
  {
    code: 'fm', numericId: '583', name: 'Micronesia', aliases: ['Federated States of Micronesia'], capital: 'Palikir', continent: 'Oceania', region: 'Micronesia',
    lat: 6.92, lng: 158.16, difficulty: 'expert', colors: ['blue', 'white'], similarCodes: ['so', 'hn', 'pw'], isIsland: true,
    fact: 'Four white stars arranged in a diamond on light blue symbolize the four island states of Chuuk, Kosrae, Pohnpei, and Yap.'
  },
  {
    code: 'nr', numericId: '520', name: 'Nauru', capital: 'Yaren', continent: 'Oceania', region: 'Micronesia',
    lat: -0.55, lng: 166.92, difficulty: 'expert', colors: ['blue', 'yellow', 'white'], similarCodes: ['mh', 'cv', 'pw'], isIsland: true,
    fact: 'Nauru’s flag places a 12-pointed white star just below a thin yellow horizontal stripe symbolizing the Equator.'
  },
  {
    code: 'nz', numericId: '554', name: 'New Zealand', capital: 'Wellington', continent: 'Oceania', region: 'Australia and New Zealand',
    lat: -41.29, lng: 174.78, difficulty: 'easy', colors: ['blue', 'red', 'white'], similarCodes: ['au', 'fj', 'gb'], isIsland: true,
    fact: 'Unlike Australia’s white stars, New Zealand’s Southern Cross features four five-pointed red stars outlined in white.'
  },
  {
    code: 'pw', numericId: '585', name: 'Palau', capital: 'Ngerulmud', continent: 'Oceania', region: 'Micronesia',
    lat: 7.50, lng: 134.62, difficulty: 'hard', colors: ['blue', 'yellow'], similarCodes: ['bd', 'jp', 'ua', 'kz'], isIsland: true,
    fact: 'Palau’s golden disc on sky blue represents the full moon—celebrated locally as the ideal time for harmony and harvest.'
  },
  {
    code: 'pg', numericId: '598', name: 'Papua New Guinea', capital: 'Port Moresby', continent: 'Oceania', region: 'Melanesia',
    lat: -9.44, lng: 147.18, difficulty: 'medium', colors: ['red', 'black', 'yellow', 'white'], similarCodes: ['ao', 'bt', 'au'], isIsland: true,
    fact: 'Designed by 15-year-old Susan Karike in 1971, Papua New Guinea’s flag pairs a golden Raggiana bird-of-paradise with the Southern Cross.'
  },
  {
    code: 'ws', numericId: '882', name: 'Samoa', capital: 'Apia', continent: 'Oceania', region: 'Polynesia',
    lat: -13.83, lng: -171.76, difficulty: 'hard', colors: ['red', 'blue', 'white'], similarCodes: ['to', 'tw', 'nz'], isIsland: true,
    fact: 'Samoa’s red banner places five white stars of the Southern Cross inside a dark blue upper-left canton.'
  },
  {
    code: 'sb', numericId: '090', name: 'Solomon Islands', capital: 'Honiara', continent: 'Oceania', region: 'Melanesia',
    lat: -9.43, lng: 159.95, difficulty: 'hard', colors: ['blue', 'yellow', 'green', 'white'], similarCodes: ['ki', 'vu'], isIsland: true,
    fact: 'Five white stars in the blue triangle represent the five original island districts of the Solomon Islands.'
  },
  {
    code: 'to', numericId: '776', name: 'Tonga', capital: "Nuku'alofa", capitalAliases: ['Nukualofa'], continent: 'Oceania', region: 'Polynesia',
    lat: -21.14, lng: -175.20, difficulty: 'hard', colors: ['red', 'white'], similarCodes: ['ch', 'ws', 'dk'], isIsland: true,
    fact: 'Tonga’s crimson banner displays a red Greek cross inside a white canton, distinguishing it from Switzerland’s square flag.'
  },
  {
    code: 'tv', numericId: '798', name: 'Tuvalu', capital: 'Funafuti', continent: 'Oceania', region: 'Polynesia',
    lat: -8.52, lng: 179.20, difficulty: 'expert', colors: ['blue', 'yellow', 'red', 'white'], similarCodes: ['fj', 'au', 'nz'], isIsland: true,
    fact: 'The nine yellow stars on Tuvalu’s light-blue field mirror the geographic arrangement of its nine coral atolls.'
  },
  {
    code: 'vu', numericId: '548', name: 'Vanuatu', capital: 'Port Vila', continent: 'Oceania', region: 'Melanesia',
    lat: -17.73, lng: 168.32, difficulty: 'expert', colors: ['red', 'green', 'black', 'yellow'], similarCodes: ['za', 'sb'], isIsland: true,
    fact: 'Vanuatu’s Y-shaped yellow band frames a black triangle bearing a boar’s tusk and two crossed namele fern leaves.'
  },

  // ================= OPTIONAL TERRITORIES & SPECIAL REGIONS (4) =================
  {
    code: 'tw', numericId: '158', name: 'Taiwan', capital: 'Taipei', continent: 'Asia', region: 'East Asia',
    lat: 25.03, lng: 121.57, difficulty: 'medium', colors: ['red', 'blue', 'white'], similarCodes: ['ws', 'mm'], isIsland: true, isTerritory: true,
    fact: 'Taiwan’s flag features a 12-ray white sun inside a blue canton over a crimson field.'
  },
  {
    code: 'gl', numericId: '304', name: 'Greenland', capital: 'Nuuk', continent: 'North America', region: 'Northern America',
    lat: 64.18, lng: -51.72, difficulty: 'medium', colors: ['white', 'red'], similarCodes: ['pl', 'dk', 'jp'], isIsland: true, isTerritory: true,
    fact: 'Erfalasorput, Greenland’s flag, depicts the midnight sun rising over snowy icebergs and the dark ocean.'
  },
  {
    code: 'hk', numericId: '344', name: 'Hong Kong', capital: 'Hong Kong', continent: 'Asia', region: 'East Asia',
    lat: 22.32, lng: 114.17, difficulty: 'medium', colors: ['red', 'white'], similarCodes: ['cn', 'sg'], isTerritory: true,
    fact: 'Hong Kong’s crimson banner centers a stylized five-petal white Bauhinia blakeana orchid.'
  },
  {
    code: 'pr', numericId: '630', name: 'Puerto Rico', capital: 'San Juan', continent: 'North America', region: 'Caribbean',
    lat: 18.47, lng: -66.11, difficulty: 'medium', colors: ['red', 'white', 'blue'], similarCodes: ['cu', 'ph'], isIsland: true, isTerritory: true,
    fact: 'Puerto Rico’s flag reverses the red and blue positions of Cuba’s flag, placing a white star inside a blue triangle.'
  },
];

export const SOVEREIGN_COUNTRIES = COUNTRIES.filter((c) => !c.isTerritory);
export const TERRITORY_COUNTRIES = COUNTRIES.filter((c) => c.isTerritory);

export const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

export const COUNTRY_BY_NUMERIC_ID: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.numericId, c])
);
