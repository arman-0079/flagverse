import { ArrowRight, Building2, Landmark, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AudioManager } from '../core/AudioManager';
import { COUNTRY_BY_CODE } from '../data/countries';
import { GlobeSceneController, type GlobeViewMode, type GlobeVisualOptions } from '../scenes/GlobeScene';
import type { Country, GlobeHotspot } from '../types/game';
import { FlagImage } from './FlagImage';

interface GlobeCanvasProps {
  mode: GlobeViewMode;
  highQuality: boolean;
  reducedMotion: boolean;
  discoveredCountries: string[];
  selectedCountry: Country | null;
  visualOptions?: GlobeVisualOptions;
  onSelectCountry?: (country: Country) => void;
  onHoverCountry?: (country: Country | null, screenPos?: { x: number; y: number }) => void;
  onOpenCountryDetails?: (country: Country) => void;
}

type GlobeMountElement = HTMLDivElement & {
  __globeController?: GlobeSceneController;
};

export function GlobeCanvas({
  mode,
  highQuality,
  reducedMotion,
  discoveredCountries,
  selectedCountry,
  visualOptions,
  onSelectCountry,
  onHoverCountry,
  onOpenCountryDetails,
}: GlobeCanvasProps) {
  const mountRef = useRef<GlobeMountElement | null>(null);
  const controllerRef = useRef<GlobeSceneController | null>(null);
  const callbacksRef = useRef({ onSelectCountry, onHoverCountry });

  const [selectedHotspot, setSelectedHotspot] = useState<GlobeHotspot | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<{
    hotspot: GlobeHotspot;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    callbacksRef.current = { onSelectCountry, onHoverCountry };
  }, [onSelectCountry, onHoverCountry]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const controller = new GlobeSceneController(
      el,
      {
        onSelectCountry: (c) => {
          setSelectedHotspot(null);
          callbacksRef.current.onSelectCountry?.(c);
        },
        onHoverCountry: (c, pos) => callbacksRef.current.onHoverCountry?.(c, pos),
        onSelectHotspot: (hotspot) => {
          if (hotspot) {
            AudioManager.playClick();
          }
          setHoveredHotspot(null);
          setSelectedHotspot(hotspot);
        },
        onHoverHotspot: (hotspot, pos) => {
          if (hotspot && pos) {
            setHoveredHotspot({ hotspot, x: pos.x, y: pos.y });
          } else {
            setHoveredHotspot(null);
          }
        },
      },
      {
        highQuality,
        reducedMotion,
        initialMode: mode,
      }
    );
    controllerRef.current = controller;
    el.__globeController = controller;
    controller.setDiscoveredCountries(discoveredCountries);
    if (selectedCountry) {
      controller.focusCountry(selectedCountry);
    }

    return () => {
      delete el.__globeController;
      controller.dispose();
      controllerRef.current = null;
    };
    // Mount WebGL once for stable 3D lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.setMode(mode);
    setSelectedHotspot(null);
    setHoveredHotspot(null);
  }, [mode]);

  useEffect(() => {
    controllerRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    controllerRef.current?.setDiscoveredCountries(discoveredCountries);
  }, [discoveredCountries]);

  useEffect(() => {
    controllerRef.current?.focusCountry(selectedCountry);
    if (selectedCountry) {
      setSelectedHotspot(null);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (visualOptions) {
      controllerRef.current?.setVisualOptions(visualOptions);
    }
  }, [visualOptions]);

  const hotspotCountry = selectedHotspot ? COUNTRY_BY_CODE[selectedHotspot.countryCode] : null;
  const hoverCountry = hoveredHotspot ? COUNTRY_BY_CODE[hoveredHotspot.hotspot.countryCode] : null;
  const canDisplayOverlays = mode === 'hub' || mode === 'explore';

  const handleCloseHotspot = () => {
    AudioManager.playClick();
    setSelectedHotspot(null);
    controllerRef.current?.focusHotspot(null);
  };

  return (
    <>
      <div
        ref={mountRef}
        data-testid="globe-canvas-container"
        className="fixed inset-0 z-0 overflow-hidden bg-[#060B16]"
        aria-label="Interactive 3D Earth Globe"
      />

      {/* Hotspot Hover Tooltip */}
      {canDisplayOverlays && hoveredHotspot && hoverCountry && (
        <div
          className="pointer-events-none fixed z-30 flex items-center gap-2.5 rounded-xl border border-amber-400/45 bg-[#081022]/96 px-3 py-2 shadow-2xl"
          style={{
            left: Math.min(
              typeof window !== 'undefined' ? window.innerWidth - 240 : 600,
              hoveredHotspot.x + 14
            ),
            top: Math.max(72, hoveredHotspot.y - 24),
          }}
        >
          <FlagImage code={hoverCountry.code} size="sm" shadow={false} className="w-6 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  hoveredHotspot.hotspot.kind === 'landmark' ? 'text-amber-300' : 'text-sky-300'
                }`}
              >
                {hoveredHotspot.hotspot.kind === 'landmark' ? 'Landmark' : 'Capital'}
              </span>
              <span className="text-[10px] text-slate-500">·</span>
              <span className="text-[10px] text-slate-400 truncate">{hoverCountry.name}</span>
            </div>
            <div className="text-xs font-bold text-white whitespace-nowrap">
              {hoveredHotspot.hotspot.name}
            </div>
          </div>
        </div>
      )}

      {/* Selected Hotspot Info Card */}
      {canDisplayOverlays && selectedHotspot && hotspotCountry && (
        <aside
          data-testid="hotspot-info-card"
          aria-label={`${selectedHotspot.name} hotspot details`}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-400/40 bg-[#081022]/96 p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-[#0D1932] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {selectedHotspot.kind === 'landmark' ? (
                  <>
                    <Landmark className="h-3 w-3 text-amber-400" />
                    <span className="text-amber-300">World Landmark</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-3 w-3 text-sky-400" />
                    <span className="text-sky-300">Capital City</span>
                  </>
                )}
              </div>
              <h3 className="mt-1.5 font-display text-base font-extrabold text-white leading-tight">
                {selectedHotspot.name}
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                {selectedHotspot.city}, {hotspotCountry.name}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCloseHotspot}
              aria-label="Close hotspot info"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 border border-amber-400/25 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
            <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
            <span>{selectedHotspot.highlight}</span>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
            {selectedHotspot.summary}
          </p>

          <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0B152B] p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <FlagImage
                code={hotspotCountry.code}
                size="sm"
                shadow={false}
                className="w-8 shrink-0"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">{hotspotCountry.name}</div>
                <div className="truncate text-[10px] text-slate-400">
                  Capital: {hotspotCountry.capital}
                </div>
              </div>
            </div>

            {onOpenCountryDetails && (
              <button
                type="button"
                data-testid="hotspot-country-link"
                onClick={() => {
                  setSelectedHotspot(null);
                  controllerRef.current?.focusHotspot(null);
                  onOpenCountryDetails(hotspotCountry);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
              >
                <span>Country Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
