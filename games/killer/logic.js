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

function getWinnerName() {
  return gameState.winner || gameState.Winner || gameState.shanghaiWinner || null;
}

function isBullHitType(hitType) {
  return hitType === "greenBull" || hitType === "redBull";
}

function isNumberHitType(hitType) {
  return hitType === "single" || hitType === "double" || hitType === "triple";
}

function getNumberRank(hitType) {
  const rank = {
    single: 1,
    double: 2,
    triple: 3
  };

  return rank[hitType] || 0;
}

function getHitValue(hitType) {
  const values = {
    single: 1,
    double: 2,
    triple: 3,
    greenBull: 2,
    redBull: 3
  };

  return values[hitType] || 0;
}

function formatTarget(target, hitType) {
  if (target === 25) {
    return hitType === "redBull" ? "Dub Bull" : "Sing Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labelMap[hitType] || "Hit"} ${target}`;
}

function formatTargetNumber(target) {
  return target === 25 ? "Bull" : String(target);
}

function canOverride(existingAssignment, incomingAssignment) {
  if (!existingAssignment) return true;
  if (existingAssignment.target !== incomingAssignment.target) return false;

  if (existingAssignment.target === 25) {
    return (
      existingAssignment.hitType === "greenBull" &&
      incomingAssignment.hitType === "redBull"
    );
  }

  if (
    !isNumberHitType(existingAssignment.hitType) ||
    !isNumberHitType(incomingAssignment.hitType)
  ) {
    return false;
  }

  return getNumberRank(incomingAssignment.hitType) > getNumberRank(existingAssignment.hitType);
}

function getUnassignedPlayerIndexes() {
  return gameState.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.target)
    .map(({ index }) => index);
}

function findPlayerByTarget(target) {
  return gameState.players.findIndex(player => player.target === target);
}

function isPlayerActive(player) {
  return !!player && player.isActive && !player.isDormantDead;
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
  gameState.currentTurnHits = [];
  gameState.currentTurnHitsOnOwnTarget = [];
  gameState.currentTurnHitsByOpponentTarget = {};
  gameState.livesTakenThisTurn = 0;
}

function ensureStats(player) {
  if (!player.stats) {
    player.stats = {
      targetClaim: null,
      totalKills: 0,
      selfHits: 0,
      redemskis: 0,
      revives: 0,
      zombied: 0
    };
  }

  return player.stats;
}

function buildStatsSummary() {
  return gameState.players.map(player => ({
    name: player.name,
    target: player.target,
    hitType: player.hitType,
    lives: player.lives,
    isKiller: player.isKiller,
    isZombie: player.isZombie,
    isDormantDead: player.isDormantDead,
    isRedemski: player.isRedemski,
    redemskiCount: player.redemskiCount || 0,
    stats: { ...ensureStats(player) }
  }));
}

function saveKillerHistory() {
  if (gameState.historySaved) return;

  const selectedProfiles = store.selectedPlayerProfiles || [];
  const winnerName = getWinnerName();

  const players = gameState.players.map((player, index) => {
    const profile = selectedProfiles[index] || {};

    return {
      id: profile.id || null,
      name: player.name,
      avatar: profile.avatar || null,
      score: player.lives,
      result: player.name === winnerName ? "winner" : player.isDormantDead ? "out" : "played",
      stats: { ...(player.stats || {}) },
      meta: {
        target: player.target,
        hitType: player.hitType,
        lives: player.lives,
        isKiller: player.isKiller,
        isZombie: player.isZombie,
        isRedemski: player.isRedemski,
        isDormantDead: player.isDormantDead,
        redemskiCount: player.redemskiCount || 0
      }
    };
  });

  const winnerPlayer = players.find(player => player.name === winnerName) || null;

  saveGameResult({
    gameId: "killer",
    gameName: "Killer",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      Winner: winnerName,
      finalStats: gameState.finalStats || buildStatsSummary()
    }
  });

  gameState.historySaved = true;
}

function maybeDeclareWinner() {
  const activePlayers = getActivePlayers();

  if (activePlayers.length === 1) {
    gameState.winner = activePlayers[0].name;
    gameState.finalStats = buildStatsSummary();
    saveKillerHistory();
    return true;
  }

  return false;
}

function advanceTurn() {
  resetTurnTracking();

  let attempts = 0;

  do {
    gameState.currentPlayer++;

    if (gameState.currentPlayer >= gameState.players.length) {
      gameState.currentPlayer = 0;
    }

    attempts++;
  } while (
    !isPlayerActive(gameState.players[gameState.currentPlayer]) &&
    attempts <= gameState.players.length
  );

  maybeDeclareWinner();
}

function advanceNDHTurn() {
  const unassigned = getUnassignedPlayerIndexes();

  if (unassigned.length === 0) {
    gameState.phase = "READY";
    resetTurnTracking();
    updateMessage("All targets assigned. Review targets, then start the game.", "#facc15");
    return;
  }

  const currentPosition = unassigned.indexOf(gameState.currentPlayer);
  const nextPosition =
    currentPosition === -1
      ? 0
      : (currentPosition + 1) % unassigned.length;

  gameState.currentPlayer = unassigned[nextPosition];
}

function assignTargetToPlayer(playerIndex, assignment) {
  const player = gameState.players[playerIndex];
  if (!player) return;

  player.target = assignment.target;
  player.hitType = assignment.hitType;
  player.isKiller =
    assignment.hitType === "double" ||
    assignment.hitType === "triple" ||
    assignment.hitType === "greenBull" ||
    assignment.hitType === "redBull";

  ensureStats(player).targetClaim = formatTarget(assignment.target, assignment.hitType);

  updateMessage(
    player.isKiller
      ? `${player.name} claims ${formatTarget(assignment.target, assignment.hitType)} and starts as a Killer!`
      : `${player.name} claims ${formatTarget(assignment.target, assignment.hitType)}!`,
    "#22c55e"
  );
}

function bumpPlayerOffTarget(playerIndex) {
  const player = gameState.players[playerIndex];
  if (!player) return;

  player.target = null;
  player.hitType = null;
  player.isKiller = false;
  ensureStats(player).targetClaim = null;
}

