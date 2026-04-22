let gameState = {};
let history = [];

/* -------------------------
   HELPERS
--------------------------*/

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

const COLOR_ORDER = ["Black", "White", "Green", "Red"];

function getCurrentTargetColor(progress) {
  return COLOR_ORDER[progress] || null;
}

function advanceTurn() {
  gameState.dartsThrown = 0;

  gameState.currentPlayer++;

  if (gameState.currentPlayer >= gameState.players.length) {
    gameState.currentPlayer = 0;
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
      progress: 0 // 0=Black, 1=White, 2=Green, 3=Red, 4=Finished
    })),

    currentPlayer: 0,
    dartsThrown: 0,

    lastMessage: "",
    lastMessageColor: "#ffffff",
    lastMessageTimestamp: 0,

    winner: null
  };

  history = [];
}

export function getState() {
  return gameState;
}

/* -------------------------
   GAME ACTIONS
--------------------------*/

export function advancePlayer(colorClicked) {
  if (gameState.winner) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  const targetColor = getCurrentTargetColor(player.progress);

  if (!targetColor) return;

  if (colorClicked !== targetColor) {
    return;
  }

  player.progress = Math.min(player.progress + 1, 4);
  gameState.dartsThrown++;

  if (player.progress >= 4) {
    gameState.winner = player.name;
    gameState.lastMessage = `${player.name} wins!`;
    gameState.lastMessageColor = "#22c55e";
    gameState.lastMessageTimestamp = Date.now();
    return;
  }

  const nextColor = getCurrentTargetColor(player.progress);

  gameState.lastMessage = `${player.name} advances to ${nextColor}!`;
  gameState.lastMessageColor = "#22c55e";
  gameState.lastMessageTimestamp = Date.now();

  if (gameState.dartsThrown >= 3) {
    advanceTurn();
  }
}

export function missBoard() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  player.progress = 0;
  gameState.dartsThrown = 3;

  gameState.lastMessage = `${player.name} resets to Black!`;
  gameState.lastMessageColor = "#ff4c4c";
  gameState.lastMessageTimestamp = Date.now();

  advanceTurn();
}

export function partyJump() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  player.progress = 3; // needs Red next
  gameState.dartsThrown++;

  gameState.lastMessage = `${player.name} PARTY! Jump to Red!`;
  gameState.lastMessageColor = "#a855f7";
  gameState.lastMessageTimestamp = Date.now();

  if (gameState.dartsThrown >= 3) {
    advanceTurn();
  }
}

export function acdcJump() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));

  const player = gameState.players[gameState.currentPlayer];
  player.progress = 0;
  gameState.dartsThrown++;

  gameState.lastMessage = `${player.name} AC/DC! Back to Black!`;
  gameState.lastMessageColor = "#facc15";
  gameState.lastMessageTimestamp = Date.now();

  if (gameState.dartsThrown >= 3) {
    advanceTurn();
  }
}

export function nextPlayer() {
  if (gameState.winner) return;

  history.push(cloneState(gameState));
  advanceTurn();
}

export function undo() {
  if (!history.length) return;
  gameState = history.pop();
}

export function isGameOver() {
  return !!gameState.winner;
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
