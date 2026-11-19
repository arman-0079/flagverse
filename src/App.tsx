import { Check, Coins, Copy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CinematicIntro } from './components/CinematicIntro';
import { GameResultsView } from './components/GameShell';
import { GlobeCanvas } from './components/GlobeCanvas';
import { MainMenuHub } from './components/MainMenuHub';
import { ProfileModal, SettingsModal } from './components/Modals';
import { TopNav } from './components/TopNav';
import { AudioManager } from './core/AudioManager';
import { CrazyGamesSDK } from './core/CrazyGamesSDK';
import {
  applySessionResult,
  canClaimDailyReward,
  claimDailyReward,
  clearSaveData,
  loadCloudSaveData,
  loadSaveData,
  persistSaveData,
} from './core/SaveManager';
import { CapitalHunterMode } from './modes/CapitalHunterMode';
import { ContinentQuestMode } from './modes/ContinentQuestMode';
import { CountrySilhouetteMode } from './modes/CountrySilhouetteMode';
import { CountryToFlagMode } from './modes/CountryToFlagMode';
import { DailyChallengeMode } from './modes/DailyChallengeMode';
import { FlagBattleMode } from './modes/FlagBattleMode';
import { FlagBuilderMode } from './modes/FlagBuilderMode';
import { FlagMasterMode } from './modes/FlagMasterMode';
import { FlagMatchMode } from './modes/FlagMatchMode';
import { FlagMemoryMode } from './modes/FlagMemoryMode';
import { TrueFalseMode } from './modes/TrueFalseMode';
import { WorldMapMode } from './modes/WorldMapMode';
import type { GlobeViewMode, GlobeVisualOptions } from './scenes/GlobeScene';
import type {
  AchievementDef,
  Country,
  Difficulty,
  GameModeId,
  GameSessionResult,
  PlayerSaveData,
  PlayerSettings,
  ScreenId,
} from './types/game';
import { AchievementsView } from './views/AchievementsView';
import { CollectionView } from './views/CollectionView';
import { OnlineArenaView } from './views/OnlineArenaView';
import { StatisticsView } from './views/StatisticsView';
import { WorldExploreView } from './views/WorldExploreView';
import { parseInitialRouteParams } from './utils/seo';

interface SessionSummaryState {
  result: GameSessionResult;
  bestScoreBefore: number;
  newlyUnlocked: AchievementDef[];
  leveledUp: boolean;
  newLevel: number;
}