function canKillWithHit(victim, hitType) {
  const remainingLives = victim.lives;
  const activeCount = countActivePlayers();

  if (remainingLives > 3) {
    return true;
  }

  if (remainingLives === 3) {
    if (hitType === "triple" || hitType === "redBull") return true;

    if (
      activeCount === 2 &&
      hitType === "single" &&
      gameState.currentTurnHits.filter(h => h === "single").length >= 3
    ) {
      return true;
    }

    return false;
  }

  if (remainingLives === 2 || remainingLives === 1) {
    if (
      hitType === "double" ||
      hitType === "triple" ||
      hitType === "greenBull" ||
      hitType === "redBull"
    ) {
      return true;
    }

    if (
      activeCount === 2 &&
      hitType === "single" &&
      gameState.currentTurnHits.filter(h => h === "single").length >= 3
    ) {
      return true;
    }

    return false;
  }

  return true;
}

function setDormantDead(playerIndex) {
  const player = gameState.players[playerIndex];
  if (!player) return;

  player.lives = 0;
  player.isActive = false;
  player.isDormantDead = true;
  player.isZombie = false;
  player.isKiller = false;
  player.isRedemski = false;
}

function reviveZombie(playerIndex, revivedByIndex = null) {
  const player = gameState.players[playerIndex];
  if (!player) return false;
  if (!player.isDormantDead) return false;

  player.lives = 1;
  player.isActive = true;
  player.isDormantDead = false;
  player.isZombie = true;
  player.isKiller = true;
  player.isRedemski = false;
  ensureStats(player).zombied += 1;

  if (revivedByIndex != null && gameState.players[revivedByIndex]) {
    ensureStats(gameState.players[revivedByIndex]).revives += 1;
  }

  updateMessage(`${player.name} is zombied back in with 1 life and Killer status!`, "#84cc16");
  return true;
}

function checkZombieRevival(hitType, target, throwerIndex) {
  if (target == null) return false;

  const validReviveHit =
    hitType === "double" ||
    hitType === "triple" ||
    hitType === "greenBull" ||
    hitType === "redBull";

  if (!validReviveHit) return false;

  const dormantPlayerIndex = gameState.players.findIndex(player => {
    return player.isDormantDead && player.target === target;
  });

  if (dormantPlayerIndex === -1) return false;

  return reviveZombie(dormantPlayerIndex, throwerIndex);
}

function startRedemski(playerIndex) {
  gameState.phase = "REDEMSKI";
  gameState.redemskiPlayerIndex = playerIndex;
  resetTurnTracking();

  const player = gameState.players[playerIndex];
  if (!player) return;

  updateMessage(
    `${player.name} gets a Redemski! Hit Dub or Trip ${player.target === 25 ? "Bull" : player.target} to stay alive.`,
    "#facc15"
  );
}

function finishFailedRedemski() {
  const playerIndex = gameState.redemskiPlayerIndex;
  const player = gameState.players[playerIndex];
  if (!player) return;

  setDormantDead(playerIndex);

  gameState.phase = "GAME";
  gameState.redemskiPlayerIndex = null;

  updateMessage(`${player.name} fails Redemski and becomes Dormant Dead.`, "#ff4c4c");

  if (!maybeDeclareWinner()) {
    advanceTurn();
  }
}

function finishSuccessfulRedemski() {
  const playerIndex = gameState.redemskiPlayerIndex;
  const player = gameState.players[playerIndex];
  if (!player) return;

  player.lives = 1;
  player.isActive = true;
  player.isDormantDead = false;
  player.isRedemski = true;
  player.redemskiCount = (player.redemskiCount || 0) + 1;
  ensureStats(player).redemskis = player.redemskiCount;

  gameState.phase = "GAME";
  gameState.redemskiPlayerIndex = null;

  updateMessage(`${player.name} survives Redemski! Back with 1 life.`, "#22c55e");
  advanceTurn();
}

function isBullShanghai(turnHits) {
  if (!Array.isArray(turnHits) || turnHits.length !== 3) return false;

  const greenCount = turnHits.filter(hit => hit === "greenBull").length;
  const redCount = turnHits.filter(hit => hit === "redBull").length;

  return greenCount === 2 && redCount === 1;
}

function isStandardShanghai(turnHits) {
  if (!Array.isArray(turnHits)) return false;

  return (
    turnHits.includes("single") &&
    turnHits.includes("double") &&
    turnHits.includes("triple")
  );
}

function sortTargets(targets) {
  return [...new Set(targets)].sort((a, b) => {
    if (a === 25) return 1;
    if (b === 25) return -1;
    return a - b;
  });
}

function getVisibleTargetNumbersForPlayer(playerIndex) {
  const player = gameState.players[playerIndex];
  if (!player) return [];

  if (!player.isKiller) {
    return player.target != null ? [player.target] : [];
  }

  const targets = gameState.players
    .filter(other => {
      if (other.target == null) return false;
      return other.isActive || other.isDormantDead;
    })
    .map(other => other.target);

  if (player.target != null) {
    targets.unshift(player.target);
  }

  return sortTargets(targets);
}

function getCurrentTargetText() {
  const player = gameState.players[gameState.currentPlayer];
  if (!player) return "";

  const targets = getVisibleTargetNumbersForPlayer(gameState.currentPlayer);

  if (!targets.length) {
    return player.target != null ? formatTargetNumber(player.target) : "—";
  }

  return targets.map(formatTargetNumber).join(", ");
}

function recordOpponentTargetHitForShanghai(playerIndex, hitType, target) {
  const player = gameState.players[playerIndex];
  if (!player || !player.isKiller) return;
  if (target == null) return;

  const targetOwnerIndex = findPlayerByTarget(target);
  if (targetOwnerIndex === -1) return;
  if (targetOwnerIndex === playerIndex) return;

  const targetOwner = gameState.players[targetOwnerIndex];
  if (!targetOwner || targetOwner.isDormantDead) return;

  const validHitForTarget =
    (target === 25 && isBullHitType(hitType)) ||
    (target !== 25 && isNumberHitType(hitType));

  if (!validHitForTarget) return;

  const key = String(target);

  if (!gameState.currentTurnHitsByOpponentTarget) {
    gameState.currentTurnHitsByOpponentTarget = {};
  }

  if (!gameState.currentTurnHitsByOpponentTarget[key]) {
    gameState.currentTurnHitsByOpponentTarget[key] = [];
  }

  gameState.currentTurnHitsByOpponentTarget[key].push(hitType);
}

function getShanghaiTargetForCurrentPlayer() {
  const playerIndex = gameState.currentPlayer;
  const player = gameState.players[playerIndex];

  if (!player || !player.isKiller) return null;

  const hitsByTarget = gameState.currentTurnHitsByOpponentTarget || {};

  for (const targetKey of Object.keys(hitsByTarget)) {
    const target = Number(targetKey);
    const hits = hitsByTarget[targetKey];

    const targetOwnerIndex = findPlayerByTarget(target);
    if (targetOwnerIndex === -1 || targetOwnerIndex === playerIndex) continue;

    const targetOwner = gameState.players[targetOwnerIndex];
    if (!targetOwner || targetOwner.isDormantDead) continue;

    if (target === 25 && isBullShanghai(hits)) {
      return target;
    }

    if (target !== 25 && isStandardShanghai(hits)) {
      return target;
    }
  }

  return null;
}

