import { BarChart3 } from 'lucide-react';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { GAME_MODES } from '../data/modes';
import { getXpProgressInLevel } from '../systems/scoring';
import type { Continent, PlayerSaveData } from '../types/game';

const CONTINENTS: Continent[] = [
  'Europe',
  'Asia',
  'Africa',
  'North America',
  'South America',
  'Oceania',
];

export function StatisticsView({ saveData }: { saveData: PlayerSaveData }) {
  const totalGames = Object.values(saveData.gamesPlayed).reduce((s, n) => s + (n || 0), 0);
  const accuracy =
    saveData.totalQuestions > 0
      ? Math.round((saveData.totalCorrect / saveData.totalQuestions) * 100)
      : 0;
  const xpInfo = getXpProgressInLevel(saveData.xp);
  const discoveredSet = new Set(saveData.discoveredCountries);

  return (
    <main className="relative z-10 mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
      <div className="rounded-2xl border border-slate-800/90 bg-[#070E1E]/95 p-5 sm:p-7">
        <div className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-sky-300 uppercase">
            <BarChart3 className="h-4 w-4" />
            <span>Career Performance</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
            Player Statistics
          </h1>
        </div>

        {/* Summary KPI Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Explorer Level', val: `Lv.${xpInfo.level}` },
            { label: 'Games Played', val: totalGames.toLocaleString() },
            { label: 'Overall Accuracy', val: `${accuracy}%` },
            { label: 'Best Streak', val: `${saveData.bestStreak}x` },
            { label: 'Flags Rebuilt', val: saveData.flagBuilderSolved.toLocaleString() },
            { label: 'Daily Streak', val: `${saveData.dailyChallenge.streak}d` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-800 bg-[#0B152A] p-4"
            >
              <div className="text-[11px] font-medium text-slate-400">{stat.label}</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-white">{stat.val}</div>
            </div>
          ))}
        </div>

        {/* Continent Mastery Breakdown */}
        <div className="mt-7">
          <h2 className="font-display text-lg font-bold text-white">Continent Discovery</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTINENTS.map((cont) => {
              const total = SOVEREIGN_COUNTRIES.filter((c) => c.continent === cont).length;
              const found = SOVEREIGN_COUNTRIES.filter(
                (c) => c.continent === cont && discoveredSet.has(c.code)
              ).length;
              const pct = Math.round((found / Math.max(1, total)) * 100);
              return (
                <div
                  key={cont}
                  className="rounded-xl border border-slate-800 bg-[#0B152A] p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{cont}</span>
                    <span className="font-mono-num text-amber-300">
                      {found} / {total} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode High Scores */}
        <div className="mt-7">
          <h2 className="font-display text-lg font-bold text-white">Mode Records</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GAME_MODES.map((m) => {
              const best = saveData.bestScores[m.id] ?? 0;
              const played = saveData.gamesPlayed[m.id] ?? 0;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0B152A] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{m.title}</div>
                    <div className="text-xs text-slate-400 font-mono-num">
                      Played {played} {played === 1 ? 'time' : 'times'}
                    </div>
                  </div>
                  <div className="text-right font-mono-num">
                    <div className="text-base font-bold text-amber-300">
                      {best.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase">Best</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
