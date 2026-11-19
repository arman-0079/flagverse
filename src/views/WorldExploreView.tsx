import { ArrowLeft, Cloud, Compass, MapPin, MoonStar, Orbit, Radio, Search, Snowflake, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { AudioManager } from '../core/AudioManager';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import type { GlobeVisualOptions } from '../scenes/GlobeScene';
import type { Continent, Country } from '../types/game';

interface WorldExploreViewProps {
  discoveredCountries: string[];
  selectedCountry: Country | null;
  hoveredCountry: { country: Country; x: number; y: number } | null;
  visualOptions: GlobeVisualOptions;
  onChangeVisualOptions: (next: Partial<GlobeVisualOptions>) => void;
  onSelectCountry: (country: Country | null) => void;
  onBackHome: () => void;
  onPlayFlagMaster: () => void;
  onOpenCountryDetails?: (country: Country) => void;
}

const CONTINENT_HUB_TARGETS: { continent: Continent; code: string; label: string }[] = [
  { continent: 'Europe', code: 'ch', label: 'Europe' },
  { continent: 'Asia', code: 'jp', label: 'Asia' },
  { continent: 'Africa', code: 'ke', label: 'Africa' },
  { continent: 'North America', code: 'us', label: 'N. America' },
  { continent: 'South America', code: 'br', label: 'S. America' },
  { continent: 'Oceania', code: 'au', label: 'Oceania' },
];

export function WorldExploreView({
  discoveredCountries,
  selectedCountry,
  hoveredCountry,
  visualOptions,
  onChangeVisualOptions,
  onSelectCountry,
  onBackHome,
  onPlayFlagMaster,
  onOpenCountryDetails,
}: WorldExploreViewProps) {
  const [query, setQuery] = useState('');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SOVEREIGN_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.code === q
    ).slice(0, 6);
  }, [query]);

  const discoveredSet = useMemo(() => new Set(discoveredCountries), [discoveredCountries]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar Cluster (unobtrusive) */}
      <div className="flex flex-wrap items-start justify-between gap-3 pt-24 sm:pt-14">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-slate-800/90 bg-[#081022]/90 px-3.5 py-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              onBackHome();
            }}
            aria-label="Return to Game Hub"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-sm sm:text-base font-bold text-white">
              3D World Explorer
            </h1>
            <p className="text-[11px] text-slate-400">
              Drag to orbit · Scroll to zoom · Click beacons or gold landmarks
            </p>
          </div>
        </div>

        {/* Country Search */}
        <div className="pointer-events-auto relative w-full sm:w-72">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#081022]/92 px-3 py-2 shadow-xl">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Fly to country or capital..."
              aria-label="Fly to country or capital"
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-1.5 rounded-xl border border-slate-700/90 bg-[#0B152A] p-1.5 shadow-2xl">
              {searchResults.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    onSelectCountry(c);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-800/80 cursor-pointer"
                >
                  <FlagImage code={c.code} size="sm" shadow={false} className="w-7" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{c.name}</div>
                    <div className="truncate text-[11px] text-slate-400">
                      {c.capital} · {c.continent}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredCountry && !selectedCountry && (
        <div
          className="pointer-events-none fixed z-30 flex items-center gap-2 rounded-lg border border-sky-400/40 bg-[#081022]/95 px-2.5 py-1.5 shadow-xl"
          style={{
            left: Math.min(window.innerWidth - 190, hoveredCountry.x + 14),
            top: Math.max(70, hoveredCountry.y - 18),
          }}
        >
          <FlagImage code={hoveredCountry.country.code} size="sm" shadow={false} className="w-6" />
          <div className="text-xs font-semibold text-white whitespace-nowrap">
            {hoveredCountry.country.name}
          </div>
        </div>
      )}

      {/* Selected Country Inspector Card (Bottom-Left) */}
      {selectedCountry && (
        <div className="pointer-events-auto max-w-sm rounded-2xl border border-amber-400/35 bg-[#081022]/94 p-4 sm:p-5 shadow-2xl mb-16 sm:mb-20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <FlagImage code={selectedCountry.code} size="md" className="w-16 shrink-0" />
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  {selectedCountry.name}
                </h2>
                <p className="text-xs text-sky-300">
                  Capital: <strong className="text-white">{selectedCountry.capital}</strong>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {selectedCountry.region} · {selectedCountry.continent}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectCountry(null)}
              aria-label="Close country card"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-300">{selectedCountry.fact}</p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-[11px]">
            <span
              className={
                discoveredSet.has(selectedCountry.code) ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }
            >
              {discoveredSet.has(selectedCountry.code) ? 'Discovered in Atlas' : 'Not Yet Mastered'}
            </span>
            <div className="flex items-center gap-3">
              {onOpenCountryDetails && (
                <button
                  type="button"
                  onClick={() => onOpenCountryDetails(selectedCountry)}
                  className="font-semibold text-sky-300 hover:text-sky-200 cursor-pointer"
                >
                  Atlas Details →
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  onPlayFlagMaster();
                }}
                className="font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                Play Flag Master →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="pointer-events-auto mx-auto flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/80 bg-[#081022]/94 px-3 py-1 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
        >
          <Compass className="h-3.5 w-3.5 text-amber-400" />
          <span>{dockCollapsed ? 'Show Continent Camera Presets' : 'Hide Dock'}</span>
        </button>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-slate-800/90 bg-[#081022]/94 px-3 py-2 shadow-2xl">
            {CONTINENT_HUB_TARGETS.map((item) => {
              const target = SOVEREIGN_COUNTRIES.find((c) => c.code === item.code);
              return (
                <button
                  key={item.continent}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    if (target) onSelectCountry(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400/50 hover:text-sky-200 cursor-pointer whitespace-nowrap"
                >
                  <MapPin className="h-3 w-3 text-sky-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <span aria-hidden="true" className="hidden sm:inline-block h-5 w-px bg-slate-700/80 mx-1" />

            <button
              type="button"
              aria-pressed={visualOptions.showClouds}
              onClick={() => {
                AudioManager.playClick();
                onChangeVisualOptions({ showClouds: !visualOptions.showClouds });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                visualOptions.showClouds
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                  : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white'
              }`}
            >
              <Cloud className="h-3 w-3" />
              <span>Clouds</span>
            </button>

            <button
              type="button"
              aria-pressed={visualOptions.showSnow}
              onClick={() => {
                AudioManager.playClick();
                onChangeVisualOptions({ showSnow: !visualOptions.showSnow });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                visualOptions.showSnow
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                  : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white'
              }`}
            >
              <Snowflake className="h-3 w-3" />
              <span>Snow &amp; Ice</span>
            </button>

            <button
              type="button"
              aria-pressed={visualOptions.showNightLights}
              onClick={() => {
                AudioManager.playClick();
                onChangeVisualOptions({ showNightLights: !visualOptions.showNightLights });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                visualOptions.showNightLights
                  ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                  : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white'
              }`}
            >
              <MoonStar className="h-3 w-3" />
              <span>City Lights</span>
            </button>

            <button
              type="button"
              aria-pressed={visualOptions.showArcs}
              onClick={() => {
                AudioManager.playClick();
                onChangeVisualOptions({ showArcs: !visualOptions.showArcs });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                visualOptions.showArcs
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                  : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="h-3 w-3" />
              <span>Data Arcs</span>
            </button>

            <button
              type="button"
              aria-pressed={visualOptions.autoSpin}
              onClick={() => {
                AudioManager.playClick();
                onChangeVisualOptions({ autoSpin: !visualOptions.autoSpin });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                visualOptions.autoSpin
                  ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                  : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white'
              }`}
            >
              <Orbit className="h-3 w-3" />
              <span>Orbit Spin</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
