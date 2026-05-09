let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";
import { checkShanghai } from "../../core/rules/shanghai.js";

const WINNING_SCORE = 301;
const GR_RESET_THRESHOLD = 150;
const TARGET_HINT_RANGE = 100;

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function normalizePlayerName(player, index) {
  if (typeof player === "string") return player;
  if (player && typeof player.name === "string") return player.name;
  return `Player ${index + 1}`;
}

function getHitValue(hitType, target = null) {
  if (hitType === "miss") return 0;
  if (hitType === "greenBull") return 25;
  if (hitType === "redBull") return 50;

  const mult = hitType === "single" ? 1 : hitType === "double" ? 2 : 3;
  return target * mult;
}

function getHitLabel(hitType, target = null) {
  if (hitType === "miss") return "Miss";
  if (hitType === "greenBull") return "Sing Bull";
  if (hitType === "redBull") return "Dub Bull";

  const labels = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labels[hitType] || "Hit"} ${target}`;
}

function buildPlayers(playerNames) {
  return playerNames.map(name => ({
    name,
    score: 0,
    throwHistory: [],
    stats: {
      dartsThrown: 0,
      turnsTaken: 0,
      busts: 0,
      totalPoints: 0,
      gotchasGiven: 0,
      gotchasReceived: 0,
      gentlemanlyGotchas: 0,
      ungentlemanlyGotchas: 0,
      gentlemanlyWins: 0,
      ungentlemanlyWins: 0,
      checkout: null
    }
  }));
}

function getPlayerPpd(player) {
  const darts = player.stats?.dartsThrown || 0;
  const points = player.stats?.totalPoints || 0;
  if (!darts) return 0;
  return Number((points / darts).toFixed(2));
}

function buildStatsSummary() {
  return gameState.players.map(player => ({
    name: player.name,
    score: player.score,
    ppd: getPlayerPpd(player),
    throws: [...(player.throwHistory || [])],
    stats: { ...(player.stats || {}) }
  }));
}

function saveGotchaHistory() {
  if (gameState.historySaved) return;

  const selectedProfiles = store.selectedPlayerProfiles || [];

  const players = gameState.players.map((player, index) => {
    const profile = selectedProfiles[index] || {};

    return {
      id: profile.id || null,
      name: player.name,
      avatar: profile.avatar || null,
      score: player.score,
      result: player.name === gameState.winner ? "winner" : "played",
      throws: [...(player.throwHistory || [])],
      stats: { ...(player.stats || {}) }
    };
  });

  const winnerPlayer = players.find(player => player.name === gameState.winner) || null;

  saveGameResult({
    gameId: "gotcha",
    gameName: "Gotcha 301",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      winningScore: WINNING_SCORE,
      grResetThreshold: GR_RESET_THRESHOLD,
      shanghaiWinner: gameState.shanghaiWinner || null,
      finalStats: buildStatsSummary()
    }
  });

  gameState.historySaved = true;
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.turnStartSnapshot = cloneState(gameState.players);
  gameState.turnReadyForNext = false;
}

function advanceTurn() {
  gameState.currentPlayer =
    (gameState.currentPlayer + 1) % gameState.players.length;

  if (gameState.currentPlayer === 0) {
    gameState.turnNumber++;
  }

  resetTurnTracking();
}

function recordThrowHistory(player, throwRecord) {
  if (!player.throwHistory) player.throwHistory = [];

  player.throwHistory.push({
    turnNumber: gameState.turnNumber,
    dartNumber: throwRecord.dartNumber,
    label: throwRecord.label,
    value: throwRecord.value,
    scoreBefore: throwRecord.scoreBefore,
    scoreAfter: throwRecord.scoreAfter,
    result: throwRecord.result || "scored",
    gotchaEvents: throwRecord.gotchaEvents || []
  });
}

function padRemainingDartsAsMisses() {
  const player = gameState.players[gameState.currentPlayer];
  if (!player) return;

  if (gameState.dartsThrown === 0) {
    player.stats.turnsTaken++;
  }

  while (gameState.dartsThrown < 3) {
    const dartNumber = gameState.dartsThrown + 1;

    const throwRecord = {
      hitType: "miss",
      target: null,
      label: "Miss",
      value: 0,
      dartNumber,
      scoreBefore: player.score,
      scoreAfter: player.score,
      result: "miss",
      gotchaEvents: []
    };

    gameState.currentTurnThrows.push(throwRecord);
    recordThrowHistory(player, throwRecord);

    gameState.dartsThrown++;
    player.stats.dartsThrown++;
  }
}

function getShanghaiHitsForTarget(target) {
  return (gameState.currentTurnThrows || [])
    .filter(throwRecord => throwRecord.target === target && target != null)
    .map(throwRecord => {
      if (throwRecord.hitType === "single") return 1;
      if (throwRecord.hitType === "double") return 2;
      if (throwRecord.hitType === "triple") return 3;
      return 0;
    })
    .filter(Boolean);
}

function applyGotchaChecks(scoringPlayerIndex) {
  const scoringPlayer = gameState.players[scoringPlayerIndex];
  if (!scoringPlayer) return [];

  const resetEvents = [];

  gameState.players.forEach((otherPlayer, otherIndex) => {
    if (otherIndex === scoringPlayerIndex) return;
    if (otherPlayer.score !== scoringPlayer.score) return;
    if (otherPlayer.score <= 0) return;

    const victimPreviousScore = otherPlayer.score;
    const attackerPreviousScore = scoringPlayer.score;
    const isUngentlemanly = victimPreviousScore < GR_RESET_THRESHOLD;

    if (isUngentlemanly) {
      scoringPlayer.score = 0;
      otherPlayer.score = 0;

      scoringPlayer.stats.ungentlemanlyGotchas++;
      otherPlayer.stats.ungentlemanlyGotchas++;
      scoringPlayer.stats.gotchasGiven++;
      otherPlayer.stats.gotchasReceived++;

      resetEvents.push({
        type: "ungentlemanly",
        attackerName: scoringPlayer.name,
        victimName: otherPlayer.name,
        attackerPreviousScore,
        victimPreviousScore,
        attackerScoreAfter: 0,
        victimScoreAfter: 0
      });

      gameState.lastMessage = `${scoringPlayer.name} tied ${otherPlayer.name} under ${GR_RESET_THRESHOLD}. Ungentlemanly Gotcha! Both reset to 0.`;
      gameState.lastMessageColor = "#ff4c4c";
      return;
    }

    otherPlayer.score = 0;

    scoringPlayer.stats.gentlemanlyGotchas++;
    scoringPlayer.stats.gotchasGiven++;
    otherPlayer.stats.gotchasReceived++;

    resetEvents.push({
      type: "standard",
      attackerName: scoringPlayer.name,
      victimName: otherPlayer.name,
      attackerPreviousScore,
      victimPreviousScore,
      attackerScoreAfter: scoringPlayer.score,
      victimScoreAfter: 0
    });

    gameState.lastMessage = `${scoringPlayer.name} gotcha'd ${otherPlayer.name}! ${otherPlayer.name} resets to 0.`;
    gameState.lastMessageColor = "#facc15";
  });

  return resetEvents;
}

