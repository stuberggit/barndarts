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
    currentPlayer: 0,
    currentTurnHits: [],
    dartsThrown: 0,
    shanghaiWinner: null
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
  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];

  // Track hit type (1 = single, 2 = double, 3 = triple)
  if (score >= 1 && score <= 3) {
    gameState.currentTurnHits.push(score);
  }

  player.scores[gameState.currentHole] =
    (player.scores[gameState.currentHole] || 0) + score;

  player.total += score;

  gameState.dartsThrown++;

  // 🔥 Check Shanghai after each dart
  if (checkShanghai()) {
    gameState.shanghaiWinner = player.name;
    return;
  }

  // After 3 darts → next player
  if (gameState.dartsThrown >= 3) {
    gameState.dartsThrown = 0;
    gameState.currentTurnHits = [];

    gameState.currentPlayer++;

    if (gameState.currentPlayer >= gameState.players.length) {
      gameState.currentPlayer = 0;
      gameState.currentHole++;
    }
  }
}

export function undo() {
  console.log("UNDO CLICKED");
  
  if (history.length === 0) return;

  gameState = history.pop();
}

function checkShanghai() {
  const hits = gameState.currentTurnHits;

  return (
    hits.includes(1) &&
    hits.includes(2) &&
    hits.includes(3)
  );
}

export function isGameOver() {
  return gameState.currentHole >= 18 || gameState.shanghaiWinner;
}
