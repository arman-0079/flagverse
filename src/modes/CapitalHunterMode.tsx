import { ArrowRight, CheckCircle2, Keyboard, ListChecks, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { getCountriesForDifficulty, isCapitalMatch, pickDistractors, pickQuestionSet } from '../systems/gameLogic';
import { calculateAnswerPoints, calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Country, Difficulty, GameSessionResult } from '../types/game';

interface CapitalHunterModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

export function CapitalHunterMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: CapitalHunterModeProps) {
  const totalRounds = 12;
  const roundSeconds = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 16 : 13;

  const [inputMode, setInputMode] = useState<'choice' | 'typing'>('choice');
  const [questions, setQuestions] = useState<Country[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answered, setAnswered] = useState<{ correct: boolean; picked?: string } | null>(null);
  const [hintLevel, setHintLevel] = useState(0);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [paused, setPaused] = useState(false);

  const startRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setupRound = useCallback(
    (target: Country, pool: Country[]) => {
      const distractors = pickDistractors(target, pool, 3, false);
      setOptions(seededShuffle([target, ...distractors]));
      setTypedAnswer('');
      setAnswered(null);
      setHintLevel(0);
      setTimeLeft(roundSeconds);
    },
    [roundSeconds]
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
    setupRound(qs[0], pool);
  }, [difficulty, setupRound]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const current = questions[qIndex];

  useEffect(() => {
    if (inputMode === 'typing' && answered === null && !paused) {
      inputRef.current?.focus();
    }
  }, [inputMode, answered, paused, qIndex]);

  const submitResult = useCallback(
    (isRight: boolean, pickedLabel?: string) => {
      if (!current || answered !== null) return;
      setAnswered({ correct: isRight, picked: pickedLabel });
      if (isRight) {
        const nextStreak = streak + 1;
        const pts = calculateAnswerPoints({
          basePoints: inputMode === 'typing' ? 145 : 105,
          streak: nextStreak,
          timeLeftRatio: timeLeft / roundSeconds,
          difficulty,
          hintUsed: hintLevel > 0,
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
    [answered, current, difficulty, hintLevel, inputMode, roundSeconds, streak, timeLeft]
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
        modeId: 'capital-hunter',
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
    setupRound(questions[nextIdx], getCountriesForDifficulty(difficulty));
  }, [bestStreak, correctCount, difficulty, discovered, onFinish, qIndex, questions, score, setupRound]);

  useEffect(() => {
    if (paused || answered !== null) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          submitResult(false, 'Time expired');
          return 0;
        }
        if (prev <= 4) AudioManager.playTickWarning();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, answered, submitResult]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (answered !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNext();
        return;
      }
      if (answered === null && inputMode === 'choice') {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx >= 0 && options[idx]) {
          submitResult(options[idx].code === current?.code, options[idx].capital);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, answered, inputMode, options, current, handleNext, submitResult]);

  if (!current) return null;

  const letterHint =
    hintLevel > 0
      ? current.capital
          .split('')
          .map((ch, i) => (i < Math.min(3, Math.ceil(current.capital.length / 3)) || ch === ' ' ? ch : '_'))
          .join(' ')
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <GameHudBar
        modeId="capital-hunter"
        progressText={`${qIndex + 1} / ${questions.length}`}
        score={score}
        streak={streak}
        timeLeft={timeLeft}
        hintAvailable
        hintUsed={hintLevel > 0 || answered !== null}
        onHint={() => setHintLevel(1)}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
        extraControls={
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setInputMode('choice')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                inputMode === 'choice' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListChecks className="h-3 w-3" />
              <span>Choice</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('typing')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                inputMode === 'typing' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Keyboard className="h-3 w-3" />
              <span>Type</span>
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <FlagImage code={current.code} size="md" className="w-28 mb-4" />
          <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
            Name the Capital City of
          </p>
          <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold text-white">
            {current.name}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {current.region} · {current.continent}
          </p>
          {letterHint && (
            <p className="mt-3 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1 font-mono-num text-sm tracking-widest text-sky-200">
              {letterHint}
            </p>
          )}
        </div>

        {inputMode === 'choice' ? (
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((opt, idx) => {
              const isRight = opt.code === current.code;
              const isPicked = answered?.picked === opt.capital;
              let cls = 'border-slate-700/80 bg-[#0D1830] text-slate-100 hover:border-amber-400/60';
              if (answered) {
                if (isRight) cls = 'border-emerald-400 bg-emerald-500/20 text-emerald-100';
                else if (isPicked) cls = 'border-rose-500 bg-rose-500/20 text-rose-100 animate-shake';
                else cls = 'border-slate-800 bg-slate-900/50 text-slate-500';
              }
              return (
                <button
                  key={opt.code}
                  type="button"
                  disabled={answered !== null}
                  onClick={() => submitResult(isRight, opt.capital)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-base font-semibold cursor-pointer ${cls}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 font-mono-num text-xs text-slate-400">
                      {idx + 1}
                    </span>
                    <span>{opt.capital}</span>
                  </div>
                  {answered && isRight && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  {answered && isPicked && !isRight && <XCircle className="h-5 w-5 text-rose-400" />}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (answered !== null || !typedAnswer.trim()) return;
              submitResult(isCapitalMatch(typedAnswer, current), typedAnswer.trim());
            }}
            className="mt-7 mx-auto max-w-md flex gap-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              disabled={answered !== null}
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              placeholder="Type capital name..."
              aria-label="Type capital city name"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={answered !== null || !typedAnswer.trim()}
              className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-45 cursor-pointer"
            >
              Submit
            </button>
          </form>
        )}

        {answered && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4">
            <div className="text-xs sm:text-sm text-slate-300">
              <span className={`font-bold ${answered.correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                {answered.correct ? 'Correct!' : `Capital: ${current.capital}.`}
              </span>{' '}
              <span className="text-slate-400">{current.fact}</span>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>{qIndex + 1 >= questions.length ? 'Finish' : 'Next Capital'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Capital Hunter"
          onResume={() => setPaused(false)}
          onRestart={startNewGame}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
