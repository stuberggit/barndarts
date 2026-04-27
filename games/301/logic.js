let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";

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

function getHitValue(hitType, target = null) {
  if (hitType === "miss") return 0;
  if (hitType === "greenBull") return 25;
  if (hitType === "redBull") return 50;

  const mult = hitType === "single" ? 1 : hitType === "double" ? 2 : 3;
  return target * mult;
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.turnStartScore = gameState.players[gameState.currentPlayer].score;
  gameState.turnReadyForNext = false;
}

function advanceTurn() {
  resetTurnTracking();

  gameState.currentPlayer =
    (gameState.currentPlayer + 1) % gameState.players.length;

  if (gameState.currentPlayer === 0) {
    gameState.turnNumber++;
  }
}

function save301History() {
  if (gameState.historySaved) return;

  const players = gameState.players.map(p => ({
    name: p.name,
    score: p.score,
    stats: p.stats
  }));

  const winner = players.find(p => p.name === gameState.winner);

  saveGameResult({
    gameId: "301",
    gameName: "301",
    players,
    winner,
    meta: {}
  });

  gameState.historySaved = true;
}

/* -------------------------
   INIT
--------------------------*/

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],

    players: playerNames.map(name => ({
      name,
      score: 301,
      stats: {
        dartsThrown: 0,
        turnsTaken: 0,
        busts: 0,
        totalPoints: 0
      }
    })),

    currentPlayer: 0,
    turnNumber: 1,
    dartsThrown: 0,
    currentTurnThrows: [],
    turnStartScore: 301,
    turnReadyForNext: false,

    lastMessage: "",
    lastMessageColor: "#ffffff",

    winner: null,
    historySaved: false
  };

  history = [];
}

/* -------------------------
   CORE GAME
--------------------------*/

export function submitThrow(hitType, target = null) {
  if (gameState.winner || gameState.turnReadyForNext) return;

  const player = gameState.players[gameState.currentPlayer];

  history.push(cloneState(gameState));

  const value = getHitValue(hitType, target);
  const newScore = player.score - value;

  gameState.dartsThrown++;
  player.stats.dartsThrown++;

  if (gameState.dartsThrown === 1) {
    player.stats.turnsTaken++;
  }

  gameState.currentTurnThrows.push({
    hitType,
    target,
    value
  });

  // BUST
  if (newScore < 0) {
    player.score = gameState.turnStartScore;
    player.stats.busts++;
    gameState.turnReadyForNext = true;

    gameState.lastMessage = `${player.name} busts!`;
    gameState.lastMessageColor = "#ff4c4c";
    return;
  }

  // WIN
  if (newScore === 0) {
    player.score = 0;
    gameState.winner = player.name;

    gameState.lastMessage = `${player.name} wins!`;
    gameState.lastMessageColor = "#22c55e";

    save301History();
    return;
  }

  player.score = newScore;
  player.stats.totalPoints += value;

  gameState.lastMessage = `${player.name} scores ${value}`;
  gameState.lastMessageColor = "#facc15";

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;
    gameState.lastMessage = `${player.name}'s turn complete`;
  }
}

/* -------------------------
   ACTIONS
--------------------------*/

export function nextPlayer() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));
  advanceTurn();
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
