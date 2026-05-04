let gameState = {};
let history = [];

import { checkShanghai } from "../../core/rules/shanghai.js";
import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);
  const hazardHoles = generateHazardHoles();
  const hammerHoles = generateHammerHoles(hazardHoles);

  gameState = {
    originalPlayers: [...playerNames],

    players: playerNames.map(name => ({
      name,
      scores: Array(18).fill(null),
      total: 0,
      stats: {
        turnsTaken: 0,
        dartsThrown: 0,
        misses: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        scoreLabels: {}
      }
    })),

    currentHole: 0,
    currentPlayer: 0,

    dartsThrown: 0,
    turnHitsCount: 0,
    currentTurnHits: [],
    currentTurnThrows: [],

    lastScoreMessage: "",
    lastScoreColor: "",
    lastScoreTimestamp: 0,

    shanghaiWinner: null,
    pendingShanghai: null,
    finalStats: null,
    historySaved: false,

    hazardHoles,
    hammerHoles,

    awaitingHazardInput: false,
    awaitingHammerInput: false,

    pendingTurnPlayerIndex: null,
    pendingTurnHole: null,
    pendingHammerValue: null
  };

  history = [];
}

export function getState() {
  return gameState;
}

export function getStats() {
  return buildStatsSummary();
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function normalizePlayerName(player, index) {
  if (typeof player === "string") return player;
  if (player && typeof player.name === "string") return player.name;
  return `Player ${index + 1}`;
}

function ensureStats(player) {
  if (!player.stats) {
    player.stats = {
      turnsTaken: 0,
      dartsThrown: 0,
      misses: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      scoreLabels: {}
    };
  }

  if (!player.stats.scoreLabels) {
    player.stats.scoreLabels = {};
  }

  return player.stats;
}

function recordDartStats(player, hitValue) {
  const stats = ensureStats(player);

  stats.dartsThrown++;

  if (hitValue === 0) stats.misses++;
  if (hitValue === 1) stats.singles++;
  if (hitValue === 2) stats.doubles++;
  if (hitValue === 3) stats.triples++;
}

function fillUnthrownDartsAsMisses(player) {
  while (gameState.currentTurnThrows.length < 3) {
    gameState.currentTurnThrows.push(0);
    recordDartStats(player, 0);
  }
}

function getScoreLabel(score, hazards = 0, isHammer = false) {
  const meta = getMeta(score);
  let scoreLabel = score === 1 ? "Hole in One" : meta.label;

  const isBarnDartPar =
    !isHammer &&
    hazards === 0 &&
    score === 3 &&
    gameState.turnHitsCount === 1 &&
    gameState.currentTurnThrows[2] === 1;

  if (isBarnDartPar) {
    scoreLabel = "Barn Dart Par";
  }

  return scoreLabel;
}

function recordScoreLabel(player, scoreLabel) {
  const stats = ensureStats(player);

  stats.turnsTaken++;
  stats.scoreLabels[scoreLabel] = (stats.scoreLabels[scoreLabel] || 0) + 1;
}

function buildStatsSummary() {
  return gameState.players.map(player => ({
    name: player.name,
    score: player.total,
    total: player.total,
    scores: [...player.scores],
    result: player.name === getWinnerName() ? "winner" : "played",
    stats: JSON.parse(JSON.stringify(ensureStats(player)))
  }));
}

function getWinnerName() {
  if (gameState.shanghaiWinner) return gameState.shanghaiWinner;

  const winner = [...(gameState.players || [])].sort((a, b) => a.total - b.total)[0];
  return winner ? winner.name : null;
}

function saveGolfDartsHistory() {
  if (gameState.historySaved) return;

  const selectedProfiles = store.selectedPlayerProfiles || [];
  const winnerName = getWinnerName();

  const players = gameState.players.map((player, index) => {
    const profile = selectedProfiles[index] || {};
    const stats = ensureStats(player);

    return {
      id: profile.id || null,
      name: player.name,
      avatar: profile.avatar || null,
      score: player.total,
      result: player.name === winnerName ? "winner" : "played",
      scores: [...player.scores],
      stats: {
        total: player.total,
        shanghai: gameState.shanghaiWinner === player.name,
        turnsTaken: stats.turnsTaken || 0,
        dartsThrown: stats.dartsThrown || 0,
        misses: stats.misses || 0,
        singles: stats.singles || 0,
        doubles: stats.doubles || 0,
        triples: stats.triples || 0,
        scoreLabels: { ...(stats.scoreLabels || {}) }
      }
    };
  });

  const winnerPlayer = players.find(player => player.name === winnerName) || null;

  saveGameResult({
    gameId: "golfdarts",
    gameName: "GolfDarts",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      hazardHoles: [...(gameState.hazardHoles || [])],
      hammerHoles: [...(gameState.hammerHoles || [])],
      shanghaiWinner: gameState.shanghaiWinner || null,
      finalStats: buildStatsSummary()
    }
  });

  gameState.finalStats = buildStatsSummary();
  gameState.historySaved = true;
}

