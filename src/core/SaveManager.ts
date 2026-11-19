import { COUNTRY_BY_CODE } from '../data/countries';
import { evaluateNewAchievements } from '../systems/achievements';
import { getLevelFromXp, getUtcDateKey } from '../systems/scoring';
import type { AchievementDef, GameSessionResult, PlayerSaveData } from '../types/game';
import { CrazyGamesSDK } from './CrazyGamesSDK';

const STORAGE_KEY = 'flagverse_world_challenge_v1';

export function createDefaultSaveData(): PlayerSaveData {
  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    version: 1,
    playerName: 'Explorer',
    avatarCode: 'un',
    introSeen: false,
    xp: 0,
    coins: 100,
    discoveredCountries: [],
    masteredCountries: {},
    bestScores: {},
    gamesPlayed: {},
    completedModes: [],
    continentsCompleted: [],
    totalQuestions: 0,
    totalCorrect: 0,
    bestStreak: 0,
    flagBuilderSolved: 0,
    memoryBoardsCompleted: 0,
    achievements: {},
    dailyChallenge: {
      lastCompletedDate: null,
      streak: 0,
      bestScore: 0,
      history: {},
    },
    dailyReward: {
      lastClaimDate: null,
      dayCount: 0,
    },
    settings: {
      musicVolume: 0.4,
      sfxVolume: 0.7,
      muted: false,
      graphicsQuality: 'high',
      reducedMotion: prefersReduced,
    },
  };
}

function mergeParsedSave(raw: string | null): PlayerSaveData | null {
  if (!raw) return null;
  const fallback = createDefaultSaveData();
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
    return {
      ...fallback,
      ...parsed,
      dailyChallenge: {
        ...fallback.dailyChallenge,
        ...(parsed.dailyChallenge || {}),
      },
      dailyReward: {
        ...fallback.dailyReward,
        ...(parsed.dailyReward || {}),
      },
      settings: {
        ...fallback.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return null;
  }
}

export function loadCloudSaveData(): PlayerSaveData | null {
  const cloudRaw = CrazyGamesSDK.dataGetItem(STORAGE_KEY);
  return mergeParsedSave(cloudRaw);
}

export function loadSaveData(): PlayerSaveData {
  const fallback = createDefaultSaveData();
  const cloud = loadCloudSaveData();
  if (cloud) return cloud;
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return mergeParsedSave(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

export function persistSaveData(data: PlayerSaveData): void {
  const serialized = JSON.stringify(data);
  CrazyGamesSDK.dataSetItem(STORAGE_KEY, serialized);
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearSaveData(): PlayerSaveData {
  const fresh = createDefaultSaveData();
  fresh.introSeen = true;
  persistSaveData(fresh);
  return fresh;
}

export function applySessionResult(
  prev: PlayerSaveData,
  result: GameSessionResult,
  extraUpdates?: { flagBuilderSolvedDelta?: number; memoryCompletedDelta?: number }
): {
  nextSave: PlayerSaveData;
  newlyUnlocked: AchievementDef[];
  prevLevel: number;
  newLevel: number;
} {
  const prevLevel = getLevelFromXp(prev.xp);
  const discoveredSet = new Set(prev.discoveredCountries);
  const continentsSet = new Set(prev.continentsCompleted);
  const mastered = { ...prev.masteredCountries };

  for (const code of result.discoveredCodes) {
    discoveredSet.add(code);
    mastered[code] = (mastered[code] || 0) + 1;
    const c = COUNTRY_BY_CODE[code];
    if (c) continentsSet.add(c.continent);
  }

  const completedModes = prev.completedModes.includes(result.modeId)
    ? prev.completedModes
    : [...prev.completedModes, result.modeId];

  const prevBest = prev.bestScores[result.modeId] ?? 0;
  const bestScores = {
    ...prev.bestScores,
    [result.modeId]: Math.max(prevBest, result.score),
  };

  const gamesPlayed = {
    ...prev.gamesPlayed,
    [result.modeId]: (prev.gamesPlayed[result.modeId] ?? 0) + 1,
  };

  let dailyChallenge = { ...prev.dailyChallenge, history: { ...prev.dailyChallenge.history } };
  if (result.modeId === 'daily-challenge') {
    const today = getUtcDateKey();
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = getUtcDateKey(yesterdayDate);

    let nextStreak = dailyChallenge.streak;
    if (dailyChallenge.lastCompletedDate !== today) {
      nextStreak = dailyChallenge.lastCompletedDate === yesterday ? dailyChallenge.streak + 1 : 1;
    }

    dailyChallenge = {
      lastCompletedDate: today,
      streak: Math.max(1, nextStreak),
      bestScore: Math.max(dailyChallenge.bestScore, result.score),
      history: {
        ...dailyChallenge.history,
        [today]: Math.max(dailyChallenge.history[today] ?? 0, result.score),
      },
    };
  }

  const interim: PlayerSaveData = {
    ...prev,
    xp: prev.xp + result.xpEarned,
    coins: prev.coins + result.coinsEarned,
    discoveredCountries: Array.from(discoveredSet),
    masteredCountries: mastered,
    continentsCompleted: Array.from(continentsSet),
    bestScores,
    gamesPlayed,
    completedModes,
    totalQuestions: prev.totalQuestions + result.totalCount,
    totalCorrect: prev.totalCorrect + result.correctCount,
    bestStreak: Math.max(prev.bestStreak, result.bestStreak),
    flagBuilderSolved: prev.flagBuilderSolved + (extraUpdates?.flagBuilderSolvedDelta ?? 0),
    memoryBoardsCompleted: prev.memoryBoardsCompleted + (extraUpdates?.memoryCompletedDelta ?? 0),
    dailyChallenge,
  };

  const { newlyUnlocked, bonusXp, bonusCoins } = evaluateNewAchievements(interim, result);
  const now = Date.now();
  const nextAchievements = { ...interim.achievements };
  for (const ach of newlyUnlocked) {
    nextAchievements[ach.id] = now;
  }

  const nextSave: PlayerSaveData = {
    ...interim,
    xp: interim.xp + bonusXp,
    coins: interim.coins + bonusCoins,
    achievements: nextAchievements,
  };

  const newLevel = getLevelFromXp(nextSave.xp);
  return { nextSave, newlyUnlocked, prevLevel, newLevel };
}

export function canClaimDailyReward(save: PlayerSaveData): boolean {
  const today = getUtcDateKey();
  return save.dailyReward.lastClaimDate !== today;
}

export function claimDailyReward(save: PlayerSaveData): {
  nextSave: PlayerSaveData;
  coinsAwarded: number;
  xpAwarded: number;
  dayNumber: number;
} {
  const today = getUtcDateKey();
  if (save.dailyReward.lastClaimDate === today) {
    return { nextSave: save, coinsAwarded: 0, xpAwarded: 0, dayNumber: save.dailyReward.dayCount };
  }

  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = getUtcDateKey(yesterdayDate);

  const nextDay =
    save.dailyReward.lastClaimDate === yesterday ? (save.dailyReward.dayCount % 7) + 1 : 1;
  const coinsAwarded = 50 + nextDay * 25;
  const xpAwarded = 40 + nextDay * 20;

  const nextSave: PlayerSaveData = {
    ...save,
    coins: save.coins + coinsAwarded,
    xp: save.xp + xpAwarded,
    dailyReward: {
      lastClaimDate: today,
      dayCount: nextDay,
    },
  };

  return { nextSave, coinsAwarded, xpAwarded, dayNumber: nextDay };
}
