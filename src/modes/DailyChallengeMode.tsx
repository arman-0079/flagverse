import { ArrowRight, Calendar, CheckCircle2, Flame, XCircle } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { getCountrySilhouetteSvg } from '../data/worldGeometry';
import { generateDailyChallengePlan, pickDistractors } from '../systems/gameLogic';
import {
  calculateAnswerPoints,
  calculateSessionRewards,
  createSeededRng,
  getUtcDateKey,
  hashDateSeed,
  seededShuffle,
} from '../systems/scoring';
import type { Country, Difficulty, GameSessionResult } from '../types/game';
import { FlagBuilderMode } from './FlagBuilderMode';
import { FlagMatchMode } from './FlagMatchMode';

interface DailyChallengeModeProps {
  difficulty: Difficulty;
  dailyStreak: number;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult, extra?: { flagBuilderSolvedDelta?: number }) => void;
  onExit: () => void;
}

type StageId = 'flags' | 'silhouettes' | 'capitals' | 'match' | 'builder';

const STAGES: { id: StageId; label: string }[] = [
  { id: 'flags', label: '1. Flags' },
  { id: 'silhouettes', label: '2. Outlines' },
  { id: 'capitals', label: '3. Capitals' },
  { id: 'match', label: '4. Match' },
  { id: 'builder', label: '5. Builder' },
];