export function recordThrow(hitValue) {
  if (
    gameState.currentHole >= 18 ||
    gameState.shanghaiWinner ||
    gameState.pendingShanghai ||
    gameState.awaitingHazardInput ||
    gameState.awaitingHammerInput ||
    gameState.dartsThrown >= 3
  ) {
    return;
  }

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const safeHitValue = Math.max(0, Math.min(3, hitValue));

  gameState.turnHitsCount += safeHitValue;
  gameState.dartsThrown++;
  gameState.currentTurnThrows.push(safeHitValue);

  recordDartStats(player, safeHitValue);

  if (safeHitValue > 0) {
    gameState.currentTurnHits.push(safeHitValue);
  }

  if (checkShanghai(gameState.currentTurnHits)) {
    gameState.pendingShanghai = player.name;
  }
}

export function getBaseFromHits(hits) {
  const cappedHits = Math.max(0, Math.min(9, hits));

  if (cappedHits === 0) return 5;

  const s = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return s[cappedHits - 1] ?? 5;
}

export function getFinal(hits, hazards = 0) {
  const base = getBaseFromHits(hits);
  return base + hazards;
}

export function getBaseScoreFromHits(hits) {
  const cappedHits = Math.max(0, Math.min(9, hits));

  if (cappedHits === 0) return 5;

  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return scores[cappedHits - 1] ?? 5;
}

export function getFinalScore(hits, hazards = 0) {
  const baseScore = getBaseScoreFromHits(hits);
  return baseScore + hazards;
}

export function getMeta(score) {
  const labels = {
    8: "Buster",
    7: "Quad Bogey",
    6: "Triple Bogey",
    5: "Double Bogey",
    4: "Bogey",
    3: "Par",
    2: "Birdie",
    1: "Hole in One",
    0: "Goose Egg",
    "-1": "Icicle",
    "-2": "Polar Bear",
    "-3": "Frostbite",
    "-4": "Snowman",
    "-5": "Avalanche"
  };

  const colors = {
    8: "#dc143c",
    7: "#8a2be2",
    6: "#c71585",
    5: "#ff4c4c",
    4: "#ff8c00",
    3: "#22c55e",
    2: "#00ffff",
    1: "#00bfff",
    0: "#ffcc00",
    "-1": "#7fffd4",
    "-2": "#66cdaa",
    "-3": "#20b2aa",
    "-4": "#5f9ea0",
    "-5": "#2f4f4f"
  };

  return {
    label: labels[score] ?? "Unknown",
    color: colors[score] ?? "#ffffff"
  };
}

function generateHazardHoles() {
  const frontNine = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 2);
  const backNine = shuffle([9, 10, 11, 12, 13, 14, 15, 16, 17]).slice(0, 2);
  return [...frontNine, ...backNine];
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function finalizeTurn(hazards = 0, isHammer = false) {
  const player = gameState.players[gameState.currentPlayer];
  if (!player || gameState.currentHole >= 18) return;

  fillUnthrownDartsAsMisses(player);

  let hits;

  if (isHammer) {
    hits = getHammerHitsFromThrows(gameState.currentTurnThrows);
  } else {
    hits = Math.min(gameState.turnHitsCount, 9);
  }

  const score = getFinalScore(hits, hazards);
  const meta = getMeta(score);
  const scoreLabel = getScoreLabel(score, hazards, isHammer);

  player.scores[gameState.currentHole] = score;
  player.total += score;

  recordScoreLabel(player, scoreLabel);

  gameState.lastScoreMessage = `${player.name} scores ${scoreLabel}!`;
  gameState.lastScoreColor = meta.color || "#ffffff";
  gameState.lastScoreTimestamp = Date.now();

  gameState.dartsThrown = 0;
  gameState.turnHitsCount = 0;
  gameState.currentTurnHits = [];
  gameState.currentTurnThrows = [];

  gameState.awaitingHazardInput = false;
  gameState.awaitingHammerInput = false;

  gameState.pendingTurnPlayerIndex = null;
  gameState.pendingTurnHole = null;
  gameState.pendingHammerValue = null;

  gameState.currentPlayer++;

  if (gameState.currentPlayer >= gameState.players.length) {
    gameState.currentPlayer = 0;
    gameState.currentHole++;
  }

  if (gameState.currentHole >= 18) {
    gameState.finalStats = buildStatsSummary();
    saveGolfDartsHistory();
  }
}

