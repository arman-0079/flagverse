import { CheckCircle2, Link2, Play } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { getCountriesForDifficulty, pickQuestionSet } from '../systems/gameLogic';
import { calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Country, Difficulty, GameSessionResult } from '../types/game';

interface FlagMatchModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
  overrideCountries?: Country[];
  onEmbeddedComplete?: (correctCount: number, totalCount: number, score: number) => void;
}

interface LineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function FlagMatchMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
  overrideCountries,
  onEmbeddedComplete,
}: FlagMatchModeProps) {
  const [phase, setPhase] = useState<'setup' | 'playing'>(overrideCountries ? 'playing' : 'setup');
  const [pairSetting, setPairSetting] = useState<5 | 7 | 10>(5);

  const [boards, setBoards] = useState<Country[][]>([]);
  const [boardIndex, setBoardIndex] = useState(0);
  const [leftItems, setLeftItems] = useState<Country[]>([]);
  const [rightItems, setRightItems] = useState<Country[]>([]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<{ left: string; right: string } | null>(null);

  const [dragState, setDragState] = useState<{
    fromSide: 'left' | 'right';
    code: string;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  const [lineMap, setLineMap] = useState<Record<string, LineCoords>>({});
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);
  const [paused, setPaused] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const leftAnchorRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const rightAnchorRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const startRef = useRef(Date.now());

  const loadBoard = useCallback((boardCountries: Country[]) => {
    setLeftItems(seededShuffle(boardCountries));
    setRightItems(seededShuffle(boardCountries));
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedCodes([]);
    setWrongFlash(null);
    setLineMap({});
  }, []);

  const startSession = useCallback(
    (customPairs?: Country[]) => {
      const source = customPairs || overrideCountries;
      if (source && source.length > 0) {
        setBoards([source]);
        setBoardIndex(0);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setMistakes(0);
        setDiscovered([]);
        setTimeLeft(75);
        setPaused(false);
        startRef.current = Date.now();
        loadBoard(source);
        setPhase('playing');
        return;
      }

      AudioManager.playClick();
      const pool = getCountriesForDifficulty(difficulty);
      const boardCount = pairSetting === 5 ? 2 : 2;
      const totalNeeded = pairSetting * boardCount;
      const chosen = pickQuestionSet(pool, Math.min(totalNeeded, pool.length));
      const nextBoards: Country[][] = [];
      for (let i = 0; i < chosen.length; i += pairSetting) {
        const slice = chosen.slice(i, i + pairSetting);
        if (slice.length >= 4) nextBoards.push(slice);
      }

      setBoards(nextBoards);
      setBoardIndex(0);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setMistakes(0);
      setDiscovered([]);
      setTimeLeft(pairSetting === 5 ? 75 : pairSetting === 7 ? 105 : 135);
      setPaused(false);
      startRef.current = Date.now();
      if (nextBoards[0]) loadBoard(nextBoards[0]);
      setPhase('playing');
    },
    [difficulty, loadBoard, overrideCountries, pairSetting]
  );

  useEffect(() => {
    if (overrideCountries && overrideCountries.length > 0) {
      startSession(overrideCountries);
    }
  }, [overrideCountries, startSession]);

  const totalPairsAllBoards = boards.reduce((sum, b) => sum + b.length, 0);

  const completeSession = useCallback(
    (finalScore: number, completedPairsCount: number, finalBestStreak: number, finalDiscovered: string[]) => {
      if (onEmbeddedComplete) {
        onEmbeddedComplete(completedPairsCount, totalPairsAllBoards, finalScore);
        return;
      }
      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      const timeBonus = timeLeft > 0 ? timeLeft * 10 : 0;
      const totalScore = finalScore + timeBonus;
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score: totalScore,
        correctCount: completedPairsCount,
        totalCount: totalPairsAllBoards,
        difficulty,
      });
      AudioManager.playVictory();
      onFinish({
        modeId: 'flag-match',
        score: totalScore,
        correctCount: completedPairsCount,
        totalCount: totalPairsAllBoards,
        bestStreak: finalBestStreak,
        durationSeconds,
        xpEarned,
        coinsEarned,
        discoveredCodes: finalDiscovered,
        isPerfect: completedPairsCount === totalPairsAllBoards && mistakes === 0,
        isTimed: true,
        difficulty,
      });
    },
    [difficulty, mistakes, onEmbeddedComplete, onFinish, timeLeft, totalPairsAllBoards]
  );

  // Measure line anchor coordinates cleanly on layout / resize
  const recomputeLines = useCallback(() => {
    const container = boardRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const nextMap: Record<string, LineCoords> = {};

    for (const code of matchedCodes) {
      const lEl = leftAnchorRefs.current[code];
      const rEl = rightAnchorRefs.current[code];
      if (!lEl || !rEl) continue;
      const lr = lEl.getBoundingClientRect();
      const rr = rEl.getBoundingClientRect();
      nextMap[code] = {
        x1: lr.left + lr.width / 2 - rect.left,
        y1: lr.top + lr.height / 2 - rect.top,
        x2: rr.left + rr.width / 2 - rect.left,
        y2: rr.top + rr.height / 2 - rect.top,
      };
    }
    setLineMap(nextMap);
  }, [matchedCodes]);

  useLayoutEffect(() => {
    recomputeLines();
    window.addEventListener('resize', recomputeLines);
    return () => window.removeEventListener('resize', recomputeLines);
  }, [recomputeLines, boardIndex, leftItems, rightItems]);

  const attemptPair = useCallback(
    (leftCode: string, rightCode: string) => {
      if (matchedCodes.includes(leftCode) || matchedCodes.includes(rightCode)) return;

      if (leftCode === rightCode) {
        const nextStreak = streak + 1;
        const pts = 130 + Math.min(nextStreak, 8) * 30;
        const nextScore = score + pts;
        const nextMatched = [...matchedCodes, leftCode];
        const nextBest = Math.max(bestStreak, nextStreak);
        const nextDiscovered = discovered.includes(leftCode) ? discovered : [...discovered, leftCode];

        AudioManager.playCorrect(nextStreak);
        setScore(nextScore);
        setStreak(nextStreak);
        setBestStreak(nextBest);
        setMatchedCodes(nextMatched);
        setDiscovered(nextDiscovered);
        setSelectedLeft(null);
        setSelectedRight(null);

        const currentBoard = boards[boardIndex];
        if (currentBoard && nextMatched.length >= currentBoard.length) {
          window.setTimeout(() => {
            if (boardIndex + 1 < boards.length) {
              const nextB = boardIndex + 1;
              setBoardIndex(nextB);
              loadBoard(boards[nextB]);
            } else {
              completeSession(nextScore, totalPairsAllBoards, nextBest, nextDiscovered);
            }
          }, 520);
        }
      } else {
        AudioManager.playWrong();
        setStreak(0);
        setMistakes((m) => m + 1);
        setWrongFlash({ left: leftCode, right: rightCode });
        setSelectedLeft(null);
        setSelectedRight(null);
        window.setTimeout(() => setWrongFlash(null), 460);
      }
    },
    [
      bestStreak,
      boardIndex,
      boards,
      completeSession,
      discovered,
      loadBoard,
      matchedCodes,
      score,
      streak,
      totalPairsAllBoards,
    ]
  );

  // Pointer drag connection handling
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: PointerEvent) => {
      const container = boardRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              curX: e.clientX - rect.left,
              curY: e.clientY - rect.top,
            }
          : null
      );
    };

    const onUp = (e: PointerEvent) => {
      const hitEl = document.elementFromPoint(e.clientX, e.clientY);
      const targetBtn = hitEl?.closest('[data-match-side]') as HTMLElement | null;
      if (targetBtn) {
        const targetSide = targetBtn.dataset.matchSide as 'left' | 'right';
        const targetCode = targetBtn.dataset.matchCode;
        if (targetCode && targetSide !== dragState.fromSide) {
          const leftCode = dragState.fromSide === 'left' ? dragState.code : targetCode;
          const rightCode = dragState.fromSide === 'right' ? dragState.code : targetCode;
          attemptPair(leftCode, rightCode);
        }
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState, attemptPair]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          const solvedSoFar =
            boards.slice(0, boardIndex).reduce((s, b) => s + b.length, 0) + matchedCodes.length;
          completeSession(score, solvedSoFar, bestStreak, discovered);
          return 0;
        }
        if (prev <= 10) AudioManager.playTickWarning();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, paused, boards, boardIndex, matchedCodes.length, score, bestStreak, discovered, completeSession]);

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

  const handleSelectLeft = (code: string) => {
    if (matchedCodes.includes(code)) return;
    AudioManager.playClick();
    if (selectedRight) {
      attemptPair(code, selectedRight);
    } else {
      setSelectedLeft((prev) => (prev === code ? null : code));
    }
  };

  const handleSelectRight = (code: string) => {
    if (matchedCodes.includes(code)) return;
    AudioManager.playClick();
    if (selectedLeft) {
      attemptPair(selectedLeft, code);
    } else {
      setSelectedRight((prev) => (prev === code ? null : code));
    }
  };

  const beginDrag = (side: 'left' | 'right', code: string, e: React.PointerEvent) => {
    if (matchedCodes.includes(code) || e.button !== 0) return;
    const container = boardRef.current;
    if (!container) return;
    const anchor =
      side === 'left' ? leftAnchorRefs.current[code] : rightAnchorRefs.current[code];
    const cRect = container.getBoundingClientRect();
    const aRect = anchor?.getBoundingClientRect();
    const startX = aRect ? aRect.left + aRect.width / 2 - cRect.left : e.clientX - cRect.left;
    const startY = aRect ? aRect.top + aRect.height / 2 - cRect.top : e.clientY - cRect.top;

    setDragState({
      fromSide: side,
      code,
      startX,
      startY,
      curX: e.clientX - cRect.left,
      curY: e.clientY - cRect.top,
    });
  };

  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-[#081022]/96 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Mode 10</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              Flag Match
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
          Connect each country name on the left to its national flag on the right by clicking pairs or dragging connection lines directly across the board.
        </p>

        <div className="mt-6">
          <div className="text-xs font-semibold text-slate-300 uppercase">Pairs Per Board (2 Boards)</div>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            {([5, 7, 10] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  setPairSetting(cnt);
                }}
                className={`rounded-xl border py-3 text-xs sm:text-sm font-bold cursor-pointer ${
                  pairSetting === cnt
                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {cnt} Pairs
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={() => startSession()}
          className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-slate-950" />
          <span>Start Flag Match</span>
        </button>
      </div>
    );
  }

  const solvedBoardsPairs =
    boards.slice(0, boardIndex).reduce((s, b) => s + b.length, 0) + matchedCodes.length;

  const makeBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.45;
    return `M ${x1} ${y1} C ${x1 + (x2 >= x1 ? dx : -dx)} ${y1}, ${x2 - (x2 >= x1 ? dx : -dx)} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <GameHudBar
        modeId="flag-match"
        progressText={`Board ${boardIndex + 1}/${boards.length} · ${solvedBoardsPairs}/${totalPairsAllBoards}`}
        score={score}
        streak={streak}
        timeLeft={timeLeft}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-4 sm:p-7 shadow-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold uppercase tracking-wider">
            <Link2 className="h-4 w-4" />
            <span>Tap pairs or drag from dot to dot to connect</span>
          </div>
          <span className="font-mono-num">
            {matchedCodes.length} / {leftItems.length} matched on this board
          </span>
        </div>

        {/* Two-Column Match Board with SVG Connection Overlay */}
        <div ref={boardRef} className="relative grid grid-cols-2 gap-6 sm:gap-16 select-none">
          {/* SVG Lines Overlay */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full z-10 overflow-visible"
            aria-hidden="true"
          >
            {Object.entries(lineMap).map(([code, coords]) => (
              <path
                key={code}
                d={makeBezier(coords.x1, coords.y1, coords.x2, coords.y2)}
                fill="none"
                stroke="#34D399"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.88"
              />
            ))}
            {dragState && (
              <path
                d={makeBezier(dragState.startX, dragState.startY, dragState.curX, dragState.curY)}
                fill="none"
                stroke="#FBBF24"
                strokeWidth="3"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Left Column: Country Names */}
          <div className="relative z-20 flex flex-col justify-between gap-2.5">
            {leftItems.map((country) => {
              const isMatched = matchedCodes.includes(country.code);
              const isSel = selectedLeft === country.code;
              const isWrong = wrongFlash?.left === country.code;

              return (
                <button
                  key={`L-${country.code}`}
                  type="button"
                  data-match-side="left"
                  data-match-code={country.code}
                  disabled={isMatched}
                  onPointerDown={(e) => beginDrag('left', country.code, e)}
                  onClick={() => handleSelectLeft(country.code)}
                  className={`relative flex items-center justify-between gap-2 rounded-xl border px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer touch-none ${
                    isMatched
                      ? 'border-emerald-400/70 bg-emerald-950/45 text-emerald-200'
                      : isWrong
                        ? 'border-rose-500 bg-rose-500/25 text-rose-100 animate-shake'
                        : isSel
                          ? 'border-amber-400 bg-amber-400/20 text-white'
                          : 'border-slate-700/80 bg-[#0D1830] text-slate-100 hover:border-indigo-400/70'
                  }`}
                >
                  <span className="truncate">{country.name}</span>
                  <span
                    ref={(el) => {
                      leftAnchorRefs.current[country.code] = el;
                    }}
                    className={`h-3 w-3 shrink-0 rounded-full border ${
                      isMatched
                        ? 'border-emerald-300 bg-emerald-400'
                        : isSel
                          ? 'border-amber-200 bg-amber-400'
                          : 'border-slate-500 bg-slate-800'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Column: Flags */}
          <div className="relative z-20 flex flex-col justify-between gap-2.5">
            {rightItems.map((country) => {
              const isMatched = matchedCodes.includes(country.code);
              const isSel = selectedRight === country.code;
              const isWrong = wrongFlash?.right === country.code;

              return (
                <button
                  key={`R-${country.code}`}
                  type="button"
                  data-match-side="right"
                  data-match-code={country.code}
                  disabled={isMatched}
                  onPointerDown={(e) => beginDrag('right', country.code, e)}
                  onClick={() => handleSelectRight(country.code)}
                  aria-label={isMatched ? `Matched flag of ${country.name}` : 'Select flag to match'}
                  className={`relative flex items-center justify-between gap-2 rounded-xl border px-3 sm:px-4 py-2 transition-all cursor-pointer touch-none ${
                    isMatched
                      ? 'border-emerald-400/70 bg-emerald-950/45'
                      : isWrong
                        ? 'border-rose-500 bg-rose-500/25 animate-shake'
                        : isSel
                          ? 'border-amber-400 bg-amber-400/20'
                          : 'border-slate-700/80 bg-[#0D1830] hover:border-indigo-400/70'
                  }`}
                >
                  <span
                    ref={(el) => {
                      rightAnchorRefs.current[country.code] = el;
                    }}
                    className={`h-3 w-3 shrink-0 rounded-full border ${
                      isMatched
                        ? 'border-emerald-300 bg-emerald-400'
                        : isSel
                          ? 'border-amber-200 bg-amber-400'
                          : 'border-slate-500 bg-slate-800'
                    }`}
                  />
                  <div className="flex flex-1 items-center justify-center">
                    <FlagImage code={country.code} size="sm" shadow={false} className="w-14 sm:w-16" />
                  </div>
                  {isMatched && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Flag Match"
          onResume={() => setPaused(false)}
          onRestart={() => startSession(overrideCountries)}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
