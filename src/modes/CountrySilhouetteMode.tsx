import { ArrowRight, CheckCircle2, RotateCw, XCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { getCountrySilhouetteSvg } from '../data/worldGeometry';
import { getCountriesForDifficulty, pickDistractors, pickQuestionSet } from '../systems/gameLogic';
import { calculateAnswerPoints, calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Country, Difficulty, GameSessionResult } from '../types/game';

interface CountrySilhouetteModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

export function CountrySilhouetteMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: CountrySilhouetteModeProps) {
  const totalRounds = 10;
  const [questions, setQuestions] = useState<Country[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [hintUsed, setHintUsed] = useState(false);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());

  const initRound = useCallback(
    (target: Country, pool: Country[]) => {
      const distractors = pickDistractors(target, pool, 3, false);
      setOptions(seededShuffle([target, ...distractors]));
      setSelectedCode(null);
      setHintUsed(false);
      setZoom(1);
      // On Hard/Expert, rotate silhouette randomly so players can use the Rotate control!
      setRotation(
        difficulty === 'hard' || difficulty === 'expert'
          ? [90, 180, 270][Math.floor(Math.random() * 3)]
          : 0
      );
    },
    [difficulty]
  );

  const startNewGame = useCallback(() => {
    // Prefer countries with distinct recognizable shapes (exclude tiny island dots on Easy)
    const pool = getCountriesForDifficulty(difficulty).filter((c) => !c.isIsland || difficulty !== 'easy');
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

  const silhouette = useMemo(() => {
    if (!current) return { d: '', isAtollFallback: false };
    return getCountrySilhouetteSvg(current.numericId, current.lat, current.lng, 240, 24);
  }, [current]);

  const handleSelect = (code: string) => {
    if (!current || selectedCode !== null) return;
    setSelectedCode(code);
    if (code === current.code) {
      const nextStreak = streak + 1;
      const pts = calculateAnswerPoints({
        basePoints: 125,
        streak: nextStreak,
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
  };

  const handleNext = () => {
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
        modeId: 'country-silhouette',
        score,
        correctCount,
        totalCount: questions.length,
        bestStreak,
        durationSeconds,
        xpEarned,
        coinsEarned,
        discoveredCodes: discovered,
        isPerfect: correctCount === questions.length,
        isTimed: false,
        difficulty,
      });
      return;
    }
    const nextIdx = qIndex + 1;
    setQIndex(nextIdx);
    initRound(questions[nextIdx], getCountriesForDifficulty(difficulty));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!current) return null;
  const isAnswered = selectedCode !== null;
  const isCorrect = selectedCode === current.code;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <GameHudBar
        modeId="country-silhouette"
        progressText={`${qIndex + 1} / ${questions.length}`}
        score={score}
        streak={streak}
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
          <p className="text-xs font-semibold tracking-widest text-teal-300 uppercase">
            Identify Country From Its Geographic Outline
          </p>
          {hintUsed && (
            <p className="mt-1 text-xs font-medium text-amber-300">
              Hint: {current.region} ({current.continent}) · Capital: {current.capital}
            </p>
          )}
        </div>

        {/* Silhouette Stage */}
        <div className="relative mx-auto mt-5 flex h-64 w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-[#050C1B]">
          {/* Controls */}
          <div className="absolute right-2.5 top-2.5 z-10 flex gap-1.5">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Rotate silhouette 90 degrees"
              title="Rotate 90°"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:border-teal-400 cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.2))}
              aria-label="Zoom in silhouette"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:border-teal-400 cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
              aria-label="Zoom out silhouette"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:border-teal-400 cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {rotation !== 0 && (
            <span className="absolute left-3 top-2.5 font-mono-num text-[11px] text-amber-300">
              Rotated {rotation}°
            </span>
          )}

          <svg viewBox="0 0 240 240" className="h-56 w-56">
            <defs>
              <pattern id="sil-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(45, 212, 191, 0.08)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="240" height="240" fill="url(#sil-grid)" />
            <g
              transform={`translate(120 120) rotate(${isAnswered ? 0 : rotation}) scale(${zoom}) translate(-120 -120)`}
              className="transition-transform duration-300"
            >
              <path
                d={silhouette.d}
                fill={isAnswered ? (isCorrect ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.3)') : 'rgba(45, 212, 191, 0.28)'}
                stroke={isAnswered ? (isCorrect ? '#34D399' : '#FB7185') : '#2DD4BF'}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>

        {/* 4 Options */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((opt, idx) => {
            const isRight = opt.code === current.code;
            const isSel = selectedCode === opt.code;
            let cls = 'border-slate-700/80 bg-[#0D1830] text-slate-100 hover:border-teal-400/60';
            if (isAnswered) {
              if (isRight) cls = 'border-emerald-400 bg-emerald-500/20 text-emerald-100';
              else if (isSel) cls = 'border-rose-500 bg-rose-500/20 text-rose-100';
              else cls = 'border-slate-800 bg-slate-900/50 text-slate-500';
            }

            return (
              <button
                key={opt.code}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelect(opt.code)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm sm:text-base font-semibold cursor-pointer ${cls}`}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 font-mono-num text-xs text-slate-400">
                    {idx + 1}
                  </span>
                  <span>{opt.name}</span>
                </div>
                {isAnswered && isRight && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {isAnswered && isSel && !isRight && <XCircle className="h-5 w-5 text-rose-400" />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4">
            <div className="flex items-center gap-3">
              <FlagImage code={current.code} size="sm" className="w-14 shrink-0" />
              <div className="text-xs sm:text-sm text-slate-300">
                <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {current.name}
                </span>{' '}
                <span className="text-slate-400">· {current.fact}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>{qIndex + 1 >= questions.length ? 'Finish' : 'Next Border'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Country Silhouette"
          onResume={() => setPaused(false)}
          onRestart={startNewGame}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
