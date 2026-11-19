import {
  Calendar,
  Compass,
  Flame,
  Gamepad2,
  Globe,
  Grid2x2,
  Hammer,
  HelpCircle,
  Landmark,
  Layers,
  Link2,
  MapPin,
  Play,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { AudioManager } from '../core/AudioManager';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { GAME_MODES } from '../data/modes';
import { getUtcDateKey, getXpProgressInLevel } from '../systems/scoring';
import type { Difficulty, GameModeId, PlayerSaveData } from '../types/game';

interface MainMenuHubProps {
  saveData: PlayerSaveData;
  selectedDifficulty: Difficulty;
  onChangeDifficulty: (d: Difficulty) => void;
  onStartMode: (modeId: GameModeId) => void;
  onOpenOnlineArena: () => void;
  onExploreWorld: () => void;
  onOpenDailyReward: () => void;
  canClaimReward: boolean;
}

type CategoryFilter = 'All' | 'Flag' | 'Geography' | 'Puzzle' | 'Arcade' | 'Daily';

const MODE_ICONS: Record<GameModeId, typeof Gamepad2> = {
  'flag-master': Shield,
  'country-to-flag': Sparkles,
  'world-map': MapPin,
  'capital-hunter': Landmark,
  'flag-memory': Grid2x2,
  'flag-builder': Hammer,
  'country-silhouette': Compass,
  'flag-battle': Flame,
  'true-false': HelpCircle,
  'flag-match': Link2,
  'continent-quest': Layers,
  'daily-challenge': Calendar,
};

function ModeArtwork({ modeId, accent }: { modeId: GameModeId; accent: string }) {
  // Distinctive custom SVG vignette artwork per mode card
  switch (modeId) {
    case 'flag-master':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="4" y="6" width="52" height="34" rx="4" fill="#0F172A" stroke={accent} strokeWidth="1.5" />
          <rect x="8" y="10" width="44" height="8" fill="#E5B84B" fillOpacity="0.85" />
          <rect x="8" y="18" width="44" height="9" fill="#F8FAFC" fillOpacity="0.9" />
          <rect x="8" y="27" width="44" height="9" fill="#38BDF8" fillOpacity="0.85" />
          <circle cx="64" cy="34" r="10" fill="#0B1325" stroke={accent} strokeWidth="1.5" />
          <path d="M60 34l3 3 5-6" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'country-to-flag':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="6" y="8" width="28" height="20" rx="3" fill="#0F172A" stroke={accent} strokeWidth="1.4" />
          <rect x="46" y="8" width="28" height="20" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="1.2" />
          <circle cx="20" cy="18" r="5" fill={accent} />
          <path d="M16 36h48" stroke={accent} strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      );
    case 'world-map':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="4" y="5" width="72" height="38" rx="5" fill="#091B30" stroke={accent} strokeOpacity="0.55" strokeWidth="1.4" />
          <path d="M14 18c6-5 15-4 20 1s12 2 18-3 12 4 14 11-8 10-16 8-14 5-22 2-18-13-14-19z" fill={accent} fillOpacity="0.28" stroke={accent} strokeWidth="1.2" />
          <circle cx="48" cy="22" r="4" fill={accent} />
          <circle cx="48" cy="22" r="8" fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );
    case 'capital-hunter':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <path d="M14 38h52M18 38V22m14 16V22m16 16V22m14 16V22M12 22h56L40 8z" fill="none" stroke={accent} strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="40" cy="16" r="3" fill={accent} />
        </svg>
      );
    case 'flag-memory':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="10" y="6" width="24" height="34" rx="4" fill="#1E1B4B" stroke={accent} strokeWidth="1.5" />
          <rect x="44" y="10" width="24" height="34" rx="4" fill="#0F172A" stroke={accent} strokeOpacity="0.65" strokeWidth="1.5" />
          <circle cx="22" cy="23" r="5" fill={accent} />
          <path d="M51 22l10 10m0-10l-10 10" stroke={accent} strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'flag-builder':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="8" y="8" width="50" height="32" rx="4" fill="#0F172A" stroke={accent} strokeWidth="1.5" />
          <rect x="12" y="12" width="14" height="24" fill="#FB7185" />
          <rect x="26" y="12" width="14" height="24" fill="#F8FAFC" />
          <rect x="40" y="12" width="14" height="24" fill="#38BDF8" stroke="#E5B84B" strokeDasharray="2 2" strokeWidth="1" />
          <circle cx="65" cy="14" r="5" fill="#FB7185" />
          <circle cx="65" cy="27" r="5" fill="#FBBF24" />
        </svg>
      );
    case 'country-silhouette':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <path d="M22 10l18-3 14 9 7 15-12 10-18-4-11 4-6-13z" fill={accent} fillOpacity="0.24" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="40" cy="24" r="2.5" fill={accent} />
        </svg>
      );
    case 'flag-battle':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <path d="M44 6L24 27h14l-4 15 22-22H42z" fill={accent} fillOpacity="0.28" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'true-false':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="8" y="10" width="28" height="28" rx="6" fill="#064E3B" stroke="#34D399" strokeWidth="1.5" />
          <path d="M16 24l4 4 8-8" stroke="#34D399" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <rect x="44" y="10" width="28" height="28" rx="6" fill="#4C0519" stroke="#FB7185" strokeWidth="1.5" />
          <path d="M52 18l12 12m0-12L52 30" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'flag-match':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="8" y="9" width="20" height="10" rx="2" fill="#1E293B" stroke={accent} strokeWidth="1.4" />
          <rect x="8" y="29" width="20" height="10" rx="2" fill="#1E293B" stroke="#64748B" strokeWidth="1.2" />
          <rect x="52" y="9" width="20" height="10" rx="2" fill="#1E293B" stroke="#64748B" strokeWidth="1.2" />
          <rect x="52" y="29" width="20" height="10" rx="2" fill="#1E293B" stroke={accent} strokeWidth="1.4" />
          <path d="M28 14C40 14 40 34 52 34" stroke={accent} strokeWidth="1.8" fill="none" />
        </svg>
      );
    case 'continent-quest':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <circle cx="24" cy="24" r="14" fill="none" stroke={accent} strokeWidth="1.5" />
          <circle cx="56" cy="24" r="14" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          <path d="M36 24h8m-4-4l4 4-4 4" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'daily-challenge':
      return (
        <svg viewBox="0 0 80 48" className="h-11 w-16 shrink-0" aria-hidden="true">
          <rect x="14" y="8" width="52" height="34" rx="5" fill="#1E1B10" stroke={accent} strokeWidth="1.6" />
          <path d="M14 18h52" stroke={accent} strokeWidth="1.3" />
          <polygon points="40,22 42.5,28 49,28.5 44,32.5 45.5,38.5 40,35 34.5,38.5 36,32.5 31,28.5 37.5,28" fill={accent} />
        </svg>
      );
  }
}

