import { useEffect, useState } from 'react';
import { ChevronRight, Volume2 } from 'lucide-react';
import { AudioManager } from '../core/AudioManager';

interface CinematicIntroProps {
  onComplete: () => void;
  reducedMotion: boolean;
}

export function CinematicIntro({ onComplete, reducedMotion }: CinematicIntroProps) {
  const [scenePhase, setScenePhase] = useState<1 | 2 | 3 | 4>(1);
  const [exiting, setExiting] = useState(false);

  const finishIntro = () => {
    if (exiting) return;
    setExiting(true);
    AudioManager.playClick();
    window.setTimeout(() => {
      onComplete();
    }, reducedMotion ? 80 : 380);
  };

  useEffect(() => {
    if (reducedMotion) {
      setScenePhase(3);
      const t = window.setTimeout(finishIntro, 2200);
      return () => window.clearTimeout(t);
    }

    const t1 = window.setTimeout(() => setScenePhase(2), 1100);
    const t2 = window.setTimeout(() => setScenePhase(3), 2100);
    const t3 = window.setTimeout(() => setScenePhase(4), 4500);
    const t4 = window.setTimeout(() => finishIntro(), 5800);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        finishIntro();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting]);

  return (
    <div
      data-testid="cinematic-intro"
      className={`fixed inset-0 z-30 flex flex-col justify-between pointer-events-auto transition-opacity duration-500 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={() => AudioManager.playIntroChord()}
    >
      {/* Subtle dark vignette framing the emerging 3D Earth */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${
          scenePhase === 1 ? 'bg-[#040710]/70' : 'bg-[#040710]/20'
        }`}
      />

      {/* Top row: subtle audio hint & Skip Intro */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            AudioManager.playIntroChord();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600/80 bg-[#081020]/94 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:border-amber-400/70 hover:text-amber-200 transition-colors cursor-pointer"
        >
          <Volume2 className="h-3.5 w-3.5 text-amber-400" />
          <span>Enable Sound</span>
        </button>

        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.stopPropagation();
            finishIntro();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-[#0B152A]/95 px-4 py-2 text-xs font-bold tracking-wider text-amber-300 uppercase hover:bg-amber-400 hover:text-slate-950 transition-colors cursor-pointer shadow-lg"
        >
          <span>Skip Intro</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Center Title Reveal with Soft Radial Contrast Scrim */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div
          className={`flex flex-col items-center text-center rounded-3xl px-8 py-7 transition-all duration-500 ${
            scenePhase >= 3
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-4 opacity-0 scale-95'
          } ${scenePhase === 4 ? '-translate-y-4 opacity-95' : ''}`}
          style={{
            background:
              'radial-gradient(closest-side, rgba(4, 9, 22, 0.88) 42%, rgba(4, 9, 22, 0.56) 76%, rgba(4, 9, 22, 0) 100%)',
          }}
        >
          {/* Bespoke Inline SVG Title Crest */}
          <svg viewBox="0 0 88 88" className="mb-4 h-20 w-20 drop-shadow-[0_0_24px_rgba(229,184,75,0.45)]" aria-hidden="true">
            <defs>
              <linearGradient id="intro-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#E5B84B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>
            <circle cx="44" cy="44" r="38" fill="#071226" fillOpacity="0.92" stroke="url(#intro-gold)" strokeWidth="2.4" />
            <circle cx="44" cy="44" r="31" fill="none" stroke="#38BDF8" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="4 4" />
            <ellipse cx="44" cy="44" rx="16" ry="31" fill="none" stroke="#38BDF8" strokeOpacity="0.4" strokeWidth="1.2" />
            <path d="M35 23v42M35 24l28 9-28 10z" fill="url(#intro-gold)" />
          </svg>

          <h1 className="font-display text-5xl font-extrabold tracking-[0.16em] text-white sm:text-7xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            FLAG<span className="text-amber-400">VERSE</span>
          </h1>
          <p className="mt-2 font-display text-sm font-bold tracking-[0.38em] text-sky-300 uppercase sm:text-base drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            World Challenge
          </p>
          <p className="mt-4 max-w-md text-sm font-medium text-slate-100 sm:text-base">
            Explore the World. Master Every Flag.
          </p>
        </div>
      </div>

      {/* Bottom stage progress bar & control hint */}
      <div className="relative z-10 flex flex-col items-center gap-3 pb-8 px-6">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                scenePhase >= step ? 'w-10 bg-amber-400' : 'w-5 bg-slate-700'
              }`}
            />
          ))}
        </div>
        <p className="rounded-lg bg-[#040812]/80 px-3 py-1 text-xs font-medium text-slate-200">
          Press Enter or Space to jump straight into the Game Hub
        </p>
      </div>
    </div>
  );
}