function finishShanghaiWin(playerName) {
  gameState.shanghaiWinner = playerName;
  gameState.finalStats = buildStatsSummary();
  updateMessage(`${playerName} hit SHANGHAI!`, "#ffcc00");
  saveKillerHistory();
}

function canConsumeTurnEvents(amount) {
  return gameState.livesTakenThisTurn + amount <= 3;
}

function consumeTurnEvents(amount) {
  if (!canConsumeTurnEvents(amount)) return false;
  gameState.livesTakenThisTurn += amount;
  return true;
}

function dealSelfHit(player, damage) {
  ensureStats(player).selfHits += damage;
  player.lives = Math.max(0, player.lives - damage);

  if (player.lives <= 0) {
    startRedemski(gameState.currentPlayer);
    return true;
  }

  updateMessage(`${player.name} hits themselves for ${damage}!`, "#ff4c4c");
  return false;
}

function dealHitToVictim(attacker, victimIndex, hitType, damage) {
  const victim = gameState.players[victimIndex];
  if (!victim || !isPlayerActive(victim)) return false;

  if (victim.lives > damage) {
    victim.lives -= damage;
    ensureStats(attacker).totalKills += damage;
    updateMessage(`${attacker.name} hits ${victim.name} for ${damage}!`, "#ff4c4c");
    return false;
  }

  if (canKillWithHit(victim, hitType)) {
    victim.lives = 0;
    ensureStats(attacker).totalKills += damage;
    startRedemski(victimIndex);
    return true;
  }

  updateMessage(`${victim.name} is not in kill range for that hit.`, "#facc15");
  return false;
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
      target: null,
      hitType: null,
      lives: 6,
      isKiller: false,
      isZombie: false,
      isRedemski: false,
      redemskiCount: 0,
      isActive: true,
      isDormantDead: false,
      stats: {
        targetClaim: null,
        totalKills: 0,
        selfHits: 0,
        redemskis: 0,
        revives: 0,
        zombied: 0
      }
    })),

    phase: "NDH",
    currentPlayer: 0,
    redemskiPlayerIndex: null,

    dartsThrown: 0,
    currentTurnThrows: [],
    currentTurnHits: [],
    currentTurnHitsOnOwnTarget: [],
    currentTurnHitsByOpponentTarget: {},
    livesTakenThisTurn: 0,

    lastMessage: "",
    lastMessageColor: "#ffffff",
    lastMessageTimestamp: 0,

    winner: null,
    shanghaiWinner: null,
    finalStats: null,
    historySaved: false
  };

  history = [];

  if (playerNames.length < 2) {
    gameState.winner = "No Winner";
    gameState.finalStats = buildStatsSummary();
    updateMessage("Killer needs at least 2 players.", "#ff4c4c");
  }
}

export function getState() {
  return gameState;
}

export function getStats() {
  return buildStatsSummary();
}

export function getCurrentTargetDisplay() {
  return getCurrentTargetText();
}

export function getCurrentDartDisplay() {
  const dartNumber = Math.min((gameState.dartsThrown || 0) + 1, 3);
  return `${dartNumber}/3`;
}

export function canCurrentPlayerThrow() {
  if (gameState.winner || gameState.shanghaiWinner) return false;
  if (gameState.phase !== "GAME") return false;

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return false;

  return (gameState.dartsThrown || 0) < 3;
}

export function getCurrentTargetOptions() {
  const player = gameState.players[gameState.currentPlayer];
  if (!player) return [];
  return getVisibleTargetNumbersForPlayer(gameState.currentPlayer);
}

/* -------------------------
   NDH / READY
--------------------------*/

export function submitNDHThrow(hitType, target = null) {
  if (gameState.phase !== "NDH") return;

  const playerIndex = gameState.currentPlayer;
  const player = gameState.players[playerIndex];

  if (!player || player.target) return;

  let assignment;

  if (hitType === "greenBull" || hitType === "redBull") {
    assignment = {
      target: 25,
      hitType
    };
  } else {
    if (target === null || target < 1 || target > 20) return;

    assignment = {
      target,
      hitType
    };
  }

  history.push(cloneState(gameState));

  const existingIndex = findPlayerByTarget(assignment.target);

  if (existingIndex === -1) {
    assignTargetToPlayer(playerIndex, assignment);

    const unassigned = getUnassignedPlayerIndexes();

    if (unassigned.length === 0) {
      gameState.phase = "READY";
      resetTurnTracking();
      updateMessage("All targets assigned. Review targets, then start the game.", "#facc15");
    } else {
      updateMessage(
        `${player.name} claims ${formatTarget(assignment.target, assignment.hitType)}. Tap Next Player.`,
        "#22c55e"
      );
    }

    return;
  }

  if (existingIndex === playerIndex) {
    return;
  }

  const existingPlayer = gameState.players[existingIndex];
  const existingAssignment = {
    target: existingPlayer.target,
    hitType: existingPlayer.hitType
  };

  if (canOverride(existingAssignment, assignment)) {
    bumpPlayerOffTarget(existingIndex);
    assignTargetToPlayer(playerIndex, assignment);

    const unassigned = getUnassignedPlayerIndexes();

    if (unassigned.length === 0) {
      gameState.phase = "READY";
      resetTurnTracking();
      updateMessage("All targets assigned. Review targets, then start the game.", "#facc15");
    } else {
      updateMessage(
        `${player.name} takes ${formatTarget(assignment.target, assignment.hitType)} from ${existingPlayer.name}. Tap Next Player.`,
        "#facc15"
      );
    }

    return;
  }

  updateMessage(
    `${formatTarget(assignment.target, assignment.hitType)} is already locked. ${player.name} throws again.`,
    "#ff4c4c"
  );
}

export function clearNDHTarget(playerIndex = gameState.currentPlayer) {
  if (gameState.phase !== "NDH" && gameState.phase !== "READY") return;

  const player = gameState.players[playerIndex];
  if (!player || !player.target) return;

  history.push(cloneState(gameState));

  bumpPlayerOffTarget(playerIndex);

  gameState.phase = "NDH";
  gameState.currentPlayer = playerIndex;
  resetTurnTracking();

  updateMessage(`${player.name}'s target was cleared. Enter a new target.`, "#facc15");
}

