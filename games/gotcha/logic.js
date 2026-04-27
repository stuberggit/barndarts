let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";

const WINNING_SCORE = 301;
const GR_RESET_THRESHOLD = 150;

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

function buildPlayers(playerNames) {
  return playerNames.map(name => ({
    name,
    score: 0,
    stats: {
      dartsThrown: 0,
      turnsTaken: 0,
      busts: 0,
      totalPoints: 0,
      gotchasGiven: 0,
      gotchasReceived: 0,
      gentlemanlyGotchas: 0,
      ungentlemanlyGotchas: 0,
      gentlemanlyWins: 0,
      ungentlemanlyWins: 0,
      checkout: null
    }
  }));
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.turnStartSnapshot = cloneState(gameState.players);
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

function getPlayerPpd(player) {
  const darts = player.stats?.dartsThrown || 0;
  const points = player.stats?.totalPoints || 0;
  if (!darts) return 0;
  return Number((points / darts).toFixed(2));
}

function buildStatsSummary() {
  return gameState.players.map(player => ({
    name: player.name,
    score: player.score,
    ppd: getPlayerPpd(player),
    stats: { ...(player.stats || {}) }
  }));
}

function saveGotchaHistory() {
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
      stats: { ...(player.stats || {}) }
    };
  });

  const winnerPlayer = players.find(player => player.name === gameState.winner) || null;

  saveGameResult({
    gameId: "gotcha",
    gameName: "Gotcha 301",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      winningScore: WINNING_SCORE,
      finalStats: buildStatsSummary()
    }
  });

  gameState.historySaved = true;
}

function applyGotchaChecks(scoringPlayerIndex) {
  const scoringPlayer = gameState.players[scoringPlayerIndex];
  if (!scoringPlayer) return [];

  const resetEvents = [];

  gameState.players.forEach((otherPlayer, otherIndex) => {
    if (otherIndex === scoringPlayerIndex) return;
    if (otherPlayer.score !== scoringPlayer.score) return;
    if (otherPlayer.score <= 0) return;

    const victimPreviousScore = otherPlayer.score;
    const isUngentlemanly = victimPreviousScore < GR_RESET_THRESHOLD;

    if (isUngentlemanly) {
      scoringPlayer.score = 0;
      otherPlayer.score = 0;
      scoringPlayer.stats.ungentlemanlyGotchas++;
      otherPlayer.stats.ungentlemanlyGotchas++;
      scoringPlayer.stats.gotchasGiven++;
      otherPlayer.stats.gotchasReceived++;

      resetEvents.push({
        type: "ungentlemanly",
        attackerIndex: scoringPlayerIndex,
        attackerName: scoringPlayer.name,
        victimIndex: otherIndex,
        victimName: otherPlayer.name,
        victimPreviousScore,
        attackerPreviousScore: victimPreviousScore
      });

      gameState.lastMessage = `${scoringPlayer.name} tied ${otherPlayer.name} under ${GR_RESET_THRESHOLD}. Ungentlemanly Gotcha! Both reset to 0.`;
      gameState.lastMessageColor = "#ff4c4c";
      return;
    }

    otherPlayer.score = 0;
    scoringPlayer.stats.gentlemanlyGotchas++;
    scoringPlayer.stats.gotchasGiven++;
    otherPlayer.stats.gotchasReceived++;

    resetEvents.push({
      type: "standard",
      attackerIndex: scoringPlayerIndex,
      attackerName: scoringPlayer.name,
      victimIndex: otherIndex,
      victimName: otherPlayer.name,
      victimPreviousScore
    });

    gameState.lastMessage = `${scoringPlayer.name} gotcha'd ${otherPlayer.name}! ${otherPlayer.name} resets to 0.`;
    gameState.lastMessageColor = "#facc15";
  });

  return resetEvents;
}

function getWinMessage(player, hitType, value) {
  const gentlemanly =
    hitType === "double" ||
    hitType === "triple" ||
    value === 1;

  if (gentlemanly) {
    player.stats.gentlemanlyWins++;
    return `${player.name} wins Gotcha 301 like a true gentleman!`;
  }

  player.stats.ungentlemanlyWins++;
  return `${player.name} wins Gotcha 301... but that single was wildly un-gentlemanly.`;
}

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],

    players: buildPlayers(playerNames),

    currentPlayer: 0,
    turnNumber: 1,
    dartsThrown: 0,
    currentTurnThrows: [],
    turnStartSnapshot: null,
    turnReadyForNext: false,

    lastMessage: "",
    lastMessageColor: "#ffffff",

    winner: null,
    finalStats: null,
    historySaved: false
  };

  history = [];
  gameState.turnStartSnapshot = cloneState(gameState.players);
}

export function submitThrow(hitType, target = null) {
  if (gameState.winner || gameState.turnReadyForNext) return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player) return;

  history.push(cloneState(gameState));

  const scoreBefore = player.score;
  const value = getHitValue(hitType, target);
  const newScore = scoreBefore + value;

  gameState.dartsThrown++;
  player.stats.dartsThrown++;

  if (gameState.dartsThrown === 1) {
    player.stats.turnsTaken++;
  }

  const throwRecord = {
    hitType,
    target,
    label: getHitLabel(hitType, target),
    value,
    scoreBefore,
    scoreAfter: newScore,
    gotchaEvents: []
  };

  gameState.currentTurnThrows.push(throwRecord);

  if (newScore > WINNING_SCORE) {
    gameState.players = cloneState(gameState.turnStartSnapshot);
    const restoredPlayer = gameState.players[gameState.currentPlayer];

    restoredPlayer.stats.busts++;

    gameState.turnReadyForNext = true;
    gameState.lastMessage = `${restoredPlayer.name} busts! Turn resets, including any Gotchas.`;
    gameState.lastMessageColor = "#ff4c4c";
    return;
  }

  player.score = newScore;
  player.stats.totalPoints += value;

  if (newScore === WINNING_SCORE) {
    player.stats.checkout = value;
    gameState.winner = player.name;
    gameState.finalStats = buildStatsSummary();
    gameState.lastMessage = getWinMessage(player, hitType, value);
    gameState.lastMessageColor = "#22c55e";
    saveGotchaHistory();
    return;
  }

  const gotchaEvents = applyGotchaChecks(gameState.currentPlayer);
  throwRecord.gotchaEvents = gotchaEvents;

  if (!gotchaEvents.length) {
    gameState.lastMessage = `${player.name} scores ${value}.`;
    gameState.lastMessageColor = "#facc15";
  }

  if (gameState.dartsThrown >= 3) {
    gameState.turnReadyForNext = true;
    if (!gotchaEvents.length) {
      gameState.lastMessage = `${player.name}'s turn complete.`;
      gameState.lastMessageColor = "#facc15";
    }
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

  const leader = [...gameState.players].sort((a, b) => b.score - a.score)[0];
  gameState.winner = leader?.name || "No Winner";
  gameState.finalStats = buildStatsSummary();
  gameState.lastMessage = "Game ended early.";
  gameState.lastMessageColor = "#facc15";

  saveGotchaHistory();
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

export function getWinningScore() {
  return WINNING_SCORE;
}
