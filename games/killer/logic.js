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

function getNextUnassignedPlayerIndex() {
  const unassigned = getUnassignedPlayerIndexes();
  return unassigned.length ? unassigned[0] : -1;
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

function formatTarget(target, hitType) {
  if (target === 25) {
    return hitType === "redBull" ? "Red Bull" : "Green Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Double",
    triple: "Triple"
  };

  return `${labelMap[hitType]} ${target}`;
}

function canOverride(existingAssignment, incomingAssignment) {
  if (!existingAssignment) return true;
  if (existingAssignment.target !== incomingAssignment.target) return false;

  // Bull override rules
  if (existingAssignment.target === 25) {
    return (
      existingAssignment.hitType === "greenBull" &&
      incomingAssignment.hitType === "redBull"
    );
  }

  // Number override rules
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
   SHARED ACTIONS
--------------------------*/

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner || !!gameState.shanghaiWinner;
}