export function startGame() {
  if (gameState.phase !== "READY") {
    return;
  }

  const unassigned = getUnassignedPlayerIndexes();

  if (unassigned.length > 0) {
    gameState.phase = "NDH";
    gameState.currentPlayer = unassigned[0];
    updateMessage("Some players still need targets.", "#ff4c4c");
    return;
  }

  history.push(cloneState(gameState));

  gameState.phase = "GAME";
  gameState.currentPlayer = 0;
  resetTurnTracking();

  updateMessage("Killer begins!", "#22c55e");
}

/* -------------------------
   GAME PHASE
--------------------------*/

export function submitMiss() {
  if (gameState.phase !== "GAME" || gameState.winner || gameState.shanghaiWinner) return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return;

  if ((gameState.dartsThrown || 0) >= 3) {
    gameState.dartsThrown = 3;
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
    return;
  }

  history.push(cloneState(gameState));

  gameState.currentTurnThrows.push({
    target: null,
    hitType: "miss"
  });

  gameState.dartsThrown = Math.min((gameState.dartsThrown || 0) + 1, 3);

  if (gameState.dartsThrown >= 3) {
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
  } else {
    updateMessage(`${player.name} missed.`, "#ffffff");
  }
}

export function submitGameThrow(hitType, target) {
  if (gameState.phase !== "GAME" || gameState.winner || gameState.shanghaiWinner) return;

  const playerIndex = gameState.currentPlayer;
  const player = gameState.players[playerIndex];

  if (!player || !isPlayerActive(player)) return;

  if ((gameState.dartsThrown || 0) >= 3) {
    gameState.dartsThrown = 3;
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
    return;
  }

  const hitValue = getHitValue(hitType);
  if (hitValue <= 0) return;

  const validTarget =
    target === 25 ||
    (typeof target === "number" && target >= 1 && target <= 20);

  if (!validTarget) return;

  const validHitType = isNumberHitType(hitType) || isBullHitType(hitType);
  if (!validHitType) return;

  const isBullTarget = target === 25;

  if (isBullTarget && !isBullHitType(hitType)) return;
  if (!isBullTarget && !isNumberHitType(hitType)) return;

  const hitOwnTarget = target === player.target;

  if (!player.isKiller && !hitOwnTarget) {
    updateMessage(`${player.name} needs to unlock Killer on their own target first.`, "#facc15");
    return;
  }

  history.push(cloneState(gameState));

  const assignment = { target, hitType };

  gameState.currentTurnThrows.push(assignment);
  gameState.dartsThrown = Math.min((gameState.dartsThrown || 0) + 1, 3);
  gameState.currentTurnHits.push(hitType);

  recordOpponentTargetHitForShanghai(playerIndex, hitType, target);

  const revivedZombieThisDart = checkZombieRevival(hitType, target, playerIndex);

  const shanghaiTarget = getShanghaiTargetForCurrentPlayer();

  if (shanghaiTarget != null) {
    finishShanghaiWin(player.name);
    return;
  }

  if (hitOwnTarget) {
    if (!player.isKiller) {
      if (consumeTurnEvents(1)) {
        player.isKiller = true;
        updateMessage(`${player.name} is now a Killer!`, "#22c55e");
      } else {
        updateMessage(`${player.name} has already used 3 total turn events.`, "#facc15");
      }
    } else {
      const damage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);

      if (damage <= 0) {
        updateMessage(`${player.name} has already used 3 total turn events.`, "#facc15");
      } else {
        consumeTurnEvents(damage);
        const endedTurn = dealSelfHit(player, damage);
        if (endedTurn) return;
      }
    }
  } else if (player.isKiller && hitValue > 0 && !revivedZombieThisDart) {
    const victimIndex = findPlayerByTarget(target);

    if (victimIndex !== -1) {
      const victim = gameState.players[victimIndex];

      if (victim && isPlayerActive(victim)) {
        const damage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);

        if (damage <= 0) {
          updateMessage(`${player.name} has already used 3 total turn events.`, "#facc15");
        } else {
          consumeTurnEvents(damage);
          const endedTurn = dealHitToVictim(player, victimIndex, hitType, damage);
          if (endedTurn) return;
        }
      }
    }
  }

  if (maybeDeclareWinner()) return;

  if (gameState.dartsThrown >= 3) {
    gameState.dartsThrown = 3;
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
  }
}

/*
  Kept only to prevent old UI imports from crashing.
  Actual Killer Shanghai is automatic and only tracks opponent target numbers.
*/
export function submitShanghai() {
  updateMessage("Shanghai is automatic in Killer. Hit the full sequence on an opponent target.", "#facc15");
}

/* -------------------------
   REDEMSKI PHASE
--------------------------*/

export function submitRedemskiThrow(hitType, target) {
  if (gameState.phase !== "REDEMSKI" || gameState.winner || gameState.shanghaiWinner) return;

  const player = gameState.players[gameState.redemskiPlayerIndex];
  if (!player) return;

  if ((gameState.dartsThrown || 0) >= 3) {
    gameState.dartsThrown = 3;
    finishFailedRedemski();
    return;
  }

  history.push(cloneState(gameState));

  gameState.currentTurnThrows.push({ target, hitType });
  gameState.dartsThrown = Math.min((gameState.dartsThrown || 0) + 1, 3);

  const correctTarget = target === player.target;
  const validReviveHit =
    correctTarget &&
    (
      hitType === "double" ||
      hitType === "triple" ||
      (player.target === 25 && (hitType === "redBull" || hitType === "greenBull"))
    );

  if (validReviveHit) {
    finishSuccessfulRedemski();
    return;
  }

  if (gameState.dartsThrown >= 3) {
    finishFailedRedemski();
  }
}

/* -------------------------
   TURN / END ACTIONS
--------------------------*/

export function nextPlayer() {
  if (gameState.winner || gameState.shanghaiWinner) return;

  history.push(cloneState(gameState));

  if (gameState.phase === "NDH") {
    advanceNDHTurn();
    return;
  }

  if (gameState.phase === "READY") {
    startGame();
    return;
  }

  if (gameState.phase === "GAME") {
    advanceTurn();
    return;
  }

  if (gameState.phase === "REDEMSKI") {
    finishFailedRedemski();
  }
}

