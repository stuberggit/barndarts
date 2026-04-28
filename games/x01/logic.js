let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";
import { checkShanghai } from "../../core/rules/shanghai.js";

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

function buildPlayers(playerNames, startingScore) {
  return playerNames.map(name => ({
    name,
    score: startingScore,
    throwHistory: [],
    stats: {
      dartsThrown: 0,
      turnsTaken: 0,
      busts: 0,
      totalPoints: 0,
      checkout: null
    }
  }));
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.turnStartScore = gameState.players[gameState.currentPlayer].score;
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

function saveX01History() {
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
    gameId: "x01",
    gameName: "X01",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      startingScore: gameState.startingScore,
      shanghaiWinner: gameState.shanghaiWinner || null,
      finalStats: buildStatsSummary()
    }
  });

  gameState.historySaved = true;
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
    result: throwRecord.result || "scored"
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
      value: 0,
      dartNumber,
      label: "Miss",
      scoreBefore: player.score,
      scoreAfter: player.score,
      result: "miss"
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

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],
    playerNames: [...playerNames],

    isConfigured: false,
    startingScore: 301,

    players: buildPlayers(playerNames, 301),

    currentPlayer: 0,
    turnNumber: 1,
    dartsThrown: 0,
    currentTurnThrows: [],
    turnStartScore: 301,
    turnReadyForNext: false,

    lastMessage: "",
    lastMessageColor: "#ffffff",

    winner: null,
    pendingShanghai: null,
    shanghaiWinner: null,
    finalStats: null,
    historySaved: false
  };

  history = [];
}

export function configureGame(startingScore) {
  const safeScore = Math.max(101, Math.min(1001, Number(startingScore) || 301));
  const normalizedScore = safeScore % 100 === 1 ? safeScore : 301;

  history.push(cloneState(gameState));

  gameState.startingScore = normalizedScore;
  gameState.players = buildPlayers(gameState.playerNames, normalizedScore);
  gameState.currentPlayer = 0;
  gameState.turnNumber = 1;
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.turnStartScore = normalizedScore;
  gameState.turnReadyForNext = false;
  gameState.lastMessage = "";
  gameState.lastMessageColor = "#ffffff";
  gameState.winner = null;
  gameState.pendingShanghai = null;
  gameState.shanghaiWinner = null;
  gameState.finalStats = null;
  gameState.historySaved = false;
  gameState.isConfigured = true;
}

export function submitThrow(hitType, target = null) {
  if (
    !gameState.isConfigured ||
    gameState.winner ||
    gameState.pendingShanghai ||
    gameState.turnReadyForNext
  ) {
    return;
  }

  const player = gameState.players[gameState.currentPlayer];
  if (!player) return;

  history.push(cloneState(gameState));

  const value = getHitValue(hitType, target);
  const scoreBefore = player.score;
  const newScore = player.score - value;
  const dartNumber = gameState.dartsThrown + 1;

  gameState.dartsThrown++;
  player.stats.dartsThrown++;

  if (gameState.dartsThrown === 1) {
    player.stats.turnsTaken++;
  }

  const throwRecord = {
    hitType,
    target,
    value,
    dartNumber,
    label: getHitLabel(hitType, target),
    scoreBefore,
    scoreAfter: newScore,
    result: "scored"
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

  if (newScore < 0) {
    player.score = gameState.turnStartScore;
    player.stats.busts++;

    throwRecord.scoreAfter = gameState.turnStartScore;
    throwRecord.result = "bust";
    recordThrowHistory(player, throwRecord);

    gameState.turnReadyForNext = true;
    gameState.lastMessage = `${player.name} busts!`;
    gameState.lastMessageColor = "#ff4c4c";
    return;
  }

  if (newScore === 0) {
    player.score = 0;
    player.stats.totalPoints += value;
    player.stats.checkout = value;

    throwRecord.scoreAfter = 0;
    throwRecord.result = "checkout";
    recordThrowHistory(player, throwRecord);

    gameState.winner = player.name;
    gameState.finalStats = buildStatsSummary();
    gameState.lastMessage = `${player.name} wins!`;
    gameState.lastMessageColor = "#22c55e";

    saveX01History();
    return;
  }

  player.score = newScore;
  player.stats.totalPoints += value;
  recordThrowHistory(player, throwRecord);

  gameState.lastMessage = `${player.name} scores ${value}`;
  gameState.lastMessageColor = "#facc15";

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;
    gameState.lastMessage = `${player.name}'s turn complete`;
  }
}

export function nextPlayer() {
  if (!gameState.isConfigured || gameState.winner || gameState.pendingShanghai) return;

  history.push(cloneState(gameState));

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
  gameState.finalStats = buildStatsSummary();

  gameState.lastMessage = `${playerName} hit SHANGHAI on ${target}!`;
  gameState.lastMessageColor = "#ffcc00";

  saveX01History();
}

export function cancelPendingShanghai() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  if (history.length) {
    gameState = history.pop();
  } else {
    gameState.pendingShanghai = null;
  }
}

export function endGameEarly() {
  if (!gameState.isConfigured || gameState.winner) return;

  history.push(cloneState(gameState));

  const leader = [...gameState.players].sort((a, b) => a.score - b.score)[0];
  gameState.winner = leader?.name || "No Winner";
  gameState.finalStats = buildStatsSummary();
  gameState.lastMessage = "Game ended early.";
  gameState.lastMessageColor = "#facc15";

  saveX01History();
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

export function getThrowLog() {
  return gameState.players.map(player => ({
    name: player.name,
    throws: player.throwHistory || []
  }));
}
