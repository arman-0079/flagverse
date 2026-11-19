import { ArrowRight, Check, RotateCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { COUNTRY_BY_CODE } from '../data/countries';
import { FLAG_PUZZLES, type EmblemType, type FlagPuzzleSpec } from '../data/flagPuzzles';
import { evaluateFlagBuilder } from '../systems/gameLogic';
import { calculateSessionRewards, seededShuffle } from '../systems/scoring';
import type { Difficulty, GameSessionResult } from '../types/game';

interface FlagBuilderModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult, extra?: { flagBuilderSolvedDelta?: number }) => void;
  onExit: () => void;
  overridePuzzles?: FlagPuzzleSpec[];
  onEmbeddedComplete?: (correctCount: number, totalCount: number, score: number) => void;
}

export function renderEmblemSvg(type: EmblemType, color: string, rotation = 0) {
  const transform = `rotate(${rotation} 150 100)`;
  switch (type) {
    case 'none':
      return null;
    case 'disc':
      return <circle cx="150" cy="100" r="46" fill={color} />;
    case 'disc-offset':
      return <circle cx="128" cy="100" r="48" fill={color} />;
    case 'star-5':
      return (
        <polygon
          transform={transform}
          points="150,56 161,88 195,88 167,108 178,140 150,120 122,140 133,108 105,88 139,88"
          fill={color}
        />
      );
    case 'star-6':
      return (
        <g transform={transform} fill="none" stroke={color} strokeWidth="6">
          <polygon points="150,58 184,118 116,118" />
          <polygon points="150,142 184,82 116,82" />
        </g>
      );
    case 'crescent-star':
      return (
        <g transform={transform} fill={color}>
          <path d="M148 56a44 44 0 1 0 0 88 35 35 0 1 1 0-88z" />
          <polygon points="174,82 179,95 193,95 182,103 186,116 174,108 162,116 166,103 155,95 169,95" />
        </g>
      );
    case 'diamond':
      return (
        <g>
          <polygon points="150,24 268,100 150,176 32,100" fill={color} />
          <circle cx="150" cy="100" r="34" fill="#002776" />
          <path d="M117 94c22-7 45-4 66 9" stroke="#FFFFFF" strokeWidth="5" fill="none" />
        </g>
      );
    case 'maple-leaf':
      return (
        <path
          fill={color}
          d="M150 48l-7 17-15-5 8 24-18-6 4 11-16 5 18 14-4 10 25-3-2 27h14l-2-27 25 3-4-10 18-14-16-5 4-11-18 6 8-24-15 5z"
        />
      );
    case 'cedar':
      return (
        <g fill={color}>
          <polygon points="150,55 122,102 135,102 112,130 188,130 165,102 178,102" />
          <rect x="143" y="128" width="14" height="17" />
        </g>
      );
    case 'sun':
    case 'circle-sun':
      return (
        <g fill={color}>
          <circle cx="150" cy="100" r="24" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <polygon
              key={deg}
              points="150,62 145,74 155,74"
              transform={`rotate(${deg} 150 100)`}
            />
          ))}
        </g>
      );
  }
}

