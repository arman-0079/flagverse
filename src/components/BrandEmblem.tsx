interface BrandEmblemProps {
  compact?: boolean;
  className?: string;
}

export function BrandEmblem({ compact = false, className = '' }: BrandEmblemProps) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        viewBox="0 0 44 44"
        className={compact ? 'h-8 w-8 shrink-0' : 'h-11 w-11 shrink-0'}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fv-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="55%" stopColor="#E5B84B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="fv-ocean" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="22" r="19" fill="url(#fv-ocean)" stroke="url(#fv-gold)" strokeWidth="2" />
        <ellipse cx="22" cy="22" rx="9" ry="19" fill="none" stroke="#38BDF8" strokeOpacity="0.45" strokeWidth="1.2" />
        <line x1="3" y1="22" x2="41" y2="22" stroke="#38BDF8" strokeOpacity="0.45" strokeWidth="1.2" />
        <path
          d="M17 11v22M17 12l15 4.5-15 5.5z"
          fill="url(#fv-gold)"
          stroke="#060B16"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-extrabold tracking-[0.14em] text-slate-50 ${
            compact ? 'text-base sm:text-lg' : 'text-2xl sm:text-3xl'
          }`}
        >
          FLAG<span className="text-amber-400">VERSE</span>
        </span>
        {!compact && (
          <span className="mt-1 text-[11px] font-medium tracking-[0.26em] text-sky-300/85 uppercase">
            World Challenge
          </span>
        )}
      </div>
    </div>
  );
}
