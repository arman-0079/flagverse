export type OnlineBattleModeId =
  | 'flag-rush'
  | 'country-to-flag'
  | 'capital-duel'
  | 'true-false-blitz'
  | 'world-mix';

export type OnlineQuestionKind =
  | 'flag-rush'
  | 'country-to-flag'
  | 'capital-duel'
  | 'true-false-blitz';

export interface OnlineBattleModeMeta {
  id: OnlineBattleModeId;
  title: string;
  shortTitle: string;
  description: string;
  accentColor: string;
}

export const ONLINE_BATTLE_MODES: readonly OnlineBattleModeMeta[] = [
  {
    id: 'flag-rush',
    title: 'Flag Rush',
    shortTitle: 'Flag Rush',
    description: 'Spot each national flag and pick the right country faster than your rival.',
    accentColor: '#E5B84B',
  },
  {
    id: 'country-to-flag',
    title: 'Country to Flag',
    shortTitle: 'Country → Flag',
    description: 'Match the named nation to its real flag among look-alike distractors.',
    accentColor: '#38BDF8',
  },
  {
    id: 'capital-duel',
    title: 'Capital Duel',
    shortTitle: 'Capital Duel',
    description: 'Race to identify world capitals from 4 cities before the clock expires.',
    accentColor: '#F59E0B',
  },
  {
    id: 'true-false-blitz',
    title: 'True or False Blitz',
    shortTitle: 'True / False',
    description: 'Rapid-fire world geography and flag facts — split-second True or False calls.',
    accentColor: '#60A5FA',
  },
  {
    id: 'world-mix',
    title: 'World Mix',
    shortTitle: 'World Mix',
    description: 'Every question switches between flags, capitals, and facts for total mastery.',
    accentColor: '#34D399',
  },
] as const;

export const VALID_ONLINE_MODES: readonly OnlineBattleModeId[] = ONLINE_BATTLE_MODES.map(
  (m) => m.id
);

export const VALID_MATCH_DURATIONS = [45, 60, 90] as const;
export type MatchDurationSeconds = (typeof VALID_MATCH_DURATIONS)[number];

export interface OnlineQuestionOption {
  id: string;
  label: string;
  flagCode?: string;
}

export interface OnlineQuestionPublic {
  index: number;
  kind: OnlineQuestionKind;
  prompt: string;
  subPrompt?: string;
  flagCode?: string;
  options: OnlineQuestionOption[];
}

export interface OnlinePlayerPublic {
  id: string;
  name: string;
  avatarCode: string;
  isHost: boolean;
  connected: boolean;
  score: number;
  correctCount: number;
  answeredCount: number;
  streak: number;
  bestStreak: number;
  currentQuestionIndex: number;
  rematchReady: boolean;
}

export type OnlineRoomStatus = 'lobby' | 'starting' | 'playing' | 'finished';
export type OnlineRoomKind = 'quick' | 'friend';

export interface OnlineMatchResultSummary {
  winnerId: string | null; // null indicates draw
  reason: 'time_up' | 'deck_completed' | 'opponent_left';
  modeId: OnlineBattleModeId;
  wasRandomMode: boolean;
  durationSeconds: number;
  players: OnlinePlayerPublic[];
}

export interface OnlineRoomSnapshot {
  roomId: string;
  code: string | null; // 6-char friend code for friend rooms
  kind: OnlineRoomKind;
  status: OnlineRoomStatus;
  modeId: OnlineBattleModeId;
  wasRandomMode: boolean;
  durationSeconds: MatchDurationSeconds;
  countdownEndsAt: number | null;
  endsAt: number | null;
  serverNow: number;
  totalQuestions: number;
  players: OnlinePlayerPublic[];
  result: OnlineMatchResultSummary | null;
}

export interface OnlineStatsSnapshot {
  onlinePlayers: number;
  queuedPlayers: number;
  activeRooms: number;
}

export interface PlayerIdentityPayload {
  name: string;
  avatarCode: string;
}

export type ClientToServerMessage =
  | { type: 'hello'; player: PlayerIdentityPayload }
  | { type: 'quick_match:join'; player: PlayerIdentityPayload }
  | { type: 'quick_match:leave' }
  | {
      type: 'room:create';
      player: PlayerIdentityPayload;
      modeId?: OnlineBattleModeId;
      durationSeconds?: MatchDurationSeconds;
    }
  | { type: 'room:join'; code: string; player: PlayerIdentityPayload }
  | {
      type: 'room:select_mode';
      modeId: OnlineBattleModeId | 'random';
      durationSeconds?: MatchDurationSeconds;
    }
  | { type: 'room:start' }
  | { type: 'room:back_to_lobby' }
  | { type: 'room:rematch' }
  | { type: 'room:leave' }
  | { type: 'match:answer'; questionIndex: number; choiceId: string }
  | { type: 'ping' };

export type ServerToClientMessage =
  | { type: 'welcome'; playerId: string; stats: OnlineStatsSnapshot }
  | { type: 'stats'; stats: OnlineStatsSnapshot }
  | { type: 'queue:status'; queued: boolean; queuedPlayers: number; joinedAt?: number }
  | { type: 'room:state'; room: OnlineRoomSnapshot }
  | { type: 'match:question'; question: OnlineQuestionPublic | null }
  | {
      type: 'match:answer_result';
      questionIndex: number;
      choiceId: string;
      correctId: string;
      isCorrect: boolean;
      pointsAwarded: number;
      streak: number;
      score: number;
      nextQuestion: OnlineQuestionPublic | null;
    }
  | { type: 'match:ended'; result: OnlineMatchResultSummary; room: OnlineRoomSnapshot }
  | { type: 'room:closed'; reason: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong'; serverNow: number };
