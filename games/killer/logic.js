let gameState = {};
let history = [];

/* -------------------------
   HELPERS
--------------------------*/

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getUnassignedPlayerIndexes() {
  return gameState.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.target)
    .map(({ index }) => index);
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
    greenBull: 1,
    redBull: 2
  };

  return values[hitType] || 0;
}

function formatTarget(target, hitType) {
  if (target === 25) {
    return hitType === "redBull" ? "Red Bull" : "Green Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labelMap[hitType]} ${target}`;
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

  if (!isNumberHitType(existingAssignment.hitType) || !isNumberHitType(incomingAssignment.hitType)) {
    return false;
  }

  return getNumberRank(incomingAssignment.hitType) > getNumberRank(existingAssignment.hitType);
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

function updateMessage(message, color) {
  gameState.lastMessage = message;
  gameState.lastMessageColor = color;
  gameState.lastMessageTimestamp = Date.now();
}

function resetTurnTracking() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.currentTurnHits = [];
  gameState.currentTurnHitsOnOwnTarget = [];
  gameState.livesTakenThisTurn = 0;
}

function maybeDeclareWinner() {
  const activePlayers = getActivePlayers();

  if (activePlayers.length === 1) {
    gameState.winner = activePlayers[0].name;
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
  } while (!isPlayerActive(gameState.players[gameState.currentPlayer]) && attempts <= gameState.players.length);

  maybeDeclareWinner();
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
}

function maybeAdvancePhase() {
  const unassigned = getUnassignedPlayerIndexes();

  if (unassigned.length === 0) {
    gameState.phase = "GAME";
    gameState.currentPlayer = 0;
    resetTurnTracking();
    updateMessage("NDH complete. Killer begins!", "#22c55e");
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
    if (hitType === "triple") return true;

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
    if (hitType === "double" || hitType === "triple") return true;

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

function reviveZombie(playerIndex) {
  const player = gameState.players[playerIndex];
  if (!player) return false;
  if (!player.isDormantDead) return false;

  player.lives = 1;
  player.isActive = true;
  player.isDormantDead = false;
  player.isZombie = true;
  player.isKiller = true;
  player.isRedemski = false;

  updateMessage(`${player.name} is zombied back in with 1 life and Killer status!`, "#f97316");
  return true;
}

function checkZombieRevival(hitType, target) {
  if (target == null) return;
  if (hitType !== "double" && hitType !== "triple" && hitType !== "redBull") return;

  const dormantPlayerIndex = gameState.players.findIndex(player => {
    return player.isDormantDead && player.target === target;
  });

  if (dormantPlayerIndex === -1) return false;

  return reviveZombie(dormantPlayerIndex);
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

  gameState.phase = "GAME";
  gameState.redemskiPlayerIndex = null;

  updateMessage(`${player.name} survives Redemski! Back with 1 life.`, "#22c55e");
  advanceTurn();
}

/* -------------------------
   INIT / STATE
--------------------------*/

export function initGame(players) {
  gameState = {
    originalPlayers: [...players],

    players: players.map(name => ({
      name,
      target: null,
      hitType: null,
      lives: 6,
      isKiller: false,
      isZombie: false,
      isRedemski: false,
      isActive: true,
      isDormantDead: false
    })),

    phase: "NDH", // NDH | GAME | REDEMSKI
    currentPlayer: 0,
    redemskiPlayerIndex: null,

    dartsThrown: 0,
    currentTurnThrows: [],
    currentTurnHits: [],
    currentTurnHitsOnOwnTarget: [],
    livesTakenThisTurn: 0,

    lastMessage: "",
    lastMessageColor: "#ffffff",
    lastMessageTimestamp: 0,

    winner: null,
    shanghaiWinner: null
  };

  history = [];
}

export function getState() {
  return gameState;
}

/* -------------------------
   NDH ASSIGNMENT
--------------------------*/

export function submitNDHThrow(hitType, target = null) {
  if (gameState.phase !== "NDH") return;

  history.push(cloneState(gameState));

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

  const existingIndex = findPlayerByTarget(assignment.target);

  if (existingIndex === -1) {
    assignTargetToPlayer(playerIndex, assignment);
    maybeAdvancePhase();
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
    updateMessage(`${player.name} takes ${formatTarget(assignment.target, assignment.hitType)} from ${existingPlayer.name}!`, "#facc15");
    maybeAdvancePhase();
    return;
  }

  updateMessage(`${formatTarget(assignment.target, assignment.hitType)} is already locked. ${player.name} throws again.`, "#ff4c4c");
}

/* -------------------------
   GAME PHASE
--------------------------*/

export function submitGameThrow(hitType, target) {
  if (gameState.phase !== "GAME" || gameState.winner || gameState.shanghaiWinner) return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !isPlayerActive(player)) return;

  history.push(cloneState(gameState));

  const assignment = { target, hitType };
  const hitValue = getHitValue(hitType);
  const hitOwnTarget = target === player.target;

  gameState.currentTurnThrows.push(assignment);
  gameState.dartsThrown++;

  if (isNumberHitType(hitType)) {
    gameState.currentTurnHits.push(hitType);
  }

  if (
    hitOwnTarget &&
    (
      isNumberHitType(hitType) ||
      (player.target === 25 && isBullHitType(hitType))
    )
  ) {
    if (player.target === 25) {
      if (hitType === "greenBull") {
        gameState.currentTurnHitsOnOwnTarget.push("single");
      } else if (hitType === "redBull") {
        gameState.currentTurnHitsOnOwnTarget.push("double");
      }
    } else if (isNumberHitType(hitType)) {
      gameState.currentTurnHitsOnOwnTarget.push(hitType);
    }
  }

    // Zombie revival can happen on any active player's Dub/Trip hit to a dormant player's target.
  // If a dormant player is revived, that same dart should NOT also damage them or trigger Redemski.
  const revivedZombieThisDart = checkZombieRevival(hitType, target);

  // Shanghai only after Killer earned, and only on own target
  if (
    player.isKiller &&
    gameState.currentTurnHitsOnOwnTarget.includes("single") &&
    gameState.currentTurnHitsOnOwnTarget.includes("double") &&
    gameState.currentTurnHitsOnOwnTarget.includes("triple")
  ) {
    gameState.shanghaiWinner = player.name;
    updateMessage(`${player.name} hit SHANGHAI!`, "#ffcc00");
    return;
  }

  // Hitting own target
  if (hitOwnTarget) {
    if (!player.isKiller && hitValue > 0) {
      player.isKiller = true;
      updateMessage(`${player.name} is now a Killer!`, "#22c55e");
      } else if (
    player.isKiller &&
    hitValue > 0 &&
    gameState.livesTakenThisTurn < 3 &&
    !revivedZombieThisDart
  ) {
      const damage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);
      player.lives = Math.max(0, player.lives - damage);
      gameState.livesTakenThisTurn += damage;

      if (player.lives <= 0) {
        startRedemski(gameState.currentPlayer);
        return;
      } else {
        updateMessage(`${player.name} hits themselves for ${damage}!`, "#ff4c4c");
      }
    }
  } else if (player.isKiller && hitValue > 0 && gameState.livesTakenThisTurn < 3) {
    const victimIndex = findPlayerByTarget(target);

    if (victimIndex !== -1) {
      const victim = gameState.players[victimIndex];

      if (victim && isPlayerActive(victim)) {
        const potentialDamage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);

        if (victim.lives > potentialDamage) {
          victim.lives -= potentialDamage;
          gameState.livesTakenThisTurn += potentialDamage;
          updateMessage(`${player.name} hits ${victim.name} for ${potentialDamage}!`, "#ff4c4c");
        } else {
          if (canKillWithHit(victim, hitType)) {
            gameState.livesTakenThisTurn += potentialDamage;
            victim.lives = 0;
            startRedemski(victimIndex);
            return;
          } else {
            updateMessage(`${victim.name} is not in kill range for that hit.`, "#facc15");
          }
        }
      }
    }
  }

  if (maybeDeclareWinner()) return;

  if (gameState.dartsThrown >= 3) {
    advanceTurn();
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
      (player.target === 25 && hitType === "redBull")
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

  if (gameState.phase === "GAME") {
    advanceTurn();
    return;
  }

  if (gameState.phase === "REDEMSKI") {
    finishFailedRedemski();
  }
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
