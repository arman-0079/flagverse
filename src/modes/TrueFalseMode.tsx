import { ArrowRight, Check, CheckCircle2, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { HelpModal } from '../components/Modals';
import { AudioManager } from '../core/AudioManager';
import { COUNTRY_BY_CODE } from '../data/countries';
import { generateTrueFalseStatements } from '../systems/gameLogic';
import { calculateAnswerPoints, calculateSessionRewards } from '../systems/scoring';
import type { Difficulty, GameSessionResult, TrueFalseStatement } from '../types/game';

interface TrueFalseModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

export function TrueFalseMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: TrueFalseModeProps) {
  const totalStatements = 12;
  const roundSeconds =
    difficulty === 'easy' ? 14 : difficulty === 'medium' ? 12 : difficulty === 'hard' ? 10 : 8;

  const [statements, setStatements] = useState<TrueFalseStatement[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<boolean | 'timeout' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const startRef = useRef(Date.now());

  const startNewGame = useCallback(() => {
    const list = generateTrueFalseStatements(totalStatements, difficulty);
    setStatements(list);
    setIndex(0);
    setChosen(null);
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

  const current = statements[index];
  const country = current ? COUNTRY_BY_CODE[current.countryCode] : undefined;

  const handleAnswer = useCallback(
    (answer: boolean | 'timeout') => {
      if (!current || chosen !== null) return;
      setChosen(answer);

      const isCorrect = answer !== 'timeout' && answer === current.isTrue;
      if (isCorrect) {
        const nextStreak = streak + 1;
        const pts = calculateAnswerPoints({
          basePoints: 95,
          streak: nextStreak,
          timeLeftRatio: timeLeft / roundSeconds,
          difficulty,
        });
        AudioManager.playCorrect(nextStreak);
        setScore((s) => s + pts);
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setCorrectCount((c) => c + 1);
        setDiscovered((prev) =>
          prev.includes(current.countryCode) ? prev : [...prev, current.countryCode]
        );
      } else {
        AudioManager.playWrong();
        setStreak(0);
      }
    },
    [chosen, current, difficulty, roundSeconds, streak, timeLeft]
  );

  const handleNext = useCallback(() => {
    AudioManager.playClick();
    if (index + 1 >= statements.length) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score,
        correctCount,
        totalCount: statements.length,
        difficulty,
      });
      AudioManager.playVictory();
      onFinish({
        modeId: 'true-false',
        score,
        correctCount,
        totalCount: statements.length,
        bestStreak,
        durationSeconds,
        xpEarned,
        coinsEarned,
        discoveredCodes: discovered,
        isPerfect: correctCount === statements.length,
        isTimed: true,
        difficulty,
      });
      return;
    }

    setIndex((i) => i + 1);
    setChosen(null);
    setTimeLeft(roundSeconds);
  }, [bestStreak, correctCount, difficulty, discovered, index, onFinish, roundSeconds, score, statements.length]);

  useEffect(() => {
    if (paused || chosen !== null || !current) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          handleAnswer('timeout');
          return 0;
        }
        if (prev <= 4) AudioManager.playTickWarning();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, chosen, current, handleAnswer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (chosen === null) {
        const lower = e.key.toLowerCase();
        if (lower === 't' || e.key === 'ArrowLeft' || e.key === '1') {
          e.preventDefault();
          handleAnswer(true);
        } else if (lower === 'f' || e.key === 'ArrowRight' || e.key === '2') {
          e.preventDefault();
          handleAnswer(false);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, chosen, handleAnswer, handleNext]);

  if (!current) return null;

  const isAnswered = chosen !== null;
  const isCorrect = chosen !== 'timeout' && chosen === current.isTrue;
  const timerPct = Math.max(0, Math.min(100, (timeLeft / roundSeconds) * 100));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <GameHudBar
        modeId="true-false"
        progressText={`${index + 1} / ${statements.length}`}
        score={score}
        streak={streak}
        timeLeft={timeLeft}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-6 sm:p-8 shadow-2xl">
        {/* Timer Progress Strip */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              timeLeft <= 4 ? 'bg-rose-500' : 'bg-sky-400'
            }`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          {country && (
            <FlagImage code={country.code} size="md" className="w-24 sm:w-28 mb-4" />
          )}
          <p className="text-xs font-semibold tracking-widest text-lime-300 uppercase">
            Fact Check Statement
          </p>
          <h2 className="mt-2 max-w-xl font-display text-xl sm:text-2xl font-bold text-white leading-snug">
            “{current.statement}”
          </h2>
        </div>

        {/* True / False Choice Buttons */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            { value: true, label: 'TRUE', keyHint: 'T / 1', icon: Check },
            { value: false, label: 'FALSE', keyHint: 'F / 2', icon: X },
          ] as const).map((btn) => {
            const Icon = btn.icon;
            const isSelected = chosen === btn.value;
            const isActualAnswer = current.isTrue === btn.value;

            let cls =
              btn.value
                ? 'border-emerald-500/40 bg-emerald-950/35 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-900/45'
                : 'border-rose-500/40 bg-rose-950/35 text-rose-100 hover:border-rose-400 hover:bg-rose-900/45';

            if (isAnswered) {
              if (isActualAnswer) {
                cls = 'border-emerald-400 bg-emerald-500/25 text-emerald-100';
              } else if (isSelected) {
                cls = 'border-rose-500 bg-rose-500/25 text-rose-100 animate-shake';
              } else {
                cls = 'border-slate-800 bg-slate-900/50 text-slate-500 opacity-60';
              }
            }

            return (
              <button
                key={btn.label}
                type="button"
                disabled={isAnswered}
                onClick={() => handleAnswer(btn.value)}
                className={`flex items-center justify-between rounded-2xl border px-6 py-5 font-display text-xl font-extrabold transition-all cursor-pointer ${cls}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                      btn.value ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{btn.label}</span>
                </div>
                <span className="font-mono-num text-xs font-semibold text-slate-400">
                  {btn.keyHint}
                </span>
              </button>
            );
          })}
        </div>

        {/* Verified Explanation Banner */}
        {isAnswered && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
              {isCorrect ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              )}
              <div>
                <div className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isCorrect
                    ? 'Verified Correct!'
                    : chosen === 'timeout'
                      ? `Time Expired — Statement is ${current.isTrue ? 'TRUE' : 'FALSE'}`
                      : `Incorrect — Statement is ${current.isTrue ? 'TRUE' : 'FALSE'}`}
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">{current.explanation}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>{index + 1 >= statements.length ? 'View Results' : 'Next Fact'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="True or False: World Edition"
          onResume={() => setPaused(false)}
          onRestart={startNewGame}
          onHelp={() => setShowHelp(true)}
          onQuit={onExit}
        />
      )}

      {showHelp && (
        <HelpModal
          title="True or False: World Edition"
          instructions={[
            'Read each geography, capital, or flag trivia statement before the timer runs out.',
            'Select TRUE (press T or 1) or FALSE (press F or 2).',
            'Streak consecutive correct answers for combo multipliers and speed bonus points.',
            'Press Enter or Space after an explanation to advance immediately.',
          ]}
          onClose={() => setShowHelp(false)}
        />
      )}
    </div>
  );
}
