let gameState = {};
let history = [];

/* -------------------------
   INIT / STATE
--------------------------*/

export function initGame(players) {
  const rounds = buildRoundOrder();

  gameState = {
    originalPlayers: [...players],
    players: players.map(name => ({
      name,
      roundScores: Array(rounds.length).fill(null),
      total: 0,
      isSuddenDeathActive: false
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

    shanghaiWinner: null,
    suddenDeathActive: false,
    suddenDeathRound: 0,
    suddenDeathPlayerIndexes: [],
    tieMessage: ""
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

function getSuddenDeathTarget() {
  const sequence = [15, 16, 17, 18, 19, 20, 25];
  return sequence[(gameState.suddenDeathRound || 0) % sequence.length];
}

function buildRoundOrder() {
  const bonus1 = getRandomBonusTarget();
  const bonus2 = getRandomBonusTarget();

  return [
    { type: "number", label: "15", target: 15, multipliers: [1, 2, 3] },
    { type: "number", label: "16", target: 16, multipliers: [1, 2, 3] },
    { type: "number", label: "17", target: 17, multipliers: [1, 2, 3] },

    { type: "bonus", label: `Bonus (${formatTargetLabel(bonus1)})`, target: bonus1, multipliers: [1, 3, 5] },

    { type: "number", label: "18", target: 18, multipliers: [1, 2, 3] },
    { type: "number", label: "19", target: 19, multipliers: [1, 2, 3] },
    { type: "number", label: "20", target: 20, multipliers: [1, 2, 3] },

    { type: "bull", label: "Bull", target: 25, multipliers: [1, 2, 3] },

    { type: "bonus", label: `Bonus (${formatTargetLabel(bonus2)})`, target: bonus2, multipliers: [1, 3, 5] }
  ];
}

function formatTargetLabel(target) {
  return target === 25 ? "Bull" : String(target);
}

/* -------------------------
   SCORING
--------------------------*/

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

function resetTurn() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.currentTurnHits = [];
}

function getCurrentEligiblePlayerIndexes() {
  if (gameState.suddenDeathActive) {
    return [...(gameState.suddenDeathPlayerIndexes || [])];
  }

  return gameState.players.map((_, index) => index);
}

function findNextEligiblePlayerIndex(currentIndex) {
  const eligible = getCurrentEligiblePlayerIndexes();
  if (!eligible.length) return 0;

  const currentPosition = eligible.indexOf(currentIndex);

  if (currentPosition === -1) {
    return eligible[0];
  }

  return eligible[currentPosition + 1] ?? eligible[0];
}

function isLastEligiblePlayerInRound(currentIndex) {
  const eligible = getCurrentEligiblePlayerIndexes();
  if (!eligible.length) return true;

  return eligible.indexOf(currentIndex) === eligible.length - 1;
}

function getTopTiedPlayerIndexes() {
  if (!gameState.players.length) return [];

  const highestTotal = Math.max(...gameState.players.map(player => player.total));

  return gameState.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.total === highestTotal)
    .map(({ index }) => index);
}

function addRoundScoreSlotForAllPlayers() {
  gameState.players.forEach(player => {
    player.roundScores.push(null);
  });
}

function startSuddenDeath(tiedIndexes) {
  gameState.suddenDeathActive = true;
  gameState.suddenDeathPlayerIndexes = [...tiedIndexes];
  gameState.suddenDeathRound = (gameState.suddenDeathRound || 0) + 1;

  gameState.players.forEach((player, index) => {
    player.isSuddenDeathActive = tiedIndexes.includes(index);
  });

  const target = getSuddenDeathTarget();

  gameState.rounds.push({
    type: target === 25 ? "bull" : "suddenDeath",
    label: `SD ${gameState.suddenDeathRound} (${formatTargetLabel(target)})`,
    target,
    multipliers: [1, 2, 3]
  });

  addRoundScoreSlotForAllPlayers();

  gameState.currentRound = gameState.rounds.length - 1;
  gameState.currentPlayer = tiedIndexes[0];
  gameState.tieMessage = `Sudden death! ${tiedIndexes.map(index => gameState.players[index].name).join(" and ")} are tied.`;
  gameState.lastScoreMessage = gameState.tieMessage;
  gameState.lastScoreColor = "#facc15";
  gameState.lastScoreTimestamp = Date.now();

  resetTurn();
}

function resolveRoundProgress(scoredPlayerIndex) {
  const completedRound = isLastEligiblePlayerInRound(scoredPlayerIndex);

  if (!completedRound) {
    gameState.currentPlayer = findNextEligiblePlayerIndex(scoredPlayerIndex);
    return;
  }

  if (gameState.suddenDeathActive) {
    const tiedIndexes = getTopTiedPlayerIndexes().filter(index =>
      gameState.suddenDeathPlayerIndexes.includes(index)
    );

    if (tiedIndexes.length > 1) {
      startSuddenDeath(tiedIndexes);
      return;
    }

    gameState.currentRound = gameState.rounds.length;
    return;
  }

  const nextRound = gameState.currentRound + 1;

  if (nextRound >= gameState.rounds.length) {
    const tiedIndexes = getTopTiedPlayerIndexes();

    if (tiedIndexes.length > 1) {
      startSuddenDeath(tiedIndexes);
      return;
    }

    gameState.currentRound = nextRound;
    return;
  }

  gameState.currentRound = nextRound;
  gameState.currentPlayer = 0;
}

function finalizeTurn() {
  if (gameState.currentRound >= gameState.rounds.length || gameState.shanghaiWinner) {
    return;
  }

  const roundConfig = gameState.rounds?.[gameState.currentRound];
  if (!roundConfig) return;

  const scoredPlayerIndex = gameState.currentPlayer;
  const player = gameState.players?.[scoredPlayerIndex];
  if (!player) return;

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

  resetTurn();
  resolveRoundProgress(scoredPlayerIndex);
}

/* -------------------------
   ACTIONS
--------------------------*/

export function recordThrow(hitValue) {
  if (gameState.currentRound >= gameState.rounds.length || gameState.shanghaiWinner) {
    return;
  }

  if (gameState.dartsThrown >= 3) {
    return;
  }

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const safeHitValue = Math.max(0, Math.min(3, hitValue));

  gameState.currentTurnThrows.push(safeHitValue);
  gameState.dartsThrown++;

  if (safeHitValue > 0) {
    gameState.currentTurnHits.push(safeHitValue);
  }

  if (
    gameState.currentTurnHits.includes(1) &&
    gameState.currentTurnHits.includes(2) &&
    gameState.currentTurnHits.includes(3)
  ) {
    gameState.shanghaiWinner = player.name;
    gameState.lastScoreMessage = `${player.name} hit SHANGHAI!`;
    gameState.lastScoreColor = "#ffcc00";
    gameState.lastScoreTimestamp = Date.now();
  }
}

export function nextPlayer() {
  if (gameState.currentRound >= gameState.rounds.length || gameState.shanghaiWinner) {
    return;
  }

  history.push(cloneState(gameState));
  finalizeTurn();
}

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.shanghaiWinner || gameState.currentRound >= gameState.rounds.length;
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

export function getRotatedPlayersForReplay() {
  if (!gameState.originalPlayers || !gameState.originalPlayers.length) return [];

  if (gameState.originalPlayers.length === 1) {
    return [...gameState.originalPlayers];
  }

  return [
    ...gameState.originalPlayers.slice(1),
    gameState.originalPlayers[0]
  ];
}let gameState = {};
let history = [];

import { store } from "../../core/store.js";
import { saveGameResult } from "../../core/historyService.js";

/* -------------------------
   INIT / STATE
--------------------------*/

export function initGame(players) {
  const rounds = buildRoundOrder();
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],
    players: playerNames.map(name => ({
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

    shanghaiWinner: null,
    pendingShanghai: null,
    historySaved: false
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

function normalizePlayerName(player, index) {
  if (typeof player === "string") return player;
  if (player && typeof player.name === "string") return player.name;
  return `Player ${index + 1}`;
}

function getWinnerPlayer() {
  if (gameState.shanghaiWinner) {
    return gameState.players.find(player => player.name === gameState.shanghaiWinner) || null;
  }

  return [...gameState.players].sort((a, b) => b.total - a.total)[0] || null;
}

function saveHammerCricketHistory() {
  if (gameState.historySaved) return;

  const selectedProfiles = store.selectedPlayerProfiles || [];
  const winnerPlayer = getWinnerPlayer();

  const players = gameState.players.map((player, index) => {
    const profile = selectedProfiles[index] || {};

    return {
      id: profile.id || null,
      name: player.name,
      avatar: profile.avatar || null,
      score: player.total,
      result: winnerPlayer && player.name === winnerPlayer.name ? "winner" : "played",
      roundScores: [...player.roundScores],
      stats: {
        total: player.total,
        shanghai: gameState.shanghaiWinner === player.name
      }
    };
  });

  saveGameResult({
    gameId: "hammer-cricket",
    gameName: "Hammer Cricket",
    players,
    winner: winnerPlayer
      ? {
          id: players.find(player => player.name === winnerPlayer.name)?.id || null,
          name: winnerPlayer.name,
          avatar: players.find(player => player.name === winnerPlayer.name)?.avatar || null
        }
      : null,
    meta: {
      rounds: gameState.rounds,
      shanghaiWinner: gameState.shanghaiWinner || null
    }
  });

  gameState.historySaved = true;
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

    { type: "bonus", label: `Bonus (${formatTargetLabel(bonus1)})`, target: bonus1, multipliers: [1, 3, 5] },

    { type: "number", label: "18", target: 18, multipliers: [1, 2, 3] },
    { type: "number", label: "19", target: 19, multipliers: [1, 2, 3] },
    { type: "number", label: "20", target: 20, multipliers: [1, 2, 3] },

    { type: "bull", label: "Bull", target: 25, multipliers: [1, 2, 3] },

    { type: "bonus", label: `Bonus (${formatTargetLabel(bonus2)})`, target: bonus2, multipliers: [1, 3, 5] }
  ];
}

function formatTargetLabel(target) {
  return target === 25 ? "Bull" : String(target);
}

/* -------------------------
   SCORING
--------------------------*/

function getCurrentRoundConfig() {
  return gameState.rounds?.[gameState.currentRound] || null;
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
  if (gameState.currentRound >= gameState.rounds.length || gameState.shanghaiWinner) {
    return;
  }

  const roundConfig = gameState.rounds?.[gameState.currentRound];
  if (!roundConfig) return;

  const player = gameState.players?.[gameState.currentPlayer];
  if (!player) return;

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

  if (gameState.currentRound >= gameState.rounds.length) {
    saveHammerCricketHistory();
  }
}


/* -------------------------
   ACTIONS
--------------------------*/

export function recordThrow(hitValue) {
  if (gameState.currentRound >= gameState.rounds.length || gameState.shanghaiWinner) {
    return;
  }

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const safeHitValue = Math.max(0, Math.min(3, hitValue));

  gameState.currentTurnThrows.push(safeHitValue);
  gameState.dartsThrown++;

  if (safeHitValue > 0) {
    gameState.currentTurnHits.push(safeHitValue);
  }

  // Shanghai = single + double + triple in one turn
  if (
  gameState.currentTurnHits.includes(1) &&
  gameState.currentTurnHits.includes(2) &&
  gameState.currentTurnHits.includes(3)
) {
  gameState.pendingShanghai = player.name;
  return;
}

  if (gameState.dartsThrown === 3) {
    finalizeTurn();
  }
}

export function nextPlayer() {
  if (gameState.currentRound >= gameState.rounds.length || gameState.shanghaiWinner) {
    return;
  }

  history.push(cloneState(gameState));
  finalizeTurn();
}

export function confirmShanghaiWinner() {
  if (!gameState.pendingShanghai || gameState.shanghaiWinner) return;

  gameState.shanghaiWinner = gameState.pendingShanghai;
  gameState.pendingShanghai = null;
  gameState.lastScoreMessage = `${gameState.shanghaiWinner} hit SHANGHAI!`;
  gameState.lastScoreColor = "#ffcc00";
  gameState.lastScoreTimestamp = Date.now();

  saveHammerCricketHistory();
}

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.shanghaiWinner || gameState.currentRound >= gameState.rounds.length;
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
