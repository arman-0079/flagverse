import { BookOpen, CheckCircle2, Lock, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { AudioManager } from '../core/AudioManager';
import { COUNTRIES, SOVEREIGN_COUNTRIES } from '../data/countries';
import { getWorldMapPaths, projectLngLat, WORLD_SVG_HEIGHT, WORLD_SVG_WIDTH } from '../data/worldGeometry';
import type { Continent, Country, PlayerSaveData } from '../types/game';

interface CollectionViewProps {
  saveData: PlayerSaveData;
  initialCountry?: Country | null;
  onConsumeInitialCountry?: () => void;
}

const CONTINENTS: (Continent | 'All')[] = [
  'All',
  'Europe',
  'Asia',
  'Africa',
  'North America',
  'South America',
  'Oceania',
];

export function CollectionView({
  saveData,
  initialCountry,
  onConsumeInitialCountry,
}: CollectionViewProps) {
  const [search, setSearch] = useState('');
  const [continent, setContinent] = useState<Continent | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'discovered' | 'undiscovered'>('all');
  const [includeTerritories, setIncludeTerritories] = useState(false);
  const [detailCountry, setDetailCountry] = useState<Country | null>(null);

  useEffect(() => {
    if (initialCountry) {
      if (initialCountry.isTerritory) {
        setIncludeTerritories(true);
      }
      setDetailCountry(initialCountry);
      onConsumeInitialCountry?.();
    }
  }, [initialCountry, onConsumeInitialCountry]);

  const discoveredSet = useMemo(
    () => new Set(saveData.discoveredCountries),
    [saveData.discoveredCountries]
  );

  const worldMapPaths = useMemo(() => getWorldMapPaths(), []);

  const baseList = includeTerritories ? COUNTRIES : SOVEREIGN_COUNTRIES;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseList.filter((c) => {
      if (continent !== 'All' && c.continent !== continent) return false;
      const isDisc = discoveredSet.has(c.code);
      if (statusFilter === 'discovered' && !isDisc) return false;
      if (statusFilter === 'undiscovered' && isDisc) return false;
      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [baseList, continent, statusFilter, search, discoveredSet]);

  const discoveredSovereignCount = SOVEREIGN_COUNTRIES.filter((c) =>
    discoveredSet.has(c.code)
  ).length;
  const pct = Math.round((discoveredSovereignCount / SOVEREIGN_COUNTRIES.length) * 100);

  return (
    <>
      <main className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <div className="rounded-2xl border border-slate-800/90 bg-[#070E1E]/95 p-5 sm:p-7">
        {/* Header & Progress */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-400 uppercase">
              <BookOpen className="h-4 w-4" />
              <span>Interactive World Atlas</span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              Country &amp; Flag Collection
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {SOVEREIGN_COUNTRIES.length} sovereign countries · Answer correctly in any mode to unlock discovery entries
            </p>
          </div>

          <div className="w-full md:w-72 rounded-xl border border-slate-800 bg-[#0B152A] p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Atlas Mastery</span>
              <span className="font-mono-num font-bold text-amber-300">
                {discoveredSovereignCount} / {SOVEREIGN_COUNTRIES.length} ({pct}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or capital..."
                aria-label="Search country or capital"
                className="w-full rounded-xl border border-slate-700/80 bg-[#0B152A] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="inline-flex rounded-xl border border-slate-800 bg-[#0B152A] p-1">
              {(['all', 'discovered', 'undiscovered'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    setStatusFilter(st);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize cursor-pointer ${
                    statusFilter === st
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0B152A] px-3 py-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTerritories}
                onChange={(e) => setIncludeTerritories(e.target.checked)}
                className="accent-amber-400"
              />
              <span>Include Territories (+4)</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CONTINENTS.map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  setContinent(ct);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  continent === ct
                    ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                    : 'bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-800 bg-[#0B152A] py-12 text-center">
            <p className="text-sm font-medium text-slate-300">
              No countries match your current filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setContinent('All');
                setStatusFilter('all');
              }}
              className="mt-3 rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-amber-300 hover:border-amber-400 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((country) => {
              const isDisc = discoveredSet.has(country.code);
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    setDetailCountry(country);
                  }}
                  className={`group flex flex-col items-center rounded-xl border p-3.5 text-center transition-all hover:-translate-y-0.5 cursor-pointer ${
                    isDisc
                      ? 'border-emerald-500/35 bg-[#0B172C] hover:border-amber-400/60'
                      : 'border-slate-800/90 bg-[#091224] hover:border-slate-600'
                  }`}
                >
                  <div className="relative flex h-20 w-full items-center justify-center">
                    <FlagImage
                      code={country.code}
                      size="md"
                      className={`w-24 ${!isDisc ? 'opacity-75 saturate-75' : ''}`}
                    />
                  </div>
                  <div className="mt-2.5 w-full truncate font-display text-sm font-bold text-white group-hover:text-amber-300">
                    {country.name}
                  </div>
                  <div className="mt-0.5 w-full truncate text-[11px] text-slate-400">
                    {country.capital}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold">
                    {isDisc ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Discovered</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-500">Undiscovered</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      </main>

      {/* Country Detail Modal */}
      {detailCountry && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="atlas-country-modal"
          aria-label={`Atlas entry for ${detailCountry.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#040812]/85 p-4"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-[#0B152A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
                  {detailCountry.continent} · {detailCountry.region}
                  {detailCountry.isTerritory ? ' · Territory' : ''}
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
                  {detailCountry.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailCountry(null)}
                aria-label="Close country details"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#070E1D] p-5">
                <FlagImage code={detailCountry.code} size="lg" wave className="w-48" />
                <div className="mt-3 text-xs text-slate-400 font-mono-num">
                  ISO: {detailCountry.code.toUpperCase()} · Mastered {saveData.masteredCountries[detailCountry.code] ?? 0}x
                </div>
              </div>

              {/* Mini Vector Map Location */}
              <div className="rounded-xl border border-slate-800 bg-[#070E1D] p-3">
                <svg
                  viewBox={`0 0 ${WORLD_SVG_WIDTH} ${WORLD_SVG_HEIGHT}`}
                  className="w-full h-36 rounded-lg bg-[#061022]"
                  aria-label={`Map showing location of ${detailCountry.name}`}
                >
                  {worldMapPaths.map((p, idx) => (
                    <path
                      key={`${p.numericId}-${idx}`}
                      d={p.d}
                      fill={p.numericId === detailCountry.numericId ? '#E5B84B' : '#1E3A5F'}
                      stroke="#0A192F"
                      strokeWidth="0.6"
                    />
                  ))}
                  {(() => {
                    const [px, py] = projectLngLat(detailCountry.lng, detailCountry.lat);
                    return (
                      <g>
                        <circle cx={px} cy={py} r="18" fill="#E5B84B" fillOpacity="0.25" />
                        <circle cx={px} cy={py} r="7" fill="#FBBF24" stroke="#060B16" strokeWidth="2" />
                      </g>
                    );
                  })()}
                </svg>
                <div className="mt-2 flex items-center justify-between text-xs px-1">
                  <span className="text-slate-400">
                    Capital: <strong className="text-white">{detailCountry.capital}</strong>
                  </span>
                  <span
                    className={`font-semibold ${
                      discoveredSet.has(detailCountry.code) ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {discoveredSet.has(detailCountry.code) ? 'Discovered' : 'Locked'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-[#070E1D] p-4">
              <div className="text-xs font-semibold text-amber-300 uppercase">Atlas Notes</div>
              <p className="mt-1.5 text-sm text-slate-200 leading-relaxed">{detailCountry.fact}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                <span>Colors: {detailCountry.colors.join(', ')}</span>
                <span>·</span>
                <span>Coordinates: {detailCountry.lat.toFixed(1)}°, {detailCountry.lng.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
