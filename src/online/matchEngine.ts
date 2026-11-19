import { COUNTRY_BY_CODE, SOVEREIGN_COUNTRIES } from '../data/countries.ts';
import type { Country } from '../types/game.ts';
import {
  VALID_MATCH_DURATIONS,
  VALID_ONLINE_MODES,
  type ClientToServerMessage,
  type MatchDurationSeconds,
  type OnlineBattleModeId,
  type OnlineMatchResultSummary,
  type OnlinePlayerPublic,
  type OnlineQuestionKind,
  type OnlineQuestionOption,
  type OnlineQuestionPublic,
  type OnlineRoomKind,
  type OnlineRoomSnapshot,
  type OnlineRoomStatus,
  type OnlineStatsSnapshot,
  type PlayerIdentityPayload,
  type ServerToClientMessage,
} from './protocol.ts';

interface OnlineQuestionInternal extends OnlineQuestionPublic {
  correctId: string;
}

interface InternalPlayer {
  id: string;
  name: string;
  avatarCode: string;
  isHost: boolean;
  connected: boolean;
  score: number;
  correctCount: number;
  answeredCount: number;
  streak: number;
  bestStreak: number;
  currentQuestionIndex: number;
  rematchReady: boolean;
}

interface InternalRoom {
  roomId: string;
  code: string | null;
  kind: OnlineRoomKind;
  status: OnlineRoomStatus;
  modeId: OnlineBattleModeId;
  wasRandomMode: boolean;
  durationSeconds: MatchDurationSeconds;
  countdownEndsAt: number | null;
  endsAt: number | null;
  players: InternalPlayer[];
  deck: OnlineQuestionInternal[];
  result: OnlineMatchResultSummary | null;
}

