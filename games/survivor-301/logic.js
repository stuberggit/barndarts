let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";

const STARTING_SCORE = 301;
const GREEN_BULL_BASE_BONUS = 10;
const RED_BULL_BASE_BONUS = 20;
const EXTRA_BULL_BONUS = 10;
const MISS_PENALTY = -25;

/* -------------------------
   HELPERS
--------------------------*/

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function normalizePlayerName(player, index) {
  if (typeof player === "string") return player;
  if (player && typeof player.name === "string") return player.name;
  return `Player ${index + 1}`;
}

function getRandomBonusTarget() {
  return Math.floor(Math.random() * 10) + 11; // 11-20
}

function isBullHitType(hitType) {
  return hitType === "greenBull" || hitType === "redBull";
}

function isNumberHitType(hitType) {
  return hitType === "single" || hitType === "double" || hitType === "triple";
}

function getHitMultiplier(hitType) {
  const values = {
    single: 1,
    double: 2,
    triple: 3
  };

  return values[hitType] || 0;
}

function getHitLabel(hitType, target = null) {
  if (hitType === "miss") return "Miss Board";
  if (hitType === "greenBull") return "Sing Bull";
  if (hitType === "redBull") return "Dub Bull";

  const labels = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labels[hitType] || "Hit"} ${target}`;
}

function getScoreChange(hitType, target = null) {
  if (hitType === "miss") return MISS_PENALTY;

  if (hitType === "greenBull") {
    return GREEN_BULL_BASE_BONUS + (gameState.currentTurnBullCount || 0) * EXTRA_BULL_BONUS;
  }

  if (hitType === "redBull") {
    return RED_BULL_BASE_BONUS + (gameState.currentTurnBullCount || 0) * EXTRA_BULL_BONUS;
  }

  if (isNumberHitType(hitType)) {
    const value = target * getHitMultiplier(hitType);

    if (target === gameState.bonusTarget) {
      return value;
    }

    return -value;
  }

  return 0;
}

function isPlayerActive(player) {
  return !!player && player.isActive && !player.isEliminated;
}

function getActivePlayers() {
  return gameState.players.filter(player => isPlayerActive(player));
}

function countActivePlayers() {
  return getActivePlayers().length;
}

function updateMessage(message, color = "#ffffff") {
  gameState.lastMessage = message;
  gameState.lastMessageColor = color;
  gameState.lastMessageTimestamp = Date.now();
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.currentTurnBullCount = 0;
  gameState.turnReadyForNext = false;
}

function saveSurvivorHistory() {
  if (gameState.historySaved) return;

  const selectedProfiles = store.selectedPlayerProfiles || [];

  const players = gameState.players.map((player, index) => {
    const profile = selectedProfiles[index] || {};

    return {
      id: profile.id || null,
      name: player.name,
      avatar: profile.avatar || null,
      score: player.score,
      result: player.name === gameState.winner ? "winner" : "out",
      placement: player.name === gameState.winner ? 1 : player.eliminatedOrder || null,
      stats: { ...(player.stats || {}) }
    };
  });

  const winnerPlayer = players.find(player => player.result === "winner");

  saveGameResult({
    gameId: "survivor-301",
    gameName: "Survivor 301",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null
  });

  gameState.historySaved = true;
}

function ensureStats(player) {
  if (!player.stats) {
    player.stats = {
      dartsThrown: 0,
      turnsTaken: 0,
      misses: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      greenBulls: 0,
      redBulls: 0,
      pointsLost: 0,
      pointsGained: 0
    };
  }

  return player.stats;
}

function buildStatsSummary() {
  return gameState.players.map(player => ({
    name: player.name,
    score: player.score,
    isActive: player.isActive,
    isEliminated: player.isEliminated,
    eliminatedOrder: player.eliminatedOrder,
    stats: { ...ensureStats(player) }
  }));
}

function maybeDeclareWinner() {
  const activePlayers = getActivePlayers();

  if (activePlayers.length === 1) {
    gameState.winner = activePlayers[0].name;
    gameState.finalStats = buildStatsSummary();
    updateMessage(`${activePlayers[0].name} is the last survivor!`, "#facc15");
    saveSurvivorHistory();
    return true;
  }

  if (activePlayers.length === 0) {
    gameState.winner = "No Survivor";
    gameState.finalStats = buildStatsSummary();
    updateMessage("Everybody is out. No survivor remains.", "#ff4c4c");
    saveSurvivorHistory();
    return true;
  }

  return false;
}

function advanceTurn() {
  resetTurnTracking();

  let attempts = 0;
  let wrappedToNewRound = false;

  do {
    gameState.currentPlayer++;

    if (gameState.currentPlayer >= gameState.players.length) {
      gameState.currentPlayer = 0;
      gameState.turnNumber++;
      wrappedToNewRound = true;
    }

    attempts++;
  } while (
    !isPlayerActive(gameState.players[gameState.currentPlayer]) &&
    attempts <= gameState.players.length
  );

  if (wrappedToNewRound) {
    gameState.bonusTarget = getRandomBonusTarget();
  }

  maybeDeclareWinner();
}

function eliminateCurrentPlayer() {
  const player = gameState.players[gameState.currentPlayer];
  if (!player) return;

  player.isActive = false;
  player.isEliminated = true;
  player.eliminatedOrder = gameState.players.length - countActivePlayers() + 1;

  updateMessage(`${player.name} is eliminated!`, "#ff4c4c");
}

/* -------------------------
   INIT / STATE
--------------------------*/

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],

    players: playerNames.map(name => ({
      name,
      score: STARTING_SCORE,
      isActive: true,
      isEliminated: false,
      eliminatedOrder: null,
      stats: {
        dartsThrown: 0,
        turnsTaken: 0,
        misses: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        greenBulls: 0,
        redBulls: 0,
        pointsLost: 0,
        pointsGained: 0
      }
    })),

    bonusTarget: getRandomBonusTarget(), // first player

    currentPlayer: 0,
    turnNumber: 1,
    dartsThrown: 0,
    currentTurnThrows: [],
    currentTurnBullCount: 0,
    turnReadyForNext: false,

    lastMessage: "",
    lastMessageColor: "#ffffff",
    lastMessageTimestamp: 0,

    winner: null,
    finalStats: null,
    historySaved: false
  };

  history = [];

  if (playerNames.length < 2) {
    gameState.winner = "No Survivor";
    updateMessage("Survivor 301 needs at least 2 players.", "#ff4c4c");
  }
}

export function getState() {
  return gameState;
}

export function getStats() {
  return buildStatsSummary();
}

export function getCurrentTargetDisplay() {
  if (gameState.turnReadyForNext) {
    return `Turn complete — tap Next Player`;
  }

  return `Dart ${gameState.dartsThrown + 1}/3 | Bonus: ${gameState.bonusTarget}`;
}

/* -------------------------
   GAMEPLAY
--------------------------*/

export function submitThrow(hitType, target = null) {
  if (gameState.winner || gameState.turnReadyForNext) return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return;

  if (isNumberHitType(hitType)) {
    if (target == null || target < 1 || target > 20) return;
  }

  history.push(cloneState(gameState));

  const scoreBefore = player.score;
  const scoreChange = getScoreChange(hitType, target);
  const scoreAfter = scoreBefore + scoreChange;

  player.score = scoreAfter;
  gameState.dartsThrown++;

  if (isBullHitType(hitType)) {
    gameState.currentTurnBullCount++;
  }

  const throwRecord = {
    hitType,
    target,
    label: getHitLabel(hitType, target),
    scoreBefore,
    scoreChange,
    scoreAfter
  };

  gameState.currentTurnThrows.push(throwRecord);

  const stats = ensureStats(player);
  stats.dartsThrown++;

  if (gameState.dartsThrown === 1) {
    stats.turnsTaken++;
  }

  if (hitType === "miss") stats.misses++;
  if (hitType === "single") stats.singles++;
  if (hitType === "double") stats.doubles++;
  if (hitType === "triple") stats.triples++;
  if (hitType === "greenBull") stats.greenBulls++;
  if (hitType === "redBull") stats.redBulls++;

  if (scoreChange < 0) stats.pointsLost += Math.abs(scoreChange);
  if (scoreChange > 0) stats.pointsGained += scoreChange;

  if (hitType === "miss") {
    updateMessage(`${player.name} misses the board and loses ${Math.abs(MISS_PENALTY)}.`, "#ff4c4c");
  } else if (isBullHitType(hitType)) {
    updateMessage(`${player.name} hits ${getHitLabel(hitType)} and gains ${scoreChange}!`, "#22c55e");
  } else if (target === gameState.bonusTarget) {
    updateMessage(`${player.name} hits bonus ${getHitLabel(hitType, target)} and gains ${scoreChange}!`, "#22c55e");
  } else {
    updateMessage(`${player.name} hits ${getHitLabel(hitType, target)} for ${Math.abs(scoreChange)} damage.`, "#facc15");
  }

  if (player.score <= 0) {
    eliminateCurrentPlayer();

    if (!maybeDeclareWinner()) {
      advanceTurn();
    }

    return;
  }

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
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

  const activePlayers = getActivePlayers();

  if (activePlayers.length > 0) {
    const leader = [...activePlayers].sort((a, b) => b.score - a.score)[0];
    gameState.winner = leader.name;
  } else {
    gameState.winner = "No Survivor";
  }

  gameState.finalStats = buildStatsSummary();
   saveSurvivorHistory(); 
   updateMessage("Game ended early.", "#facc15");
}

/* -------------------------
   SHARED ACTIONS
--------------------------*/

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner;
}
