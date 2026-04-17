let gameState = {};

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
}

export function getState() {
  return gameState;
}

export function recordScore(score) {
  const player = gameState.players[gameState.currentPlayer];

  player.scores[gameState.currentHole] = score;
  player.total += score;

  // Move to next player
  gameState.currentPlayer++;

  // If all players have gone, move to next hole
  if (gameState.currentPlayer >= gameState.players.length) {
    gameState.currentPlayer = 0;
    gameState.currentHole++;
  }
}

export function isGameOver() {
  return gameState.currentHole >= 18;
}