interface ConnectedClient {
  id: string;
  name: string;
  avatarCode: string;
  roomId: string | null;
  queuedAt: number | null;
  send: (msg: ServerToClientMessage) => void;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DECK_SIZE = 60;
const COUNTDOWN_MS = 3200;
const DEFAULT_QUICK_DURATION: MatchDurationSeconds = 60;

const CONTINENTS = ['Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'] as const;

function sanitizeName(raw: string | undefined): string {
  const cleaned = (raw || '').replace(/[^\p{L}\p{N}\s._-]/gu, '').trim().slice(0, 20);
  return cleaned || 'Explorer';
}

function sanitizeAvatar(raw: string | undefined): string {
  const code = (raw || 'un').toLowerCase().trim();
  return COUNTRY_BY_CODE[code] ? code : 'jp';
}

function sanitizeDuration(raw: number | undefined): MatchDurationSeconds {
  if (raw === 45 || raw === 60 || raw === 90) return raw;
  return 60;
}

function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDistractorCountries(
  target: Country,
  count: number,
  preferSimilar: boolean,
  rng: () => number
): Country[] {
  const chosen: Country[] = [];
  const used = new Set<string>([target.code]);

  if (preferSimilar && target.similarCodes?.length) {
    for (const simCode of shuffleWithRng(target.similarCodes, rng)) {
      if (chosen.length >= count) break;
      const found = COUNTRY_BY_CODE[simCode];
      if (found && !used.has(found.code) && !found.isTerritory) {
        chosen.push(found);
        used.add(found.code);
      }
    }
  }

  if (chosen.length < count) {
    const related = shuffleWithRng(
      SOVEREIGN_COUNTRIES.filter(
        (c) =>
          !used.has(c.code) &&
          (c.continent === target.continent || c.colors.some((col) => target.colors.includes(col)))
      ),
      rng
    );
    for (const c of related) {
      if (chosen.length >= count) break;
      chosen.push(c);
      used.add(c.code);
    }
  }

  if (chosen.length < count) {
    const fallback = shuffleWithRng(
      SOVEREIGN_COUNTRIES.filter((c) => !used.has(c.code)),
      rng
    );
    for (const c of fallback) {
      if (chosen.length >= count) break;
      chosen.push(c);
      used.add(c.code);
    }
  }

  return chosen;
}

export function buildOnlineQuestionDeck(
  modeId: OnlineBattleModeId,
  count = DECK_SIZE,
  rng: () => number = Math.random
): OnlineQuestionInternal[] {
  const pool = shuffleWithRng(SOVEREIGN_COUNTRIES, rng);
  const mixKinds: OnlineQuestionKind[] = [
    'flag-rush',
    'country-to-flag',
    'capital-duel',
    'true-false-blitz',
  ];
  const questions: OnlineQuestionInternal[] = [];

  for (let i = 0; i < count; i++) {
    const country = pool[i % pool.length];
    const kind: OnlineQuestionKind =
      modeId === 'world-mix' ? mixKinds[i % mixKinds.length] : modeId;

    if (kind === 'flag-rush') {
      const distractors = pickDistractorCountries(country, 3, true, rng);
      const options: OnlineQuestionOption[] = shuffleWithRng(
        [country, ...distractors].map((c) => ({ id: c.code, label: c.name })),
        rng
      );
      questions.push({
        index: i,
        kind,
        prompt: 'Which country does this flag belong to?',
        subPrompt: country.continent,
        flagCode: country.code,
        options,
        correctId: country.code,
      });
    } else if (kind === 'country-to-flag') {
      const distractors = pickDistractorCountries(country, 3, true, rng);
      const options: OnlineQuestionOption[] = shuffleWithRng(
        [country, ...distractors].map((c) => ({
          id: c.code,
          label: c.name,
          flagCode: c.code,
        })),
        rng
      );
      questions.push({
        index: i,
        kind,
        prompt: country.name,
        subPrompt: `Select the official flag · ${country.continent}`,
        options,
        correctId: country.code,
      });
    } else if (kind === 'capital-duel') {
      const distractors = pickDistractorCountries(country, 3, false, rng);
      const options: OnlineQuestionOption[] = shuffleWithRng(
        [country, ...distractors].map((c) => ({ id: c.code, label: c.capital })),
        rng
      );
      questions.push({
        index: i,
        kind,
        prompt: `What is the capital of ${country.name}?`,
        subPrompt: country.continent,
        flagCode: country.code,
        options,
        correctId: country.code,
      });
    } else {
      // true-false-blitz
      const roll = rng();
      const makeTrue = rng() < 0.5;
      let statement = '';
      let isTrueStatement = makeTrue;
      if (roll < 0.45) {
        if (makeTrue) {
          statement = `${country.capital} is the capital of ${country.name}.`;
        } else {
          const fake =
            pool.find((c) => c.code !== country.code && c.continent === country.continent) ||
            pool[(i + 1) % pool.length];
          statement = `${fake.capital} is the capital of ${country.name}.`;
        }
      } else if (roll < 0.8) {
        if (makeTrue) {
          statement = `${country.name} is located in ${country.continent}.`;
        } else {
          const wrongConts = CONTINENTS.filter((ct) => ct !== country.continent);
          const wrong = wrongConts[Math.floor(rng() * wrongConts.length)];
          statement = `${country.name} is located in ${wrong}.`;
        }
      } else {
        const allCols = ['red', 'blue', 'white', 'green', 'yellow', 'black'] as const;
        const missing = allCols.find((col) => !country.colors.includes(col));
        if (makeTrue || !missing) {
          statement = `The flag of ${country.name} includes the color ${country.colors[0]}.`;
          isTrueStatement = true;
        } else {
          statement = `The flag of ${country.name} includes the color ${missing}.`;
          isTrueStatement = false;
        }
      }

      questions.push({
        index: i,
        kind,
        prompt: statement,
        subPrompt: 'True or False?',
        flagCode: roll < 0.8 ? country.code : undefined,
        options: [
          { id: 'true', label: 'TRUE' },
          { id: 'false', label: 'FALSE' },
        ],
        correctId: isTrueStatement ? 'true' : 'false',
      });
    }
  }

  return questions;
}

function toPublicQuestion(q: OnlineQuestionInternal | undefined): OnlineQuestionPublic | null {
  if (!q) return null;
  const { correctId: _strip, ...pub } = q;
  return pub;
}

function toPublicPlayer(p: InternalPlayer): OnlinePlayerPublic {
  return {
    id: p.id,
    name: p.name,
    avatarCode: p.avatarCode,
    isHost: p.isHost,
    connected: p.connected,
    score: p.score,
    correctCount: p.correctCount,
    answeredCount: p.answeredCount,
    streak: p.streak,
    bestStreak: p.bestStreak,
    currentQuestionIndex: p.currentQuestionIndex,
    rematchReady: p.rematchReady,
  };
}

export class OnlineMatchEngine {
  private readonly clients = new Map<string, ConnectedClient>();
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly roomByCode = new Map<string, string>();
  private readonly quickQueue: string[] = [];
  private readonly rng: () => number;
  private readonly nowFn: () => number;
  private nextIdSeq = 1;

