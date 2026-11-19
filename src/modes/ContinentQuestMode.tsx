import { ArrowRight, CheckCircle2, Layers, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { getCountriesForDifficulty, pickQuestionSet } from '../systems/gameLogic';
import { calculateAnswerPoints, calculateSessionRewards } from '../systems/scoring';
import type { Continent, Country, Difficulty, GameSessionResult } from '../types/game';

interface ContinentQuestModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

const CONTINENT_META: {
  id: Continent;
  short: string;
  accent: string;
  svgPath: string;
}[] = [
  {
    id: 'North America',
    short: 'N. America',
    accent: '#38BDF8',
    svgPath: 'M8 10l18-4 12 6-5 10-8 4-3 10-7-2-3-10-8-6z',
  },
  {
    id: 'South America',
    short: 'S. America',
    accent: '#34D399',
    svgPath: 'M18 6l12 6 6 11-7 11-6 8-5-9-4-12z',
  },
  {
    id: 'Europe',
    short: 'Europe',
    accent: '#818CF8',
    svgPath: 'M8 22l8-10 14-4 10 8-4 10-12 4-10-2z',
  },
  {
    id: 'Africa',
    short: 'Africa',
    accent: '#FBBF24',
    svgPath: 'M14 8l16 2 8 10-8 8-4 12-7-4-4-11-5-8z',
  },
  {
    id: 'Asia',
    short: 'Asia',
    accent: '#FB7185',
    svgPath: 'M6 16l12-8 18 2 10 10-6 12-14 2-10-6z',
  },
  {
    id: 'Oceania',
    short: 'Oceania',
    accent: '#2DD4BF',
    svgPath: 'M10 20l14-6 10 8-4 10-14 2-6-6zm26-8l5 3-3 5z',
  },
];

export function ContinentQuestMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: ContinentQuestModeProps) {
  const totalCountries = 15;
  const roundSeconds = difficulty === 'easy' ? 16 : difficulty === 'medium' ? 14 : 11;

  const [questions, setQuestions] = useState<Country[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedContinent, setSelectedContinent] = useState<Continent | 'timeout' | null>(null);
  const [dragOverCont, setDragOverCont] = useState<Continent | null>(null);
  const [hintUsed, setHintUsed] = useState(false);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [paused, setPaused] = useState(false);

  const startRef = useRef(Date.now());

  const startNewGame = useCallback(() => {
    const pool = getCountriesForDifficulty(difficulty);
    const qs = pickQuestionSet(pool, totalCountries);
    setQuestions(qs);
    setQIndex(0);
    setSelectedContinent(null);
    setDragOverCont(null);
    setHintUsed(false);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setDiscovered([]);
    setTimeLeft(roundSeconds);
    setPaused(false);
    startRef.current = Date.now();
  }, [difficulty, roundSeconds]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const current = questions[qIndex];

  const handleSort = useCallback(
    (cont: Continent | 'timeout') => {
      if (!current || selectedContinent !== null) return;
      setSelectedContinent(cont);
      setDragOverCont(null);

      if (cont === current.continent) {
        const nextStreak = streak + 1;
        const pts = calculateAnswerPoints({
          basePoints: 100,
          streak: nextStreak,
          timeLeftRatio: timeLeft / roundSeconds,
          difficulty,
          hintUsed,
        });
        AudioManager.playCorrect(nextStreak);
        setScore((s) => s + pts);
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setCorrectCount((c) => c + 1);
        setDiscovered((prev) => (prev.includes(current.code) ? prev : [...prev, current.code]));
      } else {
        AudioManager.playWrong();
        setStreak(0);
      }
    },
    [current, difficulty, hintUsed, roundSeconds, selectedContinent, streak, timeLeft]
  );

  const handleNext = useCallback(() => {
    AudioManager.playClick();
    if (qIndex + 1 >= questions.length) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score,
        correctCount,
        totalCount: questions.length,
        difficulty,
      });
      AudioManager.playVictory();
      onFinish({
        modeId: 'continent-quest',
        score,
        correctCount,
        totalCount: questions.length,
        bestStreak,
        durationSeconds,
        xpEarned,
        coinsEarned,
        discoveredCodes: discovered,
        isPerfect: correctCount === questions.length,
        isTimed: true,
        difficulty,
      });
      return;
    }

    setQIndex((i) => i + 1);
    setSelectedContinent(null);
    setHintUsed(false);
    setTimeLeft(roundSeconds);
  }, [bestStreak, correctCount, difficulty, discovered, onFinish, qIndex, questions.length, roundSeconds, score]);

  useEffect(() => {
    if (paused || selectedContinent !== null || !current) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          handleSort('timeout');
          return 0;
        }
        if (prev <= 4) AudioManager.playTickWarning();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, selectedContinent, current, handleSort]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (selectedContinent === null) {
        const idx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
        if (idx >= 0 && CONTINENT_META[idx]) {
          handleSort(CONTINENT_META[idx].id);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, selectedContinent, handleSort, handleNext]);

  if (!current) return null;

  const isAnswered = selectedContinent !== null;
  const isCorrect = selectedContinent === current.continent;
  const showFlag = difficulty === 'easy' || difficulty === 'medium' || hintUsed || isAnswered;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <GameHudBar
        modeId="continent-quest"
        progressText={`${qIndex + 1} / ${questions.length}`}
        score={score}
        streak={streak}
        timeLeft={timeLeft}
        hintAvailable
        hintUsed={hintUsed || isAnswered}
        onHint={() => setHintUsed(true)}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-5 sm:p-7 shadow-2xl">
        {/* Draggable Country Dispatch Card */}
        <div className="flex flex-col items-center text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-amber-300 uppercase">
            <Layers className="h-3.5 w-3.5" />
            <span>Sort Country Into Its Continent (Drag or Click 1–6)</span>
          </p>

          <div
            draggable={!isAnswered}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', current.code)}
            className={`mt-4 flex flex-col sm:flex-row items-center gap-4 rounded-2xl border px-6 py-4 shadow-xl transition-all ${
              isAnswered
                ? isCorrect
                  ? 'border-emerald-400/70 bg-emerald-950/35'
                  : 'border-rose-500/70 bg-rose-950/35'
                : 'border-amber-400/45 bg-[#0D1830] cursor-grab active:cursor-grabbing'
            }`}
          >
            {showFlag && (
              <FlagImage code={current.code} size="md" className="w-20 shrink-0" />
            )}
            <div className="text-center sm:text-left">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                {current.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Capital: <strong className="text-slate-200">{current.capital}</strong>
                {hintUsed && ` · Subregion: ${current.region}`}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Continent Buckets */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CONTINENT_META.map((cont, idx) => {
            const isTarget = cont.id === current.continent;
            const isPicked = selectedContinent === cont.id;
            const isDragTarget = dragOverCont === cont.id;

            let cls =
              'border-slate-700/80 bg-[#0D1830] hover:border-amber-400/60 hover:bg-[#132242]';
            if (isDragTarget && !isAnswered) {
              cls = 'border-amber-400 bg-amber-400/20 scale-[1.02]';
            } else if (isAnswered) {
              if (isTarget) {
                cls = 'border-emerald-400 bg-emerald-500/20';
              } else if (isPicked) {
                cls = 'border-rose-500 bg-rose-500/20 animate-shake';
              } else {
                cls = 'border-slate-800 bg-slate-900/50 opacity-50';
              }
            }

            return (
              <button
                key={cont.id}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSort(cont.id)}
                onDragOver={(e) => {
                  if (isAnswered) return;
                  e.preventDefault();
                  setDragOverCont(cont.id);
                }}
                onDragLeave={() => setDragOverCont((prev) => (prev === cont.id ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!isAnswered) handleSort(cont.id);
                }}
                className={`relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all cursor-pointer ${cls}`}
              >
                <span className="absolute left-2.5 top-2.5 font-mono-num text-[11px] text-slate-400">
                  {idx + 1}
                </span>

                <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden="true">
                  <path
                    d={cont.svgPath}
                    fill={cont.accent}
                    fillOpacity="0.26"
                    stroke={cont.accent}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>

                <span className="mt-2 font-display text-sm sm:text-base font-bold text-white">
                  {cont.id}
                </span>

                {isAnswered && isTarget && (
                  <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-400" />
                )}
                {isAnswered && isPicked && !isTarget && (
                  <XCircle className="mt-1 h-4 w-4 text-rose-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Post-Sort Feedback */}
        {isAnswered && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs sm:text-sm text-slate-300">
              <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isCorrect
                  ? `Sorted! ${current.name} is in ${current.continent}.`
                  : selectedContinent === 'timeout'
                    ? `Time Expired — ${current.name} belongs to ${current.continent}.`
                    : `${current.name} belongs to ${current.continent} (${current.region}).`}
              </span>{' '}
              <span className="text-slate-400">{current.fact}</span>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>{qIndex + 1 >= questions.length ? 'View Results' : 'Next Country'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Continent Quest"
          onResume={() => setPaused(false)}
          onRestart={startNewGame}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
