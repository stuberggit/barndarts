let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";
import { checkShanghai } from "../../core/rules/shanghai.js";

const STARTING_SCORE = 301;

const BONUS_MIN = 5;
const BONUS_MAX = 12;
const BONUS_ROUND_CHANCE = 0.25;
const MAX_BONUS_ROUNDS_IN_A_ROW = 2;

const GREEN_BULL_BASE_BONUS = 10;
const GREEN_BULL_STEP = 5;
const GREEN_BULL_CAP = 25;

const RED_BULL_BASE_BONUS = 20;
const RED_BULL_STEP = 5;
const RED_BULL_CAP = 50;

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
  return Math.floor(Math.random() * (BONUS_MAX - BONUS_MIN + 1)) + BONUS_MIN;
}

function getConsecutiveBonusRoundCount() {
  const history = gameState.bonusRoundHistory || [];
  let count = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] !== true) break;
    count++;
  }

  return count;
}

function shouldCreateBonusRound() {
  const consecutiveBonusRounds = getConsecutiveBonusRoundCount();

  if (consecutiveBonusRounds >= MAX_BONUS_ROUNDS_IN_A_ROW) {
    return false;
  }

  return Math.random() < BONUS_ROUND_CHANCE;
}

function setBonusForNewRound() {
  const bonusActive = shouldCreateBonusRound();

  gameState.bonusTarget = bonusActive ? getRandomBonusTarget() : null;

  if (!Array.isArray(gameState.bonusRoundHistory)) {
    gameState.bonusRoundHistory = [];
  }

  gameState.bonusRoundHistory.push(bonusActive);
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

function isBonusRound() {
  return !!gameState.bonusTarget;
}

function getActiveBonusTarget() {
  return isBonusRound() ? gameState.bonusTarget : null;
}

function hasEarnedBonusThisTurn() {
  return (gameState.currentTurnThrows || []).some(
    throwRecord => throwRecord.wasBonus === true
  );
}

function getBullBonus(player, hitType) {
  if (!player) return 0;

  if (hitType === "greenBull") {
    const priorHits = player.greenBullHits || 0;

    return Math.min(
      GREEN_BULL_BASE_BONUS + priorHits * GREEN_BULL_STEP,
      GREEN_BULL_CAP
    );
  }

  if (hitType === "redBull") {
    const priorHits = player.redBullHits || 0;

    return Math.min(
      RED_BULL_BASE_BONUS + priorHits * RED_BULL_STEP,
      RED_BULL_CAP
    );
  }

  return 0;
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
  const player = gameState.players?.[gameState.currentPlayer];

  if (hitType === "miss") return MISS_PENALTY;

  if (isBullHitType(hitType)) {
    return getBullBonus(player, hitType);
  }

  if (isNumberHitType(hitType)) {
    const rawValue = target * getHitMultiplier(hitType);
    const activeBonusTarget = getActiveBonusTarget();

    if (
      activeBonusTarget &&
      target === activeBonusTarget &&
      !hasEarnedBonusThisTurn()
    ) {
      return rawValue;
    }

    return -rawValue;
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
      bonusHits: 0,
      pointsLost: 0,
      pointsGained: 0
    };
  }

  if (player.stats.bonusHits == null) {
    player.stats.bonusHits = 0;
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
  if (gameState.pendingWinnerConfirmation || gameState.winner) {
    return true;
  }

  const activePlayers = getActivePlayers();

  if (activePlayers.length === 1) {
    gameState.pendingWinnerConfirmation = true;
    gameState.pendingWinner = activePlayers[0].name;
    gameState.finalStats = buildStatsSummary();

    updateMessage(
      `${activePlayers[0].name} appears to be the last survivor. Confirm winner.`,
      "#facc15"
    );

    return true;
  }

  if (activePlayers.length === 0) {
    gameState.pendingWinnerConfirmation = true;
    gameState.pendingWinner = "No Survivor";
    gameState.finalStats = buildStatsSummary();

    updateMessage(
      "Everybody appears to be out. Confirm no survivor remains.",
      "#ff4c4c"
    );

    return true;
  }

  return false;
}

function advanceTurn() {
  if (gameState.pendingWinnerConfirmation || gameState.winner) return;

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
    setBonusForNewRound();
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
      throwHistory: [],
      greenBullHits: 0,
      redBullHits: 0,
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
        bonusHits: 0,
        pointsLost: 0,
        pointsGained: 0
      }
    })),

    bonusTarget: null,
    bonusRoundHistory: [],

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
    pendingWinner: null,
    pendingWinnerConfirmation: false,

    pendingShanghai: null,
    shanghaiWinner: null,

    finalStats: null,
    historySaved: false
  };

  history = [];

  if (playerNames.length < 2) {
    gameState.winner = "No Survivor";
    updateMessage("Survivor 301 needs at least 2 players.", "#ff4c4c");
    return;
  }

  setBonusForNewRound();
}

