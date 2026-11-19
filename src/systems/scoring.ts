import type { Difficulty } from '../types/game';

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.25,
  hard: 1.5,
  expert: 1.85,
};

export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp);
  return Math.floor(Math.sqrt(safeXp / 120)) + 1;
}

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * (level - 1) * 120;
}

export function getXpProgressInLevel(xp: number): {
  level: number;
  currentIntoLevel: number;
  neededForNext: number;
  pct: number;
} {
  const level = getLevelFromXp(xp);
  const floorXp = getXpForLevel(level);
  const nextXp = getXpForLevel(level + 1);
  const currentIntoLevel = Math.max(0, xp - floorXp);
  const neededForNext = Math.max(1, nextXp - floorXp);
  const pct = Math.min(100, Math.round((currentIntoLevel / neededForNext) * 100));
  return { level, currentIntoLevel, neededForNext, pct };
}

export function calculateAnswerPoints(params: {
  basePoints?: number;
  streak: number;
  timeLeftRatio?: number;
  difficulty: Difficulty;
  hintUsed?: boolean;
}): number {
  const base = params.basePoints ?? 100;
  const streakBonus = Math.min(params.streak, 10) * 15;
  const speedBonus = params.timeLeftRatio != null ? Math.round(Math.max(0, params.timeLeftRatio) * 50) : 0;
  const diffMult = DIFFICULTY_MULTIPLIER[params.difficulty] ?? 1;
  const hintPenalty = params.hintUsed ? 0.75 : 1;
  return Math.round((base + streakBonus + speedBonus) * diffMult * hintPenalty);
}

export function calculateSessionRewards(params: {
  score: number;
  correctCount: number;
  totalCount: number;
  difficulty: Difficulty;
  isDaily?: boolean;
}): { xpEarned: number; coinsEarned: number } {
  const accuracy = params.totalCount > 0 ? params.correctCount / params.totalCount : 0;
  const perfectBonus = accuracy === 1 && params.totalCount >= 5 ? 60 : 0;
  const dailyBonus = params.isDaily ? 120 : 0;
  const diffMult = DIFFICULTY_MULTIPLIER[params.difficulty] ?? 1;
  const xpEarned = Math.max(
    25,
    Math.round((params.correctCount * 18 + params.score * 0.08 + perfectBonus + dailyBonus) * diffMult)
  );
  const coinsEarned = Math.max(
    10,
    Math.round(params.correctCount * 8 + (perfectBonus > 0 ? 35 : 0) + (params.isDaily ? 60 : 0))
  );
  return { xpEarned, coinsEarned };
}

/**
 * Consistent global Daily Challenge date rule: UTC YYYY-MM-DD.
 */
export function getUtcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function hashDateSeed(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
