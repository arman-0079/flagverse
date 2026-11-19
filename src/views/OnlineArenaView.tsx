import {
  ArrowLeft,
  Check,
  Clock,
  Coins,
  Copy,
  Crown,
  Flame,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  Shuffle,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlagImage } from '../components/FlagImage';
import { AudioManager } from '../core/AudioManager';
import { CrazyGamesSDK } from '../core/CrazyGamesSDK';
import { OnlineArenaClient, type OnlineConnectionStatus } from '../online/onlineClient';
import {
  ONLINE_BATTLE_MODES,
  VALID_MATCH_DURATIONS,
  type MatchDurationSeconds,
  type OnlineBattleModeId,
  type OnlineMatchResultSummary,
  type OnlinePlayerPublic,
  type OnlineQuestionPublic,
  type OnlineRoomSnapshot,
  type OnlineStatsSnapshot,
  type ServerToClientMessage,
} from '../online/protocol';
import type { PlayerSaveData } from '../types/game';

interface OnlineArenaViewProps {
  saveData: PlayerSaveData;
  initialFriendCode?: string | null;
  onConsumeInitialFriendCode?: () => void;
  onBackHome: () => void;
  onMatchRewardsEarned: (reward: {
    xpEarned: number;
    coinsEarned: number;
    won: boolean;
    score: number;
    correctCount: number;
    answeredCount: number;
    bestStreak: number;
  }) => void;
}