function getWinMessage(player, hitType, value) {
  const gentlemanly =
    hitType === "double" ||
    hitType === "triple" ||
    value === 1;

  if (gentlemanly) {
    player.stats.gentlemanlyWins++;
    return `${player.name} checks out like a true gentleman. Tap Next Player to make it official.`;
  }

  player.stats.ungentlemanlyWins++;
  return `${player.name} hit the number... but that single was wildly un-gentlemanly. Tap Next Player to make it official.`;
}

function finalizePendingWinner() {
  if (!gameState.pendingWinner || gameState.winner) return false;

  gameState.winner = gameState.pendingWinner.playerName;
  gameState.pendingWinner = null;
  gameState.finalStats = buildStatsSummary();

  saveGotchaHistory();

  return true;
}

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],

    players: buildPlayers(playerNames),

    currentPlayer: 0,
    turnNumber: 1,
    dartsThrown: 0,
    currentTurnThrows: [],
    turnStartSnapshot: null,
    turnReadyForNext: false,

    lastMessage: "",
    lastMessageColor: "#ffffff",

    winner: null,
    pendingWinner: null,
    pendingShanghai: null,
    shanghaiWinner: null,
    finalStats: null,
    historySaved: false
  };

  history = [];
  gameState.turnStartSnapshot = cloneState(gameState.players);
}

