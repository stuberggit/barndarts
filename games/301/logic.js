let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";
import { checkShanghai } from "../../core/rules/shanghai.js";

const STARTING_SCORE = 301;

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
  const player = gameState.players?.[gameState.currentPlayer];

  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.turnStartScore = player ? player.score : STARTING_SCORE;
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
      score: STARTING_SCORE,
      throwHistory: [],
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
    turnStartScore: STARTING_SCORE,
    turnReadyForNext: false,

    lastMessage: "",
    lastMessageColor: "#ffffff",

    winner: null,
    pendingShanghai: null,
    shanghaiWinner: null,
    historySaved: false
  };

  history = [];
}

/* -------------------------
   CORE GAME
--------------------------*/

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
    gameState.turnStartScore = player.score;
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

export function submitThrow(hitType, target = null) {
  if (
    gameState.winner ||
    gameState.pendingShanghai ||
    gameState.turnReadyForNext
  ) {
    return;
  }

  const player = gameState.players[gameState.currentPlayer];
  if (!player) return;

  history.push(cloneState(gameState));

  const scoreBefore = player.score;

  if (gameState.dartsThrown === 0) {
    gameState.turnStartScore = scoreBefore;
  }

  const value = getHitValue(hitType, target);
  const newScore = scoreBefore - value;
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

  const numberedShanghaiHits = gameState.currentTurnThrows
    .filter(t => t.target === target && target !== null)
    .map(t => {
      if (t.hitType === "single") return 1;
      if (t.hitType === "double") return 2;
      if (t.hitType === "triple") return 3;
      return 0;
    })
    .filter(Boolean);

  const bullHits = gameState.currentTurnThrows.filter(t => {
    return t.hitType === "greenBull" || t.hitType === "redBull";
  });

  const isNumberShanghai = checkShanghai(numberedShanghaiHits);
  const isBullShanghai = bullHits.length === 3;

  if (isNumberShanghai || isBullShanghai) {
    gameState.pendingShanghai = {
      playerName: player.name,
      target: isBullShanghai ? "Bull" : target
    };
    return;
  }

  if (newScore < 0) {
    player.score = gameState.turnStartScore;
    player.stats.busts++;
    gameState.turnReadyForNext = true;

    throwRecord.scoreAfter = gameState.turnStartScore;
    throwRecord.result = "bust";
    recordThrowHistory(player, throwRecord);

    gameState.lastMessage = `${player.name} busts!`;
    gameState.lastMessageColor = "#ff4c4c";
    return;
  }

  if (newScore === 0) {
    player.score = 0;
    player.stats.totalPoints += value;

    throwRecord.scoreAfter = 0;
    throwRecord.result = "checkout";
    recordThrowHistory(player, throwRecord);

    gameState.winner = player.name;
    gameState.lastMessage = `${player.name} wins!`;
    gameState.lastMessageColor = "#22c55e";

    save301History();
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
/* -------------------------
   ACTIONS
--------------------------*/

export function confirmShanghaiWinner() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  const playerName = gameState.pendingShanghai.playerName;
  const target = gameState.pendingShanghai.target;
  const isBullShanghai = gameState.pendingShanghai.isBullShanghai;

  gameState.shanghaiWinner = playerName;
  gameState.winner = playerName;
  gameState.pendingShanghai = null;

  gameState.lastMessage = isBullShanghai
    ? `${playerName} hit SHANGHAI with 3 Bulls!`
    : `${playerName} hit SHANGHAI on ${target}!`;

  gameState.lastMessageColor = "#ffcc00";

  save301History();
}

export function cancelPendingShanghai() {
  if (!gameState.pendingShanghai || gameState.winner) return;

  if (history.length) {
    gameState = history.pop();
  } else {
    gameState.pendingShanghai = null;
  }
}

export function nextPlayer() {
  if (gameState.winner || gameState.pendingShanghai) return;

  history.push(cloneState(gameState));

  padRemainingDartsAsMisses();
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

export function getThrowLog() {
  return gameState.players.map(player => ({
    name: player.name,
    throws: player.throwHistory || []
  }));
}
