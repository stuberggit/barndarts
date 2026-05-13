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

const COLOR_ORDER = ["Black", "White", "Green", "Red"];

function normalizePlayerName(player, index) {
  if (typeof player === "string") return player;
  if (player && typeof player.name === "string") return player.name;
  return `Player ${index + 1}`;
}

function getCurrentTargetColor(progress) {
  return COLOR_ORDER[progress] || null;
}

function ensureStats(player) {
  if (!player.stats) {
    player.stats = {
      dartsThrown: 0,
      colorHits: 0,
      misses: 0,
      parties: 0,
      acdcs: 0,
      completedColors: {
        Black: 0,
        White: 0,
        Green: 0,
        Red: 0
      }
    };
  }

  if (!player.stats.completedColors) {
    player.stats.completedColors = {
      Black: 0,
      White: 0,
      Green: 0,
      Red: 0
    };
  }

  return player.stats;
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.turnReadyForNext = false;
}

function advanceTurn() {
  resetTurnTracking();

  gameState.currentPlayer++;

  if (gameState.currentPlayer >= gameState.players.length) {
    gameState.currentPlayer = 0;
  }
}

function getRankedPlayersForStats() {
  return gameState.players
    .map((player, index) => ({
      player,
      index
    }))
    .sort((a, b) => {
      if (a.player.name === gameState.winner) return -1;
      if (b.player.name === gameState.winner) return 1;

      if (b.player.progress !== a.player.progress) {
        return b.player.progress - a.player.progress;
      }

      const aStats = ensureStats(a.player);
      const bStats = ensureStats(b.player);

      if (aStats.dartsThrown !== bStats.dartsThrown) {
        return aStats.dartsThrown - bStats.dartsThrown;
      }

      return a.index - b.index;
    });
}

function buildStatsSummary() {
  const ranked = getRankedPlayersForStats();

  return ranked.map(({ player, index }, placementIndex) => ({
    name: player.name,
    progress: player.progress,
    status: player.progress >= 4 ? "finished" : "active",
    isWinner: player.name === gameState.winner,
    placement: placementIndex + 1,
    originalIndex: index,
    stats: JSON.parse(JSON.stringify(ensureStats(player)))
  }));
}

function saveAhmanGreenHistory() {
  if (gameState.historySaved) return;

  const selectedProfiles = store.selectedPlayerProfiles || [];
  const finalStats = gameState.finalStats || buildStatsSummary();

  const players = gameState.players.map((player, index) => {
    const profile = selectedProfiles[index] || {};
    const stats = ensureStats(player);
    const finalStatRow = finalStats.find(row => row.name === player.name);

    return {
      id: profile.id || null,
      name: player.name,
      avatar: profile.avatar || null,
      score: player.progress,
      result: player.name === gameState.winner ? "winner" : "played",
      placement: finalStatRow?.placement || null,
      stats: {
        progress: player.progress,
        finished: player.progress >= 4,
        dartsThrown: stats.dartsThrown,
        colorHits: stats.colorHits,
        misses: stats.misses,
        parties: stats.parties,
        acdcs: stats.acdcs,
        completedColors: { ...stats.completedColors }
      }
    };
  });

  const winnerPlayer = players.find(player => player.result === "winner");

  saveGameResult({
    gameId: "ahman-green",
    gameName: "Ahman Green",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      colorOrder: [...COLOR_ORDER],
      finalStats
    }
  });

  gameState.historySaved = true;
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
      progress: 0, // 0=Black, 1=White, 2=Green, 3=Red, 4=Finished
      stats: {
        dartsThrown: 0,
        colorHits: 0,
        misses: 0,
        parties: 0,
        acdcs: 0,
        completedColors: {
          Black: 0,
          White: 0,
          Green: 0,
          Red: 0
        }
      }
    })),

    currentPlayer: 0,
    dartsThrown: 0,

    lastMessage: "",
    lastMessageColor: "#ffffff",
    lastMessageTimestamp: 0,

    winner: null,
    pendingWinner: null,
    turnReadyForNext: false,
    finalStats: null,
    historySaved: false
  };

  history = [];
}

export function getState() {
  return gameState;
}

