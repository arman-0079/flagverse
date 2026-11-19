import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  HelpCircle,
  Home,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AudioManager } from '../core/AudioManager';
import { CrazyGamesSDK } from '../core/CrazyGamesSDK';
import { GAME_MODES } from '../data/modes';
import type { AchievementDef, GameModeId, GameSessionResult } from '../types/game';

interface GameHudBarProps {
  modeId: GameModeId;
  progressText: string;
  score: number;
  streak?: number;
  timeLeft?: number | null;
  lives?: number | null;
  maxLives?: number;
  hintAvailable?: boolean;
  hintUsed?: boolean;
  onHint?: () => void;
  onPause: () => void;
  onExit: () => void;
  muted: boolean;
  onToggleMute: () => void;
  extraControls?: ReactNode;
}

export function GameHudBar({
  modeId,
  progressText,
  score,
  streak = 0,
  timeLeft = null,
  lives = null,
  maxLives = 3,
  hintAvailable = false,
  hintUsed = false,
  onHint,
  onPause,
  onExit,
  muted,
  onToggleMute,
  extraControls,
}: GameHudBarProps) {
  const modeMeta = GAME_MODES.find((m) => m.id === modeId);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-[#081022]/94 px-4 py-3">
      {/* Left: Back + Mode Title + Progress */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            AudioManager.playClick();
            onExit();
          }}
          aria-label="Back to modes"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-sm sm:text-base font-bold text-white">
              {modeMeta?.title || modeId}
            </h1>
            <span className="text-xs font-mono-num text-slate-400">· {progressText}</span>
          </div>
        </div>
      </div>

      {/* Center/Right: Live Stats & Controls */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {extraControls}

        {lives !== null && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-2.5 py-1.5" aria-label={`Lives remaining: ${lives}`}>
            {Array.from({ length: maxLives }).map((_, i) => (
              <Heart
                key={i}
                className={`h-4 w-4 ${
                  i < lives ? 'fill-rose-500 text-rose-400' : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {timeLeft !== null && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono-num text-xs font-bold ${
              timeLeft <= 5
                ? 'border-rose-500/60 bg-rose-950/60 text-rose-300'
                : 'border-slate-700/80 bg-slate-900/80 text-sky-300'
            }`}
            aria-label={`Time remaining: ${Math.max(0, Math.ceil(timeLeft))} seconds`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{Math.max(0, Math.ceil(timeLeft))}s</span>
          </div>
        )}

        {streak > 0 && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-amber-400/35 bg-amber-950/40 px-2.5 py-1.5 font-mono-num text-xs font-bold text-amber-300">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>{streak}x</span>
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 font-mono-num text-xs sm:text-sm font-bold text-amber-300">
          <span>{Math.round(score).toLocaleString()}</span>
          <span className="text-[10px] font-medium text-slate-400 uppercase">pts</span>
        </div>

        {hintAvailable && onHint && (
          <button
            type="button"
            disabled={hintUsed}
            onClick={() => {
              AudioManager.playClick();
              onHint();
            }}
            aria-label="Use Hint"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Lightbulb className="h-3.5 w-3.5 text-sky-300" />
            <span>Hint</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:text-white cursor-pointer"
        >
          {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            AudioManager.playClick();
            onPause();
          }}
          aria-label="Pause game"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-amber-400/50 hover:text-amber-300 cursor-pointer"
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface PauseOverlayModalProps {
  modeTitle: string;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onHelp?: () => void;
}

export function PauseOverlayModal({
  modeTitle,
  onResume,
  onRestart,
  onQuit,
  onHelp,
}: PauseOverlayModalProps) {
  useEffect(() => {
    CrazyGamesSDK.gameplayStop();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040812]/85 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/80 bg-[#0B152A] p-6 text-center shadow-2xl">
        <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">Paused</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">{modeTitle}</h2>
        <p className="mt-2 text-xs text-slate-400">
          Take a breather or jump right back into the challenge.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              CrazyGamesSDK.gameplayStart();
              onResume();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>Resume Game</span>
          </button>

          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              CrazyGamesSDK.gameplayStart();
              onRestart();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Restart Round</span>
          </button>

          {onHelp && (
            <button
              type="button"
              onClick={() => {
                AudioManager.playClick();
                onHelp();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              <span>How to Play</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              onQuit();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Return to Modes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameResultsViewProps {
  result: GameSessionResult;
  bestScoreBefore: number;
  newlyUnlocked: AchievementDef[];
  leveledUp: boolean;
  newLevel: number;
  onPlayAgain: () => void;
  onReturnToModes: () => void;
  extraAction?: ReactNode;
}

export function GameResultsView({
  result,
  bestScoreBefore,
  newlyUnlocked,
  leveledUp,
  newLevel,
  onPlayAgain,
  onReturnToModes,
  extraAction,
}: GameResultsViewProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const accuracy =
    result.totalCount > 0 ? Math.round((result.correctCount / result.totalCount) * 100) : 0;
  const isNewBest = result.score > bestScoreBefore && result.score > 0;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 650;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(result.score * eased));
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [result.score]);

  const modeMeta = GAME_MODES.find((m) => m.id === result.modeId);

  return (
    <div
      data-testid="game-results-screen"
      className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-[#0B152A]/96 p-6 sm:p-8 shadow-2xl"
    >
      <div className="text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-400/15 text-amber-300">
          <Trophy className="h-7 w-7" />
        </div>
        <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
          {modeMeta?.title || 'Session Complete'}
        </p>
        <h2 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-white">
          {result.isPerfect ? 'Flawless Mastery!' : accuracy >= 70 ? 'Great Expedition!' : 'Round Complete'}
        </h2>

        <div className="mt-5 flex flex-col items-center">
          <div className="font-mono-num text-5xl font-extrabold text-amber-400">
            {displayScore.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {isNewBest
              ? 'New Personal Best!'
              : `Personal Best: ${Math.max(bestScoreBefore, result.score).toLocaleString()} pts`}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-[#070E1D] p-3.5 text-center">
          <div className="text-[11px] text-slate-400 uppercase">Accuracy</div>
          <div className="mt-1 font-mono-num text-xl font-bold text-emerald-400">{accuracy}%</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#070E1D] p-3.5 text-center">
          <div className="text-[11px] text-slate-400 uppercase">Solved</div>
          <div className="mt-1 font-mono-num text-xl font-bold text-white">
            {result.correctCount}/{result.totalCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#070E1D] p-3.5 text-center">
          <div className="text-[11px] text-slate-400 uppercase">Best Streak</div>
          <div className="mt-1 font-mono-num text-xl font-bold text-sky-300">{result.bestStreak}x</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#070E1D] p-3.5 text-center">
          <div className="text-[11px] text-slate-400 uppercase">Rewards</div>
          <div className="mt-1 font-mono-num text-sm font-bold text-amber-300">
            +{result.xpEarned} XP · +{result.coinsEarned}c
          </div>
        </div>
      </div>

      {/* Level Up Banner */}
      {leveledUp && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-200">
          <CheckCircle2 className="h-4 w-4 text-sky-300" />
          <span>Level Up! You reached Explorer Level {newLevel}</span>
        </div>
      )}

      {/* Newly Unlocked Achievements */}
      {newlyUnlocked.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-4">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-300 uppercase">
            <Award className="h-4 w-4" />
            <span>Achievements Unlocked ({newlyUnlocked.length})</span>
          </div>
          <div className="mt-2.5 space-y-2">
            {newlyUnlocked.map((ach) => (
              <div
                key={ach.id}
                className="flex items-center justify-between rounded-lg bg-[#081022]/80 px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-semibold text-white">{ach.title}</div>
                  <div className="text-slate-400">{ach.description}</div>
                </div>
                <div className="font-mono-num font-bold text-amber-300 shrink-0 ml-3">
                  +{ach.xpReward} XP · +{ach.coinReward}c
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          data-start="true"
          onClick={() => {
            AudioManager.playClick();
            onPlayAgain();
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 active:scale-[0.98] cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Play Again</span>
        </button>

        {extraAction}

        <button
          type="button"
          onClick={() => {
            AudioManager.playClick();
            onReturnToModes();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer"
        >
          <Home className="h-4 w-4" />
          <span>Return to Modes</span>
        </button>
      </div>
    </div>
  );
}