export function endGameEarly() {
  if (gameState.winner || gameState.shanghaiWinner) return;

  history.push(cloneState(gameState));

  const activePlayers = getActivePlayers();

  if (activePlayers.length > 0) {
    const leader = [...activePlayers].sort((a, b) => b.lives - a.lives)[0];
    gameState.winner = leader.name;
  } else {
    gameState.winner = "No Winner";
  }

  gameState.finalStats = buildStatsSummary();
  updateMessage("Game ended early.", "#facc15");
  saveKillerHistory();
}

/* -------------------------
   SHARED ACTIONS
--------------------------*/

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner || !!gameState.shanghaiWinner;
}let gameState = {};
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

function getWinnerName() {
  return gameState.winner || gameState.Winner || null;
}

function saveKillerHistory() {
  if (gameState.historySaved) return;

  const selectedProfiles = store.selectedPlayerProfiles || [];
  const winnerName = getWinnerName();

  const players = gameState.players.map((player, index) => {
    const profile = selectedProfiles[index] || {};

    return {
      id: profile.id || null,
      name: player.name,
      avatar: profile.avatar || null,
      score: player.lives,
      result: player.name === winnerName ? "winner" : player.isDormantDead ? "out" : "played",
      stats: { ...(player.stats || {}) },
      meta: {
        target: player.target,
        hitType: player.hitType,
        lives: player.lives,
        isKiller: player.isKiller,
        isZombie: player.isZombie,
        isRedemski: player.isRedemski,
        isDormantDead: player.isDormantDead,
        redemskiCount: player.redemskiCount || 0
      }
    };
  });

  const winnerPlayer = players.find(player => player.name === winnerName) || null;

  saveGameResult({
    gameId: "killer",
    gameName: "Killer",
    players,
    winner: winnerPlayer
      ? {
          id: winnerPlayer.id,
          name: winnerPlayer.name,
          avatar: winnerPlayer.avatar
        }
      : null,
    meta: {
      Winner: gameState.Winner || null,
      finalStats: gameState.finalStats || buildStatsSummary()
    }
  });

  gameState.historySaved = true;
}

function isBullHitType(hitType) {
  return hitType === "greenBull" || hitType === "redBull";
}

function isNumberHitType(hitType) {
  return hitType === "single" || hitType === "double" || hitType === "triple";
}

function getNumberRank(hitType) {
  const rank = {
    single: 1,
    double: 2,
    triple: 3
  };
  return rank[hitType] || 0;
}

function getHitValue(hitType) {
  const values = {
    single: 1,
    double: 2,
    triple: 3,
    greenBull: 2,
    redBull: 3
  };

  return values[hitType] || 0;
}

function formatTarget(target, hitType) {
  if (target === 25) {
    return hitType === "redBull" ? "Dub Bull" : "Sing Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labelMap[hitType]} ${target}`;
}

function formatTargetNumber(target) {
  return target === 25 ? "Bull" : String(target);
}

function canOverride(existingAssignment, incomingAssignment) {
  if (!existingAssignment) return true;
  if (existingAssignment.target !== incomingAssignment.target) return false;

  if (existingAssignment.target === 25) {
    return (
      existingAssignment.hitType === "greenBull" &&
      incomingAssignment.hitType === "redBull"
    );
  }

  if (
    !isNumberHitType(existingAssignment.hitType) ||
    !isNumberHitType(incomingAssignment.hitType)
  ) {
    return false;
  }

  return getNumberRank(incomingAssignment.hitType) > getNumberRank(existingAssignment.hitType);
}

function getUnassignedPlayerIndexes() {
  return gameState.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.target)
    .map(({ index }) => index);
}

function findPlayerByTarget(target) {
  return gameState.players.findIndex(player => player.target === target);
}

function isPlayerActive(player) {
  return !!player && player.isActive && !player.isDormantDead;
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
  gameState.currentTurnHits = [];
  gameState.currentTurnHitsOnOwnTarget = [];
  gameState.currentTurnHitsByOpponentTarget = {};
  gameState.livesTakenThisTurn = 0;
}

function ensureStats(player) {
  if (!player.stats) {
    player.stats = {
      targetClaim: null,
      totalKills: 0,
      selfHits: 0,
      redemskis: 0,
      revives: 0,
      zombied: 0
    };
  }

  return player.stats;
}

function buildStatsSummary() {
  return gameState.players.map(player => ({
    name: player.name,
    target: player.target,
    hitType: player.hitType,
    lives: player.lives,
    isKiller: player.isKiller,
    isZombie: player.isZombie,
    isDormantDead: player.isDormantDead,
    isRedemski: player.isRedemski,
    redemskiCount: player.redemskiCount || 0,
    stats: { ...ensureStats(player) }
  }));
}

function maybeDeclareWinner() {
  const activePlayers = getActivePlayers();

  if (activePlayers.length === 1) {
    gameState.winner = activePlayers[0].name;
    gameState.finalStats = buildStatsSummary();
    saveKillerHistory();
    return true;
  }

  return false;
}

function advanceTurn() {
  resetTurnTracking();

  let attempts = 0;
  do {
    gameState.currentPlayer++;
    if (gameState.currentPlayer >= gameState.players.length) {
      gameState.currentPlayer = 0;
    }
    attempts++;
  } while (
    !isPlayerActive(gameState.players[gameState.currentPlayer]) &&
    attempts <= gameState.players.length
  );

  maybeDeclareWinner();
}

function advanceNDHTurn() {
  const unassigned = getUnassignedPlayerIndexes();

  if (unassigned.length === 0) {
    gameState.phase = "READY";
    resetTurnTracking();
    updateMessage("All targets assigned. Review targets, then start the game.", "#facc15");
    return;
  }

  const currentPosition = unassigned.indexOf(gameState.currentPlayer);
  const nextPosition =
    currentPosition === -1
      ? 0
      : (currentPosition + 1) % unassigned.length;

  gameState.currentPlayer = unassigned[nextPosition];
}

function assignTargetToPlayer(playerIndex, assignment) {
  const player = gameState.players[playerIndex];

  player.target = assignment.target;
  player.hitType = assignment.hitType;
  player.isKiller =
    assignment.hitType === "double" ||
    assignment.hitType === "triple" ||
    assignment.hitType === "greenBull" ||
    assignment.hitType === "redBull";

  ensureStats(player).targetClaim = formatTarget(assignment.target, assignment.hitType);

  updateMessage(
    player.isKiller
      ? `${player.name} claims ${formatTarget(assignment.target, assignment.hitType)} and starts as a Killer!`
      : `${player.name} claims ${formatTarget(assignment.target, assignment.hitType)}!`,
    "#22c55e"
  );
}

function bumpPlayerOffTarget(playerIndex) {
  const player = gameState.players[playerIndex];

  player.target = null;
  player.hitType = null;
  player.isKiller = false;
  ensureStats(player).targetClaim = null;
}

