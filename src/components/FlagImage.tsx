import { useState } from 'react';
import { Globe } from 'lucide-react';
import { COUNTRY_BY_CODE } from '../data/countries';
import { getFlagUrl } from '../data/flags';

interface FlagImageProps {
  code: string;
  alt?: string;
  className?: string;
  wave?: boolean;
  shadow?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function FlagImage({
  code,
  alt,
  className = '',
  wave = false,
  shadow = true,
  size = 'md',
}: FlagImageProps) {
  const [failed, setFailed] = useState(false);
  const country = COUNTRY_BY_CODE[code.toLowerCase()];
  const isSquare = country?.aspectRatio === '1:1';
  const isPennant = country?.aspectRatio === 'pennant';
  const src = getFlagUrl(code, isSquare);
  const label = alt || (country ? `Flag of ${country.name}` : `Flag (${code.toUpperCase()})`);

  const aspectClass = isSquare ? 'aspect-square' : isPennant ? 'aspect-[5/6]' : 'aspect-[4/3]';
  const sizeMaxClass =
    size === 'sm'
      ? 'w-10'
      : size === 'md'
        ? 'w-20'
        : size === 'lg'
          ? 'w-44 sm:w-52'
          : 'w-56 sm:w-72';

  if (failed || !src) {
    return (
      <div
        className={`${sizeMaxClass} ${aspectClass} inline-flex flex-col items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/90 text-slate-400 ${className}`}
        role="img"
        aria-label={label}
      >
        <Globe className="h-5 w-5 text-amber-400/70" />
        <span className="mt-1 font-mono-num text-[11px] uppercase tracking-wider">
          {code}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        wave ? 'animate-flag-cloth' : ''
      } ${className}`}
    >
      <img
        src={src}
        alt={label}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        draggable={false}
        className={`h-full w-full object-contain ${
          isPennant
            ? 'drop-shadow-[0_10px_22px_rgba(0,0,0,0.65)]'
            : `rounded-[5px] ring-1 ring-white/15 ${
                shadow ? 'shadow-[0_12px_30px_rgba(0,0,0,0.55)]' : ''
              }`
        }`}
      />
    </div>
  );
}