  constructor(options?: { rng?: () => number; now?: () => number }) {
    this.rng = options?.rng || Math.random;
    this.nowFn = options?.now || Date.now;
  }

  private generateId(prefix: string): string {
    const suffix = Math.floor(this.rng() * 1e6)
      .toString(36)
      .padStart(4, '0');
    return `${prefix}_${this.nextIdSeq++}_${suffix}`;
  }

  private generateFriendCode(): string {
    for (let attempt = 0; attempt < 40; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += CODE_ALPHABET[Math.floor(this.rng() * CODE_ALPHABET.length)];
      }
      if (!this.roomByCode.has(code)) {
        return code;
      }
    }
    return `FV${String(this.nextIdSeq++).padStart(4, '0')}`;
  }

  private pickRandomMode(): OnlineBattleModeId {
    return VALID_ONLINE_MODES[Math.floor(this.rng() * VALID_ONLINE_MODES.length)];
  }

  public getStats(): OnlineStatsSnapshot {
    return {
      onlinePlayers: this.clients.size,
      queuedPlayers: this.quickQueue.length,
      activeRooms: this.rooms.size,
    };
  }

  private broadcastStats(): void {
    const stats = this.getStats();
    for (const client of this.clients.values()) {
      client.send({ type: 'stats', stats });
    }
  }

  public registerClient(send: (msg: ServerToClientMessage) => void): string {
    const id = this.generateId('p');
    const client: ConnectedClient = {
      id,
      name: 'Explorer',
      avatarCode: 'jp',
      roomId: null,
      queuedAt: null,
      send,
    };
    this.clients.set(id, client);
    send({ type: 'welcome', playerId: id, stats: this.getStats() });
    this.broadcastStats();
    return id;
  }

  public unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.removeFromQueue(clientId);
    if (client.roomId) {
      this.handleLeaveRoom(clientId, true);
    }

