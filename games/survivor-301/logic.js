// Survivor 301 - logic.js

const STARTING_SCORE = 301;
const RED_BULL_BONUS = 10;
const MAX_DARTS_PER_TURN = 3;

const DART_TYPES = {
  MISS: "miss",
  SINGLE: "single",
  DOUBLE: "double",
  TRIPLE: "triple",
  GREEN_BULL: "greenBull",
  RED_BULL: "redBull"
};

let state = createEmptyState();
const listeners = new Set();

function createEmptyState() {
  return {
    gameStarted: false,
    gameOver: false,
    winnerId: null,
    currentPlayerIndex: 0,
    turnNumber: 1,
    players: [],
    turnDarts: [],
    history: [],
    playerOrderSeed: []
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitChange() {
  const snapshot = getState();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error("Survivor 301 listener error:", err);
    }
  });
}

function normalizePlayers(players) {
  if (!Array.isArray(players)) return [];

  return players
    .map((player, index) => {
      const name =
        typeof player === "string"
          ? player.trim()
          : typeof player?.name === "string"
          ? player.name.trim()
          : `Player ${index + 1}`;

      return {
        id: `p${index + 1}`,
        name: name || `Player ${index + 1}`,
        score: STARTING_SCORE,
        eliminated: false,
        eliminatedOnTurn: null,
        eliminatedPlace: null,
        stats: {
          turnsTaken: 0,
          dartsThrown: 0,
          misses: 0,
          singles: 0,
          doubles: 0,
          triples: 0,
          greenBulls: 0,
          redBulls: 0,
          pointsLost: 0,
          pointsGained: 0
        }
      };
    })
    .filter(Boolean);
}

function getLivingPlayers(players = state.players) {
  return players.filter((player) => !player.eliminated);
}

function getPlayerById(playerId) {
  return state.players.find((player) => player.id === playerId) || null;
}

function getCurrentPlayer() {
  if (!state.players.length) return null;
  return state.players[state.currentPlayerIndex] || null;
}

function getNextLivingPlayerIndex(fromIndex = state.currentPlayerIndex) {
  if (!state.players.length) return -1;

  for (let step = 1; step <= state.players.length; step += 1) {
    const nextIndex = (fromIndex + step) % state.players.length;
    if (!state.players[nextIndex].eliminated) {
      return nextIndex;
    }
  }

  return -1;
}

function getEliminationCount() {
  return state.players.filter((player) => player.eliminated).length;
}

function computeMultiplier(type) {
  switch (type) {
    case DART_TYPES.SINGLE:
      return 1;
    case DART_TYPES.DOUBLE:
      return 2;
    case DART_TYPES.TRIPLE:
      return 3;
    default:
      return 0;
  }
}

function isNumberType(type) {
  return (
    type === DART_TYPES.SINGLE ||
    type === DART_TYPES.DOUBLE ||
    type === DART_TYPES.TRIPLE
  );
}

function isBullType(type) {
  return type === DART_TYPES.GREEN_BULL || type === DART_TYPES.RED_BULL;
}

function isValidNumber(number) {
  return Number.isInteger(number) && number >= 1 && number <= 20;
}

function resolveDart(scoreBefore, type, number = null) {
  let scoreAfter = scoreBefore;
  let label = "";
  let amount = 0;
  let pointsLost = 0;
  let pointsGained = 0;

  if (type === DART_TYPES.MISS) {
    label = "Miss";
    scoreAfter = scoreBefore;
  } else if (type === DART_TYPES.GREEN_BULL) {
    label = "Green Bull";
    scoreAfter = scoreBefore;
  } else if (type === DART_TYPES.RED_BULL) {
    label = "Red Bull";
    scoreAfter = scoreBefore + RED_BULL_BONUS;
    pointsGained = RED_BULL_BONUS;
  } else if (isNumberType(type)) {
    const multiplier = computeMultiplier(type);
    amount = number * multiplier;
    pointsLost = amount;
    scoreAfter = scoreBefore - amount;

    if (type === DART_TYPES.SINGLE) label = `Single ${number}`;
    if (type === DART_TYPES.DOUBLE) label = `Double ${number}`;
    if (type === DART_TYPES.TRIPLE) label = `Triple ${number}`;
  }

  return {
    type,
    number,
    label,
    amount,
    scoreBefore,
    scoreAfter,
    pointsLost,
    pointsGained,
    eliminated: scoreAfter <= 0
  };
}

