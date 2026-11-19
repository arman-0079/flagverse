import { Award, Check, Gift, HelpCircle, RotateCcw, Settings, User, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';
import { AudioManager } from '../core/AudioManager';
import { SOVEREIGN_COUNTRIES } from '../data/countries';
import { getXpProgressInLevel } from '../systems/scoring';
import type { PlayerSaveData, PlayerSettings } from '../types/game';
import { FlagImage } from './FlagImage';

interface SettingsModalProps {
  settings: PlayerSettings;
  onUpdateSettings: (next: PlayerSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040812]/85 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0B152A] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold text-white">Settings</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              onClose();
            }}
            aria-label="Close Settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Audio Mute */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Master Audio</div>
              <div className="text-xs text-slate-400">Mute or unmute all music and sound effects</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, muted: !settings.muted })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                settings.muted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{settings.muted ? 'Muted' : 'Active'}</span>
            </button>
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="music-vol" className="font-semibold text-slate-200">
                Ambient Music Volume
              </label>
              <span className="font-mono-num text-amber-300">
                {Math.round(settings.musicVolume * 100)}%
              </span>
            </div>
            <input
              id="music-vol"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) / 100 })
              }
              className="mt-2 w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="sfx-vol" className="font-semibold text-slate-200">
                Sound Effects Volume
              </label>
              <span className="font-mono-num text-sky-300">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              id="sfx-vol"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) / 100 })
              }
              className="mt-2 w-full accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Graphics Quality */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">3D Globe Quality</div>
              <div className="text-xs text-slate-400">Balanced saves battery on older devices</div>
            </div>
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              {(['balanced', 'high'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    onUpdateSettings({ ...settings, graphicsQuality: q });
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize cursor-pointer ${
                    settings.graphicsQuality === q
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Reduced Motion</div>
              <div className="text-xs text-slate-400">Minimizes UI transitions and globe motion</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reducedMotion}
              onClick={() => {
                AudioManager.playClick();
                onUpdateSettings({ ...settings, reducedMotion: !settings.reducedMotion });
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                settings.reducedMotion
                  ? 'bg-sky-400 text-slate-950'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {settings.reducedMotion ? 'On' : 'Off'}
            </button>
          </div>

          {/* Reset Save */}
          <div className="border-t border-slate-800 pt-4">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-2 text-xs font-medium text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Local Progress</span>
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3">
                <span className="text-xs text-rose-200">Erase all XP, scores, and unlocks?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-bold text-white hover:bg-rose-400 cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileModalProps {
  saveData: PlayerSaveData;
  canClaimReward: boolean;
  onClaimReward: () => { coinsAwarded: number; xpAwarded: number; dayNumber: number };
  onUpdateProfile: (name: string, avatarCode: string) => void;
  onClose: () => void;
}

const AVATAR_FLAGS = ['jp', 'br', 'ch', 'ca', 'fr', 'ke', 'gb', 'au', 'np', 'gr', 'kr', 'ma'];

export function ProfileModal({
  saveData,
  canClaimReward,
  onClaimReward,
  onUpdateProfile,
  onClose,
}: ProfileModalProps) {
  const [nameInput, setNameInput] = useState(saveData.playerName);
  const [avatarCode, setAvatarCode] = useState(saveData.avatarCode);
  const [rewardBanner, setRewardBanner] = useState<string | null>(null);

  const xpInfo = getXpProgressInLevel(saveData.xp);

  const handleSave = () => {
    AudioManager.playClick();
    onUpdateProfile(nameInput.trim() || 'Explorer', avatarCode);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Explorer Profile"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040812]/85 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0B152A] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold text-white">Explorer Profile</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              AudioManager.playClick();
              onClose();
            }}
            aria-label="Close Profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Level & XP Progress */}
          <div className="rounded-xl border border-slate-800 bg-[#070E1D] p-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold text-amber-300">
                Level {xpInfo.level}
              </span>
              <span className="font-mono-num text-xs text-slate-300">
                {saveData.xp.toLocaleString()} XP · {saveData.coins.toLocaleString()} Coins
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${xpInfo.pct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400 font-mono-num">
              <span>{saveData.discoveredCountries.length} / {SOVEREIGN_COUNTRIES.length} Countries</span>
              <span>{Object.keys(saveData.achievements).length} Achievements</span>
            </div>
          </div>

          {/* Daily Reward Box */}
          <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Gift className="h-5 w-5 text-amber-300 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">Daily Explorer Gift</div>
                  <div className="text-xs text-slate-300">
                    {canClaimReward
                      ? `Day ${(saveData.dailyReward.dayCount % 7) + 1} reward ready to claim!`
                      : rewardBanner || `Claimed for today · Day ${saveData.dailyReward.dayCount} streak`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!canClaimReward}
                onClick={() => {
                  const res = onClaimReward();
                  if (res.coinsAwarded > 0) {
                    AudioManager.playReward();
                    setRewardBanner(`+${res.coinsAwarded} Coins & +${res.xpAwarded} XP added!`);
                  }
                }}
                className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer shrink-0"
              >
                {canClaimReward ? 'Claim' : 'Claimed'}
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor="explorer-name" className="block text-xs font-semibold text-slate-300">
              Explorer Callsign (Local Guest Profile)
            </label>
            <input
              id="explorer-name"
              type="text"
              maxLength={20}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Avatar Emblem Picker */}
          <div>
            <div className="text-xs font-semibold text-slate-300">Favorite Flag Emblem</div>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATAR_FLAGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    AudioManager.playClick();
                    setAvatarCode(code);
                  }}
                  aria-label={`Select ${code.toUpperCase()} emblem`}
                  className={`flex items-center justify-center rounded-lg border p-1.5 cursor-pointer ${
                    avatarCode === code
                      ? 'border-amber-400 bg-amber-400/15'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                  }`}
                >
                  <FlagImage code={code} size="sm" shadow={false} className="w-8" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function HelpModal({
  title,
  instructions,
  onClose,
}: {
  title: string;
  instructions: string[];
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`How to play ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040812]/85 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0B152A] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-sky-400" />
            <h2 className="font-display text-lg font-bold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Help"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
          {instructions.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-400 cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
