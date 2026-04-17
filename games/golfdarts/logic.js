let gameState = {};
let history = [];

import { checkShanghai } from "../../core/rules/shanghai.js";

export function initGame(players) {
  gameState = {
    players: players.map(name => ({
      name,
      scores: Array(18).fill(null),
      total: 0
    })),
    currentHole: 0,
    currentPlayer: 0,
    currentTurnHits: [],
    dartsThrown: 0,
    turnHitsCount: 0,
    holeHazards: Array(18).fill(0),
    shanghaiWinner: null
  };

  history = [];
}

export function getState() {
  return gameState;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function recordThrow(isHit) {
  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];

  if (isHit) {
    gameState.turnHitsCount++;
    gameState.currentTurnHits.push(1); // for Shanghai tracking
  }

  gameState.dartsThrown++;

  // 🔥 Shanghai check
  if (checkShanghai(gameState.currentTurnHits)) {
    gameState.shanghaiWinner = player.name;
    return;
  }

  // After 3 darts → calculate score
  if (gameState.dartsThrown >= 3) {
    const hits = gameState.turnHitsCount;

    const score = convertHitsToScore(hits);

    player.scores[gameState.currentHole] = score;
    player.total += score;

    // Reset turn
    gameState.dartsThrown = 0;
    gameState.turnHitsCount = 0;
    gameState.currentTurnHits = [];

    // Next player
    gameState.currentPlayer++;

    if (gameState.currentPlayer >= gameState.players.length) {
      gameState.currentPlayer = 0;
      gameState.currentHole++;
    }
  }
}

export function getBaseScoreFromHits(hits) {
  // Special case: complete miss
  if (hits === 0) return 5;

  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return scores[hits - 1] ?? 5;
}

export function getFinalScore(hits, hazards = 0) {
  const base = getBaseScoreFromHits(hits);
  return base + hazards;
}

export function getScoreMeta(score) {
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

export function undo() {
  console.log("UNDO CLICKED");
  
  if (history.length === 0) return;

  gameState = history.pop();
}

export function isGameOver() {
  return gameState.currentHole >= 18 || gameState.shanghaiWinner;
}
