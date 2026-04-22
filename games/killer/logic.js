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

function autoUnlocksKiller(hitType) {
  return (
    hitType === "double" ||
    hitType === "triple" ||
    hitType === "greenBull" ||
    hitType === "redBull"
  );
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

function assignTargetToPlayer(playerIndex, assignment) {
  const player = gameState.players[playerIndex];

  player.target = assignment.target;
  player.hitType = assignment.hitType;
  player.isKiller = autoUnlocksKiller(assignment.hitType);

  gameState.lastMessage = `${player.name} claims ${formatTarget(assignment.target, assignment.hitType)}!`;
  gameState.lastMessageColor = "#22c55e";
  gameState.lastMessageTimestamp = Date.now();
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
    gameState.lastMessage = "NDH complete. Killer begins!";
    gameState.lastMessageColor = "#22c55e";
    gameState.lastMessageTimestamp = Date.now();
  } else {
    gameState.currentPlayer = unassigned[0];
  }
}

function getActivePlayers() {
  return gameState.players.filter(player => player.isActive);
}

function advanceTurn() {
  gameState.dartsThrown = 0;
  gameState.currentTurnThrows = [];
  gameState.currentTurnHits = [];
  gameState.livesTakenThisTurn = 0;

  let attempts = 0;
  do {
    gameState.currentPlayer++;
    if (gameState.currentPlayer >= gameState.players.length) {
      gameState.currentPlayer = 0;
    }
    attempts++;
  } while (!gameState.players[gameState.currentPlayer].isActive && attempts <= gameState.players.length);

  const activePlayers = getActivePlayers();
  if (activePlayers.length === 1) {
    gameState.winner = activePlayers[0].name;
  }
}

function updateMessage(message, color) {
  gameState.lastMessage = message;
  gameState.lastMessageColor = color;
  gameState.lastMessageTimestamp = Date.now();
}

function maybeEliminatePlayer(player) {
  if (player.lives <= 0) {
    player.isActive = false;
  }
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
      isActive: true
    })),

    phase: "NDH",
    currentPlayer: 0,

    dartsThrown: 0,
    currentTurnThrows: [],
    currentTurnHits: [],
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

    gameState.lastMessage = `${player.name} takes ${formatTarget(assignment.target, assignment.hitType)} from ${existingPlayer.name}!`;
    gameState.lastMessageColor = "#facc15";
    gameState.lastMessageTimestamp = Date.now();

    maybeAdvancePhase();
    return;
  }

  gameState.lastMessage = `${formatTarget(assignment.target, assignment.hitType)} is already locked. ${player.name} throws again.`;
  gameState.lastMessageColor = "#ff4c4c";
  gameState.lastMessageTimestamp = Date.now();
}

/* -------------------------
   GAME PHASE
--------------------------*/

export function submitGameThrow(hitType, target) {
  if (gameState.phase !== "GAME" || gameState.winner || gameState.shanghaiWinner) return;

  const player = gameState.players[gameState.currentPlayer];
  if (!player || !player.isActive) return;

  history.push(cloneState(gameState));

  const assignment = { target, hitType };
  const hitValue = getHitValue(hitType);

  gameState.currentTurnThrows.push(assignment);
  gameState.dartsThrown++;

  if (isNumberHitType(hitType)) {
    gameState.currentTurnHits.push(hitType);
  }

  // Shanghai only after killer status has been earned
  if (
    player.isKiller &&
    gameState.currentTurnHits.includes("single") &&
    gameState.currentTurnHits.includes("double") &&
    gameState.currentTurnHits.includes("triple")
  ) {
    gameState.shanghaiWinner = player.name;
    updateMessage(`${player.name} hit SHANGHAI!`, "#ffcc00");
    return;
  }

  // Hitting own target
  if (target === player.target) {
    if (!player.isKiller && hitValue > 0) {
      player.isKiller = true;
      updateMessage(`${player.name} is now a Killer!`, "#22c55e");
    } else if (player.isKiller && hitValue > 0 && gameState.livesTakenThisTurn < 3) {
      const damage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);
      player.lives = Math.max(0, player.lives - damage);
      gameState.livesTakenThisTurn += damage;

      if (player.lives <= 0) {
        maybeEliminatePlayer(player);
        updateMessage(`${player.name} kills themselves!`, "#ff4c4c");
      } else {
        updateMessage(`${player.name} hits themselves for ${damage}!`, "#ff4c4c");
      }
    }
  } else if (player.isKiller && hitValue > 0 && gameState.livesTakenThisTurn < 3) {
    // Attack others only after killer unlocked
    const victimIndex = findPlayerByTarget(target);

    if (victimIndex !== -1) {
      const victim = gameState.players[victimIndex];

      if (victim && victim.isActive) {
        const damage = Math.min(hitValue, 3 - gameState.livesTakenThisTurn);

        victim.lives = Math.max(0, victim.lives - damage);
        gameState.livesTakenThisTurn += damage;

        if (victim.lives <= 0) {
          maybeEliminatePlayer(victim);
          updateMessage(`${player.name} kills ${victim.name}!`, "#ff4c4c");
        } else {
          updateMessage(`${player.name} hits ${victim.name} for ${damage}!`, "#ff4c4c");
        }
      }
    }
  }

  const activePlayers = getActivePlayers();
  if (activePlayers.length === 1) {
    gameState.winner = activePlayers[0].name;
    return;
  }

  if (gameState.dartsThrown >= 3) {
    advanceTurn();
  }
}

export function nextPlayer() {
  if (gameState.phase !== "GAME" || gameState.winner || gameState.shanghaiWinner) return;

  history.push(cloneState(gameState));
  advanceTurn();
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