function maybeAdvancePhase() {
  const unassigned = getUnassignedPlayerIndexes();

  if (unassigned.length === 0) {
    gameState.phase = "READY";
    resetTurnTracking();
    updateMessage("All targets assigned. Review targets, then start the game.", "#facc15");
  } else {
    gameState.currentPlayer = unassigned[0];
  }
}

function canKillWithHit(victim, hitType) {
  const remainingLives = victim.lives;
  const activeCount = countActivePlayers();

  if (remainingLives > 3) {
    return true;
  }

  if (remainingLives === 3) {
    if (hitType === "triple" || hitType === "redBull") return true;

    if (
      activeCount === 2 &&
      hitType === "single" &&
      gameState.currentTurnHits.filter(h => h === "single").length >= 3
    ) {
      return true;
    }

    return false;
  }

  if (remainingLives === 2 || remainingLives === 1) {
    if (
      hitType === "double" ||
      hitType === "triple" ||
      hitType === "greenBull" ||
      hitType === "redBull"
    ) {
      return true;
    }

    if (
      activeCount === 2 &&
      hitType === "single" &&
      gameState.currentTurnHits.filter(h => h === "single").length >= 3
    ) {
      return true;
    }

    return false;
  }

  return true;
}

function setDormantDead(playerIndex) {
  const player = gameState.players[playerIndex];
  if (!player) return;

  player.lives = 0;
  player.isActive = false;
  player.isDormantDead = true;
  player.isZombie = false;
  player.isKiller = false;
  player.isRedemski = false;
}

function reviveZombie(playerIndex, revivedByIndex = null) {
  const player = gameState.players[playerIndex];
  if (!player) return false;
  if (!player.isDormantDead) return false;

  player.lives = 1;
  player.isActive = true;
  player.isDormantDead = false;
  player.isZombie = true;
  player.isKiller = true;
  player.isRedemski = false;
  ensureStats(player).zombied += 1;

  if (revivedByIndex != null && gameState.players[revivedByIndex]) {
    ensureStats(gameState.players[revivedByIndex]).revives += 1;
  }

  updateMessage(`${player.name} is zombied back in with 1 life and Killer status!`, "#84cc16");
  return true;
}

function checkZombieRevival(hitType, target, throwerIndex) {
  if (target == null) return false;

  const validReviveHit =
    hitType === "double" ||
    hitType === "triple" ||
    hitType === "greenBull" ||
    hitType === "redBull";

  if (!validReviveHit) return false;

  const dormantPlayerIndex = gameState.players.findIndex(player => {
    return player.isDormantDead && player.target === target;
  });

  if (dormantPlayerIndex === -1) return false;

  return reviveZombie(dormantPlayerIndex, throwerIndex);
}

function startRedemski(playerIndex) {
  gameState.phase = "REDEMSKI";
  gameState.redemskiPlayerIndex = playerIndex;
  resetTurnTracking();

  const player = gameState.players[playerIndex];
  updateMessage(
    `${player.name} gets a Redemski! Hit Dub or Trip ${player.target === 25 ? "Bull" : player.target} to stay alive.`,
    "#facc15"
  );
}

function finishFailedRedemski() {
  const player = gameState.players[gameState.redemskiPlayerIndex];
  if (!player) return;

  setDormantDead(gameState.redemskiPlayerIndex);

  gameState.phase = "GAME";
  gameState.redemskiPlayerIndex = null;

  updateMessage(`${player.name} fails Redemski and becomes Dormant Dead.`, "#ff4c4c");

  if (!maybeDeclareWinner()) {
    advanceTurn();
  }
}

function finishSuccessfulRedemski() {
  const player = gameState.players[gameState.redemskiPlayerIndex];
  if (!player) return;

  player.lives = 1;
  player.isActive = true;
  player.isDormantDead = false;
  player.isRedemski = true;
  player.redemskiCount = (player.redemskiCount || 0) + 1;
  ensureStats(player).redemskis = player.redemskiCount;

  gameState.phase = "GAME";
  gameState.redemskiPlayerIndex = null;

  updateMessage(`${player.name} survives Redemski! Back with 1 life.`, "#22c55e");
  advanceTurn();
}

function isBull(turnHits) {
  if (!Array.isArray(turnHits) || turnHits.length !== 3) return false;

  const greenCount = turnHits.filter(hit => hit === "greenBull").length;
  const redCount = turnHits.filter(hit => hit === "redBull").length;

  return greenCount === 2 && redCount === 1;
}

function isStandard(turnHits) {
  if (!Array.isArray(turnHits)) return false;

  return (
    turnHits.includes("single") &&
    turnHits.includes("double") &&
    turnHits.includes("triple")
  );
}

function sortTargets(targets) {
  return [...new Set(targets)].sort((a, b) => {
    if (a === 25) return 1;
    if (b === 25) return -1;
    return a - b;
  });
}

function getVisibleTargetNumbersForPlayer(playerIndex) {
  const player = gameState.players[playerIndex];
  if (!player) return [];

  if (!player.isKiller) {
    return player.target != null ? [player.target] : [];
  }

  const targets = gameState.players
    .filter(other => {
      if (other.target == null) return false;
      return other.isActive || other.isDormantDead;
    })
    .map(other => other.target);

  if (player.target != null) {
    targets.unshift(player.target);
  }

  return sortTargets(targets);
}

function recordOpponentTargetHitForShanghai(playerIndex, hitType, target) {
  const player = gameState.players[playerIndex];
  if (!player || !player.isKiller) return;
  if (target == null) return;

  const targetOwnerIndex = findPlayerByTarget(target);
  if (targetOwnerIndex === -1) return;
  if (targetOwnerIndex === playerIndex) return;

  const targetOwner = gameState.players[targetOwnerIndex];
  if (!targetOwner || targetOwner.isDormantDead) return;

  const validHitForTarget =
    (target === 25 && isBullHitType(hitType)) ||
    (target !== 25 && isNumberHitType(hitType));

  if (!validHitForTarget) return;

  const key = String(target);

  if (!gameState.currentTurnHitsByOpponentTarget) {
    gameState.currentTurnHitsByOpponentTarget = {};
  }

  if (!gameState.currentTurnHitsByOpponentTarget[key]) {
    gameState.currentTurnHitsByOpponentTarget[key] = [];
  }

  gameState.currentTurnHitsByOpponentTarget[key].push(hitType);
}

