import type { PlayerSettings } from '../types/game';

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private isUnlocked = false;
  private isPlayingMusic = false;
  private externalMuted = false;
  private chordStep = 0;

  private settings: PlayerSettings = {
    musicVolume: 0.4,
    sfxVolume: 0.7,
    muted: false,
    graphicsQuality: 'high',
    reducedMotion: false,
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this.ctx.suspend().catch(() => {});
        } else if (this.isUnlocked && !this.isEffectivelyMuted()) {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private isEffectivelyMuted(): boolean {
    return this.settings.muted || this.externalMuted;
  }

  public unlock(): void {
    this.isUnlocked = true;
    const ctx = this.ensureContext();
    if (ctx && !this.isPlayingMusic && !this.isEffectivelyMuted() && this.settings.musicVolume > 0.01) {
      this.startAmbientMusic();
    }
  }

  public setExternalMute(muted: boolean): void {
    this.externalMuted = muted;
    this.applyVolumes();
    if (this.ctx) {
      if (muted) {
        this.ctx.suspend().catch(() => {});
      } else if (this.isUnlocked && !this.settings.muted && !document.hidden) {
        this.ctx.resume().catch(() => {});
      }
    }
    if (this.isEffectivelyMuted()) {
      this.stopAmbientMusic();
    } else if (this.isUnlocked && !this.isPlayingMusic && this.settings.musicVolume > 0.01) {
      this.startAmbientMusic();
    }
  }

  public updateSettings(next: PlayerSettings): void {
    this.settings = next;
    this.applyVolumes();
    if (this.isEffectivelyMuted() || next.musicVolume <= 0.01) {
      this.stopAmbientMusic();
    } else if (this.isUnlocked && !this.isPlayingMusic) {
      this.startAmbientMusic();
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const master = this.isEffectivelyMuted() ? 0 : 1;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.24, now, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.45, now, 0.03);
  }

  public startAmbientMusic(): void {
    if (this.isPlayingMusic || typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.isPlayingMusic = true;

    // Warm, calm space-atlas progression in D minor / F major9 / C6 / Bbmaj7
    const chords = [
      [146.83, 220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63, 349.23],
      [130.81, 196.0, 261.63, 329.63],
      [116.54, 174.61, 220.0, 293.66],
    ];

    const scheduleChord = () => {
      if (!this.isPlayingMusic || !this.ctx || !this.musicGain || document.hidden) return;
      if (this.isEffectivelyMuted() || this.settings.musicVolume <= 0.01) return;

      const freqs = chords[this.chordStep % chords.length];
      this.chordStep += 1;
      const now = this.ctx.currentTime;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);
      filter.connect(this.musicGain);

      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.24 : 0.14, now + 1.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.4);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(now);
        osc.stop(now + 4.5);
      });
    };

    scheduleChord();
    this.musicTimer = window.setInterval(scheduleChord, 4200);
  }

  public stopAmbientMusic(): void {
    this.isPlayingMusic = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.22,
    delay = 0,
    endFreq?: number
  ): void {
    if (this.isEffectivelyMuted() || this.settings.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + duration);
    }

    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gainPeak, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  public playIntroChord(): void {
    this.unlock();
    this.playTone(146.83, 1.4, 'triangle', 0.18, 0);
    this.playTone(220.0, 1.4, 'sine', 0.16, 0.06);
    this.playTone(329.63, 1.5, 'sine', 0.14, 0.14);
    this.playTone(440.0, 1.6, 'sine', 0.12, 0.22);
  }

  public playClick(): void {
    this.unlock();
    this.playTone(540, 0.06, 'triangle', 0.14, 0, 420);
  }

  public playFlip(): void {
    this.unlock();
    this.playTone(340, 0.09, 'sine', 0.15, 0, 560);
  }

  public playCorrect(combo = 1): void {
    this.unlock();
    const pitchShift = Math.min(combo - 1, 8) * 28;
    this.playTone(523.25 + pitchShift, 0.14, 'triangle', 0.22, 0);
    this.playTone(659.25 + pitchShift, 0.22, 'sine', 0.2, 0.07);
  }

  public playWrong(): void {
    this.unlock();
    this.playTone(220, 0.14, 'sawtooth', 0.11, 0, 165);
    this.playTone(165, 0.22, 'triangle', 0.14, 0.1, 130);
  }

  public playTickWarning(): void {
    this.unlock();
    this.playTone(880, 0.05, 'sine', 0.1, 0);
  }

  public playStreak(): void {
    this.unlock();
    this.playTone(587.33, 0.12, 'triangle', 0.18, 0);
    this.playTone(739.99, 0.14, 'triangle', 0.18, 0.06);
    this.playTone(880.0, 0.24, 'sine', 0.2, 0.12);
  }

  public playAchievement(): void {
    this.unlock();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.28, 'triangle', 0.2, idx * 0.075);
    });
  }

  public playLevelUp(): void {
    this.unlock();
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.3, 'sine', 0.2, idx * 0.07);
    });
  }

  public playReward(): void {
    this.unlock();
    this.playTone(659.25, 0.15, 'triangle', 0.18, 0);
    this.playTone(987.77, 0.28, 'sine', 0.2, 0.08);
  }

  public playVictory(): void {
    this.unlock();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.34, 'triangle', 0.2, idx * 0.09);
    });
  }
}

export const AudioManager = new ProceduralAudioEngine();