function applyStatsForDart(stats, dart) {
  stats.dartsThrown += 1;

  switch (dart.type) {
    case DART_TYPES.MISS:
      stats.misses += 1;
      break;
    case DART_TYPES.SINGLE:
      stats.singles += 1;
      break;
    case DART_TYPES.DOUBLE:
      stats.doubles += 1;
      break;
    case DART_TYPES.TRIPLE:
      stats.triples += 1;
      break;
    case DART_TYPES.GREEN_BULL:
      stats.greenBulls += 1;
      break;
    case DART_TYPES.RED_BULL:
      stats.redBulls += 1;
      break;
    default:
      break;
  }

  stats.pointsLost += dart.pointsLost;
  stats.pointsGained += dart.pointsGained;
}

function buildCommittedTurn(player, darts) {
  const scoreBeforeTurn = player.score;
  const scoreAfterTurn =
    darts.length > 0 ? darts[darts.length - 1].scoreAfter : player.score;
  const eliminated = darts.some((dart) => dart.eliminated);

  return {
    playerId: player.id,
    playerName: player.name,
    turnNumber: state.turnNumber,
    scoreBeforeTurn,
    scoreAfterTurn,
    eliminated,
    darts: clone(darts)
  };
}

function checkForWinner() {
  const livingPlayers = getLivingPlayers();

  if (livingPlayers.length === 1) {
    state.gameOver = true;
    state.winnerId = livingPlayers[0].id;
    return livingPlayers[0];
  }

  if (livingPlayers.length === 0) {
    state.gameOver = true;
    state.winnerId = null;
    return null;
  }

  return null;
}

function advanceTurn() {
  if (state.gameOver) return;

  const nextIndex = getNextLivingPlayerIndex(state.currentPlayerIndex);

  if (nextIndex === -1) {
    checkForWinner();
    return;
  }

  const wrapped = nextIndex <= state.currentPlayerIndex;
  state.currentPlayerIndex = nextIndex;

  if (wrapped) {
    state.turnNumber += 1;
  }
}

export function initGame(players) {
  const normalizedPlayers = normalizePlayers(players);

  state = createEmptyState();
  state.players = normalizedPlayers;
  state.playerOrderSeed = normalizedPlayers.map((player) => player.name);
  state.gameStarted = normalizedPlayers.length >= 2;
  state.currentPlayerIndex = 0;

  emitChange();
}