function getShanghaiTargetForCurrentPlayer() {
  const playerIndex = gameState.currentPlayer;
  const player = gameState.players[playerIndex];

  if (!player || !player.isKiller) return null;

  const hitsByTarget = gameState.currentTurnHitsByOpponentTarget || {};

  for (const targetKey of Object.keys(hitsByTarget)) {
    const target = Number(targetKey);
    const hits = hitsByTarget[targetKey];

    const targetOwnerIndex = findPlayerByTarget(target);
    if (targetOwnerIndex === -1 || targetOwnerIndex === playerIndex) continue;

    const targetOwner = gameState.players[targetOwnerIndex];
    if (!targetOwner || targetOwner.isDormantDead) continue;

    if (target === 25 && isBullShanghai(hits)) {
      return target;
    }

    if (target !== 25 && isStandardShanghai(hits)) {
      return target;
    }
  }

  return null;
}

function finishShanghaiWin(playerName) {
  gameState.shanghaiWinner = playerName;
  gameState.finalStats = buildStatsSummary();
  updateMessage(`${playerName} hit SHANGHAI!`, "#ffcc00");
  saveKillerHistory();
}

function canConsumeTurnEvents(amount) {
  return gameState.livesTakenThisTurn + amount <= 3;
}

function consumeTurnEvents(amount) {
  if (!canConsumeTurnEvents(amount)) return false;
  gameState.livesTakenThisTurn += amount;
  return true;
}

function dealSelfHit(player, damage) {
  ensureStats(player).selfHits += damage;
  player.lives = Math.max(0, player.lives - damage);

  if (player.lives <= 0) {
    startRedemski(gameState.currentPlayer);
    return true;
  }

  updateMessage(`${player.name} hits themselves for ${damage}!`, "#ff4c4c");
  return false;
}

function dealHitToVictim(attacker, victimIndex, hitType, damage) {
  const victim = gameState.players[victimIndex];
  if (!victim || !isPlayerActive(victim)) return false;

  if (victim.lives > damage) {
    victim.lives -= damage;
    ensureStats(attacker).totalKills += damage;
    updateMessage(`${attacker.name} hits ${victim.name} for ${damage}!`, "#ff4c4c");
    return false;
  }

  if (canKillWithHit(victim, hitType)) {
    victim.lives = 0;
    ensureStats(attacker).totalKills += damage;
    startRedemski(victimIndex);
    return true;
  }

  updateMessage(`${victim.name} is not in kill range for that hit.`, "#facc15");
  return false;
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
      target: null,
      hitType: null,
      lives: 6,
      isKiller: false,
      isZombie: false,
      isRedemski: false,
      redemskiCount: 0,
      isActive: true,
      isDormantDead: false,
      stats: {
        targetClaim: null,
        totalKills: 0,
        selfHits: 0,
        redemskis: 0,
        revives: 0,
        zombied: 0
      }
    })),

    phase: "NDH",
    currentPlayer: 0,
    redemskiPlayerIndex: null,

    dartsThrown: 0,
    currentTurnThrows: [],
    currentTurnHits: [],
    currentTurnHitsOnOwnTarget: [],
    currentTurnHitsByOpponentTarget: {},
    livesTakenThisTurn: 0,

    lastMessage: "",
    lastMessageColor: "#ffffff",
    lastMessageTimestamp: 0,

    winner: null,
    shanghaiWinner: null,
    finalStats: null,
    historySaved: false
  };

  history = [];
}

export function getState() {
  return gameState;
}

export function getStats() {
  return buildStatsSummary();
}

export function getCurrentTargetDisplay() {
  return getCurrentTargetText();
}

export function getCurrentDartDisplay() {
  const dartNumber = Math.min((gameState.dartsThrown || 0) + 1, 3);
  return `${dartNumber}/3`;
}

export function canCurrentPlayerThrow() {
  if (gameState.winner || gameState.shanghaiWinner) return false;
  if (gameState.phase !== "GAME") return false;

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return false;

  return (gameState.dartsThrown || 0) < 3;
}

export function getCurrentTargetOptions() {
  const player = gameState.players[gameState.currentPlayer];
  if (!player) return [];
  return getVisibleTargetNumbersForPlayer(gameState.currentPlayer);
}

/* -------------------------
   NDH ASSIGNMENT
--------------------------*/

export function submitNDHThrow(hitType, target = null) {
  if (gameState.phase !== "NDH") return;

  const playerIndex = gameState.currentPlayer;
  const player = gameState.players[playerIndex];

  if (!player || player.target) return;

  history.push(cloneState(gameState));

  let assignment;

  if (hitType === "greenBull" || hitType === "redBull") {
    assignment = {
      target: 25,
      hitType
    };
  } else {
    if (target === null || target < 1 || target > 20) return;

    assignment = {
      target,
      hitType
    };
  }

  const existingIndex = findPlayerByTarget(assignment.target);

  if (existingIndex === -1) {
    assignTargetToPlayer(playerIndex, assignment);

    const unassigned = getUnassignedPlayerIndexes();

    if (unassigned.length === 0) {
      gameState.phase = "READY";
      resetTurnTracking();
      updateMessage("All targets assigned. Review targets, then start the game.", "#facc15");
    } else {
      updateMessage(`${player.name} claims ${formatTarget(assignment.target, assignment.hitType)}. Tap Next Player.`, "#22c55e");
    }

    return;
  }

  if (existingIndex === playerIndex) {
    return;
  }

  const existingPlayer = gameState.players[existingIndex];
  const existingAssignment = {
    target: existingPlayer.target,
    hitType: existingPlayer.hitType
  };

  if (canOverride(existingAssignment, assignment)) {
    bumpPlayerOffTarget(existingIndex);
    assignTargetToPlayer(playerIndex, assignment);

    const unassigned = getUnassignedPlayerIndexes();

    if (unassigned.length === 0) {
      gameState.phase = "READY";
      resetTurnTracking();
      updateMessage("All targets assigned. Review targets, then start the game.", "#facc15");
    } else {
      updateMessage(
        `${player.name} takes ${formatTarget(assignment.target, assignment.hitType)} from ${existingPlayer.name}. Tap Next Player.`,
        "#facc15"
      );
    }

    return;
  }

  updateMessage(
    `${formatTarget(assignment.target, assignment.hitType)} is already locked. ${player.name} throws again.`,
    "#ff4c4c"
  );
}

/* -------------------------
   GAME PHASE
--------------------------*/

