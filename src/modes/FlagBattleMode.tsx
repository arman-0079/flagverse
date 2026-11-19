import { Flame } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { getCountriesForDifficulty, pickDistractors } from '../systems/gameLogic';
import { calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Country, Difficulty, GameSessionResult } from '../types/game';

interface FlagBattleModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

export function FlagBattleMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: FlagBattleModeProps) {
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wave, setWave] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);

  const [current, setCurrent] = useState<Country | null>(null);
  const [options, setOptions] = useState<Country[]>([]);
  const [flashState, setFlashState] = useState<'none' | 'hit' | 'miss'>('none');
  const [fuseRemaining, setFuseRemaining] = useState(8);
  const [fuseMax, setFuseMax] = useState(8);

  const usedPoolRef = useRef<Set<string>>(new Set());
  const startRef = useRef(Date.now());
  const endedRef = useRef(false);

  const computeFuseDuration = (waveNum: number) => {
    const base = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 8.5 : 7;
    return Math.max(3.6, base - waveNum * 0.16);
  };

  const spawnNextFlag = useCallback(
    (waveNum: number) => {
      const pool = waveNum > 8 ? SOVEREIGN_COUNTRIES : getCountriesForDifficulty(difficulty);
      let candidates = pool.filter((c) => !usedPoolRef.current.has(c.code));
      if (candidates.length === 0) {
        usedPoolRef.current.clear();
        candidates = pool;
      }
      const nextTarget = candidates[Math.floor(Math.random() * candidates.length)];
      usedPoolRef.current.add(nextTarget.code);

      const distractors = pickDistractors(nextTarget, SOVEREIGN_COUNTRIES, 3, waveNum > 4);
      const fuse = computeFuseDuration(waveNum);
      setCurrent(nextTarget);
      setOptions(seededShuffle([nextTarget, ...distractors]));
      setFuseMax(fuse);
      setFuseRemaining(fuse);
      setFlashState('none');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );

  const startBattle = useCallback(() => {
    usedPoolRef.current.clear();
    endedRef.current = false;
    startRef.current = Date.now();
    setLives(3);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setWave(1);
    setCorrectCount(0);
    setTotalAttempted(0);
    setDiscovered([]);
    setPaused(false);
    spawnNextFlag(1);
  }, [spawnNextFlag]);

  useEffect(() => {
    startBattle();
  }, [startBattle]);

  const endBattle = useCallback(
    (finalScore: number, finalCorrect: number, finalTotal: number, finalBestStreak: number, finalDisc: string[]) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score: finalScore,
        correctCount: finalCorrect,
        totalCount: Math.max(1, finalTotal),
        difficulty,
      });
      AudioManager.playVictory();
      onFinish({
        modeId: 'flag-battle',
        score: finalScore,
        correctCount: finalCorrect,
        totalCount: Math.max(1, finalTotal),
        bestStreak: finalBestStreak,
        durationSeconds,
        xpEarned,
        coinsEarned,
        discoveredCodes: finalDisc,
        isPerfect: false,
        isTimed: true,
        difficulty,
      });
    },
    [difficulty, onFinish]
  );

  const handleAnswer = useCallback(
    (chosenCode: string | null) => {
      if (!current || flashState !== 'none' || endedRef.current) return;
      const nextTotal = totalAttempted + 1;
      setTotalAttempted(nextTotal);

      if (chosenCode === current.code) {
        const nextStreak = streak + 1;
        const multiplier = Math.min(5, 1 + Math.floor(nextStreak / 3));
        const pts = Math.round((100 + fuseRemaining * 15) * multiplier);
        const nextScore = score + pts;
        const nextCorrect = correctCount + 1;
        const nextBest = Math.max(bestStreak, nextStreak);
        const nextWave = wave + 1;
        const nextDisc = discovered.includes(current.code) ? discovered : [...discovered, current.code];

        // Bonus heart every 10 combo if under 3 lives
        if (nextStreak % 10 === 0 && lives < 3) {
          setLives((l) => Math.min(3, l + 1));
          AudioManager.playStreak();
        } else {
          AudioManager.playCorrect(nextStreak);
        }

        setFlashState('hit');
        setScore(nextScore);
        setStreak(nextStreak);
        setBestStreak(nextBest);
        setCorrectCount(nextCorrect);
        setWave(nextWave);
        setDiscovered(nextDisc);

        window.setTimeout(() => {
          spawnNextFlag(nextWave);
        }, 280);
      } else {
        const nextLives = lives - 1;
        AudioManager.playWrong();
        setFlashState('miss');
        setLives(nextLives);
        setStreak(0);

        if (nextLives <= 0) {
          window.setTimeout(() => {
            endBattle(score, correctCount, nextTotal, bestStreak, discovered);
          }, 480);
        } else {
          const nextWave = wave + 1;
          setWave(nextWave);
          window.setTimeout(() => {
            spawnNextFlag(nextWave);
          }, 520);
        }
      }
    },
    [
      bestStreak,
      correctCount,
      current,
      discovered,
      endBattle,
      flashState,
      fuseRemaining,
      lives,
      score,
      spawnNextFlag,
      streak,
      totalAttempted,
      wave,
    ]
  );

  // Smooth fuse countdown
  useEffect(() => {
    if (paused || flashState !== 'none' || endedRef.current) return;
    const id = window.setInterval(() => {
      setFuseRemaining((prev) => {
        if (prev <= 0.1) {
          window.clearInterval(id);
          handleAnswer(null);
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [paused, flashState, handleAnswer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused || flashState !== 'none') return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0 && options[idx]) {
        handleAnswer(options[idx].code);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, flashState, options, handleAnswer]);

  if (!current) return null;
  const multiplier = Math.min(5, 1 + Math.floor(streak / 3));
  const fusePct = Math.max(0, Math.min(100, (fuseRemaining / fuseMax) * 100));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <GameHudBar
        modeId="flag-battle"
        progressText={`Wave ${wave} · ${multiplier}x Multiplier`}
        score={score}
        streak={streak}
        lives={lives}
        maxLives={3}
        timeLeft={fuseRemaining}
        onPause={() => setPaused(true)}
        onExit={() => {
          if (totalAttempted > 0) {
            endBattle(score, correctCount, totalAttempted, bestStreak, discovered);
          } else {
            onExit();
          }
        }}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div
        className={`rounded-2xl border bg-[#081022]/96 p-5 sm:p-8 shadow-2xl transition-colors ${
          flashState === 'hit'
            ? 'border-emerald-400/80'
            : flashState === 'miss'
              ? 'border-rose-500/80 animate-shake'
              : 'border-slate-800/90'
        }`}
      >
        {/* Accelerating Fuse Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-100 ${
              fusePct < 30 ? 'bg-rose-500' : fusePct < 60 ? 'bg-amber-400' : 'bg-sky-400'
            }`}
            style={{ width: `${fusePct}%` }}
          />
        </div>

        <div className="mt-5 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-orange-400 uppercase">
            <Flame className="h-4 w-4" />
            <span>{multiplier >= 4 ? 'FEVER MULTIPLIER ACTIVE' : `SURVIVAL WAVE ${wave}`}</span>
          </div>

          <div className="my-6 flex min-h-[160px] items-center justify-center">
            <FlagImage code={current.code} size="lg" className="w-56 sm:w-64" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((opt, idx) => {
            const isRight = opt.code === current.code;
            let cls = 'border-slate-700/80 bg-[#0D1830] text-white hover:border-orange-400/70 hover:bg-[#132242]';
            if (flashState !== 'none') {
              cls = isRight
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                : 'border-slate-800 bg-slate-900/50 text-slate-500';
            }
            return (
              <button
                key={opt.code}
                type="button"
                disabled={flashState !== 'none'}
                onClick={() => handleAnswer(opt.code)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-base font-bold cursor-pointer ${cls}`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 font-mono-num text-xs text-slate-400">
                  {idx + 1}
                </span>
                <span className="truncate">{opt.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Flag Battle"
          onResume={() => setPaused(false)}
          onRestart={startBattle}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
