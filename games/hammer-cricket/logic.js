let gameState = {};
let history = [];

import { checkShanghai } from "../../core/rules/shanghai.js";

/* -------------------------
   INIT / STATE
--------------------------*/

export function initGame(players) {
  const rounds = buildRoundOrder();

  gameState = {
    players: players.map(name => ({
      name,
      roundScores: Array(rounds.length).fill(null),
      total: 0
    })),

    rounds,
    currentRound: 0,
    currentPlayer: 0,

    dartsThrown: 0,
    currentTurnThrows: [],
    currentTurnHits: [],

    lastScoreMessage: "",
    lastScoreColor: "#ffffff",
    lastScoreTimestamp: 0,

    shanghaiWinner: null
  };

  history = [];
}

export function getState() {
  return gameState;
}
/* -------------------------
   SETUP HELPERS
--------------------------*/

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getRandomBonusTarget() {
  const options = [15, 16, 17, 18, 19, 20, 25];
  return shuffle(options)[0];
}

function buildRoundOrder() {
  const bonus1 = getRandomBonusTarget();
  const bonus2 = getRandomBonusTarget();

  return [
    { type: "number", label: "15", target: 15, multipliers: [1, 2, 3] },
    { type: "number", label: "16", target: 16, multipliers: [1, 2, 3] },
    { type: "number", label: "17", target: 17, multipliers: [1, 2, 3] },

    { type: "bonus", label: `Bonus`, target: bonus1, multipliers: [1, 3, 5] },

    { type: "number", label: "18", target: 18, multipliers: [1, 2, 3] },
    { type: "number", label: "19", target: 19, multipliers: [1, 2, 3] },
    { type: "number", label: "20", target: 20, multipliers: [1, 2, 3] },

    { type: "bull", label: "Bull", target: 25, multipliers: [1, 2, 3] },

    { type: "bonus", label: `Bonus`, target: bonus2, multipliers: [1, 3, 5] }
  ];
}

function formatTargetLabel(target) {
  return target === 25 ? "Bull" : String(target);
}

/* -------------------------
   SCORING
--------------------------*/

function getCurrentRoundConfig() {
  return gameState.rounds[gameState.currentRound];
}

function getRoundScore(throws, roundConfig) {
  const { target, multipliers } = roundConfig;

  const safeThrows = Array.isArray(throws) ? throws.slice(0, 3) : [];
  const allMisses = safeThrows.length === 3 && safeThrows.every(v => v === 0);

  if (allMisses) {
    const penaltyMultiplier = roundConfig.type === "bonus" ? 5 : 3;
    return -(target * penaltyMultiplier);
  }

  let total = 0;

  for (let i = 0; i < safeThrows.length; i++) {
    const hitValue = Math.max(0, Math.min(3, safeThrows[i]));
    total += target * hitValue * multipliers[i];
  }

  return total;
}

function getRoundLabel(score) {
  if (score < 0) return "Penalty";
  if (score === 0) return "No Score";
  return "Scored";
}

function finalizeTurn() {
  const player = gameState.players[gameState.currentPlayer];
  const roundConfig = getCurrentRoundConfig();

  while (gameState.currentTurnThrows.length < 3) {
    gameState.currentTurnThrows.push(0);
  }

  const score = getRoundScore(gameState.currentTurnThrows, roundConfig);
  const roundLabel = getRoundLabel(score);

  player.roundScores[gameState.currentRound] = score;
  player.total += score;

  gameState.lastScoreMessage = `${player.name} ${roundLabel}: ${score > 0 ? "+" : ""}${score}`;
  gameState.lastScoreColor = score < 0 ? "#ff4c4c" : "#22c55e";
  gameState.lastScoreTimestamp = Date.now();

  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.currentTurnHits = [];

  gameState.currentPlayer++;

  if (gameState.currentPlayer >= gameState.players.length) {
    gameState.currentPlayer = 0;
    gameState.currentRound++;
  }
}

/* -------------------------
   ACTIONS
--------------------------*/

export function recordThrow(hitValue) {
  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const safeHitValue = Math.max(0, Math.min(3, hitValue));

  gameState.currentTurnThrows.push(safeHitValue);
  gameState.dartsThrown++;

  if (safeHitValue > 0) {
    gameState.currentTurnHits.push(safeHitValue);
  }

  if (checkShanghai(gameState.currentTurnHits)) {
    gameState.shanghaiWinner = player.name;
    gameState.lastScoreMessage = `${player.name} hit SHANGHAI!`;
    gameState.lastScoreColor = "#ffcc00";
    gameState.lastScoreTimestamp = Date.now();
    return;
  }

  if (gameState.dartsThrown === 3) {
    finalizeTurn();
  }
}

export function nextPlayer() {
  history.push(cloneState(gameState));
  finalizeTurn();
}

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return gameState.currentRound >= gameState.rounds.length || !!gameState.shanghaiWinner;
}

export function getMeta(score) {
  if (score < 0) {
    return { label: "Penalty", color: "#ff4c4c" };
  }

  if (score === 0) {
    return { label: "No Score", color: "#ffffff" };
  }

  return { label: "Scored", color: "#22c55e" };
}