export default function App() {
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadSaveData());

  const [initialRoute] = useState(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const loaded = loadSaveData();
    return parseInitialRouteParams(search, loaded.introSeen);
  });

  const [initialFriendCode, setInitialFriendCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('code');
    const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    return clean.length >= 4 ? clean : null;
  });

  const [screen, setScreen] = useState<ScreenId>(initialRoute.screen);

  const [activeModeId, setActiveModeId] = useState<GameModeId>(initialRoute.modeId);
  const [sessionKey, setSessionKey] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryState | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [sdkActive, setSdkActive] = useState(false);
  const [rewardAdBusy, setRewardAdBusy] = useState(false);
  const [rewardDoubled, setRewardDoubled] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [atlasCountry, setAtlasCountry] = useState<Country | null>(null);
  const [globeVisualOptions, setGlobeVisualOptions] = useState<GlobeVisualOptions>({
    showClouds: true,
    showSnow: true,
    showArcs: true,
    showNightLights: true,
    autoSpin: false,
  });
  const [selectedExploreCountry, setSelectedExploreCountry] = useState<Country | null>(null);
  const [hoveredExploreCountry, setHoveredExploreCountry] = useState<{
    country: Country;
    x: number;
    y: number;
  } | null>(null);

  // Initialize CrazyGames HTML5 SDK v3, sync cloud saves & logged-in user profile
  useEffect(() => {
    let active = true;
    let detachAuth: (() => void) | null = null;

    CrazyGamesSDK.init().then(async (isActive) => {
      if (!active) return;
      setSdkActive(isActive);

      if (!isActive) return;

      CrazyGamesSDK.loadingStart();
      try {
        // Hydrate CrazyGames cloud save if it contains more progress than local storage
        const cloudSave = loadCloudSaveData();
        if (cloudSave) {
          setSaveData((prev) =>
            cloudSave.xp > prev.xp ||
            cloudSave.discoveredCountries.length > prev.discoveredCountries.length
              ? cloudSave
              : prev
          );
        }

        // Sync CrazyGames logged-in username when player still uses the default guest name
        const applyUser = (user: { username: string } | null) => {
          if (!user?.username) return;
          setSaveData((prev) =>
            prev.playerName === 'Explorer'
              ? { ...prev, playerName: user.username.slice(0, 20) }
              : prev
          );
        };

        const cgUser = await CrazyGamesSDK.getUser();
        if (active) applyUser(cgUser);
        detachAuth = CrazyGamesSDK.addAuthListener(applyUser);
      } finally {
        CrazyGamesSDK.loadingStop();
      }
    });

    return () => {
      active = false;
      detachAuth?.();
    };
  }, []);

  useEffect(() => {
    persistSaveData(saveData);
    AudioManager.updateSettings(saveData.settings);
    document.documentElement.classList.toggle('reduced-motion', saveData.settings.reducedMotion);
  }, [saveData]);

  // Expose semantic game state on document.body for diagnostics & QA
  useEffect(() => {
    if (screen === 'intro') {
      document.body.dataset.state = 'title';
    } else if (screen === 'play' && sessionSummary) {
      document.body.dataset.state = 'gameover';
    } else if (screen === 'play' || screen === 'explore' || screen === 'online') {
      document.body.dataset.state = 'playing';
    } else {
      document.body.dataset.state = 'hub';
    }
  }, [screen, sessionSummary]);

  const handleIntroComplete = useCallback(() => {
    setSaveData((prev) => ({ ...prev, introSeen: true }));
    setScreen('hub');
  }, []);

  const handleToggleMute = useCallback(() => {
    AudioManager.unlock();
    setSaveData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        muted: !prev.settings.muted,
      },
    }));
  }, []);

  const handleUpdateSettings = useCallback((nextSettings: PlayerSettings) => {
    setSaveData((prev) => ({ ...prev, settings: nextSettings }));
  }, []);

  const handleStartMode = useCallback((modeId: GameModeId) => {
    AudioManager.unlock();
    setActiveModeId(modeId);
    setSessionSummary(null);
    setCopiedShare(false);
    setRewardDoubled(false);
    setSessionKey((k) => k + 1);
    setScreen('play');
    CrazyGamesSDK.gameplayStart();
  }, []);

  const handleNavigate = useCallback((nextScreen: ScreenId) => {
    if (nextScreen !== 'play') {
      CrazyGamesSDK.gameplayStop();
      setSessionSummary(null);
    }
    if (nextScreen !== 'explore') {
      setSelectedExploreCountry(null);
      setHoveredExploreCountry(null);
    }
    setScreen(nextScreen);
  }, []);

  const handleExitGameplay = useCallback(() => {
    CrazyGamesSDK.gameplayStop();
    setSessionSummary(null);
    setScreen('hub');
  }, []);

  const handleModeFinish = useCallback(
    (
      result: GameSessionResult,
      extra?: { flagBuilderSolvedDelta?: number; memoryCompletedDelta?: number }
    ) => {
      CrazyGamesSDK.gameplayStop();
      setSaveData((prev) => {
        const bestScoreBefore = prev.bestScores[result.modeId] ?? 0;
        const { nextSave, newlyUnlocked, prevLevel, newLevel } = applySessionResult(
          prev,
          result,
          extra
        );
        const leveledUp = newLevel > prevLevel;

        if (newlyUnlocked.length > 0) {
          window.setTimeout(() => AudioManager.playAchievement(), 280);
        } else if (leveledUp) {
          window.setTimeout(() => AudioManager.playLevelUp(), 280);
        }
        if (result.isPerfect || leveledUp || newlyUnlocked.length > 0) {
          CrazyGamesSDK.happytime();
        }

        setSessionSummary({
          result,
          bestScoreBefore,
          newlyUnlocked,
          leveledUp,
          newLevel,
        });
        return nextSave;
      });
    },
    []
  );

  const handlePlayAgain = useCallback(async () => {
    await CrazyGamesSDK.requestMidgameAd();
    setSessionSummary(null);
    setCopiedShare(false);
    setRewardDoubled(false);
    setSessionKey((k) => k + 1);
    CrazyGamesSDK.gameplayStart();
  }, []);

  const handleWatchRewardedDoubleCoins = useCallback(async () => {
    if (!sessionSummary || rewardDoubled || rewardAdBusy) return;
    const bonusCoins = sessionSummary.result.coinsEarned;
    if (bonusCoins <= 0) return;

    setRewardAdBusy(true);
    const rewarded = await CrazyGamesSDK.requestRewardedAd();
    setRewardAdBusy(false);

    if (rewarded) {
      AudioManager.playReward();
      setRewardDoubled(true);
      setSaveData((prev) => ({
        ...prev,
        coins: prev.coins + bonusCoins,
      }));
    }
  }, [sessionSummary, rewardDoubled, rewardAdBusy]);

  const handleHoverGlobeCountry = useCallback(
    (country: Country | null, pos?: { x: number; y: number }) => {
      if (country && pos) {
        setHoveredExploreCountry({ country, x: pos.x, y: pos.y });
      } else {
        setHoveredExploreCountry(null);
      }
    },
    []
  );

  const handleSelectGlobeCountry = useCallback((country: Country | null) => {
    if (country) {
      AudioManager.playClick();
    }
    setSelectedExploreCountry(country);
  }, []);

  const handleOpenCountryDetails = useCallback((country: Country) => {
    AudioManager.playClick();
    setAtlasCountry(country);
    setSelectedExploreCountry(null);
    setHoveredExploreCountry(null);
    setScreen('collection');
  }, []);

  const handleOnlineMatchRewards = useCallback(
    (reward: {
      xpEarned: number;
      coinsEarned: number;
      won: boolean;
      score: number;
      correctCount: number;
      answeredCount: number;
      bestStreak: number;
    }) => {
      setSaveData((prev) => ({
        ...prev,
        xp: prev.xp + reward.xpEarned,
        coins: prev.coins + reward.coinsEarned,
        totalQuestions: prev.totalQuestions + reward.answeredCount,
        totalCorrect: prev.totalCorrect + reward.correctCount,
        bestStreak: Math.max(prev.bestStreak, reward.bestStreak),
      }));
    },
    []
  );

  const rewardReady = canClaimDailyReward(saveData);

  const globeMode: GlobeViewMode =
    screen === 'intro'
      ? 'intro'
      : screen === 'explore'
        ? 'explore'
        : screen === 'hub'
          ? 'hub'
          : 'paused-bg';

  const renderActiveMode = () => {
    const commonProps = {
      difficulty: selectedDifficulty,
      muted: saveData.settings.muted,
      onToggleMute: handleToggleMute,
      onExit: handleExitGameplay,
    };

    switch (activeModeId) {
      case 'flag-master':
        return <FlagMasterMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'country-to-flag':
        return <CountryToFlagMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'world-map':
        return <WorldMapMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'capital-hunter':
        return <CapitalHunterMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'flag-memory':
        return <FlagMemoryMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'flag-builder':
        return <FlagBuilderMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'country-silhouette':
        return <CountrySilhouetteMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'flag-battle':
        return <FlagBattleMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'true-false':
        return <TrueFalseMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'flag-match':
        return <FlagMatchMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'continent-quest':
        return <ContinentQuestMode key={sessionKey} {...commonProps} onFinish={handleModeFinish} />;
      case 'daily-challenge':
        return (
          <DailyChallengeMode
            key={sessionKey}
            {...commonProps}
            dailyStreak={saveData.dailyChallenge.streak}
            onFinish={handleModeFinish}
          />
        );
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#060B16] text-slate-100">
      {/* Persistent Three.js Interactive 3D Globe Layer */}
      <GlobeCanvas
        mode={globeMode}
        highQuality={saveData.settings.graphicsQuality === 'high'}
        reducedMotion={saveData.settings.reducedMotion}
        discoveredCountries={saveData.discoveredCountries}
        selectedCountry={screen === 'explore' ? selectedExploreCountry : null}
        visualOptions={globeVisualOptions}
        onSelectCountry={screen === 'explore' ? handleSelectGlobeCountry : undefined}
        onHoverCountry={screen === 'explore' ? handleHoverGlobeCountry : undefined}
        onOpenCountryDetails={handleOpenCountryDetails}
      />

      {/* Cinematic Intro Overlay */}
      {screen === 'intro' && (
        <CinematicIntro
          onComplete={handleIntroComplete}
          reducedMotion={saveData.settings.reducedMotion}
        />
      )}

      {/* Top Navigation Chrome (Hidden during Intro & Active Gameplay for clean viewport) */}
      {screen !== 'intro' && screen !== 'play' && (
        <TopNav
          activeScreen={screen}
          saveData={saveData}
          onNavigate={handleNavigate}
          onQuickPlay={() => handleStartMode('flag-master')}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          canClaimReward={rewardReady}
        />
      )}

      {/* Screen Router */}
      {screen === 'hub' && (
        <MainMenuHub
          saveData={saveData}
          selectedDifficulty={selectedDifficulty}
          onChangeDifficulty={setSelectedDifficulty}
          onStartMode={handleStartMode}
          onOpenOnlineArena={() => handleNavigate('online')}
          onExploreWorld={() => handleNavigate('explore')}
          onOpenDailyReward={() => setProfileOpen(true)}
          canClaimReward={rewardReady}
        />
      )}

      {screen === 'online' && (
        <OnlineArenaView
          saveData={saveData}
          initialFriendCode={initialFriendCode}
          onConsumeInitialFriendCode={() => setInitialFriendCode(null)}
          onBackHome={() => handleNavigate('hub')}
          onMatchRewardsEarned={handleOnlineMatchRewards}
        />
      )}

      {screen === 'explore' && (
        <WorldExploreView
          discoveredCountries={saveData.discoveredCountries}
          selectedCountry={selectedExploreCountry}
          hoveredCountry={hoveredExploreCountry}
          visualOptions={globeVisualOptions}
          onChangeVisualOptions={(next) =>
            setGlobeVisualOptions((prev) => ({ ...prev, ...next }))
          }
          onSelectCountry={handleSelectGlobeCountry}
          onBackHome={() => handleNavigate('hub')}
          onPlayFlagMaster={() => handleStartMode('flag-master')}
          onOpenCountryDetails={handleOpenCountryDetails}
        />
      )}

      {screen === 'collection' && (
        <CollectionView
          saveData={saveData}
          initialCountry={atlasCountry}
          onConsumeInitialCountry={() => setAtlasCountry(null)}
        />
      )}

      {screen === 'achievements' && <AchievementsView saveData={saveData} />}

      {screen === 'statistics' && <StatisticsView saveData={saveData} />}

      {screen === 'play' && (
        <main className="relative z-20 mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
          {sessionSummary ? (
            <GameResultsView
              result={sessionSummary.result}
              bestScoreBefore={sessionSummary.bestScoreBefore}
              newlyUnlocked={sessionSummary.newlyUnlocked}
              leveledUp={sessionSummary.leveledUp}
              newLevel={sessionSummary.newLevel}
              onPlayAgain={handlePlayAgain}
              onReturnToModes={handleExitGameplay}
              extraAction={
                <>
                  {sdkActive &&
                    sessionSummary.result.coinsEarned > 0 &&
                    !rewardDoubled && (
                      <button
                        type="button"
                        disabled={rewardAdBusy}
                        onClick={handleWatchRewardedDoubleCoins}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/55 bg-amber-400/15 px-5 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-400/25 disabled:opacity-50 cursor-pointer"
                      >
                        <Coins className="h-4 w-4 text-amber-300" />
                        <span>
                          {rewardAdBusy
                            ? 'Loading Ad...'
                            : `Watch Ad · +${sessionSummary.result.coinsEarned} Coins`}
                        </span>
                      </button>
                    )}

                  {rewardDoubled && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300">
                      <Check className="h-4 w-4" />
                      <span>2× Coins Claimed!</span>
                    </span>
                  )}

                  {sessionSummary.result.modeId === 'daily-challenge' &&
                    sessionSummary.result.extraLabel && (
                      <button
                        type="button"
                        onClick={() => {
                          const text = sessionSummary.result.extraLabel!;
                          navigator.clipboard?.writeText(text).catch(() => {});
                          AudioManager.playClick();
                          setCopiedShare(true);
                          window.setTimeout(() => setCopiedShare(false), 2400);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/15 px-5 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 cursor-pointer"
                      >
                        {copiedShare ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span>Copied Summary!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span>Share Daily Result</span>
                          </>
                        )}
                      </button>
                    )}
                </>
              }
            />
          ) : (
            renderActiveMode()
          )}
        </main>
      )}

      {/* Global Settings & Explorer Profile Modals */}
      {settingsOpen && (
        <SettingsModal
          settings={saveData.settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={() => setSaveData(clearSaveData())}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {profileOpen && (
        <ProfileModal
          saveData={saveData}
          canClaimReward={rewardReady}
          onClaimReward={() => {
            const claimed = claimDailyReward(saveData);
            if (claimed.coinsAwarded > 0) {
              setSaveData(claimed.nextSave);
            }
            return {
              coinsAwarded: claimed.coinsAwarded,
              xpAwarded: claimed.xpAwarded,
              dayNumber: claimed.dayNumber,
            };
          }}
          onUpdateProfile={(playerName, avatarCode) =>
            setSaveData((prev) => ({ ...prev, playerName, avatarCode }))
          }
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}