export function MainMenuHub({
  saveData,
  selectedDifficulty,
  onChangeDifficulty,
  onStartMode,
  onOpenOnlineArena,
  onExploreWorld,
  onOpenDailyReward,
  canClaimReward,
}: MainMenuHubProps) {
  const [category, setCategory] = useState<CategoryFilter>('All');
  const todayKey = getUtcDateKey();
  const dailyDoneToday = saveData.dailyChallenge.lastCompletedDate === todayKey;
  const xpInfo = getXpProgressInLevel(saveData.xp);

  const filteredModes =
    category === 'All' ? GAME_MODES : GAME_MODES.filter((m) => m.category === category);

  const categories: CategoryFilter[] = ['All', 'Flag', 'Geography', 'Puzzle', 'Arcade', 'Daily'];
  const difficulties: { id: Difficulty; label: string }[] = [
    { id: 'easy', label: 'Easy' },
    { id: 'medium', label: 'Medium' },
    { id: 'hard', label: 'Hard' },
    { id: 'expert', label: 'Expert' },
  ];

  return (
    <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-8 sm:pt-10 pointer-events-none">
      {/* Hero Section staged over live 3D Earth on the right */}
      <section className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 min-h-[400px] sm:min-h-[440px]">
        <div className="lg:col-span-7 pointer-events-auto">
          <div className="rounded-2xl border border-slate-800/80 bg-[#070E1E]/86 p-6 sm:p-8 shadow-2xl max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
              Interactive World Flag &amp; Geography Arena
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl text-balance leading-[1.08]">
              THE WORLD IS YOUR PLAYGROUND
            </h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-300 leading-relaxed">
              Discover countries, master flags and challenge your geography knowledge across 12 distinct game modes and 195 sovereign nations.
            </p>

            {/* Primary Action Trio */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={() => {
                  AudioManager.playClick();
                  onStartMode('flag-master');
                }}
                className="inline-flex items-center gap-2.5 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold tracking-wide text-slate-950 shadow-lg hover:bg-amber-300 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                <span>PLAY NOW</span>
              </button>

              <button
                type="button"
                data-testid="hub-online-1v1-btn"
                onClick={() => {
                  AudioManager.playClick();
                  onOpenOnlineArena();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/55 bg-emerald-500/18 px-5 py-3.5 text-sm font-bold text-emerald-200 hover:bg-emerald-500/28 hover:border-emerald-300 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Swords className="h-4 w-4 text-emerald-300" />
                <span>ONLINE 1v1</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  onExploreWorld();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/45 bg-sky-500/15 px-5 py-3.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 hover:border-sky-300 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Globe className="h-4 w-4 text-sky-300" />
                <span>EXPLORE WORLD</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  onStartMode('daily-challenge');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/35 bg-slate-900/90 px-5 py-3.5 text-sm font-semibold text-amber-200 hover:border-amber-300 hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Calendar className="h-4 w-4 text-amber-400" />
                <span>{dailyDoneToday ? 'DAILY COMPLETE' : 'DAILY CHALLENGE'}</span>
              </button>
            </div>

            {/* Clean unboxed progression summary */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-800/80 pt-4 text-xs text-slate-300">
              <span className="font-mono-num">
                <strong className="text-white">{saveData.discoveredCountries.length}</strong> / {SOVEREIGN_COUNTRIES.length} Countries Discovered
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono-num">
                Level <strong className="text-amber-300">{xpInfo.level}</strong> ({xpInfo.pct}% to next)
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono-num">
                Daily Streak <strong className="text-sky-300">{saveData.dailyChallenge.streak}d</strong>
              </span>
              {canClaimReward && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      AudioManager.playClick();
                      onOpenDailyReward();
                    }}
                    className="font-semibold text-amber-300 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-200 cursor-pointer"
                  >
                    Claim Daily Reward
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right spacer intentionally leaves the 3D Earth & Orbital Flags unobstructed */}
        <div className="hidden lg:block lg:col-span-5" aria-hidden="true" />
      </section>

      {/* Online 1v1 Multiplayer Banner */}
      <section className="mt-8 pointer-events-auto rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-[#0A182E]/95 via-[#0B1E36]/95 to-[#091529]/95 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/45 bg-emerald-500/15 text-emerald-300">
              <Swords className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                Real-Time Multiplayer · 1v1 Head-to-Head
              </p>
              <h2 className="mt-0.5 font-display text-lg sm:text-xl font-extrabold text-white">
                Online 1v1 Battle Arena — Quick Match &amp; Friend Code Rooms
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
                Battle a random player in a timed duel with random mode selection, or add a friend by 6-character code, pick your favorite mode, and compete for the highest score!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              onOpenOnlineArena();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-emerald-300 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Users className="h-4 w-4" />
            <span>ENTER 1v1 ARENA</span>
          </button>
        </div>
      </section>

      {/* Game Mode Selection Section */}
      <section className="mt-6 pointer-events-auto rounded-2xl border border-slate-800/80 bg-[#070E1E]/92 p-5 sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Select Game Mode
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
              12 distinct flag, map, capital, puzzle, and arcade experiences
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Difficulty Selector */}
            <div
              className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0B152A] p-1"
              role="group"
              aria-label="Global difficulty selector"
            >
              {difficulties.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    onChangeDifficulty(d.id);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDifficulty === d.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Mode categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              onClick={() => {
                AudioManager.playClick();
                setCategory(cat);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                category === cat
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat === 'All' ? 'All 12 Modes' : cat}
            </button>
          ))}
        </div>

        {/* 12 Mode Cards Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredModes.map((mode) => {
            const Icon = MODE_ICONS[mode.id];
            const bestScore = saveData.bestScores[mode.id] ?? 0;
            const played = saveData.gamesPlayed[mode.id] ?? 0;

            return (
              <button
                key={mode.id}
                type="button"
                data-testid={`mode-card-${mode.id}`}
                onClick={() => {
                  AudioManager.playClick();
                  onStartMode(mode.id);
                }}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0B152A] p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-400/45 hover:bg-[#0F1C36] active:scale-[0.985] cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <ModeArtwork modeId={mode.id} accent={mode.accentColor} />
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/90 text-slate-300 group-hover:text-amber-300 transition-colors">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {mode.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {mode.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                  <span className="font-medium text-slate-300">
                    {mode.difficultyLabel} · {mode.estimatedTime}
                  </span>
                  <span className="font-mono-num text-amber-300/90">
                    {played > 0 ? `Best ${bestScore.toLocaleString()}` : 'Play →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