export function DailyChallengeMode({
  difficulty,
  dailyStreak,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: DailyChallengeModeProps) {
  const dateKey = useMemo(() => getUtcDateKey(), []);
  const plan = useMemo(() => generateDailyChallengePlan(dateKey), [dateKey]);

  const [stageIdx, setStageIdx] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);

  const startRef = useRef(Date.now());
  const stage: StageId = STAGES[stageIdx].id;

  const currentStageItems: Country[] = useMemo(() => {
    if (stage === 'flags') return plan.flagRound;
    if (stage === 'silhouettes') return plan.silhouetteRound;
    if (stage === 'capitals') return plan.capitalRound;
    return [];
  }, [plan, stage]);

  const currentCountry = currentStageItems[subIndex];

  const options = useMemo(() => {
    if (!currentCountry) return [];
    const rng = createSeededRng(hashDateSeed(`${dateKey}-${stage}-${currentCountry.code}`));
    const distractors = pickDistractors(
      currentCountry,
      SOVEREIGN_COUNTRIES,
      3,
      stage === 'flags',
      rng
    );
    return seededShuffle([currentCountry, ...distractors], rng);
  }, [currentCountry, dateKey, stage]);

  const silhouette = useMemo(() => {
    if (stage !== 'silhouettes' || !currentCountry) return { d: '', isAtollFallback: false };
    return getCountrySilhouetteSvg(currentCountry.numericId, currentCountry.lat, currentCountry.lng, 220, 22);
  }, [currentCountry, stage]);

  const handleSelectOption = (code: string) => {
    if (!currentCountry || selectedCode !== null) return;
    setSelectedCode(code);
    const isRight = code === currentCountry.code;
    setOutcomes((prev) => [...prev, isRight ? '🟩' : '🟥']);

    if (isRight) {
      const nextStreak = streak + 1;
      const pts = calculateAnswerPoints({
        basePoints: 130,
        streak: nextStreak,
        difficulty: 'medium',
      });
      AudioManager.playCorrect(nextStreak);
      setScore((s) => s + pts);
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      setCorrectCount((c) => c + 1);
      setDiscovered((prev) =>
        prev.includes(currentCountry.code) ? prev : [...prev, currentCountry.code]
      );
    } else {
      AudioManager.playWrong();
      setStreak(0);
    }
  };

  const handleAdvanceQuiz = () => {
    AudioManager.playClick();
    if (subIndex + 1 < currentStageItems.length) {
      setSubIndex((i) => i + 1);
      setSelectedCode(null);
    } else {
      setStageIdx((s) => s + 1);
      setSubIndex(0);
      setSelectedCode(null);
    }
  };

  const handleMatchComplete = useCallback((matched: number, total: number, stageScore: number) => {
    setScore((s) => s + stageScore);
    setCorrectCount((c) => c + matched);
    setOutcomes((prev) => [
      ...prev,
      ...Array.from({ length: total }, (_, idx) => (idx < matched ? '🟩' : '🟥')),
    ]);
    setDiscovered((prev) => {
      const merged = new Set(prev);
      plan.matchRound.forEach((c) => merged.add(c.code));
      return Array.from(merged);
    });
    setStageIdx(4);
    setSubIndex(0);
  }, [plan.matchRound]);

  const handleBuilderComplete = useCallback(
    (solved: number, total: number, stageScore: number) => {
      const totalItems =
        plan.flagRound.length +
        plan.silhouetteRound.length +
        plan.capitalRound.length +
        plan.matchRound.length +
        total;
      const finalCorrect = correctCount + solved;
      const finalScore = score + stageScore + 250; // Daily completion bonus
      const finalOutcomes = [
        ...outcomes,
        ...Array.from({ length: total }, (_, idx) => (idx < solved ? '🟩' : '🟥')),
      ];
      const finalDiscovered = new Set(discovered);
      plan.builderRound.forEach((p) => finalDiscovered.add(p.countryCode));

      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score: finalScore,
        correctCount: finalCorrect,
        totalCount: totalItems,
        difficulty,
        isDaily: true,
      });

      const accuracy = Math.round((finalCorrect / Math.max(1, totalItems)) * 100);
      const shareText = `FLAGVERSE Daily (${dateKey})\nScore: ${finalScore.toLocaleString()} pts · ${accuracy}% (${finalCorrect}/${totalItems})\n${finalOutcomes.join('')}`;

      AudioManager.playVictory();
      onFinish(
        {
          modeId: 'daily-challenge',
          score: finalScore,
          correctCount: finalCorrect,
          totalCount: totalItems,
          bestStreak: Math.max(bestStreak, solved),
          durationSeconds,
          xpEarned,
          coinsEarned,
          discoveredCodes: Array.from(finalDiscovered),
          isPerfect: finalCorrect === totalItems,
          isTimed: true,
          difficulty,
          extraLabel: shareText,
        },
        { flagBuilderSolvedDelta: solved }
      );
    },
    [
      bestStreak,
      correctCount,
      dateKey,
      difficulty,
      discovered,
      onFinish,
      outcomes,
      plan,
      score,
    ]
  );

  // Stage progress bar shared across all 5 stages
  const StageStepper = (
    <div className="mx-auto max-w-4xl rounded-xl border border-amber-400/30 bg-[#081022]/94 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
          <Calendar className="h-4 w-4" />
          <span>Daily World Challenge · {dateKey}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono-num text-slate-300">
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span>Streak: {dailyStreak}d</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-300 font-bold">{score.toLocaleString()} pts</span>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {STAGES.map((st, idx) => (
          <div
            key={st.id}
            className={`rounded-lg px-2 py-1 text-center text-[11px] font-semibold ${
              idx < stageIdx
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                : idx === stageIdx
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}
          >
            {st.label}
          </div>
        ))}
      </div>
    </div>
  );

  if (stage === 'match') {
    return (
      <div className="space-y-4">
        {StageStepper}
        <FlagMatchMode
          difficulty={difficulty}
          muted={muted}
          onToggleMute={onToggleMute}
          onFinish={() => {}}
          onExit={onExit}
          overrideCountries={plan.matchRound}
          onEmbeddedComplete={handleMatchComplete}
        />
      </div>
    );
  }

  if (stage === 'builder') {
    return (
      <div className="space-y-4">
        {StageStepper}
        <FlagBuilderMode
          difficulty={difficulty}
          muted={muted}
          onToggleMute={onToggleMute}
          onFinish={() => {}}
          onExit={onExit}
          overridePuzzles={plan.builderRound}
          onEmbeddedComplete={handleBuilderComplete}
        />
      </div>
    );
  }

  if (!currentCountry) return null;
  const isAnswered = selectedCode !== null;
  const isCorrect = selectedCode === currentCountry.code;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {StageStepper}

      <GameHudBar
        modeId="daily-challenge"
        progressText={`Stage ${stageIdx + 1}/5 · ${subIndex + 1}/${currentStageItems.length}`}
        score={score}
        streak={streak}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-5 sm:p-8 shadow-2xl">
        {stage === 'flags' && (
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
              Stage 1 · Flag Identification
            </p>
            <div className="my-5">
              <FlagImage code={currentCountry.code} size="xl" wave={!isAnswered} className="w-56 sm:w-64" />
            </div>
          </div>
        )}

        {stage === 'silhouettes' && (
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-widest text-teal-300 uppercase">
              Stage 2 · Border Silhouette
            </p>
            <div className="my-5 flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-800 bg-[#050C1B]">
              <svg viewBox="0 0 220 220" className="h-52 w-52">
                <path
                  d={silhouette.d}
                  fill={isAnswered ? 'rgba(52, 211, 153, 0.3)' : 'rgba(45, 212, 191, 0.28)'}
                  stroke={isAnswered ? '#34D399' : '#2DD4BF'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

        {stage === 'capitals' && (
          <div className="flex flex-col items-center text-center">
            <FlagImage code={currentCountry.code} size="md" className="w-24 mb-3" />
            <p className="text-xs font-semibold tracking-widest text-sky-300 uppercase">
              Stage 3 · Capital City of
            </p>
            <h2 className="mt-1 font-display text-3xl font-extrabold text-white">
              {currentCountry.name}
            </h2>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((opt, idx) => {
            const isRight = opt.code === currentCountry.code;
            const isSel = selectedCode === opt.code;
            let cls = 'border-slate-700/80 bg-[#0D1830] text-slate-100 hover:border-amber-400/60';
            if (isAnswered) {
              if (isRight) cls = 'border-emerald-400 bg-emerald-500/20 text-emerald-100';
              else if (isSel) cls = 'border-rose-500 bg-rose-500/20 text-rose-100 animate-shake';
              else cls = 'border-slate-800 bg-slate-900/50 text-slate-500';
            }

            return (
              <button
                key={opt.code}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(opt.code)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm sm:text-base font-semibold cursor-pointer ${cls}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 font-mono-num text-xs text-slate-400">
                    {idx + 1}
                  </span>
                  <span className="truncate">
                    {stage === 'capitals' ? opt.capital : opt.name}
                  </span>
                </div>
                {isAnswered && isRight && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
                {isAnswered && isSel && !isRight && <XCircle className="h-5 w-5 text-rose-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs sm:text-sm text-slate-300">
              <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentCountry.name} ({currentCountry.capital})
              </span>{' '}
              <span className="text-slate-400">· {currentCountry.fact}</span>
            </div>
            <button
              type="button"
              onClick={handleAdvanceQuiz}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>Next Stage Step</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Daily World Challenge"
          onResume={() => setPaused(false)}
          onRestart={() => {
            setPaused(false);
            setStageIdx(0);
            setSubIndex(0);
            setSelectedCode(null);
            setScore(0);
            setStreak(0);
            setBestStreak(0);
            setCorrectCount(0);
            setDiscovered([]);
            setOutcomes([]);
          }}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