export function getState() {
  return gameState;
}

export function getStats() {
  return buildStatsSummary();
}

export function getCurrentTargetDisplay() {
  if (gameState.pendingWinnerConfirmation) {
    return "Confirm winner";
  }

  if (gameState.turnReadyForNext) {
    return "Turn complete — tap Next Player";
  }

  const bonusText = getActiveBonusTarget()
    ? ` | Bonus: ${getActiveBonusTarget()}`
    : "";

  return `Dart ${gameState.dartsThrown + 1}/3${bonusText}`;
}

export function getCurrentBonusDisplay() {
  const activeBonusTarget = getActiveBonusTarget();

  return {
    active: !!activeBonusTarget,
    target: activeBonusTarget,
    label: activeBonusTarget ? `Bonus ${activeBonusTarget}` : "No Bonus"
  };
}

/* -------------------------
   GAMEPLAY
--------------------------*/

function recordThrowHistory(player, throwRecord) {
  if (!player.throwHistory) player.throwHistory = [];

  player.throwHistory.push({
    turnNumber: gameState.turnNumber,
    dartNumber: throwRecord.dartNumber,
    label: throwRecord.label,
    scoreBefore: throwRecord.scoreBefore,
    scoreChange: throwRecord.scoreChange,
    scoreAfter: throwRecord.scoreAfter,
    result: throwRecord.result || "scored"
  });
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

function padRemainingDartsAsMisses() {
  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return;

  while (
    !gameState.winner &&
    !gameState.pendingWinnerConfirmation &&
    !gameState.pendingShanghai &&
    gameState.dartsThrown < 3
  ) {
    applySurvivorThrow("miss", null, true);
  }
}

function applySurvivorThrow(hitType, target = null, isAutoMiss = false) {
  if (
    gameState.winner ||
    gameState.pendingWinnerConfirmation ||
    gameState.pendingShanghai ||
    gameState.turnReadyForNext
  ) {
    return;
  }

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return;

  if (isNumberHitType(hitType)) {
    if (target == null || target < 1 || target > 20) return;
  }

  if (!isAutoMiss) {
    history.push(cloneState(gameState));
  }

  const scoreBefore = player.score;
  const scoreChange = getScoreChange(hitType, target);
  const scoreAfter = scoreBefore + scoreChange;
  const dartNumber = gameState.dartsThrown + 1;
  const activeBonusTarget = getActiveBonusTarget();

  const wasBonus =
    isNumberHitType(hitType) &&
    target === activeBonusTarget &&
    scoreChange > 0;

  gameState.dartsThrown++;

  if (isBullHitType(hitType)) {
    gameState.currentTurnBullCount++;
  }

  if (hitType === "greenBull") {
    player.greenBullHits = (player.greenBullHits || 0) + 1;
  }

  if (hitType === "redBull") {
    player.redBullHits = (player.redBullHits || 0) + 1;
  }

  const throwRecord = {
    hitType,
    target,
    label: getHitLabel(hitType, target),
    scoreBefore,
    scoreChange,
    scoreAfter,
    dartNumber,
    bonusTarget: activeBonusTarget,
    wasBonus,
    result: hitType === "miss" ? "miss" : wasBonus ? "bonus" : "scored"
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
  if (wasBonus) stats.bonusHits++;

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

  player.score = scoreAfter;

  if (scoreChange < 0) stats.pointsLost += Math.abs(scoreChange);
  if (scoreChange > 0) stats.pointsGained += scoreChange;

  recordThrowHistory(player, throwRecord);

  if (hitType === "miss") {
    updateMessage(`${player.name} misses the board and loses ${Math.abs(scoreChange)}.`, "#ff4c4c");
  } else if (isBullHitType(hitType)) {
    updateMessage(`${player.name} hits ${getHitLabel(hitType)} and gains ${scoreChange}!`, "#22c55e");
  } else if (wasBonus) {
    updateMessage(`${player.name} hits bonus ${getHitLabel(hitType, target)} and gains ${scoreChange}!`, "#22c55e");
  } else {
    updateMessage(`${player.name} hits ${getHitLabel(hitType, target)} for ${Math.abs(scoreChange)} damage.`, "#facc15");
  }

  if (player.score <= 0) {
    eliminateCurrentPlayer();

    if (!maybeDeclareWinner() && !isAutoMiss) {
      advanceTurn();
    }

    return;
  }

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
  }
}

export function submitThrow(hitType, target = null) {
  applySurvivorThrow(hitType, target, false);
}

export function nextPlayer() {
  if (
    gameState.winner ||
    gameState.pendingWinnerConfirmation ||
    gameState.pendingShanghai
  ) {
    return;
  }

  history.push(cloneState(gameState));

  padRemainingDartsAsMisses();

  if (
    !gameState.winner &&
    !gameState.pendingWinnerConfirmation &&
    !gameState.pendingShanghai
  ) {
    advanceTurn();
  }
}

export function endGameEarly() {
  if (gameState.winner || gameState.pendingWinnerConfirmation) return;

  history.push(cloneState(gameState));

  const activePlayers = getActivePlayers();

  if (activePlayers.length > 0) {
    const leader = [...activePlayers].sort((a, b) => b.score - a.score)[0];
    gameState.winner = leader.name;
  } else {
    gameState.winner = "No Survivor";
  }

  gameState.pendingWinner = null;
  gameState.pendingWinnerConfirmation = false;
  gameState.finalStats = buildStatsSummary();

  saveSurvivorHistory();
  updateMessage("Game ended early.", "#facc15");
}

/* -------------------------
   SHARED ACTIONS
--------------------------*/

export function confirmShanghaiWinner() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  const playerName = gameState.pendingShanghai.playerName;
  const target = gameState.pendingShanghai.target;

  gameState.shanghaiWinner = playerName;
  gameState.winner = playerName;
  gameState.pendingShanghai = null;
  gameState.pendingWinner = null;
  gameState.pendingWinnerConfirmation = false;
  gameState.finalStats = buildStatsSummary();

  updateMessage(`${playerName} hit SHANGHAI on ${target}!`, "#ffcc00");

  saveSurvivorHistory();
}

