import {
  Award,
  BarChart3,
  BookOpen,
  Gamepad2,
  Globe,
  Home,
  Maximize2,
  Minimize2,
  Settings,
  Swords,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { AudioManager } from '../core/AudioManager';
import { getLevelFromXp } from '../systems/scoring';
import type { PlayerSaveData, ScreenId } from '../types/game';
import { BrandEmblem } from './BrandEmblem';

interface TopNavProps {
  activeScreen: ScreenId;
  saveData: PlayerSaveData;
  onNavigate: (screen: ScreenId) => void;
  onQuickPlay: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  canClaimReward: boolean;
}

export function TopNav({
  activeScreen,
  saveData,
  onNavigate,
  onQuickPlay,
  onToggleMute,
  onOpenSettings,
  onOpenProfile,
  canClaimReward,
}: TopNavProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const level = getLevelFromXp(saveData.xp);

  const toggleFullscreen = () => {
    AudioManager.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const navItems: { id: ScreenId; label: string; icon: typeof Home; action?: () => void }[] = [
    { id: 'hub', label: 'Home', icon: Home },
    { id: 'play', label: 'Play', icon: Gamepad2, action: onQuickPlay },
    { id: 'online', label: 'Online 1v1', icon: Swords },
    { id: 'explore', label: 'World Map', icon: Globe },
    { id: 'collection', label: 'Collection', icon: BookOpen },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070E1D]/94 px-3 py-2.5 sm:px-5">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2.5">
        {/* Brand */}
        <button
          type="button"
          onClick={() => {
            AudioManager.playClick();
            onNavigate('hub');
          }}
          className="cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-amber-400 shrink-0"
          aria-label="FLAGVERSE Home"
        >
          <BrandEmblem compact />
        </button>

        {/* Primary Navigation Links */}
        <nav className="hidden xl:flex items-center gap-0.5" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  if (item.action) item.action();
                  else onNavigate(item.id);
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Utility Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              AudioManager.unlock();
              onToggleMute();
            }}
            aria-label={saveData.settings.muted ? 'Unmute audio' : 'Mute audio'}
            title={saveData.settings.muted ? 'Unmute audio' : 'Mute audio'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            {saveData.settings.muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-sky-300" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              onOpenSettings();
            }}
            aria-label="Open Settings"
            title="Settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              onOpenProfile();
            }}
            aria-label={`Player profile: ${saveData.playerName}, Level ${level}`}
            className="relative inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-[#101C36] px-2.5 py-1.5 text-left hover:border-amber-400/70 transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-400/20 text-amber-300">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                {saveData.playerName}
              </span>
              <span className="font-mono-num text-[11px] text-amber-300 whitespace-nowrap">
                Lv.{level} · {saveData.coins.toLocaleString()} Coins
              </span>
            </div>
            {canClaimReward && (
              <span
                className="ml-0.5 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950 uppercase"
                title="Daily reward ready"
              >
                Gift
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Compact Nav Row inside header on < xl screens */}
      <nav
        className="mt-2 flex xl:hidden items-center gap-1 overflow-x-auto pb-0.5"
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                AudioManager.playClick();
                if (item.action) item.action();
                else onNavigate(item.id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
