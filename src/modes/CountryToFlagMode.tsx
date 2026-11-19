import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { getCountriesForDifficulty, pickDistractors, pickQuestionSet } from '../systems/gameLogic';
import { calculateAnswerPoints, calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Country, Difficulty, GameSessionResult } from '../types/game';

interface CountryToFlagModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

export function CountryToFlagMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: CountryToFlagModeProps) {
  const optionCount = difficulty === 'hard' || difficulty === 'expert' ? 6 : 4;
  const totalRounds = 12;
  const roundSeconds = difficulty === 'easy' ? 18 : difficulty === 'medium' ? 14 : 11;

  const [questions, setQuestions] = useState<Country[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());

  const initRound = useCallback(
    (target: Country, pool: Country[]) => {
      // Prioritize visually similar look-alike flags for authentic challenge
      const distractors = pickDistractors(target, pool, optionCount - 1, true);
      setOptions(seededShuffle([target, ...distractors]));
      setSelectedCode(null);
      setHintUsed(false);
      setTimeLeft(roundSeconds);
    },
    [optionCount, roundSeconds]
  );

  const startNewGame = useCallback(() => {
    const pool = getCountriesForDifficulty(difficulty);
    const qs = pickQuestionSet(pool, totalRounds);
    setQuestions(qs);
    setQIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setDiscovered([]);
    setPaused(false);
    startRef.current = Date.now();
    initRound(qs[0], pool);
  }, [difficulty, initRound]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const current = questions[qIndex];

  const handleChoose = useCallback(
    (code: string | null) => {
      if (!current || selectedCode !== null) return;
      setSelectedCode(code ?? '__timeout__');
      if (code === current.code) {
        const nextStreak = streak + 1;
        const pts = calculateAnswerPoints({
          basePoints: 120,
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
    [current, difficulty, hintUsed, roundSeconds, selectedCode, streak, timeLeft]
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
        modeId: 'country-to-flag',
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
    const nextIdx = qIndex + 1;
    setQIndex(nextIdx);
    initRound(questions[nextIdx], getCountriesForDifficulty(difficulty));
  }, [bestStreak, correctCount, difficulty, discovered, initRound, onFinish, qIndex, questions, score]);

  useEffect(() => {
    if (paused || selectedCode !== null) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          handleChoose(null);
          return 0;
        }
        if (prev <= 4) AudioManager.playTickWarning();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, selectedCode, handleChoose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (selectedCode === null) {
        const idx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
        if (idx >= 0 && options[idx]) handleChoose(options[idx].code);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, selectedCode, options, handleChoose, handleNext]);

  if (!current) return null;
  const isAnswered = selectedCode !== null;
  const isCorrect = selectedCode === current.code;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <GameHudBar
        modeId="country-to-flag"
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

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-5 sm:p-8 shadow-2xl">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-sky-300 uppercase">
            Select the Official Flag of
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-white">
            {current.name}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {current.region} · {current.continent}
            {hintUsed ? ` · Flag colors: ${current.colors.join(', ')}` : ''}
          </p>
        </div>

        <div
          className={`mt-7 grid gap-4 ${
            optionCount === 6 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
          }`}
        >
          {options.map((opt, idx) => {
            const isSel = selectedCode === opt.code;
            const isRight = opt.code === current.code;
            let ring = 'border-slate-800 bg-[#0B152A] hover:border-amber-400/60 hover:-translate-y-0.5';
            if (isAnswered) {
              if (isRight) ring = 'border-emerald-400 bg-emerald-500/15 animate-pop';
              else if (isSel) ring = 'border-rose-500 bg-rose-500/15 animate-shake';
              else ring = 'border-slate-800/60 bg-slate-950/50 opacity-55';
            }

            return (
              <button
                key={opt.code}
                type="button"
                disabled={isAnswered}
                onClick={() => handleChoose(opt.code)}
                aria-label={`Option ${idx + 1}`}
                className={`relative flex flex-col items-center justify-center rounded-xl border p-5 transition-all cursor-pointer ${ring}`}
              >
                <span className="absolute left-2.5 top-2 font-mono-num text-[11px] font-bold text-slate-500">
                  {idx + 1}
                </span>
                <FlagImage code={opt.code} alt={`Candidate flag ${idx + 1}`} size="md" className="w-32 sm:w-36" />
                {isAnswered && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold">
                    {isRight ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-300">{opt.name}</span>
                      </>
                    ) : isSel ? (
                      <>
                        <XCircle className="h-4 w-4 text-rose-400" />
                        <span className="text-rose-300">{opt.name}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">{opt.name}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4">
            <div className="text-xs sm:text-sm text-slate-300">
              <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isCorrect ? 'Spot on!' : `Correct flag: ${current.name}.`}
              </span>{' '}
              <span className="text-slate-400">{current.fact}</span>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>{qIndex + 1 >= questions.length ? 'Finish' : 'Next Country'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Country to Flag"
          onResume={() => setPaused(false)}
          onRestart={startNewGame}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
