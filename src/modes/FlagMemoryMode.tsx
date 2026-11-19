import { Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { getCountriesForDifficulty, pickQuestionSet } from '../systems/gameLogic';
import { calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Country, Difficulty, GameSessionResult } from '../types/game';

interface FlagMemoryModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult, extra?: { memoryCompletedDelta?: number }) => void;
  onExit: () => void;
}

interface MemoryCard {
  uid: string;
  country: Country;
  kind: 'flag' | 'name';
}

export function FlagMemoryMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: FlagMemoryModeProps) {
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup');
  const [boardSize, setBoardSize] = useState<'4x3' | '4x4' | '6x4'>('4x4');
  const [matchMode, setMatchMode] = useState<'flag-flag' | 'flag-name'>('flag-flag');

  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [paused, setPaused] = useState(false);

  const lockRef = useRef(false);
  const startRef = useRef(Date.now());

  const pairCount = boardSize === '4x3' ? 6 : boardSize === '4x4' ? 8 : 12;
  const maxSeconds = boardSize === '4x3' ? 75 : boardSize === '4x4' ? 105 : 150;

  const startBoard = useCallback(() => {
    AudioManager.playClick();
    const pool = getCountriesForDifficulty(difficulty);
    const chosen = pickQuestionSet(pool, pairCount);
    const deck: MemoryCard[] = [];

    chosen.forEach((c) => {
      deck.push({ uid: `${c.code}-a`, country: c, kind: 'flag' });
      deck.push({
        uid: `${c.code}-b`,
        country: c,
        kind: matchMode === 'flag-name' ? 'name' : 'flag',
      });
    });

    setCards(seededShuffle(deck));
    setFlippedIds([]);
    setMatchedCodes([]);
    setMoves(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(maxSeconds);
    setPaused(false);
    lockRef.current = false;
    startRef.current = Date.now();
    setPhase('playing');
  }, [difficulty, matchMode, maxSeconds, pairCount]);

  const finishMemory = useCallback(
    (finalScore: number, foundPairs: number, finalBestStreak: number, completed: boolean) => {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      const timeBonus = completed ? timeLeft * 12 : 0;
      const totalScore = finalScore + timeBonus;
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score: totalScore,
        correctCount: foundPairs,
        totalCount: pairCount,
        difficulty,
      });
      AudioManager.playVictory();
      onFinish(
        {
          modeId: 'flag-memory',
          score: totalScore,
          correctCount: foundPairs,
          totalCount: pairCount,
          bestStreak: finalBestStreak,
          durationSeconds,
          xpEarned,
          coinsEarned,
          discoveredCodes: matchedCodes,
          isPerfect: completed && moves <= pairCount + 2,
          isTimed: true,
          difficulty,
        },
        { memoryCompletedDelta: completed ? 1 : 0 }
      );
    },
    [difficulty, matchedCodes, moves, onFinish, pairCount, timeLeft]
  );

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          finishMemory(score, matchedCodes.length, bestStreak, false);
          return 0;
        }
        if (prev <= 10) AudioManager.playTickWarning();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, paused, score, matchedCodes.length, bestStreak, finishMemory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'playing' && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const handleCardClick = (card: MemoryCard) => {
    if (lockRef.current || paused) return;
    if (matchedCodes.includes(card.country.code) || flippedIds.includes(card.uid)) return;

    AudioManager.playFlip();
    const nextFlipped = [...flippedIds, card.uid];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const first = cards.find((c) => c.uid === nextFlipped[0])!;
      const second = card;

      if (first.country.code === second.country.code) {
        const nextStreak = streak + 1;
        const pts = 140 + Math.min(nextStreak, 8) * 35;
        const nextScore = score + pts;
        const nextMatched = [...matchedCodes, first.country.code];
        const nextBest = Math.max(bestStreak, nextStreak);

        AudioManager.playCorrect(nextStreak);
        setScore(nextScore);
        setStreak(nextStreak);
        setBestStreak(nextBest);
        setMatchedCodes(nextMatched);
        setFlippedIds([]);

        if (nextMatched.length >= pairCount) {
          window.setTimeout(() => {
            finishMemory(nextScore, nextMatched.length, nextBest, true);
          }, 420);
        }
      } else {
        lockRef.current = true;
        AudioManager.playWrong();
        setStreak(0);
        window.setTimeout(() => {
          setFlippedIds([]);
          lockRef.current = false;
        }, 760);
      }
    }
  };

  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-[#081022]/96 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-violet-300 uppercase">Mode 05</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              Flag Memory
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
          Flip hidden atlas cards, pair matching flags or flag-to-country cards, and clear the board before the clock expires.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase">Board Size</div>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: '4x3', label: '4 × 3 (6 Pairs)' },
                  { id: '4x4', label: '4 × 4 (8 Pairs)' },
                  { id: '6x4', label: '6 × 4 (12 Pairs)' },
                ] as const
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    setBoardSize(b.id);
                  }}
                  className={`rounded-xl border py-3 px-2 text-xs font-bold cursor-pointer ${
                    boardSize === b.id
                      ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase">Matching Rule</div>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  setMatchMode('flag-flag');
                }}
                className={`rounded-xl border py-3 px-3 text-xs font-bold cursor-pointer ${
                  matchMode === 'flag-flag'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Flag ↔ Identical Flag
              </button>
              <button
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  setMatchMode('flag-name');
                }}
                className={`rounded-xl border py-3 px-3 text-xs font-bold cursor-pointer ${
                  matchMode === 'flag-name'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Flag ↔ Country Name
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={startBoard}
          className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-slate-950" />
          <span>Deal Memory Board</span>
        </button>
      </div>
    );
  }

  const gridCols = boardSize === '6x4' ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-4';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <GameHudBar
        modeId="flag-memory"
        progressText={`${matchedCodes.length}/${pairCount} Pairs · ${moves} Moves`}
        score={score}
        streak={streak}
        timeLeft={timeLeft}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-4 sm:p-6 shadow-2xl">
        <div className={`grid ${gridCols} gap-2.5 sm:gap-3.5`}>
          {cards.map((card) => {
            const isMatched = matchedCodes.includes(card.country.code);
            const isRevealed = isMatched || flippedIds.includes(card.uid);

            return (
              <button
                key={card.uid}
                type="button"
                disabled={isMatched}
                onClick={() => handleCardClick(card)}
                aria-label={isRevealed ? card.country.name : 'Hidden memory card'}
                className="perspective-1000 h-24 sm:h-28 w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <div
                  className={`preserve-3d relative h-full w-full transition-transform duration-300 ${
                    isRevealed ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Card Back */}
                  <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-slate-700/80 bg-[#0F1B35] hover:border-amber-400/55 shadow-md">
                    <div className="h-7 w-7 rounded-full border border-amber-400/40 bg-amber-400/10 flex items-center justify-center">
                      <span className="font-display text-xs font-extrabold text-amber-400">F</span>
                    </div>
                  </div>

                  {/* Card Front */}
                  <div
                    className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-xl border p-2 ${
                      isMatched
                        ? 'border-emerald-400/80 bg-emerald-950/50'
                        : 'border-sky-400/60 bg-[#0B152A]'
                    }`}
                  >
                    {card.kind === 'flag' ? (
                      <FlagImage code={card.country.code} size="md" shadow={false} className="w-16 sm:w-20" />
                    ) : (
                      <span className="px-1 text-center font-display text-xs sm:text-sm font-bold text-white leading-tight">
                        {card.country.name}
                      </span>
                    )}
                    {isMatched && (
                      <span className="mt-1 truncate max-w-full text-[10px] font-semibold text-emerald-300">
                        {card.country.name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Flag Memory"
          onResume={() => setPaused(false)}
          onRestart={startBoard}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