export function cancelPendingShanghai() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  if (history.length) {
    gameState = history.pop();
  } else {
    gameState.pendingShanghai = null;
  }
}

export function confirmPendingWinner() {
  if (!gameState.pendingWinnerConfirmation || gameState.winner) return;

  gameState.winner = gameState.pendingWinner || "No Survivor";
  gameState.pendingWinner = null;
  gameState.pendingWinnerConfirmation = false;
  gameState.finalStats = buildStatsSummary();

  if (gameState.winner === "No Survivor") {
    updateMessage("Everybody is out. No survivor remains.", "#ff4c4c");
  } else {
    updateMessage(`${gameState.winner} is the last survivor!`, "#facc15");
  }

  saveSurvivorHistory();
}

export function cancelPendingWinner() {
  if (!gameState.pendingWinnerConfirmation || gameState.winner) return;

  if (history.length) {
    gameState = history.pop();
    updateMessage("Final elimination undone. Continue playing.", "#facc15");
    return;
  }

  gameState.pendingWinner = null;
  gameState.pendingWinnerConfirmation = false;
  updateMessage("Final elimination cancelled. Continue playing.", "#facc15");
}

export function getThrowLog() {
  return gameState.players.map(player => ({
    name: player.name,
    throws: player.throwHistory || []
  }));
}

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner;
}
