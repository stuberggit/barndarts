let gameState = {};
let history = [];

export function initGame(players) {
  gameState = {
    players: players.map(name => ({
      name,
      scores: Array(18).fill(null),
      total: 0
    })),
    currentHole: 0,
    currentPlayer: 0
  };

  history = [];
}

export function getState() {
  return gameState;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function recordScore(score) {
  // Save snapshot BEFORE change
  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];

  player.scores[gameState.currentHole] = score;
  player.total += score;

  gameState.currentPlayer++;

  if (gameState.currentPlayer >= gameState.players.length) {
    gameState.currentPlayer = 0;
    gameState.currentHole++;
  }
}

export function undo() {
  if (history.length === 0) return;

  gameState = history.pop();
}

export function isGameOver() {
  return gameState.currentHole >= 18;
}