    this.clients.delete(clientId);
    this.broadcastStats();
  }

  public handleMessage(clientId: string, msg: ClientToServerMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case 'ping':
        client.send({ type: 'pong', serverNow: this.nowFn() });
        return;

      case 'hello':
        this.applyIdentity(client, msg.player);
        return;

      case 'quick_match:join':
        this.applyIdentity(client, msg.player);
        this.handleJoinQuickMatch(clientId);
        return;

      case 'quick_match:leave':
        this.removeFromQueue(clientId);
        client.send({
          type: 'queue:status',
          queued: false,
          queuedPlayers: this.quickQueue.length,
        });
        this.broadcastStats();
        return;

      case 'room:create':
        this.applyIdentity(client, msg.player);
        this.handleCreateFriendRoom(clientId, msg.modeId, msg.durationSeconds);
        return;

      case 'room:join':
        this.applyIdentity(client, msg.player);
        this.handleJoinFriendRoom(clientId, msg.code);
        return;

      case 'room:select_mode':
        this.handleSelectMode(clientId, msg.modeId, msg.durationSeconds);
        return;

      case 'room:start':
        this.handleStartRoom(clientId);
        return;

      case 'room:back_to_lobby':
        this.handleBackToLobby(clientId);
        return;

      case 'room:rematch':
        this.handleRematch(clientId);
        return;

      case 'room:leave':
        this.handleLeaveRoom(clientId, false);
        return;

      case 'match:answer':
        this.handleSubmitAnswer(clientId, msg.questionIndex, msg.choiceId);
        return;
    }
  }

  private applyIdentity(client: ConnectedClient, identity: PlayerIdentityPayload): void {
    client.name = sanitizeName(identity?.name);
    client.avatarCode = sanitizeAvatar(identity?.avatarCode);
  }

  private removeFromQueue(clientId: string): void {
    const idx = this.quickQueue.indexOf(clientId);
    if (idx >= 0) {
      this.quickQueue.splice(idx, 1);
    }
    const client = this.clients.get(clientId);
    if (client) {
      client.queuedAt = null;
    }
  }

  private handleJoinQuickMatch(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.roomId) {
      this.handleLeaveRoom(clientId, false);
    }

    if (!this.quickQueue.includes(clientId)) {
      this.quickQueue.push(clientId);
      client.queuedAt = this.nowFn();
    }

    // Attempt immediate pairing when at least 2 real players are queued
    while (this.quickQueue.length >= 2) {
      const p1Id = this.quickQueue.shift()!;
      const p2Id = this.quickQueue.shift()!;
      const c1 = this.clients.get(p1Id);
      const c2 = this.clients.get(p2Id);

      if (!c1) {
        if (c2) this.quickQueue.unshift(p2Id);
        continue;
      }
      if (!c2) {
        this.quickQueue.unshift(p1Id);
        continue;
      }

      c1.queuedAt = null;
      c2.queuedAt = null;
      this.createQuickMatchRoom(c1, c2);
    }

    // Notify remaining queued players
    if (this.quickQueue.includes(clientId)) {
      client.send({
        type: 'queue:status',
        queued: true,
        queuedPlayers: this.quickQueue.length,
        joinedAt: client.queuedAt ?? this.nowFn(),
      });
    }
    this.broadcastStats();
  }

  private createQuickMatchRoom(c1: ConnectedClient, c2: ConnectedClient): void {
    const roomId = this.generateId('qm');
    const selectedMode = this.pickRandomMode();
    const now = this.nowFn();
    const deck = buildOnlineQuestionDeck(selectedMode, DECK_SIZE, this.rng);

    const room: InternalRoom = {
      roomId,
      code: null,
      kind: 'quick',
      status: 'starting',
      modeId: selectedMode,
      wasRandomMode: true,
      durationSeconds: DEFAULT_QUICK_DURATION,
      countdownEndsAt: now + COUNTDOWN_MS,
      endsAt: null,
      deck,
      result: null,
      players: [
        this.makePlayer(c1, true),
        this.makePlayer(c2, false),
      ],
    };

    this.rooms.set(roomId, room);
    c1.roomId = roomId;
    c2.roomId = roomId;

    c1.send({ type: 'queue:status', queued: false, queuedPlayers: this.quickQueue.length });
    c2.send({ type: 'queue:status', queued: false, queuedPlayers: this.quickQueue.length });
    this.broadcastRoomState(room);
  }

  private handleCreateFriendRoom(
    clientId: string,
    modeId?: OnlineBattleModeId,
    durationSeconds?: MatchDurationSeconds
  ): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.removeFromQueue(clientId);
    if (client.roomId) {
      this.handleLeaveRoom(clientId, false);
    }

    const roomId = this.generateId('fr');
    const code = this.generateFriendCode();
    const safeMode: OnlineBattleModeId =
      modeId && VALID_ONLINE_MODES.includes(modeId) ? modeId : 'flag-rush';

    const room: InternalRoom = {
      roomId,
      code,
      kind: 'friend',
      status: 'lobby',
      modeId: safeMode,
      wasRandomMode: false,
      durationSeconds: sanitizeDuration(durationSeconds),
      countdownEndsAt: null,
      endsAt: null,
      deck: [],
      result: null,
      players: [this.makePlayer(client, true)],
    };

    this.rooms.set(roomId, room);
    this.roomByCode.set(code, roomId);
    client.roomId = roomId;

    this.broadcastRoomState(room);
    this.broadcastStats();
  }

  private handleJoinFriendRoom(clientId: string, rawCode: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const code = (rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (!code) {
      client.send({
        type: 'error',
        code: 'INVALID_CODE',
        message: 'Enter a valid 6-character Friend Code.',
      });
      return;
    }

    const roomId = this.roomByCode.get(code);
    const room = roomId ? this.rooms.get(roomId) : undefined;
    if (!room) {
      client.send({
        type: 'error',
        code: 'ROOM_NOT_FOUND',
        message: `No active room found for code "${code}". Ask your friend to check the code.`,
      });
      return;
    }

    // Idempotent if already inside this room
    if (room.players.some((p) => p.id === clientId)) {
      this.broadcastRoomState(room);
      return;
    }

    if (room.players.length >= 2) {
      client.send({
        type: 'error',
        code: 'ROOM_FULL',
        message: 'That Friend Room already has 2 players.',
      });
      return;
    }

    if (room.status !== 'lobby') {
      client.send({
        type: 'error',
        code: 'MATCH_IN_PROGRESS',
        message: 'That room is already in an active match.',
      });
      return;
    }

    this.removeFromQueue(clientId);
    if (client.roomId && client.roomId !== room.roomId) {
      this.handleLeaveRoom(clientId, false);
    }

    room.players.push(this.makePlayer(client, false));
    client.roomId = room.roomId;

    this.broadcastRoomState(room);
    this.broadcastStats();
  }

  private handleSelectMode(
    clientId: string,
    modeSelection: OnlineBattleModeId | 'random',
    durationSeconds?: MatchDurationSeconds
  ): void {
    const client = this.clients.get(clientId);
    if (!client?.roomId) return;
    const room = this.rooms.get(client.roomId);
    if (!room || room.kind !== 'friend' || room.status !== 'lobby') return;

    const player = room.players.find((p) => p.id === clientId);
    if (!player?.isHost) {
      client.send({
        type: 'error',
        code: 'HOST_ONLY',
        message: 'Only the room host can change the match mode.',
      });
      return;
    }

    if (modeSelection === 'random') {
      room.modeId = this.pickRandomMode();
      room.wasRandomMode = true;
    } else if (VALID_ONLINE_MODES.includes(modeSelection)) {
      room.modeId = modeSelection;
      room.wasRandomMode = false;
    }

    if (durationSeconds && VALID_MATCH_DURATIONS.includes(durationSeconds)) {
      room.durationSeconds = durationSeconds;
    }

    this.broadcastRoomState(room);
  }

  private handleStartRoom(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client?.roomId) return;
    const room = this.rooms.get(client.roomId);
    if (!room || room.kind !== 'friend' || room.status !== 'lobby') return;

    const player = room.players.find((p) => p.id === clientId);
    if (!player?.isHost) {
      client.send({
        type: 'error',
        code: 'HOST_ONLY',
        message: 'Only the host can start the match.',
      });
      return;
    }

    if (room.players.length < 2) {
      client.send({
        type: 'error',
        code: 'WAITING_FOR_FRIEND',
        message: 'Share your Friend Code and wait for your friend to join before starting.',
      });
      return;
    }

    this.beginCountdown(room);
  }

  private handleBackToLobby(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client?.roomId) return;
    const room = this.rooms.get(client.roomId);
    if (!room || room.kind !== 'friend' || room.status !== 'finished') return;

    const player = room.players.find((p) => p.id === clientId);
    if (!player?.isHost) return;

    room.status = 'lobby';
    room.countdownEndsAt = null;
    room.endsAt = null;
    room.deck = [];
    room.result = null;
    for (const p of room.players) {
      this.resetPlayerStats(p);
    }
    this.broadcastRoomState(room);
  }

  private handleRematch(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client?.roomId) return;
    const room = this.rooms.get(client.roomId);
    if (!room || room.status !== 'finished') return;

    if (room.players.length < 2) {
      client.send({
        type: 'error',
        code: 'OPPONENT_LEFT',
        message: 'Your opponent left the room.',
      });
      return;
    }

    const player = room.players.find((p) => p.id === clientId);
    if (!player) return;
    player.rematchReady = true;

    if (room.players.every((p) => p.rematchReady && p.connected)) {
      if (room.kind === 'quick') {
        // Quick Match rematch selects a fresh random mode again
        room.modeId = this.pickRandomMode();
        room.wasRandomMode = true;
      }
      this.beginCountdown(room);
    } else {
      this.broadcastRoomState(room);
    }
  }

  private beginCountdown(room: InternalRoom): void {
    const now = this.nowFn();
    room.status = 'starting';
    room.countdownEndsAt = now + COUNTDOWN_MS;
    room.endsAt = null;
    room.result = null;
    room.deck = buildOnlineQuestionDeck(room.modeId, DECK_SIZE, this.rng);
    for (const p of room.players) {
      this.resetPlayerStats(p);
    }
    this.broadcastRoomState(room);
  }

  private handleSubmitAnswer(clientId: string, questionIndex: number, choiceId: string): void {
    const client = this.clients.get(clientId);
    if (!client?.roomId) return;
    const room = this.rooms.get(client.roomId);
    if (!room || room.status !== 'playing') return;

    const now = this.nowFn();
    if (room.endsAt !== null && now >= room.endsAt) {
      this.finishRoom(room, 'time_up');
      return;
    }

    const player = room.players.find((p) => p.id === clientId);
    if (!player) return;

    // Idempotent guard: ignore stale or duplicate submissions
    if (questionIndex !== player.currentQuestionIndex) return;

    const question = room.deck[questionIndex];
    if (!question) return;

    const isCorrect = choiceId === question.correctId;
    player.answeredCount += 1;
    let pointsAwarded = 0;

    if (isCorrect) {
      player.streak += 1;
      player.bestStreak = Math.max(player.bestStreak, player.streak);
      player.correctCount += 1;
      // Base 100 pts + streak momentum bonus (+20 per consecutive correct up to +160)
      pointsAwarded = 100 + Math.min(player.streak - 1, 8) * 20;
      player.score += pointsAwarded;
    } else {
      player.streak = 0;
    }

    player.currentQuestionIndex += 1;
    const nextQuestion = toPublicQuestion(room.deck[player.currentQuestionIndex]);

    client.send({
      type: 'match:answer_result',
      questionIndex,
      choiceId,
      correctId: question.correctId,
      isCorrect,
      pointsAwarded,
      streak: player.streak,
      score: player.score,
      nextQuestion,
    });

    // End immediately if all players completed the entire deck
    const allFinishedDeck = room.players.every((p) => p.currentQuestionIndex >= room.deck.length);
    if (allFinishedDeck) {
      this.finishRoom(room, 'deck_completed');
    } else {
      this.broadcastRoomState(room);
    }
  }

  private handleLeaveRoom(clientId: string, isDisconnect: boolean): void {
    const client = this.clients.get(clientId);
    const roomId = client?.roomId;
    if (!roomId) return;

    if (client) {
      client.roomId = null;
    }

    const room = this.rooms.get(roomId);
    if (!room) return;

    const leavingPlayer = room.players.find((p) => p.id === clientId);
    const remainingPlayers = room.players.filter((p) => p.id !== clientId);

    if (remainingPlayers.length === 0) {
      this.destroyRoom(room);
      this.broadcastStats();
      return;
    }

    if (room.status === 'playing' || room.status === 'starting') {
      if (leavingPlayer) {
        leavingPlayer.connected = false;
      }
      // Award victory to remaining player cleanly
      this.finishRoom(room, 'opponent_left', remainingPlayers[0].id);
      // Remove disconnected player from room roster if friend room returns to lobby later
      room.players = remainingPlayers;
      if (room.players.length > 0) {
        room.players[0].isHost = true;
      }
      this.broadcastStats();
      return;
    }

    // Lobby or finished state
    room.players = remainingPlayers;
    if (room.players.length > 0 && !room.players.some((p) => p.isHost)) {
      room.players[0].isHost = true;
    }

    if (room.kind === 'quick' && room.status === 'finished') {
      const survivor = this.clients.get(room.players[0].id);
      if (survivor) {
        survivor.roomId = null;
        survivor.send({
          type: 'room:closed',
          reason: isDisconnect ? 'Opponent disconnected.' : 'Opponent left the match.',
        });
      }
      this.destroyRoom(room);
    } else {
      this.broadcastRoomState(room);
    }

    this.broadcastStats();
  }

  public tick(): void {
    const now = this.nowFn();
    for (const room of this.rooms.values()) {
      if (room.status === 'starting' && room.countdownEndsAt !== null && now >= room.countdownEndsAt) {
        room.status = 'playing';
        room.countdownEndsAt = null;
        room.endsAt = now + room.durationSeconds * 1000;
        this.broadcastRoomState(room);
        for (const p of room.players) {
          const c = this.clients.get(p.id);
          c?.send({
            type: 'match:question',
            question: toPublicQuestion(room.deck[p.currentQuestionIndex]),
          });
        }
      } else if (room.status === 'playing' && room.endsAt !== null && now >= room.endsAt) {
        this.finishRoom(room, 'time_up');
      }
    }
  }

  private finishRoom(
    room: InternalRoom,
    reason: OnlineMatchResultSummary['reason'],
    forcedWinnerId?: string
  ): void {
    if (room.status === 'finished') return;
    room.status = 'finished';
    room.countdownEndsAt = null;
    room.endsAt = null;

    let winnerId: string | null = forcedWinnerId ?? null;
    if (!forcedWinnerId && room.players.length >= 2) {
      const [a, b] = room.players;
      if (a.score > b.score) {
        winnerId = a.id;
      } else if (b.score > a.score) {
        winnerId = b.id;
      } else {
        // Tiebreaker: higher accuracy, then draw
        const accA = a.answeredCount > 0 ? a.correctCount / a.answeredCount : 0;
        const accB = b.answeredCount > 0 ? b.correctCount / b.answeredCount : 0;
        if (accA > accB) winnerId = a.id;
        else if (accB > accA) winnerId = b.id;
        else winnerId = null;
      }
    } else if (!forcedWinnerId && room.players.length === 1) {
      winnerId = room.players[0].id;
    }

    const result: OnlineMatchResultSummary = {
      winnerId,
      reason,
      modeId: room.modeId,
      wasRandomMode: room.wasRandomMode,
      durationSeconds: room.durationSeconds,
      players: room.players.map(toPublicPlayer),
    };
    room.result = result;

    const snapshot = this.buildRoomSnapshot(room);
    for (const p of room.players) {
      const c = this.clients.get(p.id);
      if (c && c.roomId === room.roomId) {
        c.send({ type: 'match:ended', result, room: snapshot });
      }
    }
  }

  private buildRoomSnapshot(room: InternalRoom): OnlineRoomSnapshot {
    return {
      roomId: room.roomId,
      code: room.code,
      kind: room.kind,
      status: room.status,
      modeId: room.modeId,
      wasRandomMode: room.wasRandomMode,
      durationSeconds: room.durationSeconds,
      countdownEndsAt: room.countdownEndsAt,
      endsAt: room.endsAt,
      serverNow: this.nowFn(),
      totalQuestions: room.deck.length,
      players: room.players.map(toPublicPlayer),
      result: room.result,
    };
  }

  private broadcastRoomState(room: InternalRoom): void {
    const snapshot = this.buildRoomSnapshot(room);
    for (const p of room.players) {
      const c = this.clients.get(p.id);
      if (c && c.roomId === room.roomId) {
        c.send({ type: 'room:state', room: snapshot });
      }
    }
  }

  private destroyRoom(room: InternalRoom): void {
    if (room.code) {
      this.roomByCode.delete(room.code);
    }
    this.rooms.delete(room.roomId);
  }

  private makePlayer(client: ConnectedClient, isHost: boolean): InternalPlayer {
    return {
      id: client.id,
      name: client.name,
      avatarCode: client.avatarCode,
      isHost,
      connected: true,
      score: 0,
      correctCount: 0,
      answeredCount: 0,
      streak: 0,
      bestStreak: 0,
      currentQuestionIndex: 0,
      rematchReady: false,
    };
  }

  private resetPlayerStats(p: InternalPlayer): void {
    p.score = 0;
    p.correctCount = 0;
    p.answeredCount = 0;
    p.streak = 0;
    p.bestStreak = 0;
    p.currentQuestionIndex = 0;
    p.rematchReady = false;
  }
}
