import { COUNTRY_BY_CODE, SOVEREIGN_COUNTRIES } from '../data/countries';
import { FLAG_PUZZLES, type EmblemType, type FlagPuzzleSpec } from '../data/flagPuzzles';
import type { Continent, Country, Difficulty, TrueFalseStatement } from '../types/game';
import { createSeededRng, hashDateSeed, seededShuffle } from './scoring';

export function getCountriesForDifficulty(
  difficulty: Difficulty,
  continentFilter?: Continent | 'All'
): Country[] {
  let pool = SOVEREIGN_COUNTRIES;
  if (continentFilter && continentFilter !== 'All') {
    pool = pool.filter((c) => c.continent === continentFilter);
  }

  if (difficulty === 'easy') {
    const easy = pool.filter((c) => c.difficulty === 'easy');
    return easy.length >= 8 ? easy : pool;
  }
  if (difficulty === 'medium') {
    const med = pool.filter((c) => c.difficulty === 'easy' || c.difficulty === 'medium');
    return med.length >= 10 ? med : pool;
  }
  if (difficulty === 'hard') {
    const hard = pool.filter((c) => c.difficulty !== 'easy');
    return hard.length >= 10 ? hard : pool;
  }
  return pool;
}

export function pickQuestionSet(
  pool: Country[],
  count: number,
  rng: () => number = Math.random
): Country[] {
  const shuffled = seededShuffle(pool, rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function pickDistractors(
  target: Country,
  fullPool: Country[],
  count: number,
  preferSimilar: boolean,
  rng: () => number = Math.random
): Country[] {
  const chosen: Country[] = [];
  const used = new Set<string>([target.code]);

  if (preferSimilar && target.similarCodes && target.similarCodes.length > 0) {
    const simShuffled = seededShuffle(target.similarCodes, rng);
    for (const code of simShuffled) {
      if (chosen.length >= count) break;
      const found = COUNTRY_BY_CODE[code];
      if (found && !used.has(found.code) && !found.isTerritory) {
        chosen.push(found);
        used.add(found.code);
      }
    }
  }

  // Next prefer same continent or shared primary flag color for balanced challenge
  if (chosen.length < count) {
    const sameContext = seededShuffle(
      fullPool.filter(
        (c) =>
          !used.has(c.code) &&
          (c.continent === target.continent ||
            c.colors.some((col) => target.colors.includes(col)))
      ),
      rng
    );
    for (const c of sameContext) {
      if (chosen.length >= count) break;
      chosen.push(c);
      used.add(c.code);
    }
  }

  // Fallback fill from sovereign countries
  if (chosen.length < count) {
    const rest = seededShuffle(
      SOVEREIGN_COUNTRIES.filter((c) => !used.has(c.code)),
      rng
    );
    for (const c of rest) {
      if (chosen.length >= count) break;
      chosen.push(c);
      used.add(c.code);
    }
  }

  return chosen;
}

export function normalizeAnswerText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCapitalMatch(input: string, country: Country): boolean {
  const norm = normalizeAnswerText(input);
  if (!norm) return false;
  const targets = [country.capital, ...(country.capitalAliases || [])];
  return targets.some((t) => normalizeAnswerText(t) === norm);
}

export function isCountryNameMatch(input: string, country: Country): boolean {
  const norm = normalizeAnswerText(input);
  if (!norm) return false;
  const targets = [country.name, ...(country.aliases || [])];
  return targets.some((t) => normalizeAnswerText(t) === norm);
}

const VERIFIED_EXTRA_STATEMENTS: TrueFalseStatement[] = [
  {
    id: 'tf-ch-square',
    statement: 'The national flag of Switzerland is officially a 1:1 square.',
    isTrue: true,
    explanation: 'Switzerland and Vatican City are the only two sovereign nations with square 1:1 national flags.',
    countryCode: 'ch',
    difficulty: 'easy',
  },
  {
    id: 'tf-np-pennant',
    statement: 'Nepal has the only non-rectangular national flag among sovereign UN member states.',
    isTrue: true,
    explanation: 'Nepal’s flag is shaped from two stacked crimson triangles (double pennant).',
    countryCode: 'np',
    difficulty: 'easy',
  },
  {
    id: 'tf-jm-colors',
    statement: 'Jamaica’s national flag contains neither red, white, nor blue.',
    isTrue: true,
    explanation: 'Jamaica uses green, black, and gold—making it unique among current sovereign national flags.',
    countryCode: 'jm',
    difficulty: 'medium',
  },
  {
    id: 'tf-au-capital',
    statement: 'Sydney is the national capital of Australia.',
    isTrue: false,
    explanation: 'Canberra is Australia’s capital city, chosen in 1908 as a compromise between Sydney and Melbourne.',
    countryCode: 'au',
    difficulty: 'easy',
  },
  {
    id: 'tf-ca-capital',
    statement: 'Toronto is the capital city of Canada.',
    isTrue: false,
    explanation: 'Ottawa is Canada’s federal capital, located in eastern Ontario along the Ottawa River.',
    countryCode: 'ca',
    difficulty: 'easy',
  },
  {
    id: 'tf-tr-capital',
    statement: 'Istanbul is the official capital of Turkey.',
    isTrue: false,
    explanation: 'Ankara became Turkey’s capital in 1923, though Istanbul is its largest city.',
    countryCode: 'tr',
    difficulty: 'easy',
  },
  {
    id: 'tf-uz-landlocked',
    statement: 'Uzbekistan is doubly landlocked, surrounded only by other landlocked countries.',
    isTrue: true,
    explanation: 'Only Uzbekistan and Liechtenstein are doubly landlocked nations in the world.',
    countryCode: 'uz',
    difficulty: 'hard',
  },
  {
    id: 'tf-ki-hemispheres',
    statement: 'Kiribati is the only country that spans all four hemispheres of Earth.',
    isTrue: true,
    explanation: 'Kiribati’s islands straddle both the Equator and the 180th meridian.',
    countryCode: 'ki',
    difficulty: 'hard',
  },
  {
    id: 'tf-cy-map',
    statement: 'Cyprus displays a map silhouette of its own island on its national flag.',
    isTrue: true,
    explanation: 'Cyprus places a copper-orange map of the island above two olive branches on white.',
    countryCode: 'cy',
    difficulty: 'medium',
  },
  {
    id: 'tf-ph-war',
    statement: 'Flipping the Philippine flag upside down with red on top officially signals a state of war.',
    isTrue: true,
    explanation: 'Under Philippine law, blue on top signifies peace while red on top signifies a state of war.',
    countryCode: 'ph',
    difficulty: 'medium',
  },
  {
    id: 'tf-br-continent',
    statement: 'Brazil is located in Europe.',
    isTrue: false,
    explanation: 'Brazil is the largest country in South America.',
    countryCode: 'br',
    difficulty: 'easy',
  },
  {
    id: 'tf-nz-capital',
    statement: 'Wellington is the capital city of New Zealand.',
    isTrue: true,
    explanation: 'Wellington sits at the southern tip of the North Island and is the world’s southernmost sovereign capital.',
    countryCode: 'nz',
    difficulty: 'medium',
  },
];

const CONTINENTS: Continent[] = [
  'Asia',
  'Europe',
  'Africa',
  'North America',
  'South America',
  'Oceania',
];

export function generateTrueFalseStatements(
  count: number,
  difficulty: Difficulty,
  rng: () => number = Math.random
): TrueFalseStatement[] {
  const pool = getCountriesForDifficulty(difficulty);
  const items: TrueFalseStatement[] = [...VERIFIED_EXTRA_STATEMENTS];

  for (const c of seededShuffle(pool, rng).slice(0, count * 2)) {
    const roll = rng();
    if (roll < 0.36) {
      // Capital statement
      const makeTrue = rng() < 0.5;
      if (makeTrue) {
        items.push({
          id: `tf-cap-t-${c.code}`,
          statement: `${c.capital} is the capital of ${c.name}.`,
          isTrue: true,
          explanation: `${c.capital} is indeed the official capital of ${c.name}. ${c.fact}`,
          countryCode: c.code,
          difficulty: c.difficulty,
        });
      } else {
        const other = pool.find((x) => x.code !== c.code && x.continent === c.continent) ||
          SOVEREIGN_COUNTRIES.find((x) => x.code !== c.code)!;
        items.push({
          id: `tf-cap-f-${c.code}`,
          statement: `${other.capital} is the capital of ${c.name}.`,
          isTrue: false,
          explanation: `False — ${other.capital} is the capital of ${other.name}. The capital of ${c.name} is ${c.capital}.`,
          countryCode: c.code,
          difficulty: c.difficulty,
        });
      }
    } else if (roll < 0.7) {
      // Continent statement
      const makeTrue = rng() < 0.5;
      if (makeTrue) {
        items.push({
          id: `tf-cont-t-${c.code}`,
          statement: `${c.name} is located in ${c.continent}.`,
          isTrue: true,
          explanation: `Correct — ${c.name} is situated in ${c.region} (${c.continent}).`,
          countryCode: c.code,
          difficulty: c.difficulty,
        });
      } else {
        const wrongContinents = CONTINENTS.filter((ct) => ct !== c.continent);
        const fakeCont = wrongContinents[Math.floor(rng() * wrongContinents.length)];
        items.push({
          id: `tf-cont-f-${c.code}`,
          statement: `${c.name} is located in ${fakeCont}.`,
          isTrue: false,
          explanation: `False — ${c.name} is in ${c.continent} (${c.region}), not ${fakeCont}.`,
          countryCode: c.code,
          difficulty: c.difficulty,
        });
      }
    } else {
      // Flag color statement
      const allColors = ['red', 'blue', 'white', 'green', 'yellow', 'black'] as const;
      const missingColor = allColors.find((col) => !c.colors.includes(col));
      const hasColor = c.colors[0];
      const makeTrue = rng() < 0.5 || !missingColor;
      if (makeTrue) {
        items.push({
          id: `tf-col-t-${c.code}`,
          statement: `The national flag of ${c.name} contains the color ${hasColor}.`,
          isTrue: true,
          explanation: `Yes! ${c.name}’s flag features ${c.colors.join(', ')}.`,
          countryCode: c.code,
          difficulty: c.difficulty,
        });
      } else {
        items.push({
          id: `tf-col-f-${c.code}`,
          statement: `The national flag of ${c.name} features ${missingColor}.`,
          isTrue: false,
          explanation: `False — ${c.name}’s flag uses ${c.colors.join(', ')}, with no ${missingColor}.`,
          countryCode: c.code,
          difficulty: c.difficulty,
        });
      }
    }
  }

  // Deduplicate by countryCode so we don't repeat the same country in a short session
  const unique: TrueFalseStatement[] = [];
  const seenCountries = new Set<string>();
  for (const item of seededShuffle(items, rng)) {
    if (seenCountries.has(item.countryCode)) continue;
    seenCountries.add(item.countryCode);
    unique.push(item);
    if (unique.length >= count) break;
  }
  return unique;
}

export function evaluateFlagBuilder(
  puzzle: FlagPuzzleSpec,
  placedZones: string[],
  placedEmblem: EmblemType,
  placedEmblemColor: string,
  placedRotation = 0
): {
  accuracyPct: number;
  zoneMatches: boolean[];
  emblemMatch: boolean;
  isCorrect: boolean;
} {
  const zoneMatches = puzzle.targetZones.map(
    (expected, idx) => (placedZones[idx] || '').toUpperCase() === expected.toUpperCase()
  );

  const needsEmblem = puzzle.targetEmblem !== 'none';
  const expectedRot = ((puzzle.targetEmblemRotation ?? 0) % 360 + 360) % 360;
  const actualRot = ((placedRotation % 360) + 360) % 360;
  const rotationRequired = puzzle.targetEmblem === 'star-5' || puzzle.targetEmblem === 'crescent-star';

  const emblemMatch = needsEmblem
    ? placedEmblem === puzzle.targetEmblem &&
      placedEmblemColor.toUpperCase() === puzzle.targetEmblemColor.toUpperCase() &&
      (!rotationRequired || actualRot === expectedRot)
    : placedEmblem === 'none';

  const totalParts = puzzle.targetZones.length + (needsEmblem ? 1 : 0);
  const matchedParts =
    zoneMatches.filter(Boolean).length + (needsEmblem && emblemMatch ? 1 : 0);
  const accuracyPct = Math.round((matchedParts / Math.max(1, totalParts)) * 100);
  const isCorrect = zoneMatches.every(Boolean) && emblemMatch;

  return { accuracyPct, zoneMatches, emblemMatch, isCorrect };
}

export interface DailyChallengePlan {
  dateKey: string;
  flagRound: Country[];
  capitalRound: Country[];
  silhouetteRound: Country[];
  matchRound: Country[];
  builderRound: FlagPuzzleSpec[];
}

export function generateDailyChallengePlan(dateKey: string): DailyChallengePlan {
  const rng = createSeededRng(hashDateSeed(`flagverse-daily-${dateKey}`));
  const pool = seededShuffle(SOVEREIGN_COUNTRIES, rng);

  const flagRound = pool.slice(0, 4);
  const capitalRound = pool.slice(4, 7);
  const silhouetteRound = pool.slice(7, 10);
  const matchRound = pool.slice(10, 15);
  const builderRound = seededShuffle(FLAG_PUZZLES, rng).slice(0, 2);

  return {
    dateKey,
    flagRound,
    capitalRound,
    silhouetteRound,
    matchRound,
    builderRound,
  };
}
