export type Continent =
  | 'Asia'
  | 'Europe'
  | 'Africa'
  | 'North America'
  | 'South America'
  | 'Oceania';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type FlagColor =
  | 'red'
  | 'blue'
  | 'white'
  | 'green'
  | 'yellow'
  | 'black'
  | 'orange';

export interface Country {
  code: string;
  numericId: string;
  name: string;
  aliases?: string[];
  capital: string;
  capitalAliases?: string[];
  continent: Continent;
  region: string;
  lat: number;
  lng: number;
  difficulty: Difficulty;
  colors: FlagColor[];
  similarCodes?: string[];
  aspectRatio?: '4:3' | '1:1' | 'pennant';
  isLandlocked?: boolean;
  isIsland?: boolean;
  isTerritory?: boolean;
  fact: string;
}

export type GameModeId =
  | 'flag-master'
  | 'country-to-flag'
  | 'world-map'
  | 'capital-hunter'
  | 'flag-memory'
  | 'flag-builder'
  | 'country-silhouette'
  | 'flag-battle'
  | 'true-false'
  | 'flag-match'
  | 'continent-quest'
  | 'daily-challenge';

export type ScreenId =
  | 'intro'
  | 'hub'
  | 'play'
  | 'online'
  | 'explore'
  | 'collection'
  | 'achievements'
  | 'statistics';

export interface GameModeMeta {
  id: GameModeId;
  title: string;
  shortTitle: string;
  description: string;
  category: 'Flag' | 'Geography' | 'Puzzle' | 'Arcade' | 'Daily';
  difficultyLabel: string;
  accentColor: string;
  estimatedTime: string;
}

export interface GameSessionResult {
  modeId: GameModeId;
  score: number;
  correctCount: number;
  totalCount: number;
  bestStreak: number;
  durationSeconds: number;
  xpEarned: number;
  coinsEarned: number;
  discoveredCodes: string[];
  isPerfect: boolean;
  isTimed: boolean;
  difficulty: Difficulty;
  extraLabel?: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'Progression' | 'Mastery' | 'Speed' | 'Collection';
  xpReward: number;
  coinReward: number;
  target: number;
}

export interface PlayerSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  graphicsQuality: 'high' | 'balanced';
  reducedMotion: boolean;
}

export interface PlayerSaveData {
  version: number;
  playerName: string;
  avatarCode: string;
  introSeen: boolean;
  xp: number;
  coins: number;
  discoveredCountries: string[];
  masteredCountries: Record<string, number>;
  bestScores: Partial<Record<GameModeId, number>>;
  gamesPlayed: Partial<Record<GameModeId, number>>;
  completedModes: GameModeId[];
  continentsCompleted: Continent[];
  totalQuestions: number;
  totalCorrect: number;
  bestStreak: number;
  flagBuilderSolved: number;
  memoryBoardsCompleted: number;
  achievements: Record<string, number>;
  dailyChallenge: {
    lastCompletedDate: string | null;
    streak: number;
    bestScore: number;
    history: Record<string, number>;
  };
  dailyReward: {
    lastClaimDate: string | null;
    dayCount: number;
  };
  settings: PlayerSettings;
}

export interface TrueFalseStatement {
  id: string;
  statement: string;
  isTrue: boolean;
  explanation: string;
  countryCode: string;
  difficulty: Difficulty;
}

export interface GlobeHotspot {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  kind: 'landmark' | 'capital';
  lat: number;
  lng: number;
  summary: string;
  highlight: string;
}
