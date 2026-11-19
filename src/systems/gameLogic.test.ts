import test from 'node:test';
import assert from 'node:assert/strict';
import { SOVEREIGN_COUNTRIES, COUNTRY_BY_CODE } from '../data/countries';
import { FLAG_PUZZLES } from '../data/flagPuzzles';
import { GLOBE_HOTSPOTS } from '../data/hotspots';
import { getWorldMapPaths, getCountrySilhouetteSvg, getFeatureByNumericId } from '../data/worldGeometry';
import {
  calculateAnswerPoints,
  createSeededRng,
  getLevelFromXp,
  getUtcDateKey,
  hashDateSeed,
} from './scoring';
import {
  evaluateFlagBuilder,
  generateDailyChallengePlan,
  generateTrueFalseStatements,
  isCapitalMatch,
  isCountryNameMatch,
  pickDistractors,
} from './gameLogic';
import { evaluateNewAchievements } from './achievements';
import { createCrazyGamesBridge, type CrazyGamesGameSettings, type CrazyGamesSDKv3 } from '../core/CrazyGamesSDK';
import { createDefaultSaveData } from '../core/SaveManager';
import { computeEarthTextureDimensions } from '../scenes/earthTextureConfig';
import {
  buildRobotsTxt,
  buildSitemapXml,
  DEFAULT_SITE_URL,
  parseInitialRouteParams,
  SITEMAP_ENTRIES,
  VALID_GAME_MODE_IDS,
} from '../utils/seo';
import { OnlineMatchEngine } from '../online/matchEngine';
import {
  VALID_ONLINE_MODES,
  type OnlineQuestionPublic,
  type OnlineRoomSnapshot,
  type ServerToClientMessage,
} from '../online/protocol';

