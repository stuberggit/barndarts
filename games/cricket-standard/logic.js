let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";
import { checkShanghai } from "../../core/rules/shanghai.js";

const TARGETS = [20, 19, 18, 17, 16, 15, 25];

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function normalizePlayerName(player, index) {
  if (typeof player === "string") return player;
  if (player && typeof player.name === "string") return player.name;
  return `Player ${index + 1}`;
}

function formatTarget(target) {
  return target === 25 ? "Bull" : String(target);
}

function getHitMarks(hitType) {
  if (hitType === "miss") return 0;
  if (hitType === "single" || hitType === "greenBull") return 1;
  if (hitType === "double" || hitType === "redBull") return 2;
  if (hitType === "triple") return 3;
  return 0;
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

  return `${labels[hitType] || "Hit"} ${formatTarget(target)}`;
}

function isTargetClosedForPlayer(player, target) {
  return (player.marks?.[target] || 0) >= 3;
}

function isTargetClosedByAll(target) {
  return gameState.players.every(player => isTargetClosedForPlayer(player, target));
}

function canScoreOnTarget(playerIndex, target) {
  const player = gameState.players[playerIndex];
  if (!player || !isTargetClosedForPlayer(player, target)) return false;

  return gameState.players.some((other, index) => {
    if (index === playerIndex) return false;
    return !isTargetClosedForPlayer(other, target);
  });
}

function allTargetsClosed(player) {
  return TARGETS.every(target => isTargetClosedForPlayer(player, target));
}

function getHighestScore() {
  return Math.max(...gameState.players.map(player => player.score));
}

function buildStatsSummary() {
  return gameState.players.map(player => ({
    name: player.name,
    score: player.score,
    marks: { ...player.marks },
    stats: { ...(player.stats || {}) }
  }));
}

function saveCricketHistory() {
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
      marks: { ...player.marks },
      stats: { ...(player.stats || {}) }
    };
  });

  const winnerPlayer = players.find(player => player.name === gameState.winner) || null;

  saveGameResult({
    gameId: "cricket-standard",
    gameName: "Standard Cricket",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      targets: TARGETS.map(formatTarget),
      finalStats: buildStatsSummary()
    }
  });

  gameState.historySaved = true;
}

function maybeDeclareWinner() {
  const eligibleWinners = gameState.players.filter(player => {
    return allTargetsClosed(player) && player.score >= getHighestScore();
  });

  if (eligibleWinners.length === 1) {
    gameState.winner = eligibleWinners[0].name;
    gameState.finalStats = buildStatsSummary();
    gameState.lastMessage = `${eligibleWinners[0].name} wins Cricket!`;
    gameState.lastMessageColor = "#22c55e";
    saveCricketHistory();
    return true;
  }

  return false;
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
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

function createMarks() {
  return TARGETS.reduce((acc, target) => {
    acc[target] = 0;
    return acc;
  }, {});
}

function createStats() {
  return {
    dartsThrown: 0,
    turnsTaken: 0,
    marksHit: 0,
    pointsScored: 0,
    misses: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    greenBulls: 0,
    redBulls: 0
  };
}

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],

    players: playerNames.map(name => ({
      name,
      score: 0,
      marks: createMarks(),
      stats: createStats()
    })),

    currentPlayer: 0,
    turnNumber: 1,
    dartsThrown: 0,
    currentTurnThrows: [],
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

