let gameState = {};
let history = [];

import { checkShanghai } from "../../core/rules/shanghai.js";

export function initGame(players) {
  const hazardHoles = generateHazardHoles();
  const hammerHoles = generateHammerHoles(hazardHoles);

  gameState = {
    players: players.map(name => ({
      name,
      scores: Array(18).fill(null),
      total: 0
    })),

    currentHole: 0,
    currentPlayer: 0,

    dartsThrown: 0,
    turnHitsCount: 0,
    currentTurnHits: [],
    currentTurnThrows: [],

    shanghaiWinner: null,

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

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function recordThrow(hitValue) {
  history.push(cloneState(gameState));

  if (gameState.awaitingHazardInput || gameState.awaitingHammerInput) return;

  const player = gameState.players[gameState.currentPlayer];
  const safeHitValue = Math.max(0, Math.min(3, hitValue));

  gameState.turnHitsCount += safeHitValue;
  gameState.dartsThrown++;
  gameState.currentTurnThrows.push(safeHitValue);

  if (safeHitValue > 0) {
    gameState.currentTurnHits.push(safeHitValue);
  }

  if (checkShanghai(gameState.currentTurnHits)) {
    gameState.shanghaiWinner = player.name;
    return;
  }

  if (gameState.dartsThrown === 3) {
    const hole = gameState.currentHole;
    const isHazard = gameState.hazardHoles.includes(hole);
    const isHammer = gameState.hammerHoles.includes(hole);

    if (isHazard) {
      gameState.awaitingHazardInput = true;
      return;
    }

    if (isHammer) {
      finalizeTurn(0, true);
      return;
    }

    finalizeTurn(0, false);
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

export function getMeta(score) {
  const labels = {
    8: "Buster",
    7: "Quad Bogey",
    6: "Triple Bogey",
    5: "Double Bogey",
    4: "Bogey",
    3: "Par",
    2: "Birdie",
    1: "Ace",
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

  let hits;

  if (isHammer) {
    hits = getHammerHitsFromThrows(gameState.currentTurnThrows);
  } else {
    hits = Math.min(gameState.turnHitsCount, 9);
  }

  const score = getFinalScore(hits, hazards);

  player.scores[gameState.currentHole] = score;
  player.total += score;

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
}

function generateHammerHoles(hazardHoles) {
  const frontNine = [0,1,2,3,4,5,6,7,8].filter(h => !hazardHoles.includes(h));
  const backNine = [9,10,11,12,13,14,15,16,17].filter(h => !hazardHoles.includes(h));

  const frontHammer = shuffle(frontNine)[0];
  const backHammer = shuffle(backNine)[0];

  return [frontHammer, backHammer];
}

export function submitHazards(hazardCount) {
  history.push(cloneState(gameState));

  if (!gameState.awaitingHazardInput) return;

  const safeHazards = Math.max(0, Math.min(3, hazardCount));
  finalizeTurn(safeHazards);
}

export function submitHammer() {
  history.push(cloneState(gameState));

  if (!gameState.awaitingHammerInput) return;

  finalizeTurn(0, true);
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
  console.log("UNDO CLICKED");
  
  if (history.length === 0) return;

  gameState = history.pop();
}

export function nextPlayer() {
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

  if (isHammerHole) {
    finalizeTurn(0, true);
    return;
  }

  finalizeTurn(0, false);
}

export function isGameOver() {
  return gameState.currentHole >= 18 || gameState.shanghaiWinner;
}