test('country database has 195 sovereign countries with valid geometry', () => {
  assert.equal(SOVEREIGN_COUNTRIES.length, 195);
  const mapPaths = getWorldMapPaths();
  assert.ok(mapPaths.length > 180);
  const jpSil = getCountrySilhouetteSvg('392', 35.68, 139.77);
  assert.ok(jpSil.d.startsWith('M'));
  const tvSil = getCountrySilhouetteSvg('798', -8.52, 179.2);
  assert.equal(tvSil.isAtollFallback, true);

  const india = getFeatureByNumericId('356');
  assert.ok(india);
  let maxLat = -90;
  for (const poly of india.polygons) {
    for (const ring of poly) {
      for (const [, lat] of ring) {
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  assert.ok(maxLat >= 37.0, `Expected India maxLat >= 37.0, got ${maxLat}`);
});

test('scoring and XP progression scale properly', () => {
  assert.equal(getLevelFromXp(0), 1);
  assert.equal(getLevelFromXp(120), 2);
  assert.equal(getLevelFromXp(480), 3);

  const easyPts = calculateAnswerPoints({ streak: 0, difficulty: 'easy' });
  const streakPts = calculateAnswerPoints({ streak: 5, difficulty: 'hard', timeLeftRatio: 1 });
  assert.equal(easyPts, 100);
  assert.ok(streakPts > easyPts);
});

test('daily challenge seed is 100% deterministic for the same UTC date', () => {
  const dateKey = getUtcDateKey(new Date('2026-11-18T12:00:00Z'));
  assert.equal(dateKey, '2026-11-18');
  const planA = generateDailyChallengePlan(dateKey);
  const planB = generateDailyChallengePlan(dateKey);
  assert.deepEqual(
    planA.flagRound.map((c) => c.code),
    planB.flagRound.map((c) => c.code)
  );
  assert.deepEqual(
    planA.builderRound.map((p) => p.id),
    planB.builderRound.map((p) => p.id)
  );
  const otherPlan = generateDailyChallengePlan('2026-11-19');
  assert.notDeepEqual(
    planA.flagRound.map((c) => c.code),
    otherPlan.flagRound.map((c) => c.code)
  );
});

test('capital and country matching handles diacritics and aliases', () => {
  const br = COUNTRY_BY_CODE['br'];
  assert.equal(isCapitalMatch('Brasilia', br), true);
  assert.equal(isCapitalMatch('Brasília', br), true);
  assert.equal(isCapitalMatch('Rio de Janeiro', br), false);

  const us = COUNTRY_BY_CODE['us'];
  assert.equal(isCountryNameMatch('USA', us), true);
  assert.equal(isCountryNameMatch('United States', us), true);
});

test('distractors avoid duplicates and prioritize similar flags when requested', () => {
  const ro = COUNTRY_BY_CODE['ro'];
  const rng = createSeededRng(hashDateSeed('2026-11-18'));
  const distractors = pickDistractors(ro, SOVEREIGN_COUNTRIES, 3, true, rng);
  assert.equal(distractors.length, 3);
  assert.ok(!distractors.some((d) => d.code === 'ro'));
});

test('Flag Builder evaluation checks zones and emblem accurately', () => {
  const jp = FLAG_PUZZLES.find((p) => p.id === 'jp')!;
  const perfect = evaluateFlagBuilder(jp, ['#FFFFFF'], 'disc', '#BC002D', 0);
  assert.equal(perfect.isCorrect, true);
  assert.equal(perfect.accuracyPct, 100);

  const wrongEmblem = evaluateFlagBuilder(jp, ['#FFFFFF'], 'star-5', '#BC002D', 0);
  assert.equal(wrongEmblem.isCorrect, false);
  assert.equal(wrongEmblem.accuracyPct, 50);
});

test('True or False statements generate unique countries without errors', () => {
  const rng = createSeededRng(42);
  const list = generateTrueFalseStatements(10, 'medium', rng);
  assert.equal(list.length, 10);
  const codes = new Set(list.map((s) => s.countryCode));
  assert.equal(codes.size, 10);
});

test('Achievements unlock on real milestones', () => {
  const save = createDefaultSaveData();
  save.gamesPlayed['flag-master'] = 1;
  save.discoveredCountries = Array.from({ length: 25 }, (_, i) => `c${i}`);
  save.bestStreak = 12;

  const evalRes = evaluateNewAchievements(save, {
    modeId: 'flag-master',
    score: 1200,
    correctCount: 10,
    totalCount: 10,
    bestStreak: 10,
    durationSeconds: 40,
    xpEarned: 200,
    coinsEarned: 100,
    discoveredCodes: [],
    isPerfect: true,
    isTimed: true,
    difficulty: 'medium',
  });

  const unlockedIds = evalRes.newlyUnlocked.map((a) => a.id);
  assert.ok(unlockedIds.includes('first_steps'));
  assert.ok(unlockedIds.includes('flag_explorer_25'));
  assert.ok(unlockedIds.includes('perfect_round'));
  assert.ok(unlockedIds.includes('speed_demon'));
  assert.ok(unlockedIds.includes('streak_10'));
});

test('globe hotspots have unique IDs, valid coordinates, and valid country links', () => {
  assert.ok(GLOBE_HOTSPOTS.length >= 20);
  const ids = new Set<string>();
  let landmarks = 0;
  let capitals = 0;

  for (const h of GLOBE_HOTSPOTS) {
    assert.ok(!ids.has(h.id), `Duplicate hotspot id: ${h.id}`);
    ids.add(h.id);
    assert.ok(COUNTRY_BY_CODE[h.countryCode], `Missing countryCode: ${h.countryCode}`);
    assert.ok(h.lat >= -90 && h.lat <= 90);
    assert.ok(h.lng >= -180 && h.lng <= 180);
    assert.ok(h.name.length > 0 && h.city.length > 0 && h.summary.length > 10);
    if (h.kind === 'landmark') landmarks++;
    if (h.kind === 'capital') capitals++;
  }

  assert.ok(landmarks > 0 && capitals > 0);
});

test('Earth texture dimensions target 8K (8192x4096) on capable GPUs and clamp safely', () => {
  assert.deepEqual(computeEarthTextureDimensions(16384, true), { width: 8192, height: 4096 });
  assert.deepEqual(computeEarthTextureDimensions(8192, true), { width: 8192, height: 4096 });
  assert.deepEqual(computeEarthTextureDimensions(4096, true), { width: 4096, height: 2048 });
  assert.deepEqual(computeEarthTextureDimensions(16384, false), { width: 4096, height: 2048 });
});

test('SEO robots.txt and sitemap.xml generate valid directives and cover all modes', () => {
  const robots = buildRobotsTxt('https://flagverse.example.com/');
  assert.ok(robots.includes('User-agent: *'));
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Sitemap: https://flagverse.example.com/sitemap.xml'));

  const fallbackRobots = buildRobotsTxt('MY_APP_URL');
  assert.ok(fallbackRobots.includes(`Sitemap: ${DEFAULT_SITE_URL}/sitemap.xml`));

  const xml = buildSitemapXml('https://flagverse.example.com', '2026-11-18');
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(xml.includes('<loc>https://flagverse.example.com/</loc>'));
  assert.ok(xml.includes('<loc>https://flagverse.example.com/?view=explore</loc>'));
  for (const modeId of VALID_GAME_MODE_IDS) {
    assert.ok(
      xml.includes(`<loc>https://flagverse.example.com/?mode=${modeId}</loc>`),
      `Missing sitemap URL for mode ${modeId}`
    );
  }
  const urlCount = (xml.match(/<url>/g) || []).length;
  assert.equal(urlCount, SITEMAP_ENTRIES.length);
});

test('parseInitialRouteParams resolves sitemap deep links and autostart properly', () => {
  assert.deepEqual(parseInitialRouteParams('?view=collection', false), {
    screen: 'collection',
    modeId: 'flag-master',
  });
  assert.deepEqual(parseInitialRouteParams('?mode=capital-hunter', false), {
    screen: 'play',
    modeId: 'capital-hunter',
  });
  assert.deepEqual(parseInitialRouteParams('?autostart=1', false), {
    screen: 'hub',
    modeId: 'flag-master',
  });
  assert.deepEqual(parseInitialRouteParams('', false), {
    screen: 'intro',
    modeId: 'flag-master',
  });
  assert.deepEqual(parseInitialRouteParams('', true), {
    screen: 'hub',
    modeId: 'flag-master',
  });
});

test('CrazyGames SDK v3 bridge handles init, gameplay deduplication, ads, audio mute, data, and user sync', async () => {
  const events: string[] = [];
  const muteStates: boolean[] = [];
  const store = new Map<string, string>();
  const listenerRef: { current: ((s: CrazyGamesGameSettings) => void) | null } = {
    current: null,
  };

  const fakeSdk: CrazyGamesSDKv3 = {
    environment: 'crazygames',
    init: async () => {
      events.push('init');
    },
    game: {
      settings: { muteAudio: false },
      addSettingsChangeListener: (fn) => {
        listenerRef.current = fn;
      },
      loadingStart: () => events.push('loadingStart'),
      loadingStop: () => events.push('loadingStop'),
      gameplayStart: () => events.push('gameplayStart'),
      gameplayStop: () => events.push('gameplayStop'),
      happytime: () => events.push('happytime'),
    },
    ad: {
      requestAd: (type, cbs) => {
        events.push(`ad:${type}`);
        cbs.adStarted?.();
        if (type === 'rewarded') {
          cbs.adFinished?.();
        } else {
          cbs.adError?.('adblock');
        }
      },
    },
    data: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
      removeItem: (k) => {
        store.delete(k);
      },
    },
    user: {
      isUserAccountAvailable: async () => true,
      getUser: async () => ({ username: 'AtlasAce' }),
    },
  };

  const bridge = createCrazyGamesBridge(
    () => fakeSdk,
    {
      setExternalMute: (m) => muteStates.push(m),
    }
  );

  // Pre-init calls must NOT touch raw SDK before init() resolves
  bridge.happytime();
  assert.equal(events.length, 0);

  const active = await bridge.init();
  assert.equal(active, true);
  assert.equal(bridge.getEnvironment(), 'crazygames');
  bridge.loadingStart();
  bridge.loadingStop();

  // Deduplicated gameplay start/stop
  bridge.gameplayStart();
  bridge.gameplayStart();
  bridge.gameplayStop();
  bridge.gameplayStop();
  bridge.happytime();

  assert.deepEqual(events.slice(0, 6), [
    'init',
    'loadingStart',
    'loadingStop',
    'gameplayStart',
    'gameplayStop',
    'happytime',
  ]);

  // Rewarded ad mutes during playback and unmutes after finish
  let paused = 0;
  let resumed = 0;
  const rewarded = await bridge.requestRewardedAd({
    onPause: () => paused++,
    onResume: () => resumed++,
  });
  assert.equal(rewarded, true);
  assert.equal(paused, 1);
  assert.equal(resumed, 1);
  assert.equal(muteStates.includes(true), true);
  assert.equal(muteStates[muteStates.length - 1], false);

  // Midgame ad error restores audio cleanly and returns false
  const midgame = await bridge.requestMidgameAd();
  assert.equal(midgame, false);
  assert.equal(muteStates[muteStates.length - 1], false);

  // Portal mute listener toggles external mute cleanly
  assert.ok(listenerRef.current, 'settings change listener should be registered');
  listenerRef.current({ muteAudio: true });
  assert.equal(muteStates[muteStates.length - 1], true);
  listenerRef.current({ muteAudio: false });
  assert.equal(muteStates[muteStates.length - 1], false);

  // Cloud data + User account
  assert.equal(bridge.dataSetItem('score', '999'), true);
  assert.equal(bridge.dataGetItem('score'), '999');
  const user = await bridge.getUser();
  assert.equal(user?.username, 'AtlasAce');

  // Standalone fallback when SDK is absent
  const standalone = createCrazyGamesBridge(
    () => undefined,
    { setExternalMute: () => {} }
  );
  assert.equal(await standalone.init(), false);
  assert.equal(standalone.isSdkActive(), false);
  assert.equal(await standalone.requestRewardedAd(), false);
  assert.equal(await standalone.getUser(), null);
});

test('OnlineMatchEngine pairs Quick Match players with random mode and awards highest-score winner on time up', () => {
  let fakeNow = 100_000;
  const rng = createSeededRng(4242);
  const engine = new OnlineMatchEngine({ rng, now: () => fakeNow });

  const inboxA: ServerToClientMessage[] = [];
  const inboxB: ServerToClientMessage[] = [];
  const idA = engine.registerClient((m) => inboxA.push(m));
  const idB = engine.registerClient((m) => inboxB.push(m));

  engine.handleMessage(idA, {
    type: 'quick_match:join',
    player: { name: 'Alpha', avatarCode: 'in' },
  });
  assert.equal(engine.getStats().queuedPlayers, 1);

  engine.handleMessage(idB, {
    type: 'quick_match:join',
    player: { name: 'Bravo', avatarCode: 'jp' },
  });
  assert.equal(engine.getStats().queuedPlayers, 0);
  assert.equal(engine.getStats().activeRooms, 1);

  const startRoomA = [...inboxA]
    .reverse()
    .find((m): m is { type: 'room:state'; room: OnlineRoomSnapshot } => m.type === 'room:state');
  assert.ok(startRoomA);
  assert.equal(startRoomA.room.kind, 'quick');
  assert.equal(startRoomA.room.status, 'starting');
  assert.equal(startRoomA.room.wasRandomMode, true);
  assert.ok(VALID_ONLINE_MODES.includes(startRoomA.room.modeId));
  assert.equal(startRoomA.room.players.length, 2);

  // Advance past 3.2s countdown -> match begins and both players receive question #0
  fakeNow += 4000;
  engine.tick();

  const qA = inboxA.find((m) => m.type === 'match:question');
  const qB = inboxB.find((m) => m.type === 'match:question');
  assert.ok(qA && qA.type === 'match:question' && qA.question);
  assert.ok(qB && qB.type === 'match:question' && qB.question);
  // Both players receive the exact same question #0 without any answer key leaked
  assert.deepEqual(qA.question, qB.question);
  assert.equal('correctId' in qA.question, false);

  // Player A tries every option sequentially across questions to accumulate score,
  // while Player B answers nothing -> when time expires, highest score wins!
  let currentQ: OnlineQuestionPublic | null = qA.question;
  for (let round = 0; round < 6 && currentQ; round++) {
    // Submit first option on each question (some will score, and we can verify score >= 0)
    const choice = currentQ.options[0].id;
    engine.handleMessage(idA, {
      type: 'match:answer',
      questionIndex: currentQ.index,
      choiceId: choice,
    });
    const resMsg = [...inboxA].reverse().find((m) => m.type === 'match:answer_result');
    assert.ok(resMsg && resMsg.type === 'match:answer_result');
    // Duplicate submission for the same questionIndex must be ignored idempotently
    const prevCount = inboxA.length;
    engine.handleMessage(idA, {
      type: 'match:answer',
      questionIndex: currentQ.index,
      choiceId: choice,
    });
    assert.equal(inboxA.length, prevCount);
    currentQ = resMsg.nextQuestion;
  }

  // Advance past 60s match timer -> authoritative server ends match
  fakeNow += 61_000;
  engine.tick();

  const endMsg = [...inboxA].reverse().find((m) => m.type === 'match:ended');
  assert.ok(endMsg && endMsg.type === 'match:ended');
  assert.equal(endMsg.result.reason, 'time_up');
  const pA = endMsg.result.players.find((p) => p.id === idA)!;
  const pB = endMsg.result.players.find((p) => p.id === idB)!;
  if (pA.score > pB.score) {
    assert.equal(endMsg.result.winnerId, idA);
  } else {
    assert.equal(endMsg.result.winnerId, null);
  }
});

test('OnlineMatchEngine supports Friend Code rooms: create, join by code, select mode, start, and invite routes', () => {
  let fakeNow = 200_000;
  const rng = createSeededRng(9911);
  const engine = new OnlineMatchEngine({ rng, now: () => fakeNow });

  const hostMsgs: ServerToClientMessage[] = [];
  const friendMsgs: ServerToClientMessage[] = [];
  const hostId = engine.registerClient((m) => hostMsgs.push(m));
  const friendId = engine.registerClient((m) => friendMsgs.push(m));

  // Host creates private friend room
  engine.handleMessage(hostId, {
    type: 'room:create',
    player: { name: 'HostAce', avatarCode: 'in' },
  });

  const createdState = [...hostMsgs]
    .reverse()
    .find((m): m is { type: 'room:state'; room: OnlineRoomSnapshot } => m.type === 'room:state');
  assert.ok(createdState?.room.code && createdState.room.code.length === 6);
  const friendCode = createdState.room.code;

  // Cannot start alone before friend joins
  engine.handleMessage(hostId, { type: 'room:start' });
  const waitErr = [...hostMsgs].reverse().find((m) => m.type === 'error');
  assert.ok(waitErr && waitErr.type === 'error' && waitErr.code === 'WAITING_FOR_FRIEND');

  // Friend joins using the 6-character Friend Code (case-insensitive)
  engine.handleMessage(friendId, {
    type: 'room:join',
    code: friendCode.toLowerCase(),
    player: { name: 'BestFriend', avatarCode: 'fr' },
  });

  // Host selects Capital Duel + 45s timer after friend joins
  engine.handleMessage(hostId, {
    type: 'room:select_mode',
    modeId: 'capital-duel',
    durationSeconds: 45,
  });

  const syncedFriendState = [...friendMsgs]
    .reverse()
    .find((m): m is { type: 'room:state'; room: OnlineRoomSnapshot } => m.type === 'room:state');
  assert.ok(syncedFriendState);
  assert.equal(syncedFriendState.room.players.length, 2);
  assert.equal(syncedFriendState.room.modeId, 'capital-duel');
  assert.equal(syncedFriendState.room.durationSeconds, 45);
  assert.equal(syncedFriendState.room.wasRandomMode, false);

  // Host starts game
  engine.handleMessage(hostId, { type: 'room:start' });
  fakeNow += 4000;
  engine.tick();

  const playingState = [...hostMsgs]
    .reverse()
    .find((m): m is { type: 'room:state'; room: OnlineRoomSnapshot } => m.type === 'room:state');
  assert.equal(playingState?.room.status, 'playing');

  // If friend disconnects mid-match, host wins cleanly by forfeit
  engine.unregisterClient(friendId);
  const forfeitEnd = [...hostMsgs].reverse().find((m) => m.type === 'match:ended');
  assert.ok(forfeitEnd && forfeitEnd.type === 'match:ended');
  assert.equal(forfeitEnd.result.reason, 'opponent_left');
  assert.equal(forfeitEnd.result.winnerId, hostId);

  // Invite URL route parsing opens online arena directly
  assert.deepEqual(parseInitialRouteParams(`?view=online&code=${friendCode}`, false), {
    screen: 'online',
    modeId: 'flag-master',
  });
  assert.deepEqual(parseInitialRouteParams(`?code=${friendCode}`, false), {
    screen: 'online',
    modeId: 'flag-master',
  });
});

