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
    currentTurnHits: []
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

  // Track hit type (simple version)
  // 1 = single, 2 = double, 3 = triple, 4/5 = misses/over
  if (score >= 1 && score <= 3) {
    gameState.currentTurnHits.push(score);
  }

  player.scores[gameState.currentHole] = score;
  player.total += score;

  // 🔥 Check Shanghai BEFORE advancing
  if (checkShanghai()) {
    gameState.shanghaiWinner = player.name;
    return;
  }

  // Move to next player
  gameState.currentPlayer++;

  // Reset turn hits when player changes
  if (gameState.currentPlayer >= gameState.players.length) {
    gameState.currentPlayer = 0;
    gameState.currentHole++;
  }

  gameState.currentTurnHits = [];
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
