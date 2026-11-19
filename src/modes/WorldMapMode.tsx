import { ArrowRight, LocateFixed, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { GameHudBar, PauseOverlayModal } from '../components/GameShell';
import { AudioManager } from '../core/AudioManager';
import { COUNTRY_BY_NUMERIC_ID, SOVEREIGN_COUNTRIES } from '../data/countries';
import { getWorldMapPaths, projectLngLat, WORLD_SVG_HEIGHT, WORLD_SVG_WIDTH } from '../data/worldGeometry';
import { getCountriesForDifficulty, pickQuestionSet } from '../systems/gameLogic';
import { calculateAnswerPoints, calculateSessionRewards } from '../systems/scoring';
import type { Continent, Country, Difficulty, GameSessionResult } from '../types/game';

interface WorldMapModeProps {
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onFinish: (result: GameSessionResult) => void;
  onExit: () => void;
}

const REGION_PRESETS: Record<Continent | 'World', { x: number; y: number; w: number; h: number }> = {
  World: { x: 0, y: 20, w: 1000, h: 460 },
  Europe: { x: 430, y: 48, w: 200, h: 120 },
  Asia: { x: 560, y: 55, w: 320, h: 210 },
  Africa: { x: 425, y: 145, w: 215, h: 205 },
  'North America': { x: 65, y: 45, w: 295, h: 215 },
  'South America': { x: 225, y: 235, w: 185, h: 210 },
  Oceania: { x: 750, y: 235, w: 245, h: 180 },
};

export function WorldMapMode({
  difficulty,
  muted,
  onToggleMute,
  onFinish,
  onExit,
}: WorldMapModeProps) {
  const totalRounds = 10;
  const mapPaths = useMemo(() => getWorldMapPaths(), []);

  const [questions, setQuestions] = useState<Country[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [viewBox, setViewBox] = useState(REGION_PRESETS.World);
  const [clickedNumericId, setClickedNumericId] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; startVb: typeof viewBox; moved: boolean }>({
    active: false,
    startX: 0,
    startY: 0,
    startVb: REGION_PRESETS.World,
    moved: false,
  });
  const startRef = useRef(Date.now());

  const startNewGame = useCallback(() => {
    const pool = getCountriesForDifficulty(difficulty);
    const qs = pickQuestionSet(pool, totalRounds);
    setQuestions(qs);
    setQIndex(0);
    setClickedNumericId(null);
    setHintUsed(false);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setDiscovered([]);
    setPaused(false);
    setViewBox(REGION_PRESETS.World);
    startRef.current = Date.now();
  }, [difficulty]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const current = questions[qIndex];

  const zoomBy = (factor: number) => {
    setViewBox((vb) => {
      const nextW = Math.max(90, Math.min(WORLD_SVG_WIDTH, vb.w * factor));
      const nextH = (nextW / WORLD_SVG_WIDTH) * WORLD_SVG_HEIGHT;
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      const nx = Math.max(0, Math.min(WORLD_SVG_WIDTH - nextW, cx - nextW / 2));
      const ny = Math.max(0, Math.min(WORLD_SVG_HEIGHT - nextH, cy - nextH / 2));
      return { x: nx, y: ny, w: nextW, h: nextH };
    });
  };

  const focusOnCountry = (country: Country) => {
    const [px, py] = projectLngLat(country.lng, country.lat);
    const w = 220;
    const h = 110;
    setViewBox({
      x: Math.max(0, Math.min(WORLD_SVG_WIDTH - w, px - w / 2)),
      y: Math.max(0, Math.min(WORLD_SVG_HEIGHT - h, py - h / 2)),
      w,
      h,
    });
  };

  const handleCountryClick = (numericId: string) => {
    if (dragRef.current.moved || !current || clickedNumericId !== null) return;
    setClickedNumericId(numericId);

    if (numericId === current.numericId) {
      const nextStreak = streak + 1;
      const pts = calculateAnswerPoints({
        basePoints: 130,
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
      focusOnCountry(current);
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
        modeId: 'world-map',
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
    setQIndex((i) => i + 1);
    setClickedNumericId(null);
    setHintUsed(false);
    setViewBox(REGION_PRESETS.World);
  };

  const handleHint = () => {
    if (!current || hintUsed || clickedNumericId !== null) return;
    setHintUsed(true);
    setViewBox(REGION_PRESETS[current.continent]);
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
  const isAnswered = clickedNumericId !== null;
  const isCorrect = clickedNumericId === current.numericId;
  const clickedCountry = clickedNumericId ? COUNTRY_BY_NUMERIC_ID[clickedNumericId] : null;

  // Small / island nations get an interactive beacon ring so touch & mouse clicks always hit cleanly
  const microCountries = SOVEREIGN_COUNTRIES.filter((c) => {
    const path = mapPaths.find((p) => p.numericId === c.numericId);
    if (!path) return true;
    return (path.maxX - path.minX) * (path.maxY - path.minY) < 42;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <GameHudBar
        modeId="world-map"
        progressText={`${qIndex + 1} / ${questions.length}`}
        score={score}
        streak={streak}
        hintAvailable
        hintUsed={hintUsed || isAnswered}
        onHint={handleHint}
        onPause={() => setPaused(true)}
        onExit={onExit}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-4 sm:p-5 shadow-2xl">
        {/* Prompt Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3.5">
            <FlagImage code={current.code} size="sm" className="w-14 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-sky-300 uppercase">
                Locate on the Map
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                {current.name}
              </h2>
              {hintUsed && (
                <p className="text-xs text-amber-300">
                  Hint: Zoomed to {current.continent} ({current.region})
                </p>
              )}
            </div>
          </div>

          {/* Region Quick-Zoom Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(REGION_PRESETS) as (Continent | 'World')[]).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  setViewBox(REGION_PRESETS[reg]);
                }}
                className="rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-sky-400 hover:text-white cursor-pointer"
              >
                {reg === 'North America' ? 'N. America' : reg === 'South America' ? 'S. America' : reg}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Pan/Zoom Map Viewport */}
        <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-800 bg-[#040B18]">
          {/* Map Zoom Toolbar */}
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => zoomBy(0.72)}
              aria-label="Zoom in map"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-[#081022]/92 text-slate-200 hover:border-amber-400 cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => zoomBy(1.38)}
              aria-label="Zoom out map"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-[#081022]/92 text-slate-200 hover:border-amber-400 cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewBox(REGION_PRESETS.World)}
              aria-label="Reset map zoom"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-[#081022]/92 text-slate-200 hover:border-amber-400 cursor-pointer"
            >
              <LocateFixed className="h-4 w-4" />
            </button>
          </div>

          {hoveredName && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-slate-700 bg-[#081022]/92 px-2.5 py-1 text-xs font-medium text-slate-200">
              {hoveredName}
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="h-[340px] sm:h-[430px] w-full touch-none select-none cursor-grab active:cursor-grabbing"
            onWheel={(e) => {
              e.preventDefault();
              zoomBy(e.deltaY > 0 ? 1.18 : 0.84);
            }}
            onPointerDown={(e) => {
              dragRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                startVb: viewBox,
                moved: false,
              };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active || !svgRef.current) return;
              const dx = e.clientX - dragRef.current.startX;
              const dy = e.clientY - dragRef.current.startY;
              if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
              const rect = svgRef.current.getBoundingClientRect();
              const scaleX = dragRef.current.startVb.w / Math.max(1, rect.width);
              const scaleY = dragRef.current.startVb.h / Math.max(1, rect.height);
              setViewBox({
                x: Math.max(
                  0,
                  Math.min(
                    WORLD_SVG_WIDTH - dragRef.current.startVb.w,
                    dragRef.current.startVb.x - dx * scaleX
                  )
                ),
                y: Math.max(
                  0,
                  Math.min(
                    WORLD_SVG_HEIGHT - dragRef.current.startVb.h,
                    dragRef.current.startVb.y - dy * scaleY
                  )
                ),
                w: dragRef.current.startVb.w,
                h: dragRef.current.startVb.h,
              });
            }}
            onPointerUp={() => {
              window.setTimeout(() => {
                dragRef.current.active = false;
                dragRef.current.moved = false;
              }, 0);
            }}
          >
            {/* Subtle ocean grid */}
            <rect x="0" y="0" width={WORLD_SVG_WIDTH} height={WORLD_SVG_HEIGHT} fill="#050E1E" />

            {/* Country Polygons */}
            {mapPaths.map((item, idx) => {
              const isTarget = item.numericId === current.numericId;
              const isClicked = item.numericId === clickedNumericId;

              let fill = '#1E3A5A';
              let stroke = '#0A192F';
              if (isAnswered) {
                if (isTarget) {
                  fill = '#10B981';
                  stroke = '#A7F3D0';
                } else if (isClicked) {
                  fill = '#EF4444';
                  stroke = '#FECACA';
                }
              }

              return (
                <path
                  key={`${item.numericId}-${idx}`}
                  d={item.d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={Math.max(0.22, viewBox.w / 1400)}
                  className="transition-colors duration-150 hover:fill-[#2C5682] cursor-pointer"
                  onMouseEnter={() => {
                    const c = COUNTRY_BY_NUMERIC_ID[item.numericId];
                    setHoveredName(c ? `${c.continent}` : item.name);
                  }}
                  onMouseLeave={() => setHoveredName(null)}
                  onClick={() => handleCountryClick(item.numericId)}
                />
              );
            })}

            {/* Microstate & Island Clickable Targets (always easy to tap) */}
            {microCountries.map((mc) => {
              const [px, py] = projectLngLat(mc.lng, mc.lat);
              const isTarget = mc.numericId === current.numericId;
              const isClicked = mc.numericId === clickedNumericId;
              const r = Math.max(2.6, viewBox.w / 145);
              return (
                <circle
                  key={`micro-${mc.code}`}
                  cx={px}
                  cy={py}
                  r={r}
                  fill={
                    isAnswered
                      ? isTarget
                        ? '#10B981'
                        : isClicked
                          ? '#EF4444'
                          : 'rgba(56, 189, 248, 0.25)'
                      : 'rgba(56, 189, 248, 0.22)'
                  }
                  stroke={isAnswered && isTarget ? '#FDE68A' : 'rgba(125, 211, 252, 0.55)'}
                  strokeWidth={r * 0.25}
                  className="cursor-pointer hover:fill-amber-400/60"
                  onClick={() => handleCountryClick(mc.numericId)}
                />
              );
            })}

            {/* Answer Reveal Beacon */}
            {isAnswered && (() => {
              const [tx, ty] = projectLngLat(current.lng, current.lat);
              const r = Math.max(4, viewBox.w / 80);
              return (
                <g pointerEvents="none">
                  <circle cx={tx} cy={ty} r={r * 1.9} fill="#10B981" fillOpacity="0.28" />
                  <circle cx={tx} cy={ty} r={r * 0.7} fill="#FBBF24" stroke="#060B16" strokeWidth={r * 0.25} />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Feedback Footer */}
        {isAnswered ? (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#060C1A] p-4">
            <div className="text-xs sm:text-sm text-slate-300">
              {isCorrect ? (
                <span className="font-bold text-emerald-400">
                  Bullseye! You pinpointed {current.name}.
                </span>
              ) : (
                <span className="font-bold text-rose-400">
                  You clicked {clickedCountry?.name || 'another territory'}. {current.name} is highlighted in emerald.
                </span>
              )}
              <span className="ml-2 text-slate-400">Capital: {current.capital}</span>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 shrink-0 cursor-pointer"
            >
              <span>{qIndex + 1 >= questions.length ? 'Finish Map Run' : 'Next Country'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="mt-3 text-center text-xs text-slate-400">
            Drag to pan, scroll or use +/- to zoom, or click a continent preset above. Microstates appear as glowing cyan markers.
          </p>
        )}
      </div>

      {paused && (
        <PauseOverlayModal
          modeTitle="World Map Challenge"
          onResume={() => setPaused(false)}
          onRestart={startNewGame}
          onQuit={onExit}
        />
      )}
    </div>
  );
}