interface AnswerFeedback {
  questionIndex: number;
  choiceId: string;
  correctId: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

function getModeMeta(modeId: OnlineBattleModeId) {
  return ONLINE_BATTLE_MODES.find((m) => m.id === modeId) ?? ONLINE_BATTLE_MODES[0];
}

function formatClock(msRemaining: number): string {
  const clamped = Math.max(0, Math.ceil(msRemaining / 1000));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
}

export function OnlineArenaView({
  saveData,
  initialFriendCode,
  onConsumeInitialFriendCode,
  onBackHome,
  onMatchRewardsEarned,
}: OnlineArenaViewProps) {
  const clientRef = useRef<OnlineArenaClient | null>(null);
  const autoJoinedCodeRef = useRef<string | null>(null);
  const awardedMatchKeyRef = useRef<string | null>(null);
  const pendingNextQuestionRef = useRef<OnlineQuestionPublic | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const clockOffsetRef = useRef<number>(0);

  const [connStatus, setConnStatus] = useState<OnlineConnectionStatus>('connecting');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [stats, setStats] = useState<OnlineStatsSnapshot>({
    onlinePlayers: 1,
    queuedPlayers: 0,
    activeRooms: 0,
  });
  const [queued, setQueued] = useState(false);
  const [queueStartedAt, setQueueStartedAt] = useState<number | null>(null);
  const [room, setRoom] = useState<OnlineRoomSnapshot | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<OnlineQuestionPublic | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [submittedIndex, setSubmittedIndex] = useState<number | null>(null);
  const [friendCodeInput, setFriendCodeInput] = useState(
    (initialFriendCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rouletteIndex, setRouletteIndex] = useState(0);
  const [lastEarnedReward, setLastEarnedReward] = useState<{
    xpEarned: number;
    coinsEarned: number;
  } | null>(null);

  const identity = useMemo(
    () => ({
      name: saveData.playerName || 'Explorer',
      avatarCode: saveData.avatarCode || 'jp',
    }),
    [saveData.playerName, saveData.avatarCode]
  );

  // Sync live ticker for countdowns, match timer, and queue search elapsed time
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  // Roulette visual cycle while random mode reveal countdown is active
  useEffect(() => {
    if (room?.status !== 'starting' || !room.wasRandomMode) return;
    const interval = window.setInterval(() => {
      setRouletteIndex((idx) => (idx + 1) % ONLINE_BATTLE_MODES.length);
    }, 130);
    return () => window.clearInterval(interval);
  }, [room?.status, room?.wasRandomMode]);

  // Connect WebSocket client on mount and clean up on unmount
  useEffect(() => {
    const client = new OnlineArenaClient();
    clientRef.current = client;

    const offStatus = client.onStatus((nextStatus) => {
      setConnStatus(nextStatus);
    });

    const offMsg = client.onMessage((msg: ServerToClientMessage) => {
      switch (msg.type) {
        case 'welcome':
          setMyPlayerId(msg.playerId);
          setStats(msg.stats);
          setErrorMessage(null);
          break;

        case 'stats':
          setStats(msg.stats);
          break;

        case 'pong':
          clockOffsetRef.current = msg.serverNow - Date.now();
          break;

        case 'queue:status':
          setQueued(msg.queued);
          setQueueStartedAt(msg.queued ? msg.joinedAt ?? Date.now() : null);
          if (msg.queued) setErrorMessage(null);
          break;

        case 'room:state': {
          clockOffsetRef.current = msg.room.serverNow - Date.now();
          setRoom(msg.room);
          setErrorMessage(null);
          if (msg.room.status === 'starting') {
            setCurrentQuestion(null);
            setAnswerFeedback(null);
            setSubmittedIndex(null);
            setLastEarnedReward(null);
            pendingNextQuestionRef.current = null;
            AudioManager.playClick();
          } else if (msg.room.status === 'playing') {
            CrazyGamesSDK.gameplayStart();
          } else if (msg.room.status === 'lobby') {
            setCurrentQuestion(null);
            setAnswerFeedback(null);
            setSubmittedIndex(null);
            setLastEarnedReward(null);
            CrazyGamesSDK.gameplayStop();
          }
          break;
        }

        case 'match:question':
          if (feedbackTimerRef.current !== null) {
            window.clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
          }
          setAnswerFeedback(null);
          setSubmittedIndex(null);
          setCurrentQuestion(msg.question);
          break;

        case 'match:answer_result': {
          if (msg.isCorrect) {
            AudioManager.playCorrect(msg.streak);
          } else {
            AudioManager.playWrong();
          }
          setAnswerFeedback({
            questionIndex: msg.questionIndex,
            choiceId: msg.choiceId,
            correctId: msg.correctId,
            isCorrect: msg.isCorrect,
            pointsAwarded: msg.pointsAwarded,
          });
          pendingNextQuestionRef.current = msg.nextQuestion;
          if (feedbackTimerRef.current !== null) {
            window.clearTimeout(feedbackTimerRef.current);
          }
          feedbackTimerRef.current = window.setTimeout(() => {
            feedbackTimerRef.current = null;
            setAnswerFeedback(null);
            setSubmittedIndex(null);
            setCurrentQuestion(pendingNextQuestionRef.current);
          }, 360);
          break;
        }

        case 'match:ended': {
          clockOffsetRef.current = msg.room.serverNow - Date.now();
          setRoom(msg.room);
          CrazyGamesSDK.gameplayStop();
          break;
        }

        case 'room:closed':
          setRoom(null);
          setCurrentQuestion(null);
          setAnswerFeedback(null);
          setSubmittedIndex(null);
          setErrorMessage(msg.reason);
          CrazyGamesSDK.gameplayStop();
          break;

        case 'error':
          setErrorMessage(msg.message);
          AudioManager.playWrong();
          break;
      }
    });

    client.connect(identity);

    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      offStatus();
      offMsg();
      client.disconnect();
      CrazyGamesSDK.gameplayStop();
    };
    // Connect once on mount; identity updates are sent via hello below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep player identity synced if changed
  useEffect(() => {
    if (connStatus === 'connected') {
      clientRef.current?.send({ type: 'hello', player: identity });
    }
  }, [connStatus, identity]);

  // Auto-join friend code if opened via shared invite link (?view=online&code=XXXXXX)
  useEffect(() => {
    const cleanCode = (initialFriendCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (
      cleanCode.length >= 4 &&
      connStatus === 'connected' &&
      !room &&
      autoJoinedCodeRef.current !== cleanCode
    ) {
      autoJoinedCodeRef.current = cleanCode;
      setFriendCodeInput(cleanCode);
      clientRef.current?.send({ type: 'room:join', code: cleanCode, player: identity });
      onConsumeInitialFriendCode?.();
    }
  }, [initialFriendCode, connStatus, room, identity, onConsumeInitialFriendCode]);

  // Persist XP & Coin rewards once when a match transitions to finished
  useEffect(() => {
    if (!room || room.status !== 'finished' || !room.result || !myPlayerId) return;
    const matchKey = `${room.roomId}:${room.result.players.map((p) => `${p.id}:${p.score}`).join('|')}`;
    if (awardedMatchKeyRef.current === matchKey) return;
    awardedMatchKeyRef.current = matchKey;

    const me = room.result.players.find((p) => p.id === myPlayerId);
    if (!me) return;

    const won = room.result.winnerId === myPlayerId;
    const draw = room.result.winnerId === null;
    const xpEarned = Math.max(40, Math.round(me.score * 0.14) + (won ? 120 : draw ? 70 : 40));
    const coinsEarned = Math.max(20, Math.round(me.score * 0.06) + (won ? 80 : draw ? 45 : 20));

    setLastEarnedReward({ xpEarned, coinsEarned });
    if (won) {
      AudioManager.playVictory();
      CrazyGamesSDK.happytime();
    } else if (draw) {
      AudioManager.playReward();
    } else {
      AudioManager.playClick();
    }

    onMatchRewardsEarned({
      xpEarned,
      coinsEarned,
      won,
      score: me.score,
      correctCount: me.correctCount,
      answeredCount: me.answeredCount,
      bestStreak: me.bestStreak,
    });
  }, [room, myPlayerId, onMatchRewardsEarned]);

  const me: OnlinePlayerPublic | null = useMemo(
    () => room?.players.find((p) => p.id === myPlayerId) ?? null,
    [room, myPlayerId]
  );

  const opponent: OnlinePlayerPublic | null = useMemo(
    () => room?.players.find((p) => p.id !== myPlayerId) ?? null,
    [room, myPlayerId]
  );

  const handleSubmitChoice = useCallback(
    (choiceId: string) => {
      if (!currentQuestion || !room || room.status !== 'playing') return;
      if (submittedIndex === currentQuestion.index || answerFeedback) return;
      setSubmittedIndex(currentQuestion.index);
      clientRef.current?.send({
        type: 'match:answer',
        questionIndex: currentQuestion.index,
        choiceId,
      });
    },
    [currentQuestion, room, submittedIndex, answerFeedback]
  );

  // Keyboard shortcuts during live 1v1 battle (1-4 or T/F)
  useEffect(() => {
    if (!room || room.status !== 'playing' || !currentQuestion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (currentQuestion.kind === 'true-false-blitz') {
        if (e.key === '1' || e.key.toLowerCase() === 't') {
          handleSubmitChoice('true');
        } else if (e.key === '2' || e.key.toLowerCase() === 'f') {
          handleSubmitChoice('false');
        }
      } else {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < currentQuestion.options.length) {
          handleSubmitChoice(currentQuestion.options[idx].id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [room, currentQuestion, handleSubmitChoice]);

  const handleJoinQuickMatch = () => {
    AudioManager.unlock();
    AudioManager.playClick();
    setErrorMessage(null);
    clientRef.current?.send({ type: 'quick_match:join', player: identity });
  };

  const handleCancelQuickMatch = () => {
    AudioManager.playClick();
    clientRef.current?.send({ type: 'quick_match:leave' });
  };

  const handleCreateFriendRoom = () => {
    AudioManager.unlock();
    AudioManager.playClick();
    setErrorMessage(null);
    clientRef.current?.send({
      type: 'room:create',
      player: identity,
      modeId: 'flag-rush',
      durationSeconds: 60,
    });
  };

  const handleJoinFriendRoom = () => {
    AudioManager.unlock();
    AudioManager.playClick();
    const cleaned = friendCodeInput.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (cleaned.length < 4) {
      setErrorMessage('Enter your friend’s 6-character Friend Code to join.');
      return;
    }
    setErrorMessage(null);
    clientRef.current?.send({
      type: 'room:join',
      code: cleaned,
      player: identity,
    });
  };

  const handleSelectRoomMode = (modeId: OnlineBattleModeId | 'random', duration?: MatchDurationSeconds) => {
    AudioManager.playClick();
    clientRef.current?.send({
      type: 'room:select_mode',
      modeId,
      durationSeconds: duration,
    });
  };

  const handleStartFriendMatch = () => {
    AudioManager.unlock();
    AudioManager.playClick();
    clientRef.current?.send({ type: 'room:start' });
  };

  const handleLeaveRoom = () => {
    AudioManager.playClick();
    clientRef.current?.send({ type: 'room:leave' });
    setRoom(null);
    setCurrentQuestion(null);
    setAnswerFeedback(null);
    setSubmittedIndex(null);
    setLastEarnedReward(null);
    CrazyGamesSDK.gameplayStop();
  };

  const handleCopyFriendCode = (code: string) => {
    AudioManager.playClick();
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = (code: string) => {
    AudioManager.playClick();
    const url = `${window.location.origin}/?view=online&code=${encodeURIComponent(code)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 2200);
  };

  const estimatedServerNow = nowMs + clockOffsetRef.current;
  const countdownRemainingMs = room?.countdownEndsAt ? Math.max(0, room.countdownEndsAt - estimatedServerNow) : 0;
  const matchRemainingMs = room?.endsAt ? Math.max(0, room.endsAt - estimatedServerNow) : 0;
  const queueElapsedSec = queueStartedAt ? Math.max(0, Math.floor((nowMs - queueStartedAt) / 1000)) : 0;

  // ==================== STAGE 1: ACTIVE 1v1 GAMEPLAY ====================
  if (room && room.status === 'playing') {
    const myScore = me?.score ?? 0;
    const oppScore = opponent?.score ?? 0;
    const totalScore = myScore + oppScore;
    const mySharePct = totalScore > 0 ? Math.max(12, Math.min(88, Math.round((myScore / totalScore) * 100))) : 50;
    const scoreDiff = myScore - oppScore;
    const urgent = matchRemainingMs <= 10000;
    const modeMeta = getModeMeta(room.modeId);

    return (
      <main className="relative z-20 mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-4">
        {/* Top Live 1v1 Scoreboard Bar */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#070E1E]/95 p-3 sm:p-4 shadow-2xl">
          <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
            {/* You */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <FlagImage code={me?.avatarCode || identity.avatarCode} size="sm" className="h-8 w-11 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs sm:text-sm font-bold text-white">
                    {me?.name || identity.name}
                  </span>
                  <span className="hidden sm:inline rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 uppercase">
                    You
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono-num">
                  <span className="text-lg sm:text-xl font-extrabold text-amber-300">
                    {myScore.toLocaleString()}
                  </span>
                  {(me?.streak ?? 0) >= 2 && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-400">
                      <Flame className="h-3.5 w-3.5" />
                      {me?.streak}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Center Timer + Mode */}
            <div className="flex flex-col items-center justify-center text-center">
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 font-mono-num text-lg sm:text-xl font-extrabold tracking-tight transition-colors ${
                  urgent
                    ? 'border-rose-400/70 bg-rose-500/20 text-rose-300 animate-pulse'
                    : 'border-amber-400/45 bg-slate-900/90 text-white'
                }`}
              >
                <Clock className={`h-4 w-4 ${urgent ? 'text-rose-400' : 'text-amber-400'}`} />
                <span>{formatClock(matchRemainingMs)}</span>
              </div>
              <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate max-w-full">
                {modeMeta.shortTitle}
              </span>
            </div>

            {/* Opponent */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 text-right">
              <div className="min-w-0">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="hidden sm:inline rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 uppercase">
                    Rival
                  </span>
                  <span className="truncate text-xs sm:text-sm font-bold text-white">
                    {opponent?.name || 'Opponent'}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-end gap-2 font-mono-num">
                  {(opponent?.streak ?? 0) >= 2 && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-400">
                      <Flame className="h-3.5 w-3.5" />
                      {opponent?.streak}
                    </span>
                  )}
                  <span className="text-lg sm:text-xl font-extrabold text-sky-300">
                    {oppScore.toLocaleString()}
                  </span>
                </div>
              </div>
              <FlagImage code={opponent?.avatarCode || 'us'} size="sm" className="h-8 w-11 shrink-0" />
            </div>
          </div>

          {/* Live Tug-of-War Score Dominance Bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400 mb-1">
              <span>Q{(me?.currentQuestionIndex ?? 0) + 1} · {me?.correctCount ?? 0} correct</span>
              <span
                className={`font-bold ${
                  scoreDiff > 0 ? 'text-emerald-300' : scoreDiff < 0 ? 'text-rose-300' : 'text-slate-300'
                }`}
              >
                {scoreDiff > 0
                  ? `YOU LEAD BY +${scoreDiff.toLocaleString()}`
                  : scoreDiff < 0
                    ? `BEHIND BY ${Math.abs(scoreDiff).toLocaleString()}`
                    : 'TIED — EVERY POINT COUNTS'}
              </span>
              <span>Q{(opponent?.currentQuestionIndex ?? 0) + 1} · {opponent?.correctCount ?? 0} correct</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 flex">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                style={{ width: `${mySharePct}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-300"
                style={{ width: `${100 - mySharePct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Question Stage */}
        <section className="mt-3 rounded-2xl border border-slate-800/90 bg-[#081022]/94 p-4 sm:p-6 shadow-2xl">
          {!currentQuestion ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="h-12 w-12 text-amber-400" />
              <h2 className="mt-3 font-display text-2xl font-bold text-white">
                Deck Completed!
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Waiting for the match timer to finish ({formatClock(matchRemainingMs)})...
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <span className="font-mono-num uppercase tracking-wider text-amber-300">
                  Question #{currentQuestion.index + 1}
                </span>
                <div className="flex items-center gap-3">
                  {answerFeedback && (
                    <span
                      className={`font-mono-num font-bold ${
                        answerFeedback.isCorrect ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {answerFeedback.isCorrect ? `+${answerFeedback.pointsAwarded} PTS` : 'MISS'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:border-rose-400/50 hover:text-rose-300 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>Forfeit</span>
                  </button>
                </div>
              </div>

              {/* Prompt & Flag Visual */}
              <div className="mt-3 flex flex-col items-center text-center">
                {currentQuestion.flagCode && (
                  <div className="mb-3.5 flex justify-center">
                    <FlagImage
                      code={currentQuestion.flagCode}
                      size="lg"
                      wave
                      className="h-24 sm:h-28"
                    />
                  </div>
                )}

                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white max-w-2xl text-balance leading-snug">
                  {currentQuestion.prompt}
                </h2>
                {currentQuestion.subPrompt && (
                  <p className="mt-1 text-xs sm:text-sm font-medium text-sky-300/90">
                    {currentQuestion.subPrompt}
                  </p>
                )}
              </div>

              {/* Answer Options */}
              {currentQuestion.kind === 'country-to-flag' ? (
                <div className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-4 max-w-2xl mx-auto">
                  {currentQuestion.options.map((opt, idx) => {
                    const isPicked = answerFeedback?.choiceId === opt.id;
                    const isRight = answerFeedback?.correctId === opt.id;
                    const styleClass = answerFeedback
                      ? isRight
                        ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/40'
                        : isPicked
                          ? 'border-rose-400 bg-rose-500/20'
                          : 'border-slate-800 bg-slate-900/50 opacity-50'
                      : 'border-slate-700/90 bg-[#0D1930] hover:border-amber-400/70 hover:bg-[#132344] active:scale-[0.98]';

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={Boolean(answerFeedback) || submittedIndex === currentQuestion.index}
                        onClick={() => handleSubmitChoice(opt.id)}
                        className={`relative flex flex-col items-center justify-center rounded-xl border p-4 sm:p-5 transition-all cursor-pointer ${styleClass}`}
                      >
                        <span className="absolute left-2.5 top-2 font-mono-num text-[11px] font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <FlagImage code={opt.flagCode || opt.id} size="md" className="h-20 sm:h-24 w-32 sm:w-36" />
                      </button>
                    );
                  })}
                </div>
              ) : currentQuestion.kind === 'true-false-blitz' ? (
                <div className="mt-7 grid grid-cols-2 gap-4 max-w-xl mx-auto">
                  {currentQuestion.options.map((opt) => {
                    const isTrueBtn = opt.id === 'true';
                    const isPicked = answerFeedback?.choiceId === opt.id;
                    const isRight = answerFeedback?.correctId === opt.id;
                    const styleClass = answerFeedback
                      ? isRight
                        ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                        : isPicked
                          ? 'border-rose-400 bg-rose-500/25 text-rose-100'
                          : 'border-slate-800 bg-slate-900/50 text-slate-500'
                      : isTrueBtn
                        ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/20'
                        : 'border-rose-500/45 bg-rose-500/10 text-rose-200 hover:border-rose-400 hover:bg-rose-500/20';

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={Boolean(answerFeedback) || submittedIndex === currentQuestion.index}
                        onClick={() => handleSubmitChoice(opt.id)}
                        className={`rounded-xl border py-5 px-6 font-display text-xl sm:text-2xl font-extrabold tracking-wide transition-all active:scale-[0.98] cursor-pointer ${styleClass}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {currentQuestion.options.map((opt, idx) => {
                    const isPicked = answerFeedback?.choiceId === opt.id;
                    const isRight = answerFeedback?.correctId === opt.id;
                    const styleClass = answerFeedback
                      ? isRight
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : isPicked
                          ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                          : 'border-slate-800 bg-slate-900/50 text-slate-500'
                      : 'border-slate-700/90 bg-[#0D1930] text-slate-100 hover:border-amber-400/70 hover:bg-[#132344] active:scale-[0.99]';

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={Boolean(answerFeedback) || submittedIndex === currentQuestion.index}
                        onClick={() => handleSubmitChoice(opt.id)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left font-semibold transition-all cursor-pointer ${styleClass}`}
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950/70 font-mono-num text-xs font-bold text-amber-300">
                          {idx + 1}
                        </span>
                        <span className="text-sm sm:text-base">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }

  // ==================== STAGE 2: MATCH STARTING / RANDOM MODE REVEAL ====================
  if (room && room.status === 'starting') {
    const lockedMode = getModeMeta(room.modeId);
    const showingRoulette = room.wasRandomMode && countdownRemainingMs > 1400;
    const displayMode = showingRoulette ? ONLINE_BATTLE_MODES[rouletteIndex] : lockedMode;
    const countNum = Math.max(1, Math.ceil(countdownRemainingMs / 1000));

    return (
      <main className="relative z-20 mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="rounded-2xl border border-amber-400/40 bg-[#081022]/96 p-6 sm:p-10 text-center shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            {room.kind === 'quick' ? 'Online Quick Match Found' : 'Friend 1v1 Battle Starting'}
          </p>

          {/* VS Players Row */}
          <div className="mt-6 grid grid-cols-3 items-center gap-4">
            <div className="flex flex-col items-center">
              <FlagImage code={me?.avatarCode || identity.avatarCode} size="md" className="h-14 w-20" />
              <span className="mt-2 font-display text-base sm:text-lg font-bold text-white truncate max-w-full">
                {me?.name || identity.name}
              </span>
              <span className="text-[11px] font-semibold text-sky-300 uppercase">You</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-400/15 font-display text-2xl font-black text-amber-300">
                VS
              </div>
            </div>

            <div className="flex flex-col items-center">
              <FlagImage code={opponent?.avatarCode || 'us'} size="md" className="h-14 w-20" />
              <span className="mt-2 font-display text-base sm:text-lg font-bold text-white truncate max-w-full">
                {opponent?.name || 'Opponent'}
              </span>
              <span className="text-[11px] font-semibold text-rose-300 uppercase">Opponent</span>
            </div>
          </div>

          {/* Mode Reveal Box */}
          <div className="mt-7 rounded-xl border border-slate-700/80 bg-[#0D1930] p-4 sm:p-5">
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
              {room.wasRandomMode ? <Shuffle className="h-3.5 w-3.5" /> : <Swords className="h-3.5 w-3.5" />}
              <span>
                {room.wasRandomMode
                  ? showingRoulette
                    ? 'Selecting Random Battle Mode...'
                    : 'Random Mode Locked!'
                  : 'Selected Battle Mode'}
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-extrabold text-amber-300">
              {displayMode.title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              {displayMode.description}
            </p>
            <p className="mt-2 font-mono-num text-xs font-semibold text-slate-400">
              {room.durationSeconds}s Timed Match · Highest Points Wins
            </p>
          </div>

          {/* Countdown Numeral */}
          <div className="mt-7">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-400/15 font-mono-num text-4xl font-black text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              {countNum}
            </span>
          </div>
        </div>
      </main>
    );
  }

  // ==================== STAGE 3: MATCH RESULTS ====================
  if (room && room.status === 'finished' && room.result) {
    const result: OnlineMatchResultSummary = room.result;
    const myRes = result.players.find((p) => p.id === myPlayerId) ?? me;
    const oppRes = result.players.find((p) => p.id !== myPlayerId) ?? opponent;
    const won = result.winnerId === myPlayerId;
    const draw = result.winnerId === null;
    const modeMeta = getModeMeta(result.modeId);
    const opponentStillHere = room.players.length >= 2;
    const iVotedRematch = Boolean(me?.rematchReady);
    const oppVotedRematch = Boolean(opponent?.rematchReady);

    const acc = (p: OnlinePlayerPublic | null) =>
      p && p.answeredCount > 0 ? Math.round((p.correctCount / p.answeredCount) * 100) : 0;

    return (
      <main className="relative z-20 mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/96 p-6 sm:p-9 shadow-2xl">
          {/* Victory / Defeat Header */}
          <div className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${
                won
                  ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
                  : draw
                    ? 'border-sky-400/60 bg-sky-500/15 text-sky-300'
                    : 'border-rose-400/50 bg-rose-500/15 text-rose-300'
              }`}
            >
              {won ? <Crown className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
            </div>

            <h1 className="mt-4 font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
              {won ? 'VICTORY!' : draw ? 'IT’S A DRAW!' : 'DEFEAT'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              {result.reason === 'opponent_left'
                ? 'Opponent left the battle — you win by forfeit.'
                : `${modeMeta.title} (${result.durationSeconds}s) · Highest Points Wins`}
            </p>
          </div>

          {/* Head-to-Head Comparison Cards */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'You', player: myRes, isWinner: myRes && result.winnerId === myRes.id },
              { label: 'Opponent', player: oppRes, isWinner: oppRes && result.winnerId === oppRes.id },
            ].map(({ label, player, isWinner }) => (
              <div
                key={label}
                className={`rounded-xl border p-5 ${
                  isWinner
                    ? 'border-amber-400/60 bg-amber-400/10'
                    : 'border-slate-800 bg-[#0C172D]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FlagImage code={player?.avatarCode || 'jp'} size="sm" className="h-9 w-12 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                      </p>
                      <h3 className="truncate font-display text-lg font-bold text-white">
                        {player?.name || 'Player'}
                      </h3>
                    </div>
                  </div>
                  {isWinner && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-extrabold text-slate-950 uppercase">
                      <Crown className="h-3.5 w-3.5" />
                      Winner
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-4 text-center font-mono-num">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase">Score</p>
                    <p className="mt-0.5 text-xl font-extrabold text-amber-300">
                      {(player?.score ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase">Accuracy</p>
                    <p className="mt-0.5 text-xl font-bold text-white">{acc(player)}%</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase">Best Streak</p>
                    <p className="mt-0.5 text-xl font-bold text-sky-300">{player?.bestStreak ?? 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rewards Strip */}
          {lastEarnedReward && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 rounded-xl border border-slate-800 bg-[#0B152A] px-4 py-3 text-sm font-mono-num">
              <span className="inline-flex items-center gap-1.5 font-bold text-sky-300">
                <Sparkles className="h-4 w-4" />+{lastEarnedReward.xpEarned} XP
              </span>
              <span className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
                <Coins className="h-4 w-4" />+{lastEarnedReward.coinsEarned} Coins
              </span>
            </div>
          )}

          {/* Post-Match Actions */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {opponentStillHere && (
              <button
                type="button"
                disabled={iVotedRematch}
                onClick={() => {
                  AudioManager.playClick();
                  clientRef.current?.send({ type: 'room:rematch' });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-70 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${iVotedRematch ? 'animate-spin' : ''}`} />
                <span>
                  {iVotedRematch
                    ? 'Waiting for Rival...'
                    : oppVotedRematch
                      ? 'Accept Rematch!'
                      : 'Rematch'}
                </span>
              </button>
            )}

            {room.kind === 'friend' && me?.isHost && (
              <button
                type="button"
                onClick={() => {
                  AudioManager.playClick();
                  clientRef.current?.send({ type: 'room:back_to_lobby' });
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/15 px-5 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 cursor-pointer"
              >
                <Swords className="h-4 w-4" />
                <span>Change Mode in Lobby</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleLeaveRoom();
                handleJoinQuickMatch();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-900 px-5 py-3 text-sm font-semibold text-amber-200 hover:bg-slate-800 cursor-pointer"
            >
              <Shuffle className="h-4 w-4 text-amber-400" />
              <span>New Quick Match</span>
            </button>

            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Arena Lobby</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==================== STAGE 4: FRIEND ROOM LOBBY (SELECT MODE & START) ====================
  if (room && room.status === 'lobby' && room.kind === 'friend') {
    const isHost = Boolean(me?.isHost);
    const friendJoined = room.players.length >= 2;

    return (
      <main className="relative z-20 mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#0A1326] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Leave Friend Room</span>
          </button>

          <span className="text-xs font-semibold uppercase tracking-widest text-sky-300">
            Private Friend Room
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-[#081022]/95 p-4 sm:p-6 shadow-2xl">
          {/* Friend Code Share Banner */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-amber-400/35 bg-[#0D1930] p-3.5 sm:p-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Friend Room Code
              </p>
              <p
                data-testid="friend-room-code"
                className="mt-0.5 font-mono-num text-2xl sm:text-3xl font-black tracking-[0.22em] text-white"
              >
                {room.code}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Share this code with your friend so they can join, then select a mode and start!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => room.code && handleCopyFriendCode(room.code)}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/45 bg-amber-400/15 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-400/25 cursor-pointer"
              >
                {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => room.code && handleCopyInviteLink(room.code)}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/45 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 cursor-pointer"
              >
                {copiedInvite ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
                <span>{copiedInvite ? 'Invite Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>

          {/* 1v1 Player Roster */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player 1 (Host) */}
            {room.players[0] && (
              <div className="flex items-center justify-between rounded-xl border border-amber-400/40 bg-[#0D1830] p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FlagImage code={room.players[0].avatarCode} size="sm" className="h-9 w-12 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-white">
                      {room.players[0].name}
                    </p>
                    <p className="text-xs text-amber-300 font-semibold">
                      Host {room.players[0].id === myPlayerId ? '(You)' : ''}
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                  Ready
                </span>
              </div>
            )}

            {/* Player 2 (Friend) */}
            {room.players[1] ? (
              <div className="flex items-center justify-between rounded-xl border border-sky-400/40 bg-[#0D1830] p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FlagImage code={room.players[1].avatarCode} size="sm" className="h-9 w-12 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-white">
                      {room.players[1].name}
                    </p>
                    <p className="text-xs text-sky-300 font-semibold">
                      Friend {room.players[1].id === myPlayerId ? '(You)' : ''}
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                  Connected
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-slate-200">
                      Waiting for Friend...
                    </p>
                    <p className="text-xs text-slate-400">
                      Ask your friend to enter code <strong className="text-amber-300">{room.code}</strong>
                    </p>
                  </div>
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-sky-400 shrink-0" />
              </div>
            )}
          </div>

          {/* Mode Selection (Host chooses, Friend sees live updates) */}
          <div className="mt-7 border-t border-slate-800/80 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  {isHost ? 'Select Battle Mode' : 'Battle Mode (Chosen by Host)'}
                </h2>
                <p className="text-xs text-slate-400">
                  Both players face the exact same questions in a timed race — highest score wins.
                </p>
              </div>

              {/* Match Duration Selector */}
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0B152A] p-1 self-start">
                {VALID_MATCH_DURATIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleSelectRoomMode(room.modeId, sec)}
                    className={`rounded-lg px-3 py-1.5 font-mono-num text-xs font-bold transition-colors ${
                      room.durationSeconds === sec
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white disabled:hover:text-slate-400'
                    } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ONLINE_BATTLE_MODES.map((m) => {
                const selected = room.modeId === m.id && !room.wasRandomMode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!isHost}
                    data-testid={`friend-mode-${m.id}`}
                    onClick={() => handleSelectRoomMode(m.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-amber-400 bg-amber-400/12 ring-1 ring-amber-400/40'
                        : 'border-slate-800 bg-[#0C172D] hover:border-slate-600 disabled:hover:border-slate-800'
                    } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-white">{m.title}</span>
                      {selected && <Check className="h-4 w-4 text-amber-300 shrink-0" />}
                    </div>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{m.description}</p>
                  </button>
                );
              })}

              {/* Random Mode Option */}
              <button
                type="button"
                disabled={!isHost}
                onClick={() => handleSelectRoomMode('random')}
                className={`rounded-xl border p-4 text-left transition-all ${
                  room.wasRandomMode
                    ? 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400/40'
                    : 'border-slate-800 bg-[#0C172D] hover:border-sky-400/50 disabled:hover:border-slate-800'
                } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-sky-200">
                    <Shuffle className="h-4 w-4 text-sky-400" />
                    Random Mode
                  </span>
                  {room.wasRandomMode && <Check className="h-4 w-4 text-sky-300 shrink-0" />}
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Let the arena surprise both of you with a randomly picked mode!
                </p>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200">
              {errorMessage}
            </div>
          )}

          {/* Start Game Action */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-5">
            <p className="text-xs text-slate-400">
              {friendJoined
                ? isHost
                  ? `Ready to start ${getModeMeta(room.modeId).title} (${room.durationSeconds}s) vs ${opponent?.name}!`
                  : `Waiting for ${room.players[0]?.name} to start the match...`
                : 'Your friend must join with the Friend Code above before starting.'}
            </p>

            {isHost && (
              <button
                type="button"
                data-testid="start-friend-match-btn"
                disabled={!friendJoined}
                onClick={handleStartFriendMatch}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-extrabold tracking-wide text-slate-950 shadow-lg hover:bg-amber-300 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                <span>START 1v1 BATTLE</span>
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ==================== STAGE 5: ONLINE ARENA HUB (QUICK MATCH OR FRIEND CODE) ====================
  return (
    <main className="relative z-20 mx-auto max-w-6xl px-4 py-4 sm:px-8 sm:py-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => {
            AudioManager.playClick();
            if (queued) handleCancelQuickMatch();
            onBackHome();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#0A1326]/90 px-3.5 py-1.5 text-sm font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Hub</span>
        </button>

        <div className="flex items-center gap-3 text-xs font-mono-num text-slate-300">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0A1326]/90 px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-sky-400" />
            <span>
              <strong className="text-white">{stats.onlinePlayers}</strong> Online
            </span>
          </span>
          {stats.activeRooms > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0A1326]/90 px-3 py-1.5">
              <Swords className="h-3.5 w-3.5 text-amber-400" />
              <span>
                <strong className="text-white">{stats.activeRooms}</strong> Active Battles
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#070E1E]/94 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
              Real-Time Head-to-Head Multiplayer
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              ONLINE 1v1 BATTLE ARENA
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Challenge a random opponent in a live timed duel with random mode selection, or invite a friend by Friend Code to pick your mode and battle head-to-head. Highest points when time expires wins!
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0C172D] px-4 py-2.5 shrink-0">
            <FlagImage code={identity.avatarCode} size="sm" className="h-8 w-11" />
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Competing As</p>
              <p className="font-display text-sm font-bold text-white">{identity.name}</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-rose-500/45 bg-rose-500/12 px-4 py-3 text-sm text-rose-200">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Two Core Pathways: Quick Match vs Play With Friend */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PATH 1: ONLINE QUICK MATCH */}
          <div className="flex flex-col justify-between rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#101C36] to-[#0A1326] p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/45 bg-amber-400/15 text-amber-300">
                  <Shuffle className="h-6 w-6" />
                </span>
                <span className="font-mono-num text-xs font-bold uppercase tracking-wider text-amber-300/90">
                  60s · Random Mode
                </span>
              </div>

              <h2 className="mt-4 font-display text-2xl font-extrabold text-white">
                Online Quick Match
              </h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Get matched 1v1 against a random online player. The arena randomly selects the battle mode at kickoff — race the clock and score the highest points to win!
              </p>

              {/* Mode Pool Preview */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {ONLINE_BATTLE_MODES.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300"
                  >
                    {m.shortTitle}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80">
              {queued ? (
                <div className="rounded-xl border border-amber-400/45 bg-amber-400/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-300 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-amber-200">
                          Searching for Random Opponent...
                        </p>
                        <p className="font-mono-num text-xs text-slate-300">
                          Elapsed {queueElapsedSec}s · Match starts automatically when a rival joins
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelQuickMatch}
                      className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-rose-400 hover:text-rose-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="quick-match-btn"
                  disabled={connStatus !== 'connected'}
                  onClick={handleJoinQuickMatch}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-amber-400 px-6 py-4 text-sm font-extrabold tracking-wide text-slate-950 shadow-lg hover:bg-amber-300 disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Swords className="h-4 w-4" />
                  <span>
                    {connStatus === 'connected' ? 'FIND RANDOM 1v1 MATCH' : 'CONNECTING TO ARENA...'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* PATH 2: PLAY WITH FRIEND BY CODE */}
          <div className="flex flex-col justify-between rounded-2xl border border-sky-400/35 bg-gradient-to-b from-[#0E1B34] to-[#0A1326] p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-sky-400/45 bg-sky-500/15 text-sky-300">
                  <UserPlus className="h-6 w-6" />
                </span>
                <span className="font-mono-num text-xs font-bold uppercase tracking-wider text-sky-300/90">
                  Choose Mode &amp; Timer
                </span>
              </div>

              <h2 className="mt-4 font-display text-2xl font-extrabold text-white">
                Play With Friend
              </h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Create a private room to generate a Friend Code, or enter your friend’s code below. Once connected, select any battle mode and start your 1v1 duel!
              </p>

              {/* Join by Friend Code Form */}
              <div className="mt-5">
                <label
                  htmlFor="friend-code-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Add Friend by Code
                </label>
                <div className="mt-2 flex gap-2.5">
                  <input
                    id="friend-code-input"
                    data-testid="friend-code-input"
                    type="text"
                    maxLength={6}
                    value={friendCodeInput}
                    onChange={(e) =>
                      setFriendCodeInput(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoinFriendRoom();
                    }}
                    placeholder="ENTER CODE (E.G. K7M9P2)"
                    className="flex-1 rounded-xl border border-slate-700 bg-[#070E1D] px-4 py-3 font-mono-num text-sm font-bold tracking-[0.18em] text-white placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    data-testid="join-friend-btn"
                    disabled={connStatus !== 'connected' || friendCodeInput.length < 4}
                    onClick={handleJoinFriendRoom}
                    className="rounded-xl border border-sky-400/60 bg-sky-500/20 px-5 py-3 text-sm font-bold text-sky-100 hover:bg-sky-500/30 disabled:opacity-45 cursor-pointer shrink-0 transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <button
                type="button"
                data-testid="create-friend-room-btn"
                disabled={connStatus !== 'connected'}
                onClick={handleCreateFriendRoom}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-sky-400/55 bg-sky-500/18 px-6 py-4 text-sm font-extrabold tracking-wide text-sky-100 hover:bg-sky-500/28 disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Users className="h-4 w-4 text-sky-300" />
                <span>CREATE FRIEND ROOM &amp; GET CODE</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
