import { ACHIEVEMENTS } from '../data/modes';
import type { AchievementDef, GameSessionResult, PlayerSaveData } from '../types/game';

export function getAchievementProgress(
  achievementId: string,
  save: PlayerSaveData
): { current: number; target: number; unlocked: boolean; pct: number } {
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  const target = def?.target ?? 1;
  const unlocked = Boolean(save.achievements[achievementId]);

  let current = 0;
  const totalGames = Object.values(save.gamesPlayed).reduce((sum, n) => sum + (n || 0), 0);

  switch (achievementId) {
    case 'first_steps':
      current = Math.min(1, totalGames);
      break;
    case 'flag_explorer_25':
    case 'flag_scholar_75':
    case 'global_expert_150':
      current = save.discoveredCountries.length;
      break;
    case 'world_traveler':
      current = save.continentsCompleted.length;
      break;
    case 'perfect_round':
      current = unlocked ? 1 : 0;
      break;
    case 'speed_demon':
      current = unlocked ? 1 : 0;
      break;
    case 'memory_master':
      current = Math.min(1, save.memoryBoardsCompleted);
      break;
    case 'flag_architect':
      current = save.flagBuilderSolved;
      break;
    case 'capital_ace':
      current = (save.bestScores['capital-hunter'] ?? 0) >= 1200 ? 1 : 0;
      break;
    case 'cartographer':
      current =
        (save.bestScores['world-map'] ?? 0) >= 1000 ||
        (save.bestScores['country-silhouette'] ?? 0) >= 1000
          ? 1
          : 0;
      break;
    case 'streak_10':
      current = save.bestStreak;
      break;
    case 'daily_devotee':
      current = save.dailyChallenge.lastCompletedDate ? 1 : 0;
      break;
    case 'mode_connoisseur':
      current = save.completedModes.length;
      break;
    default:
      current = unlocked ? target : 0;
  }

  const clamped = Math.min(target, current);
  const pct = unlocked ? 100 : Math.min(100, Math.round((clamped / Math.max(1, target)) * 100));
  return { current: unlocked ? target : clamped, target, unlocked, pct };
}

export function evaluateNewAchievements(
  updatedSave: PlayerSaveData,
  session?: GameSessionResult
): {
  newlyUnlocked: AchievementDef[];
  bonusXp: number;
  bonusCoins: number;
} {
  const newlyUnlocked: AchievementDef[] = [];
  const totalGames = Object.values(updatedSave.gamesPlayed).reduce((sum, n) => sum + (n || 0), 0);

  const checks: Record<string, boolean> = {
    first_steps: totalGames >= 1,
    flag_explorer_25: updatedSave.discoveredCountries.length >= 25,
    flag_scholar_75: updatedSave.discoveredCountries.length >= 75,
    global_expert_150: updatedSave.discoveredCountries.length >= 150,
    world_traveler: updatedSave.continentsCompleted.length >= 6,
    perfect_round: Boolean(session && session.isPerfect && session.totalCount >= 8),
    speed_demon: Boolean(
      session &&
        session.isTimed &&
        session.totalCount >= 5 &&
        session.correctCount / session.totalCount >= 0.8
    ),
    memory_master: updatedSave.memoryBoardsCompleted >= 1,
    flag_architect: updatedSave.flagBuilderSolved >= 10,
    capital_ace: (updatedSave.bestScores['capital-hunter'] ?? 0) >= 1200,
    cartographer:
      (updatedSave.bestScores['world-map'] ?? 0) >= 1000 ||
      (updatedSave.bestScores['country-silhouette'] ?? 0) >= 1000,
    streak_10: updatedSave.bestStreak >= 10,
    daily_devotee: Boolean(updatedSave.dailyChallenge.lastCompletedDate),
    mode_connoisseur: updatedSave.completedModes.length >= 6,
  };

  let bonusXp = 0;
  let bonusCoins = 0;

  for (const def of ACHIEVEMENTS) {
    if (!updatedSave.achievements[def.id] && checks[def.id]) {
      newlyUnlocked.push(def);
      bonusXp += def.xpReward;
      bonusCoins += def.coinReward;
    }
  }

  return { newlyUnlocked, bonusXp, bonusCoins };
}