export function submitThrow(hitType, target = null) {
  if (
    gameState.winner ||
    gameState.pendingWinner ||
    gameState.pendingShanghai ||
    gameState.turnReadyForNext
  ) return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player) return;

  history.push(cloneState(gameState));

  const scoreBefore = player.score;
  const value = getHitValue(hitType, target);
  const newScore = scoreBefore + value;
  const dartNumber = gameState.dartsThrown + 1;

  gameState.dartsThrown++;
  player.stats.dartsThrown++;

  if (gameState.dartsThrown === 1) {
    player.stats.turnsTaken++;
  }

  const throwRecord = {
    hitType,
    target,
    label: getHitLabel(hitType, target),
    value,
    dartNumber,
    scoreBefore,
    scoreAfter: newScore,
    result: "scored",
    gotchaEvents: []
  };

  gameState.currentTurnThrows.push(throwRecord);

  const shanghaiHits = getShanghaiHitsForTarget(target);

  if (checkShanghai(shanghaiHits)) {
    throwRecord.result = "shanghai";
    recordThrowHistory(player, throwRecord);

    gameState.pendingShanghai = {
      playerName: player.name,
      target
    };

    return;
  }

  if (newScore > WINNING_SCORE) {
    const bustPlayerName = player.name;

    gameState.players = cloneState(gameState.turnStartSnapshot);

    const restoredPlayer = gameState.players[gameState.currentPlayer];
    if (restoredPlayer) {
      restoredPlayer.stats.busts++;
      restoredPlayer.stats.dartsThrown++;
      restoredPlayer.stats.turnsTaken =
        gameState.dartsThrown === 1
          ? restoredPlayer.stats.turnsTaken + 1
          : restoredPlayer.stats.turnsTaken;

      throwRecord.scoreAfter = restoredPlayer.score;
      throwRecord.result = "bust";
      recordThrowHistory(restoredPlayer, throwRecord);
    }

    gameState.turnReadyForNext = true;
    gameState.lastMessage = `${bustPlayerName} busts! Turn resets, including any Gotchas.`;
    gameState.lastMessageColor = "#ff4c4c";
    return;
  }

  player.score = newScore;
  player.stats.totalPoints += value;

  if (newScore === WINNING_SCORE) {
    player.stats.checkout = value;
    throwRecord.scoreAfter = player.score;
    throwRecord.result = "checkout";
    recordThrowHistory(player, throwRecord);

    gameState.pendingWinner = {
      playerName: player.name,
      hitType,
      value
    };

    gameState.turnReadyForNext = true;
    gameState.lastMessage = getWinMessage(player, hitType, value);
    gameState.lastMessageColor = "#22c55e";
    return;
  }

  const gotchaEvents = applyGotchaChecks(gameState.currentPlayer);
  throwRecord.gotchaEvents = gotchaEvents;
  throwRecord.scoreAfter = gameState.players[gameState.currentPlayer].score;

  recordThrowHistory(gameState.players[gameState.currentPlayer], throwRecord);

  if (!gotchaEvents.length) {
    gameState.lastMessage = `${player.name} scores ${value}.`;
    gameState.lastMessageColor = "#facc15";
  }

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;

    if (!gotchaEvents.length) {
      gameState.lastMessage = `${player.name}'s turn complete.`;
      gameState.lastMessageColor = "#facc15";
    }
  }
}

export function nextPlayer() {
  if (gameState.winner || gameState.pendingShanghai) return;

  history.push(cloneState(gameState));

  if (gameState.pendingWinner) {
    finalizePendingWinner();
    return;
  }

  padRemainingDartsAsMisses();
  advanceTurn();
}

export function confirmShanghaiWinner() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  const playerName = gameState.pendingShanghai.playerName;
  const target = gameState.pendingShanghai.target;

  gameState.shanghaiWinner = playerName;
  gameState.winner = playerName;
  gameState.pendingShanghai = null;
  gameState.pendingWinner = null;
  gameState.finalStats = buildStatsSummary();

  gameState.lastMessage = `${playerName} hit SHANGHAI on ${target}!`;
  gameState.lastMessageColor = "#ffcc00";

  saveGotchaHistory();
}

export function cancelPendingShanghai() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  if (history.length) {
    gameState = history.pop();
  } else {
    gameState.pendingShanghai = null;
  }
}

export function getThrowLog() {
  return gameState.players.map(player => ({
    name: player.name,
    throws: player.throwHistory || []
  }));
}

export function getTargetHints() {
  const currentPlayer = gameState.players?.[gameState.currentPlayer];

  if (!currentPlayer) {
    return {
      winNeeded: null,
      resetTargets: []
    };
  }

  const winNeeded = WINNING_SCORE - currentPlayer.score;

  const resetTargets = (gameState.players || [])
    .map((player, index) => {
      if (index === gameState.currentPlayer) return null;
      if (!player || player.score <= 0) return null;

      if (player.score < GR_RESET_THRESHOLD) return null;

      const needed = player.score - currentPlayer.score;

      if (needed <= 0 || needed > TARGET_HINT_RANGE) return null;

      return {
        playerName: player.name,
        needed,
        targetScore: player.score
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.needed - b.needed);

  return {
    winNeeded: winNeeded > 0 && winNeeded <= TARGET_HINT_RANGE ? winNeeded : null,
    resetTargets
  };
}

export function endGameEarly() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));

  const leader = [...gameState.players].sort((a, b) => b.score - a.score)[0];
  gameState.winner = leader?.name || "No Winner";
  gameState.pendingWinner = null;
  gameState.finalStats = buildStatsSummary();
  gameState.lastMessage = "Game ended early.";
  gameState.lastMessageColor = "#facc15";

  saveGotchaHistory();
}

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner;
}

export function getState() {
  return gameState;
}

export function getStats() {
  return buildStatsSummary();
}

export function getWinningScore() {
  return WINNING_SCORE;
}
