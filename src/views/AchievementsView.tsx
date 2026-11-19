import { Award, CheckCircle2, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/modes';
import { getAchievementProgress } from '../systems/achievements';
import type { PlayerSaveData } from '../types/game';

export function AchievementsView({ saveData }: { saveData: PlayerSaveData }) {
  const unlockedCount = Object.keys(saveData.achievements).length;

  return (
    <main className="relative z-10 mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
      <div className="rounded-2xl border border-slate-800/90 bg-[#070E1E]/95 p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-400 uppercase">
              <Award className="h-4 w-4" />
              <span>Honors &amp; Milestones</span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-white">
              Achievements
            </h1>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B152A] px-4 py-2.5 font-mono-num text-sm font-bold text-amber-300">
            {unlockedCount} / {ACHIEVEMENTS.length} Unlocked
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {ACHIEVEMENTS.map((ach) => {
            const prog = getAchievementProgress(ach.id, saveData);
            const unlockedAt = saveData.achievements[ach.id];
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-4 transition-colors ${
                  prog.unlocked
                    ? 'border-amber-400/45 bg-[#0D1A33]'
                    : 'border-slate-800/90 bg-[#0A1326]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        prog.unlocked
                          ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                          : 'border-slate-700 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {prog.unlocked ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-sky-300 uppercase">
                        {ach.category}
                      </div>
                      <h2 className="font-display text-base font-bold text-white">{ach.title}</h2>
                      <p className="mt-0.5 text-xs text-slate-400">{ach.description}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono-num text-[11px] font-bold text-amber-300 shrink-0">
                    +{ach.xpReward} XP
                    <div className="text-slate-400">+{ach.coinReward}c</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                    <span>
                      {prog.unlocked && unlockedAt
                        ? `Unlocked ${new Date(unlockedAt).toLocaleDateString()}`
                        : 'Progress'}
                    </span>
                    <span>
                      {prog.current} / {prog.target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        prog.unlocked ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${prog.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