export function subscribe(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getState() {
  return clone({
    ...state,
    currentPlayer: getCurrentPlayer(),
    winner: state.winnerId ? getPlayerById(state.winnerId) : null,
    livingPlayers: getLivingPlayers()
  });
}

export function getPlayers() {
  return clone(state.players);
}

export function getCurrentPlayerId() {
  return getCurrentPlayer()?.id || null;
}

export function getCurrentPlayerName() {
  return getCurrentPlayer()?.name || "";
}

export function getTurnDarts() {
  return clone(state.turnDarts);
}

export function getWinner() {
  return state.winnerId ? clone(getPlayerById(state.winnerId)) : null;
}

export function isGameStarted() {
  return state.gameStarted;
}

export function isGameOver() {
  return state.gameOver;
}

export function canUndo() {
  return state.history.length > 0;
}

export function canSubmitTurn() {
  if (!state.gameStarted || state.gameOver) return false;
  return state.turnDarts.length > 0;
}

export function canThrowDart() {
  if (!state.gameStarted || state.gameOver) return false;

  const currentPlayer = getCurrentPlayer();
  if (!currentPlayer || currentPlayer.eliminated) return false;

  if (state.turnDarts.length >= MAX_DARTS_PER_TURN) return false;
  if (state.turnDarts.some((dart) => dart.eliminated)) return false;

  return true;
}

export function getTurnPreviewScore() {
  const currentPlayer = getCurrentPlayer();
  if (!currentPlayer) return null;

  if (state.turnDarts.length === 0) {
    return currentPlayer.score;
  }

  return state.turnDarts[state.turnDarts.length - 1].scoreAfter;
}

export function getTurnSummary() {
  const currentPlayer = getCurrentPlayer();

  return {
    currentPlayer: currentPlayer ? clone(currentPlayer) : null,
    darts: clone(state.turnDarts),
    previewScore: getTurnPreviewScore(),
    canThrow: canThrowDart(),
    canSubmit: canSubmitTurn()
  };
}

export function addDart(type, number = null) {
  if (!canThrowDart()) return getState();

  if (!Object.values(DART_TYPES).includes(type)) {
    return getState();
  }

  if (isNumberType(type) && !isValidNumber(number)) {
    return getState();
  }

  if (!isNumberType(type)) {
    number = null;
  }

  const currentPlayer = getCurrentPlayer();
  if (!currentPlayer) return getState();

  const scoreBefore =
    state.turnDarts.length > 0
      ? state.turnDarts[state.turnDarts.length - 1].scoreAfter
      : currentPlayer.score;

  const resolved = resolveDart(scoreBefore, type, number);
  state.turnDarts.push(resolved);

  emitChange();
  return getState();
}

export function removeLastDart() {
  if (!state.turnDarts.length || state.gameOver) return getState();

  state.turnDarts.pop();
  emitChange();
  return getState();
}

export function clearTurnDarts() {
  if (state.gameOver) return getState();

  state.turnDarts = [];
  emitChange();
  return getState();
}

export function submitTurn() {
  if (!canSubmitTurn()) return getState();

  const currentPlayer = getCurrentPlayer();
  if (!currentPlayer) return getState();

  const committedTurn = buildCommittedTurn(currentPlayer, state.turnDarts);

  state.history.push({
    snapshotBefore: clone(state),
    committedTurn: clone(committedTurn)
  });

  currentPlayer.score = committedTurn.scoreAfterTurn;
  currentPlayer.stats.turnsTaken += 1;

  committedTurn.darts.forEach((dart) => {
    applyStatsForDart(currentPlayer.stats, dart);
  });

  if (committedTurn.eliminated) {
    currentPlayer.eliminated = true;
    currentPlayer.eliminatedOnTurn = committedTurn.turnNumber;
    currentPlayer.eliminatedPlace = state.players.length - getEliminationCount();
  }

  state.turnDarts = [];

  const winner = checkForWinner();

  if (!winner && !state.gameOver) {
    advanceTurn();
  }

  emitChange();
  return getState();
}

export function undoLastTurn() {
  if (!state.history.length) return getState();

  const lastEntry = state.history.pop();
  state = clone(lastEntry.snapshotBefore);

  emitChange();
  return getState();
}

export function restartGame() {
  const playerNames =
    state.playerOrderSeed.length > 0
      ? [...state.playerOrderSeed]
      : state.players.map((player) => player.name);

  initGame(playerNames);
  return getState();
}

export function rotatePlayersForNewGame() {
  const source =
    state.playerOrderSeed.length > 0
      ? [...state.playerOrderSeed]
      : state.players.map((player) => player.name);

  if (source.length <= 1) {
    initGame(source);
    return getState();
  }

  const rotated = source.slice(1).concat(source[0]);
  initGame(rotated);
  state.playerOrderSeed = rotated;

  emitChange();
  return getState();
}

export function getScoreboard() {
  return clone(
    state.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      eliminated: player.eliminated,
      isCurrent: player.id === getCurrentPlayerId(),
      eliminatedPlace: player.eliminatedPlace
    }))
  );
}

export function getHistory() {
  return clone(state.history.map((entry) => entry.committedTurn));
}

export function getConstants() {
  return {
    STARTING_SCORE,
    RED_BULL_BONUS,
    MAX_DARTS_PER_TURN,
    DART_TYPES
  };
}

export { DART_TYPES };
