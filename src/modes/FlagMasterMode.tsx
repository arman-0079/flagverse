import { ArrowRight, CheckCircle2, Play, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { HelpModal } from '../components/Modals';
import { AudioManager } from '../core/AudioManager';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { getCountriesForDifficulty, pickDistractors, pickQuestionSet } from '../systems/gameLogic';
import { calculateAnswerPoints, calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Continent, Country, Difficulty, GameSessionResult } from '../types/game';

interface FlagMasterModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

const CONTINENTS: (Continent | 'All')[] = [
  'All',
  'Europe',
  'Asia',
  'Africa',
  'North America',
  'South America',
  'Oceania',
];

export function FlagMasterMode({
  difficulty: initialDifficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: FlagMasterModeProps) {
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [continent, setContinent] = useState<Continent | 'All'>('All');
  const [sessionLength, setSessionLength] = useState<10 | 20 | 50 | 0>(10); // 0 = Endless
  const [isTimed, setIsTimed] = useState(true);

  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [questions, setQuestions] = useState<Country[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [hintUsed, setHintUsed] = useState(false);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const startTimeRef = useRef(Date.now());
  const usedCodesRef = useRef<Set<string>>(new Set());

  const roundSeconds = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 15 : difficulty === 'hard' ? 12 : 10;

  const setupQuestion = useCallback(
    (target: Country, pool: Country[]) => {
      const distractors = pickDistractors(target, pool, 3, difficulty !== 'easy');
      setOptions(seededShuffle([target, ...distractors]));
      setSelectedCode(null);
      setEliminated([]);
      setHintUsed(false);
      setTimeLeft(isTimed ? roundSeconds : null);
    },
    [difficulty, isTimed, roundSeconds]
  );

  const startSession = () => {
    AudioManager.playClick();
    const pool = getCountriesForDifficulty(difficulty, continent);
    const count = sessionLength === 0 ? pool.length : Math.min(sessionLength, pool.length);
    const qs = pickQuestionSet(pool, count);
    usedCodesRef.current = new Set(qs.map((q) => q.code));

    setQuestions(qs);
    setQIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setDiscovered([]);
    setPaused(false);
    startTimeRef.current = Date.now();
    setupQuestion(qs[0], pool);
    setPhase('playing');
  };

  const currentCountry = questions[qIndex];

  const finishGame = useCallback(
    (finalScore: number, finalCorrect: number, finalTotal: number, finalBestStreak: number, finalDiscovered: string[]) => {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score: finalScore,
        correctCount: finalCorrect,
        totalCount: finalTotal,
        difficulty,
      });
      AudioManager.playVictory();
      onFinish({
        modeId: 'flag-master',
        score: finalScore,
        correctCount: finalCorrect,
        totalCount: finalTotal,
        bestStreak: finalBestStreak,
        durationSeconds,
        xpEarned,
        coinsEarned,
        discoveredCodes: finalDiscovered,
        isPerfect: finalTotal > 0 && finalCorrect === finalTotal,
        isTimed,
        difficulty,
      });
    },
    [difficulty, isTimed, onFinish]
  );

  const handleSelectOption = useCallback(
    (chosenCode: string | null) => {
      if (!currentCountry || selectedCode !== null) return;
      setSelectedCode(chosenCode ?? '__timeout__');
      setAnsweredCount((c) => c + 1);

      if (chosenCode === currentCountry.code) {
        const nextStreak = streak + 1;
        const pts = calculateAnswerPoints({
          basePoints: 100,
          streak: nextStreak,
          timeLeftRatio: timeLeft != null ? timeLeft / roundSeconds : 0.4,
          difficulty,
          hintUsed,
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
    },
    [currentCountry, difficulty, hintUsed, roundSeconds, selectedCode, streak, timeLeft]
  );

  const handleNext = useCallback(() => {
    AudioManager.playClick();
    if (sessionLength === 0 && qIndex + 1 >= questions.length) {
      // Endless refill without immediate repeats
      const pool = getCountriesForDifficulty(difficulty, continent);
      const remaining = pool.filter((c) => !usedCodesRef.current.has(c.code));
      const refillSource = remaining.length > 0 ? remaining : pool;
      if (remaining.length === 0) usedCodesRef.current.clear();
      const nextBatch = pickQuestionSet(refillSource, Math.min(10, refillSource.length));
      nextBatch.forEach((c) => usedCodesRef.current.add(c.code));
      const nextQs = [...questions, ...nextBatch];
      setQuestions(nextQs);
      const nextIdx = qIndex + 1;
      setQIndex(nextIdx);
      setupQuestion(nextQs[nextIdx], pool);
      return;
    }

    if (qIndex + 1 >= questions.length) {
      finishGame(score, correctCount, answeredCount, bestStreak, discovered);
      return;
    }

    const nextIdx = qIndex + 1;
    setQIndex(nextIdx);
    const pool = getCountriesForDifficulty(difficulty, continent);
    setupQuestion(questions[nextIdx], pool);
  }, [
    answeredCount,
    bestStreak,
    continent,
    correctCount,
    difficulty,
    discovered,
    finishGame,
    qIndex,
    questions,
    score,
    sessionLength,
    setupQuestion,
  ]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing' || paused || !isTimed || selectedCode !== null || timeLeft === null) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(id);
          handleSelectOption(null);
          return 0;
        }
        if (prev <= 5) AudioManager.playTickWarning();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, paused, isTimed, selectedCode, timeLeft, handleSelectOption]);

  // Keyboard shortcuts: 1-4 answer, Enter/Space next, Esc/P pause
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused) return;

      if (selectedCode === null) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx >= 0 && options[idx] && !eliminated.includes(options[idx].code)) {
          handleSelectOption(options[idx].code);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, paused, selectedCode, options, eliminated, handleSelectOption, handleNext]);

  const handleUseHint = () => {
    if (!currentCountry || hintUsed || selectedCode !== null) return;
    setHintUsed(true);
    const wrong = options.filter((o) => o.code !== currentCountry.code).slice(0, 2);
    setEliminated(wrong.map((w) => w.code));
  };

  if (phase === 'setup') {
    const poolCount = getCountriesForDifficulty(difficulty, continent).length;
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-[#081022]/96 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">Mode 01</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              Flag Master
            </h1>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
          >
            Back
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-300">
          Identify national flags from four candidates, build combo streaks, and unlock verified facts for your World Atlas.
        </p>

        <div className="mt-6 space-y-5">
          {/* Session Length */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase">Session Length</div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {([10, 20, 50, 0] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    setSessionLength(len);
                  }}
                  className={`rounded-xl border py-2.5 text-xs sm:text-sm font-bold cursor-pointer ${
                    sessionLength === len
                      ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                      : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {len === 0 ? 'Endless' : `${len} Flags`}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase">Difficulty Tier</div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(['easy', 'medium', 'hard', 'expert'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    setDifficulty(d);
                  }}
                  className={`rounded-xl border py-2 text-xs font-bold capitalize cursor-pointer ${
                    difficulty === d
                      ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Region Filter */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase">
              Region Filter ({poolCount} available)
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CONTINENTS.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    setContinent(ct);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    continent === ct
                      ? 'border-amber-400/60 bg-amber-400/15 text-amber-200'
                      : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
                  }`}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          {/* Timer Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070E1D] px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Timed Rounds ({roundSeconds}s)</div>
              <div className="text-xs text-slate-400">Earn speed bonus points for quick answers</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isTimed}
              onClick={() => {
                AudioManager.playClick();
                setIsTimed((t) => !t);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                isTimed ? 'bg-sky-400 text-slate-950' : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {isTimed ? 'Timed' : 'Untimed'}
            </button>
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={startSession}
          className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-slate-950" />
          <span>Start Flag Master</span>
        </button>
      </div>
    );
  }

  const isAnswered = selectedCode !== null;
  const isCorrect = selectedCode === currentCountry?.code;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <GameHudBar
        modeId="flag-master"
        progressText={
          sessionLength === 0
            ? `Flag #${qIndex + 1}`
            : `${qIndex + 1} / ${questions.length}`
        }
        score={score}
        streak={streak}
        timeLeft={timeLeft}
        hintAvailable
        hintUsed={hintUsed || isAnswered}
        onHint={handleUseHint}
        onPause={() => setPaused(true)}
        onExit={() => {
          if (sessionLength === 0 && answeredCount > 0) {
            finishGame(score, correctCount, answeredCount, bestStreak, discovered);
          } else {
            onExit();
          }
        }}
        muted={muted}
        onToggleMute={onToggleMute}
        extraControls={
          sessionLength === 0 && answeredCount > 0 ? (
            <button
              type="button"
              onClick={() => finishGame(score, correctCount, answeredCount, bestStreak, discovered)}
              className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/25 cursor-pointer"
            >
              Finish Run
            </button>
          ) : null
        }
      />

      {currentCountry && (
        <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-5 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-widest text-sky-300 uppercase">
              Which country does this flag represent?
            </p>
            {hintUsed && (
              <p className="mt-1.5 text-xs font-medium text-amber-300">
                Hint: Located in {currentCountry.region} ({currentCountry.continent})
              </p>
            )}

            <div className="my-6 flex items-center justify-center min-h-[175px]">
              <FlagImage
                code={currentCountry.code}
                size="xl"
                wave={!isAnswered}
                className={`w-60 sm:w-72 ${
                  isAnswered ? (isCorrect ? 'animate-pop' : 'animate-shake') : ''
                }`}
              />
            </div>
          </div>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((opt, idx) => {
              const isElim = eliminated.includes(opt.code);
              const isThisSelected = selectedCode === opt.code;
              const isThisRight = opt.code === currentCountry.code;

              let btnStyle =
                'border-slate-700/80 bg-[#0D1830] text-slate-100 hover:border-amber-400/60 hover:bg-[#132242]';
              if (isElim) {
                btnStyle = 'border-slate-800/40 bg-slate-950/50 text-slate-600 opacity-40 cursor-not-allowed';
              } else if (isAnswered) {
                if (isThisRight) {
                  btnStyle = 'border-emerald-400 bg-emerald-500/20 text-emerald-100';
                } else if (isThisSelected) {
                  btnStyle = 'border-rose-500 bg-rose-500/20 text-rose-100 animate-shake';
                } else {
                  btnStyle = 'border-slate-800 bg-slate-900/50 text-slate-500';
                }
              }

              return (
                <button
                  key={opt.code}
                  type="button"
                  disabled={isAnswered || isElim}
                  onClick={() => handleSelectOption(opt.code)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm sm:text-base font-semibold transition-all cursor-pointer ${btnStyle}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900/90 font-mono-num text-xs text-slate-400">
                      {idx + 1}
                    </span>
                    <span className="truncate">{opt.name}</span>
                  </div>
                  {isAnswered && isThisRight && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  )}
                  {isAnswered && isThisSelected && !isThisRight && (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Post-answer Explanation & Next */}
          {isAnswered && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-2 font-bold">
                  {isCorrect ? (
                    <span className="text-emerald-400">Correct! {currentCountry.name}</span>
                  ) : (
                    <span className="text-rose-400">
                      {selectedCode === '__timeout__' ? 'Time Expired!' : 'Not quite!'} Answer: {currentCountry.name}
                    </span>
                  )}
                  <span className="text-slate-500">· Capital: {currentCountry.capital}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{currentCountry.fact}</p>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
              >
                <span>
                  {sessionLength !== 0 && qIndex + 1 >= questions.length ? 'View Results' : 'Next Flag'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {paused && (
        <PauseOverlayModal
          modeTitle="Flag Master"
          onResume={() => setPaused(false)}
          onRestart={() => {
            setPaused(false);
            startSession();
          }}
          onHelp={() => setShowHelp(true)}
          onQuit={onExit}
        />
      )}

      {showHelp && (
        <HelpModal
          title="Flag Master"
          instructions={[
            'Study the national flag and select the matching country from the 4 choices (or press keys 1–4).',
            'Use Hint to eliminate two wrong options and reveal the region.',
            'Chain consecutive correct answers to grow your combo streak and earn bonus points.',
            'Press Enter or Space after answering to advance quickly.',
          ]}
          onClose={() => setShowHelp(false)}
        />
      )}
    </div>
  );
}