export function submitThrow(hitType, target = null) {
  if (gameState.winner || gameState.pendingShanghai || gameState.turnReadyForNext) return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player) return;

  if (hitType !== "miss" && !TARGETS.includes(target)) return;
  if (target === 25 && hitType === "triple") return;

  history.push(cloneState(gameState));

  const marks = getHitMarks(hitType);
  const scoreValue = target === 25 ? 25 : target;
  let pointsScored = 0;
  let marksApplied = 0;
  let extraMarks = 0;

  gameState.dartsThrown++;
  player.stats.dartsThrown++;

  if (gameState.dartsThrown === 1) {
    player.stats.turnsTaken++;
  }

  if (hitType === "miss") player.stats.misses++;
  if (hitType === "single") player.stats.singles++;
  if (hitType === "double") player.stats.doubles++;
  if (hitType === "triple") player.stats.triples++;
  if (hitType === "greenBull") player.stats.greenBulls++;
  if (hitType === "redBull") player.stats.redBulls++;

  const throwRecord = {
    hitType,
    target,
    label: getHitLabel(hitType, target),
    marks,
    marksApplied,
    extraMarks,
    pointsScored
  };

  gameState.currentTurnThrows.push(throwRecord);

  const shanghaiHits = gameState.currentTurnThrows
    .filter(t => t.target === target && target !== null && target !== 25)
    .map(t => {
      if (t.hitType === "single") return 1;
      if (t.hitType === "double") return 2;
      if (t.hitType === "triple") return 3;
      return 0;
    })
    .filter(Boolean);

  if (checkShanghai(shanghaiHits)) {
    gameState.pendingShanghai = {
      playerName: player.name,
      target
    };
    return;
  }

  if (marks > 0) {
    const previousMarks = player.marks[target] || 0;
    const neededToClose = Math.max(0, 3 - previousMarks);
    marksApplied = Math.min(marks, neededToClose);
    extraMarks = Math.max(0, marks - marksApplied);

    player.marks[target] = Math.min(3, previousMarks + marks);

    if (extraMarks > 0 && canScoreOnTarget(gameState.currentPlayer, target)) {
      pointsScored = extraMarks * scoreValue;
      player.score += pointsScored;
      player.stats.pointsScored += pointsScored;
    }

    player.stats.marksHit += marks;
  }

  throwRecord.marksApplied = marksApplied;
  throwRecord.extraMarks = extraMarks;
  throwRecord.pointsScored = pointsScored;

  if (hitType === "miss") {
    gameState.lastMessage = `${player.name} misses.`;
    gameState.lastMessageColor = "#ffffff";
  } else if (pointsScored > 0) {
    gameState.lastMessage = `${player.name} hits ${getHitLabel(hitType, target)} and scores ${pointsScored}!`;
    gameState.lastMessageColor = "#22c55e";
  } else if (isTargetClosedForPlayer(player, target)) {
    gameState.lastMessage = `${player.name} closes ${formatTarget(target)}.`;
    gameState.lastMessageColor = "#facc15";
  } else {
    gameState.lastMessage = `${player.name} hits ${getHitLabel(hitType, target)}.`;
    gameState.lastMessageColor = "#facc15";
  }

  if (maybeDeclareWinner()) return;

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;
    gameState.lastMessage = `${player.name}'s turn complete.`;
    gameState.lastMessageColor = "#facc15";
  }
}

export function nextPlayer() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));
  advanceTurn();
}

export function endGameEarly() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));

  const leader = [...gameState.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const bClosed = TARGETS.filter(target => isTargetClosedForPlayer(b, target)).length;
    const aClosed = TARGETS.filter(target => isTargetClosedForPlayer(a, target)).length;
    return bClosed - aClosed;
  })[0];

  gameState.winner = leader?.name || "No Winner";
  gameState.finalStats = buildStatsSummary();
  gameState.lastMessage = "Game ended early.";
  gameState.lastMessageColor = "#facc15";

  saveCricketHistory();
}

export function confirmShanghaiWinner() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  const playerName = gameState.pendingShanghai.playerName;
  const target = gameState.pendingShanghai.target;

  gameState.shanghaiWinner = playerName;
  gameState.winner = playerName;
  gameState.pendingShanghai = null;
  gameState.finalStats = buildStatsSummary();

  gameState.lastMessage = `${playerName} hit SHANGHAI on ${formatTarget(target)}!`;
  gameState.lastMessageColor = "#ffcc00";

  saveCricketHistory();
}

export function cancelPendingShanghai() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  if (history.length) {
    gameState = history.pop();
  } else {
    gameState.pendingShanghai = null;
  }
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

export function getTargets() {
  return [...TARGETS];
}

export function formatCricketTarget(target) {
  return formatTarget(target);
}

export function targetClosedByAll(target) {
  return isTargetClosedByAll(target);
}