export function FlagBuilderMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
  overridePuzzles,
  onEmbeddedComplete,
}: FlagBuilderModeProps) {
  const totalRounds = overridePuzzles ? overridePuzzles.length : 5;
  const [puzzles, setPuzzles] = useState<FlagPuzzleSpec[]>([]);
  const [pIndex, setPIndex] = useState(0);

  const [placedZones, setPlacedZones] = useState<string[]>([]);
  const [activeBrushColor, setActiveBrushColor] = useState<string>('#FFFFFF');
  const [placedEmblem, setPlacedEmblem] = useState<EmblemType>('none');
  const [placedEmblemColor, setPlacedEmblemColor] = useState<string>('#FFFFFF');
  const [placedRotation, setPlacedRotation] = useState<number>(0);

  const [verification, setVerification] = useState<ReturnType<typeof evaluateFlagBuilder> | null>(null);
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [hintVisible, setHintVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  const startRef = useRef(Date.now());

  const initPuzzleState = useCallback((p: FlagPuzzleSpec) => {
    setPlacedZones(p.targetZones.map(() => '#1E293B'));
    setActiveBrushColor(p.palette[0]?.hex || '#FFFFFF');
    setPlacedEmblem('none');
    setPlacedEmblemColor(p.palette[1]?.hex || p.palette[0]?.hex || '#FFFFFF');
    setPlacedRotation(0);
    setVerification(null);
    setHintVisible(false);
  }, []);

  const startNewGame = useCallback(() => {
    let pool = overridePuzzles;
    if (!pool) {
      const filtered =
        difficulty === 'easy'
          ? FLAG_PUZZLES.filter((p) => p.difficulty === 'easy')
          : difficulty === 'medium'
            ? FLAG_PUZZLES.filter((p) => p.difficulty !== 'hard')
            : FLAG_PUZZLES;
      pool = seededShuffle(filtered.length >= 5 ? filtered : FLAG_PUZZLES).slice(0, 5);
    }
    setPuzzles(pool);
    setPIndex(0);
    setScore(0);
    setSolvedCount(0);
    setDiscovered([]);
    setPaused(false);
    startRef.current = Date.now();
    if (pool[0]) initPuzzleState(pool[0]);
  }, [difficulty, initPuzzleState, overridePuzzles]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const puzzle = puzzles[pIndex];
  const country = puzzle ? COUNTRY_BY_CODE[puzzle.countryCode] : undefined;

  const paintZone = (zoneIdx: number, colorHex: string) => {
    if (verification) return;
    AudioManager.playClick();
    setPlacedZones((prev) => prev.map((c, idx) => (idx === zoneIdx ? colorHex : c)));
  };

  const handleVerify = () => {
    if (!puzzle || verification) return;
    const res = evaluateFlagBuilder(
      puzzle,
      placedZones,
      placedEmblem,
      placedEmblemColor,
      placedRotation
    );
    setVerification(res);
    if (res.isCorrect) {
      AudioManager.playCorrect(solvedCount + 1);
      setScore((s) => s + (hintVisible ? 200 : 260));
      setSolvedCount((c) => c + 1);
      setDiscovered((prev) =>
        prev.includes(puzzle.countryCode) ? prev : [...prev, puzzle.countryCode]
      );
    } else {
      AudioManager.playWrong();
      setScore((s) => s + Math.round(res.accuracyPct * 0.8));
    }
  };

  const handleNext = () => {
    AudioManager.playClick();
    if (pIndex + 1 >= puzzles.length) {
      if (onEmbeddedComplete) {
        onEmbeddedComplete(solvedCount, puzzles.length, score);
        return;
      }
      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      const { xpEarned, coinsEarned } = calculateSessionRewards({
        score,
        correctCount: solvedCount,
        totalCount: puzzles.length,
        difficulty,
      });
      AudioManager.playVictory();
      onFinish(
        {
          modeId: 'flag-builder',
          score,
          correctCount: solvedCount,
          totalCount: puzzles.length,
          bestStreak: solvedCount,
          durationSeconds,
          xpEarned,
          coinsEarned,
          discoveredCodes: discovered,
          isPerfect: solvedCount === puzzles.length,
          isTimed: false,
          difficulty,
        },
        { flagBuilderSolvedDelta: solvedCount }
      );
      return;
    }
    const nextIdx = pIndex + 1;
    setPIndex(nextIdx);
    initPuzzleState(puzzles[nextIdx]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!puzzle || !country) return null;

  const renderInteractiveZones = () => {
    const z = placedZones;
    const zoneProps = (idx: number) => {
      const isUnpainted = (z[idx] || '#1E293B') === '#1E293B';
      return {
        fill: z[idx] || '#1E293B',
        stroke: !verification && isUnpainted ? 'rgba(148, 163, 184, 0.45)' : 'none',
        strokeWidth: !verification && isUnpainted ? 1.5 : 0,
        strokeDasharray: !verification && isUnpainted ? '5 4' : undefined,
        className: 'cursor-pointer transition-opacity hover:opacity-90',
        onClick: () => paintZone(idx, activeBrushColor),
        onDragOver: (e: React.DragEvent) => e.preventDefault(),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          const droppedColor = e.dataTransfer.getData('text/plain');
          if (droppedColor) paintZone(idx, droppedColor);
        },
      };
    };

    switch (puzzle.layout) {
      case 'solid':
        return <rect x="0" y="0" width="300" height="200" {...zoneProps(0)} />;
      case 'h-bicolor':
        return (
          <>
            <rect x="0" y="0" width="300" height="100" {...zoneProps(0)} />
            <rect x="0" y="100" width="300" height="100" {...zoneProps(1)} />
          </>
        );
      case 'h-tricolor':
        return (
          <>
            <rect x="0" y="0" width="300" height="66.7" {...zoneProps(0)} />
            <rect x="0" y="66.7" width="300" height="66.7" {...zoneProps(1)} />
            <rect x="0" y="133.4" width="300" height="66.7" {...zoneProps(2)} />
          </>
        );
      case 'h-triband-121':
        return (
          <>
            <rect x="0" y="0" width="300" height="50" {...zoneProps(0)} />
            <rect x="0" y="50" width="300" height="100" {...zoneProps(1)} />
            <rect x="0" y="150" width="300" height="50" {...zoneProps(2)} />
          </>
        );
      case 'v-tricolor':
        return (
          <>
            <rect x="0" y="0" width="100" height="200" {...zoneProps(0)} />
            <rect x="100" y="0" width="100" height="200" {...zoneProps(1)} />
            <rect x="200" y="0" width="100" height="200" {...zoneProps(2)} />
          </>
        );
      case 'v-tricolor-121':
        return (
          <>
            <rect x="0" y="0" width="75" height="200" {...zoneProps(0)} />
            <rect x="75" y="0" width="150" height="200" {...zoneProps(1)} />
            <rect x="225" y="0" width="75" height="200" {...zoneProps(2)} />
          </>
        );
      case 'nordic-cross':
        return (
          <>
            <rect x="0" y="0" width="300" height="200" {...zoneProps(0)} />
            <g {...zoneProps(1)}>
              <rect x="82" y="0" width="44" height="200" />
              <rect x="0" y="78" width="300" height="44" />
            </g>
            <g {...zoneProps(2)}>
              <rect x="92" y="0" width="24" height="200" />
              <rect x="0" y="88" width="300" height="24" />
            </g>
          </>
        );
      case 'symmetric-cross':
        return (
          <>
            <rect x="0" y="0" width="300" height="200" {...zoneProps(0)} />
            <g {...zoneProps(1)}>
              <rect x="128" y="36" width="44" height="128" />
              <rect x="86" y="78" width="128" height="44" />
            </g>
          </>
        );
      case 'hoist-triangle':
        return (
          <>
            <rect x="0" y="0" width="300" height="100" {...zoneProps(0)} />
            <rect x="0" y="100" width="300" height="100" {...zoneProps(1)} />
            <polygon points="0,0 150,100 0,200" {...zoneProps(2)} />
          </>
        );
      case 'hoist-band-h2':
        return (
          <>
            <rect x="75" y="0" width="225" height="66.7" {...zoneProps(1)} />
            <rect x="75" y="66.7" width="225" height="66.7" {...zoneProps(2)} />
            <rect x="75" y="133.4" width="225" height="66.7" {...zoneProps(3)} />
            <rect x="0" y="0" width="75" height="200" {...zoneProps(0)} />
          </>
        );
      case 'diagonal-band':
        return (
          <>
            <polygon points="0,0 300,0 0,200" {...zoneProps(0)} />
            <polygon points="300,0 300,200 0,200" {...zoneProps(3)} />
            <polygon points="0,165 250,0 300,0 300,35 50,200 0,200" {...zoneProps(1)} />
            <polygon points="0,180 272,0 300,0 300,20 28,200 0,200" {...zoneProps(2)} />
          </>
        );
      case 'saltire':
        return (
          <>
            <polygon points="0,0 150,100 300,0" {...zoneProps(0)} />
            <polygon points="0,200 150,100 300,200" {...zoneProps(0)} />
            <polygon points="0,0 150,100 0,200" {...zoneProps(1)} />
            <polygon points="300,0 150,100 300,200" {...zoneProps(1)} />
            <path d="M0 0L300 200M300 0L0 200" stroke={z[2] || '#1E293B'} strokeWidth="26" className="cursor-pointer" onClick={() => paintZone(2, activeBrushColor)} />
          </>
        );
      default:
        return <rect x="0" y="0" width="300" height="200" {...zoneProps(0)} />;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <GameHudBar
        modeId="flag-builder"
        progressText={`${pIndex + 1} / ${totalRounds}`}
        score={score}
        hintAvailable
        hintUsed={hintVisible || verification !== null}
        onHint={() => setHintVisible(true)}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-rose-300 uppercase">
              Reconstruct the National Flag of
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              {country.name}
            </h2>
            {hintVisible && <p className="mt-1 text-xs text-amber-300">Hint: {puzzle.hint}</p>}
          </div>
          <div className="text-xs text-slate-400">
            Select or drag a swatch onto each zone below
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Flag Canvas */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[380px] rounded-xl border-2 border-slate-700/80 bg-[#050B16] p-3 shadow-xl">
              <svg
                viewBox="0 0 300 200"
                className="w-full rounded-md shadow-lg select-none"
                role="img"
                aria-label={`Interactive flag builder canvas for ${country.name}`}
              >
                {renderInteractiveZones()}
                {/* Crisp subtle zone guide dashed outlines before submit */}
                {!verification && (
                  <rect
                    x="0"
                    y="0"
                    width="300"
                    height="200"
                    fill="none"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2"
                  />
                )}
                <g pointerEvents="none">
                  {renderEmblemSvg(placedEmblem, placedEmblemColor, placedRotation)}
                </g>
              </svg>
            </div>

            {/* Zone Quick Buttons for Accessibility & Keyboard Users */}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {puzzle.zoneLabels.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  disabled={verification !== null}
                  onClick={() => paintZone(idx, activeBrushColor)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-amber-400 cursor-pointer"
                >
                  <span
                    className="h-3 w-3 rounded-sm border border-white/30"
                    style={{ backgroundColor: placedZones[idx] }}
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tool Palette */}
          <div className="lg:col-span-5 space-y-5 rounded-xl border border-slate-800 bg-[#0B152A] p-4">
            {/* Color Swatches */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase">
                1. Flag Colors (Click or Drag)
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {puzzle.palette.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    draggable={!verification}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', swatch.hex)}
                    onClick={() => {
                      AudioManager.playClick();
                      setActiveBrushColor(swatch.hex);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                      activeBrushColor === swatch.hex
                        ? 'border-amber-400 bg-amber-400/15 text-white'
                        : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-md border border-white/25 shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="truncate">{swatch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emblem Selector */}
            {puzzle.emblemOptions.length > 1 && (
              <div>
                <div className="text-xs font-semibold text-slate-300 uppercase">
                  2. Emblem / Symbol
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {puzzle.emblemOptions.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      disabled={verification !== null}
                      onClick={() => {
                        AudioManager.playClick();
                        setPlacedEmblem(opt.type);
                      }}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold cursor-pointer ${
                        placedEmblem === opt.type
                          ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {placedEmblem !== 'none' && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Emblem Color:</span>
                      {puzzle.palette.map((sw) => (
                        <button
                          key={`emb-${sw.hex}`}
                          type="button"
                          onClick={() => setPlacedEmblemColor(sw.hex)}
                          aria-label={`Set emblem color ${sw.label}`}
                          className={`h-6 w-6 rounded-md border cursor-pointer ${
                            placedEmblemColor === sw.hex
                              ? 'border-amber-400 ring-2 ring-amber-400/50'
                              : 'border-white/25'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                    </div>

                    {(placedEmblem === 'star-5' || placedEmblem === 'crescent-star') && (
                      <button
                        type="button"
                        onClick={() => setPlacedRotation((r) => (r + 90) % 360)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 hover:border-amber-400 cursor-pointer"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>{placedRotation}°</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Submit / Clear Actions */}
            {!verification && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => initPuzzleState(puzzle)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Verify Design</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Visual Comparison Panel */}
        {verification && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#060C1A] p-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Official Flag</div>
                <FlagImage code={country.code} size="md" className="w-24" />
              </div>
              <div>
                <div
                  className={`font-display text-lg font-bold ${
                    verification.isCorrect ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {verification.isCorrect
                    ? 'Exact Match! 100% Accuracy'
                    : `Design Accuracy: ${verification.accuracyPct}%`}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{country.fact}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>{pIndex + 1 >= puzzles.length ? 'Finish Builder' : 'Next Blueprint'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="Flag Builder"
          onResume={() => setPaused(false)}
          onRestart={startNewGame}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