function generateHammerHoles(hazardHoles) {
  const frontNine = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
    h => !hazardHoles.includes(h)
  );
  const backNine = [9, 10, 11, 12, 13, 14, 15, 16, 17].filter(
    h => !hazardHoles.includes(h)
  );

  const frontHammer = shuffle(frontNine)[0];
  const backHammer = shuffle(backNine)[0];

  return [frontHammer, backHammer];
}

export function submitHazards(hazardCount) {
  if (!gameState.awaitingHazardInput) return;

  history.push(cloneState(gameState));

  const safeHazards = Math.max(0, Math.min(3, hazardCount));
  finalizeTurn(safeHazards);
}

export function submitHammer() {
  if (gameState.awaitingHammerInput) {
    history.push(cloneState(gameState));
    finalizeTurn(0, true);
  }
}

function getHammerHitsFromThrows(throws) {
  if (!Array.isArray(throws) || throws.length === 0) return 0;

  const weights = [1, 2, 3];
  let total = 0;

  for (let i = 0; i < Math.min(throws.length, 3); i++) {
    const hitValue = Math.max(0, Math.min(3, throws[i]));
    total += hitValue * weights[i];
  }

  return Math.min(total, 9);
}

export function undo() {
  if (history.length === 0) return;

  gameState = history.pop();
}

export function nextPlayer() {
  if (
    gameState.currentHole >= 18 ||
    gameState.shanghaiWinner ||
    gameState.pendingShanghai
  ) {
    return;
  }

  history.push(cloneState(gameState));

  if (gameState.awaitingHazardInput || gameState.awaitingHammerInput) return;

  const hole = gameState.currentHole;
  const isHazardHole = gameState.hazardHoles?.includes(hole);
  const isHammerHole = gameState.hammerHoles?.includes(hole);

  if (isHazardHole) {
    gameState.awaitingHazardInput = true;
    gameState.pendingTurnPlayerIndex = gameState.currentPlayer;
    gameState.pendingTurnHole = gameState.currentHole;
    return;
  }

  finalizeTurn(0, isHammerHole);
}

export function confirmShanghaiWinner() {
  if (!gameState.pendingShanghai || gameState.shanghaiWinner) return;

  history.push(cloneState(gameState));

  gameState.shanghaiWinner = gameState.pendingShanghai;
  gameState.pendingShanghai = null;
  gameState.lastScoreMessage = `${gameState.shanghaiWinner} hit SHANGHAI!`;
  gameState.lastScoreColor = "#ffcc00";
  gameState.lastScoreTimestamp = Date.now();
  gameState.finalStats = buildStatsSummary();

  saveGolfDartsHistory();
}

export function cancelPendingShanghai() {
  if (!gameState.pendingShanghai || gameState.shanghaiWinner) return;

  history.push(cloneState(gameState));

  gameState.pendingShanghai = null;
  gameState.lastScoreMessage = "Shanghai canceled. Continue the turn.";
  gameState.lastScoreColor = "#facc15";
  gameState.lastScoreTimestamp = Date.now();
}

export function isGameOver() {
  const over = gameState.currentHole >= 18 || !!gameState.shanghaiWinner;

  if (over) {
    saveGolfDartsHistory();
  }

  return over;
}

export function getRotatedPlayersForReplay() {
  if (!gameState.originalPlayers || !gameState.originalPlayers.length) return [];

  if (gameState.originalPlayers.length === 1) {
    return [...gameState.originalPlayers];
  }

  return [
    ...gameState.originalPlayers.slice(1),
    gameState.originalPlayers[0]
  ];
}