export function submitMiss() {
  if (gameState.winner || gameState.shanghaiWinner) return;

  if (gameState.phase !== "GAME") return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return;

  if ((gameState.dartsThrown || 0) >= 3) {
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
    return;
  }

  history.push(cloneState(gameState));

  gameState.currentTurnThrows.push({
    target: null,
    hitType: "miss"
  });

  gameState.dartsThrown = Math.min((gameState.dartsThrown || 0) + 1, 3);

  if (gameState.dartsThrown >= 3) {
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
    return;
  }

  updateMessage(`${player.name} missed.`, "#ffffff");
}

export function clearNDHTarget(playerIndex = gameState.currentPlayer) {
  if (gameState.phase !== "NDH" && gameState.phase !== "READY") return;

  const player = gameState.players[playerIndex];
  if (!player || !player.target) return;

  history.push(cloneState(gameState));

  bumpPlayerOffTarget(playerIndex);

  gameState.phase = "NDH";
  gameState.currentPlayer = playerIndex;
  resetTurnTracking();

  updateMessage(`${player.name}'s target was cleared. Enter a new target.`, "#facc15");
}

export function startGame() {
  if (gameState.phase !== "READY") return;

  const unassigned = getUnassignedPlayerIndexes();

  if (unassigned.length > 0) {
    gameState.phase = "NDH";
    gameState.currentPlayer = unassigned[0];
    updateMessage("Some players still need targets.", "#ff4c4c");
    return;
  }

  history.push(cloneState(gameState));

  gameState.phase = "GAME";
  gameState.currentPlayer = 0;
  resetTurnTracking();

  updateMessage("Killer begins!", "#22c55e");
}



export function submitGameThrow(hitType, target) {
  if (gameState.phase !== "GAME" || gameState.winner || gameState.shanghaiWinner) return;

  const playerIndex = gameState.currentPlayer;
  const player = gameState.players[playerIndex];
  if (!player || !isPlayerActive(player)) return;

  if ((gameState.dartsThrown || 0) >= 3) {
    gameState.dartsThrown = 3;
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
    return;
  }

  const hitValue = getHitValue(hitType);
  if (hitValue <= 0) return;

  const validTarget =
    target === 25 ||
    (typeof target === "number" && target >= 1 && target <= 20);

  if (!validTarget) return;

  const validHitType =
    isNumberHitType(hitType) ||
    isBullHitType(hitType);

  if (!validHitType) return;

  const isBullTarget = target === 25;

  if (isBullTarget && !isBullHitType(hitType)) return;
  if (!isBullTarget && !isNumberHitType(hitType)) return;

  history.push(cloneState(gameState));

  const assignment = { target, hitType };
  const hitOwnTarget = target === player.target;

  gameState.currentTurnThrows.push(assignment);
  gameState.dartsThrown = Math.min((gameState.dartsThrown || 0) + 1, 3);

  gameState.currentTurnHits.push(hitType);

  recordOpponentTargetHitForShanghai(playerIndex, hitType, target);

  const revivedZombieThisDart = checkZombieRevival(hitType, target, playerIndex);

  const shanghaiTarget = getShanghaiTargetForCurrentPlayer();

  if (shanghaiTarget != null) {
    finishShanghaiWin(player.name);
    return;
  }

  if (hitOwnTarget) {
    if (!player.isKiller && hitValue > 0) {
      if (!consumeTurnEvents(1)) {
        updateMessage(`${player.name} has already used 3 total turn events.`, "#facc15");
      } else {
        player.isKiller = true;
        updateMessage(`${player.name} is now a Killer! Tap Next Player or keep throwing.`, "#22c55e");
      }
    } else if (player.isKiller && hitValue > 0) {
      const damage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);

      if (damage <= 0) {
        updateMessage(`${player.name} has already used 3 total turn events.`, "#facc15");
      } else {
        consumeTurnEvents(damage);
        const endedTurn = dealSelfHit(player, damage);
        if (endedTurn) return;
      }
    }
  } else if (player.isKiller && hitValue > 0 && !revivedZombieThisDart) {
    const victimIndex = findPlayerByTarget(target);

    if (victimIndex !== -1) {
      const victim = gameState.players[victimIndex];

      if (victim && isPlayerActive(victim)) {
        const damage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);

        if (damage <= 0) {
          updateMessage(`${player.name} has already used 3 total turn events.`, "#facc15");
        } else {
          consumeTurnEvents(damage);
          const endedTurn = dealHitToVictim(player, victimIndex, hitType, damage);
          if (endedTurn) return;
        }
      }
    }
  }

  if (maybeDeclareWinner()) return;

  if (gameState.dartsThrown >= 3) {
    gameState.dartsThrown = 3;
    updateMessage(`${player.name}'s turn is complete. Tap Next Player.`, "#facc15");
  }
}

/* -------------------------
   REDEMSKI PHASE
--------------------------*/

export function submitRedemskiThrow(hitType, target) {
  if (gameState.phase !== "REDEMSKI" || gameState.winner || gameState.shanghaiWinner) return;

  const player = gameState.players[gameState.redemskiPlayerIndex];
  if (!player) return;

  history.push(cloneState(gameState));

  gameState.currentTurnThrows.push({ target, hitType });
  gameState.dartsThrown++;

  const correctTarget = target === player.target;
  const validReviveHit =
    correctTarget &&
    (
      hitType === "double" ||
      hitType === "triple" ||
      (player.target === 25 && (hitType === "redBull" || hitType === "greenBull"))
    );

  if (validReviveHit) {
    finishSuccessfulRedemski();
    return;
  }

  if (gameState.dartsThrown >= 3) {
    finishFailedRedemski();
  }
}

export function nextPlayer() {
  if (gameState.winner || gameState.shanghaiWinner) return;

  history.push(cloneState(gameState));

  if (gameState.phase === "NDH") {
    advanceNDHTurn();
    return;
  }

  if (gameState.phase === "READY") {
    startGame();
    return;
  }

  if (gameState.phase === "GAME") {
    advanceTurn();
    return;
  }

  if (gameState.phase === "REDEMSKI") {
    finishFailedRedemski();
  }
}

export function endGameEarly() {
  if (gameState.winner || gameState.shanghaiWinner) return;

  history.push(cloneState(gameState));

  const activePlayers = getActivePlayers();
  if (activePlayers.length > 0) {
    const leader = [...activePlayers].sort((a, b) => b.lives - a.lives)[0];
    gameState.winner = leader.name;
  } else {
    gameState.winner = "No Winner";
  }

  gameState.finalStats = buildStatsSummary();
  updateMessage("Game ended early.", "#facc15");
  saveKillerHistory();
}

/* -------------------------
   SHARED ACTIONS
--------------------------*/

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner || !!gameState.shanghaiWinner;
}