export function getStats() {
  return gameState.finalStats || buildStatsSummary();
}

/* -------------------------
   GAME ACTIONS
--------------------------*/

export function advancePlayer(colorClicked) {
  if (gameState.winner || gameState.pendingWinner || gameState.turnReadyForNext) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const stats = ensureStats(player);
  const targetColor = getCurrentTargetColor(player.progress);

  if (!player || !targetColor) return;

  stats.dartsThrown++;
  gameState.dartsThrown++;

  if (colorClicked !== targetColor) {
    gameState.lastMessage = `${player.name} hit ${colorClicked}. Still needs ${targetColor}.`;
    gameState.lastMessageColor = "#facc15";
    gameState.lastMessageTimestamp = Date.now();

    if (gameState.dartsThrown >= 3) {
      gameState.turnReadyForNext = true;
      gameState.lastMessage = `${player.name}'s turn is complete. Tap Next Player.`;
      gameState.lastMessageColor = "#facc15";
      gameState.lastMessageTimestamp = Date.now();
    }

    return;
  }

  stats.colorHits++;
  stats.completedColors[targetColor] = (stats.completedColors[targetColor] || 0) + 1;

  player.progress = Math.min(player.progress + 1, 4);

  if (player.progress >= 4) {
    gameState.pendingWinner = player.name;
    gameState.turnReadyForNext = true;
    gameState.finalStats = buildStatsSummary();
    gameState.lastMessage = `${player.name} finished Red! Tap Next Player to confirm the win.`;
    gameState.lastMessageColor = "#22c55e";
    gameState.lastMessageTimestamp = Date.now();
    return;
  }

  const nextColor = getCurrentTargetColor(player.progress);

  gameState.lastMessage = `${player.name} advances to ${nextColor}!`;
  gameState.lastMessageColor = "#22c55e";
  gameState.lastMessageTimestamp = Date.now();

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;
    gameState.lastMessage = `${player.name}'s turn is complete. Tap Next Player.`;
    gameState.lastMessageColor = "#facc15";
    gameState.lastMessageTimestamp = Date.now();
  }
}

export function missBoard() {
  if (gameState.winner || gameState.pendingWinner || gameState.turnReadyForNext) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const stats = ensureStats(player);

  stats.dartsThrown++;
  stats.misses++;

  player.progress = 0;
  gameState.dartsThrown = 3;

  gameState.lastMessage = `${player.name} resets to Black!`;
  gameState.lastMessageColor = "#ff4c4c";
  gameState.lastMessageTimestamp = Date.now();

  advanceTurn();
}

export function partyJump() {
  if (gameState.winner || gameState.pendingWinner || gameState.turnReadyForNext) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const stats = ensureStats(player);

  stats.dartsThrown++;
  stats.parties++;

  player.progress = 3; // needs Red next
  gameState.dartsThrown++;

  gameState.lastMessage = `${player.name} PARTY! Jump to Red!`;
  gameState.lastMessageColor = "#a855f7";
  gameState.lastMessageTimestamp = Date.now();

  if (gameState.dartsThrown >= 3) {
    advanceTurn();
  }
}

export function acdcJump() {
  if (gameState.winner || gameState.pendingWinner || gameState.turnReadyForNext) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const stats = ensureStats(player);

  stats.dartsThrown++;
  stats.acdcs++;

  player.progress = 0;
  gameState.dartsThrown++;

  gameState.lastMessage = `${player.name} AC/DC! Back to Black!`;
  gameState.lastMessageColor = "#facc15";
  gameState.lastMessageTimestamp = Date.now();

  if (gameState.dartsThrown >= 3) {
    advanceTurn();
  }
}

export function nextPlayer() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));

  if (gameState.pendingWinner) {
    gameState.winner = gameState.pendingWinner;
    gameState.pendingWinner = null;
    gameState.finalStats = buildStatsSummary();
    gameState.lastMessage = `${gameState.winner} wins!`;
    gameState.lastMessageColor = "#22c55e";
    gameState.lastMessageTimestamp = Date.now();
    saveAhmanGreenHistory();
    return;
  }

  advanceTurn();
}

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner;
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
