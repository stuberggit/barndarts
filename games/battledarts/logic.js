let gameState = {};
let history = [];

/* -------------------------
   CONSTANTS
--------------------------*/

const MODES = {
  "1v1": {
    id: "1v1",
    label: "1v1",
    numTeams: 2,
    playersPerTeam: 1,
    shipsPerTeam: 3
  },
  "2v2": {
    id: "2v2",
    label: "2v2",
    numTeams: 2,
    playersPerTeam: 2,
    shipsPerTeam: 4
  },
  "3v3": {
    id: "3v3",
    label: "3v3",
    numTeams: 2,
    playersPerTeam: 3,
    shipsPerTeam: 6
  },
  "1v1v1": {
    id: "1v1v1",
    label: "1v1v1",
    numTeams: 3,
    playersPerTeam: 1,
    shipsPerTeam: 3
  }
};

const TEAM_COLORS = ["#facc15", "#22d3ee", "#fb923c"];

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

function updateMessage(message, color = "#ffffff") {
  gameState.lastMessage = message;
  gameState.lastMessageColor = color;
  gameState.lastMessageTimestamp = Date.now();
}

function saveHistory() {
  history.push(cloneState(gameState));
}

function getModeConfig(modeId) {
  return MODES[modeId] || null;
}

function getRequiredPlayerCount(modeId) {
  const mode = getModeConfig(modeId);
  if (!mode) return 0;
  return mode.numTeams * mode.playersPerTeam;
}

function getCurrentSetupTeam() {
  return gameState.teams?.[gameState.setupTeamIndex] || null;
}

function getCurrentTeam() {
  return gameState.teams?.[gameState.currentTeamIndex] || null;
}

function formatTarget(target) {
  return target === 25 ? "Bull" : String(target);
}

function isBullHitType(hitType) {
  return hitType === "greenBull" || hitType === "redBull";
}

function getHitTypeLabel(hitType) {
  if (hitType === "single") return "Single";
  if (hitType === "double") return "Dub";
  if (hitType === "triple") return "Trip";
  if (hitType === "greenBull") return "Sing Bull";
  if (hitType === "redBull") return "Dub Bull";
  if (hitType === "miss") return "Miss";
  return "Hit";
}

function getSetupBonus(hitType) {
  if (hitType === "double" || hitType === "redBull") return 1;
  if (hitType === "triple") return 2;
  return 0;
}

function getGameplayDamage(hitType) {
  if (hitType === "single" || hitType === "greenBull") return 1;
  if (hitType === "double" || hitType === "redBull") return 2;
  if (hitType === "triple") return 3;
  return 0;
}

function getBaseShipLives(shipIndex) {
  return shipIndex + 2;
}

function getShipLivesForPlacement(shipIndex, hitType) {
  return getBaseShipLives(shipIndex) + getSetupBonus(hitType);
}

function teamHasShipNumber(team, target) {
  return team.ships.some(ship => ship.target === target);
}

function isTeamEliminated(team) {
  return team.ships.length > 0 && team.ships.every(ship => ship.lives <= 0);
}

function getActiveTeamIndexes() {
  return gameState.teams
    .map((team, index) => ({ team, index }))
    .filter(({ team }) => !isTeamEliminated(team))
    .map(({ index }) => index);
}

function getNextActiveTeamIndex(fromIndex = gameState.currentTeamIndex) {
  if (!gameState.teams?.length) return null;

  let nextIndex = fromIndex;
  let attempts = 0;

  do {
    nextIndex = (nextIndex + 1) % gameState.teams.length;
    attempts++;
  } while (
    isTeamEliminated(gameState.teams[nextIndex]) &&
    attempts <= gameState.teams.length
  );

  if (attempts > gameState.teams.length) return null;
  return nextIndex;
}

function resetTurnTracking() {
  gameState.throwsThisTurn = 0;
  gameState.currentTurnThrows = [];
  gameState.currentTurnLiveTargets = [];
}

function countRemainingShips(team) {
  return team.ships.filter(ship => ship.lives > 0).length;
}

function countSunkShips(team) {
  return team.ships.filter(ship => ship.lives <= 0).length;
}

function getTeamRemainingLives(team) {
  return team.ships.reduce((sum, ship) => sum + Math.max(0, ship.lives), 0);
}

function buildTeams(modeId, playerNames) {
  const mode = getModeConfig(modeId);
  const teams = [];
  let playerCursor = 0;

  for (let i = 0; i < mode.numTeams; i++) {
    const teamPlayers = playerNames.slice(
      playerCursor,
      playerCursor + mode.playersPerTeam
    );

    playerCursor += mode.playersPerTeam;

    teams.push({
      id: i + 1,
      name: `Team ${i + 1}`,
      color: TEAM_COLORS[i] || "#ffffff",
      players: teamPlayers,
      ships: [],
      setupDone: false,
      intel: {},
      stats: {
        throws: 0,
        misses: 0,
        hits: 0,
        shipsSunk: 0,
        damageDealt: 0,
        shanghais: 0
      }
    });
  }

  return teams;
}

function hasLiveEnemyShipOnTarget(attackingTeamIndex, target) {
  return gameState.teams.some((team, index) => {
    if (index === attackingTeamIndex) return false;
    return team.ships.some(ship => ship.target === target && ship.lives > 0);
  });
}

function updateIntelForTarget(attackingTeam, target, damage, sunk = false) {
  const key = String(target);

  if (!attackingTeam.intel[key]) {
    attackingTeam.intel[key] = {
      target,
      damageKnown: 0,
      hasSunk: false
    };
  }

  attackingTeam.intel[key].damageKnown += damage;
  attackingTeam.intel[key].hasSunk = attackingTeam.intel[key].hasSunk || sunk;
}

function hasShanghaiThisTurn(target) {
  const hitsForTarget = gameState.currentTurnThrows.filter(throwRecord => {
    return throwRecord.target === target && throwRecord.hitType !== "miss";
  });

  if (target === 25) {
    const bullHits = hitsForTarget.filter(throwRecord => {
      return isBullHitType(throwRecord.hitType);
    });

    return bullHits.length >= 3;
  }

  const hitTypes = hitsForTarget.map(throwRecord => throwRecord.hitType);

  return (
    hitTypes.includes("single") &&
    hitTypes.includes("double") &&
    hitTypes.includes("triple")
  );
}

function maybeDeclareWinner(reason = "elimination") {
  const activeIndexes = getActiveTeamIndexes();

  if (activeIndexes.length === 1) {
    const winnerIndex = activeIndexes[0];
    gameState.winnerTeamIndex = winnerIndex;
    gameState.winner = gameState.teams[winnerIndex].name;
    gameState.winnerReason = reason;
    gameState.phase = "GAME_OVER";
    gameState.finalStats = getStats();
    updateMessage(`${gameState.winner} wins!`, "#facc15");
    return true;
  }

  if (activeIndexes.length === 0) {
    gameState.winnerTeamIndex = null;
    gameState.winner = "No Winner";
    gameState.winnerReason = "no_winner";
    gameState.phase = "GAME_OVER";
    gameState.finalStats = getStats();
    updateMessage("No teams remain.", "#ff4c4c");
    return true;
  }

  return false;
}

function finishShanghaiWin(teamIndex, target) {
  const team = gameState.teams[teamIndex];

  team.stats.shanghais += 1;

  gameState.winnerTeamIndex = teamIndex;
  gameState.winner = team.name;
  gameState.winnerReason = "shanghai";
  gameState.shanghaiTarget = target;
  gameState.phase = "GAME_OVER";
  gameState.finalStats = getStats();

  updateMessage(
    `${team.name} wins with Shanghai on ${formatTarget(target)}!`,
    "#facc15"
  );
}

function finishTurn() {
  const nextIndex = getNextActiveTeamIndex(gameState.currentTeamIndex);

  gameState.lastTurnTeamIndex = gameState.currentTeamIndex;
  gameState.nextTeamIndex = nextIndex;
  gameState.phase = "TURN_TRANSITION";

  if (nextIndex == null) {
    maybeDeclareWinner();
  }
}

function buildThrowResultSummary(results) {
  if (!results.length) return "Miss.";

  const sunkCount = results.filter(result => result.result === "sunk").length;
  const hitCount = results.filter(result => result.result === "hit").length;
  const alreadySunkCount = results.filter(result => result.result === "already_sunk").length;

  if (sunkCount > 0) return `${sunkCount} ship${sunkCount === 1 ? "" : "s"} sunk!`;
  if (hitCount > 0) return `${hitCount} hit${hitCount === 1 ? "" : "s"}!`;
  if (alreadySunkCount > 0) return "Already sunk.";
  return "Miss.";
}

function getHighestImpactColor(results) {
  if (results.some(result => result.result === "sunk")) return "#facc15";
  if (results.some(result => result.result === "hit")) return "#22c55e";
  if (results.some(result => result.result === "already_sunk")) return "#94a3b8";
  return "#ffffff";
}

/* -------------------------
   INIT / STATE
--------------------------*/

export function initGame(players) {
  const playerNames = (players || []).map(normalizePlayerName);

  gameState = {
    originalPlayers: [...playerNames],
    selectedMode: null,
    modeConfig: null,

    phase: "MODE_SELECT",

    teams: [],
    setupTeamIndex: 0,

    currentTeamIndex: 0,
    lastTurnTeamIndex: null,
    nextTeamIndex: null,

    throwsThisTurn: 0,
    currentTurnThrows: [],
    currentTurnLiveTargets: [],
    allThrows: [],

    lastMessage: "",
    lastMessageColor: "#ffffff",
    lastMessageTimestamp: 0,

    winner: null,
    winnerTeamIndex: null,
    winnerReason: null,
    shanghaiTarget: null,
    finalStats: null
  };

  history = [];

  if (playerNames.length < 2) {
    gameState.phase = "GAME_OVER";
    gameState.winner = "No Winner";
    gameState.winnerReason = "not_enough_players";
    updateMessage("BattleDarts needs at least 2 players.", "#ff4c4c");
  }
}

export function getState() {
  return gameState;
}

export function getModes() {
  return Object.values(MODES).map(mode => ({
    ...mode,
    requiredPlayers: getRequiredPlayerCount(mode.id)
  }));
}

export function getStats() {
  return {
    mode: gameState.selectedMode,
    teams: (gameState.teams || []).map(team => ({
      id: team.id,
      name: team.name,
      color: team.color,
      players: [...team.players],
      ships: team.ships.map(ship => ({ ...ship })),
      intel: { ...(team.intel || {}) },
      remainingShips: countRemainingShips(team),
      sunkShips: countSunkShips(team),
      remainingLives: getTeamRemainingLives(team),
      isEliminated: isTeamEliminated(team),
      stats: { ...team.stats }
    })),
    throws: (gameState.allThrows || []).map(throwRecord => ({ ...throwRecord }))
  };
}

/* -------------------------
   MODE / SETUP
--------------------------*/

export function startMode(modeId) {
  if (gameState.phase !== "MODE_SELECT") return false;

  const mode = getModeConfig(modeId);
  if (!mode) {
    updateMessage("Invalid BattleDarts mode.", "#ff4c4c");
    return false;
  }

  const playerNames = gameState.originalPlayers || [];
  const requiredPlayers = getRequiredPlayerCount(modeId);

  if (playerNames.length < requiredPlayers) {
    updateMessage(
      `${mode.label} needs ${requiredPlayers} players.`,
      "#ff4c4c"
    );
    return false;
  }

  saveHistory();

  const activePlayers = playerNames.slice(0, requiredPlayers);

  gameState.selectedMode = modeId;
  gameState.modeConfig = { ...mode };
  gameState.teams = buildTeams(modeId, activePlayers);
  gameState.setupTeamIndex = 0;
  gameState.phase = "SETUP";
  gameState.lastMessage = "";
  gameState.lastMessageColor = "#ffffff";

  return true;
}

export function addSetupShip(hitType, target) {
  if (gameState.phase !== "SETUP") return false;

  const team = getCurrentSetupTeam();
  if (!team) return false;

  const maxShips = gameState.modeConfig?.shipsPerTeam || 0;

  if (team.ships.length >= maxShips) {
    updateMessage(`${team.name} fleet is already full.`, "#facc15");
    return false;
  }

  if (target == null || target < 1 || (target > 20 && target !== 25)) {
    updateMessage("Choose a valid ship number.", "#ff4c4c");
    return false;
  }

  if (target === 25 && hitType === "triple") {
    updateMessage("Trip Bull is not available.", "#ff4c4c");
    return false;
  }

  if (teamHasShipNumber(team, target)) {
    updateMessage(
      `${team.name} already has a ship on ${formatTarget(target)}.`,
      "#ff4c4c"
    );
    return false;
  }

  saveHistory();

  const shipIndex = team.ships.length;
  const lives = getShipLivesForPlacement(shipIndex, hitType);

  team.ships.push({
    id: `${team.id}-${target}`,
    target,
    hitType,
    label: formatTarget(target),
    lives,
    originalLives: lives,
    order: shipIndex + 1,
    isSunk: false
  });

  updateMessage(
    `${team.name} placed ${formatTarget(target)} with ${lives} lives.`,
    "#22c55e"
  );

  return true;
}

export function finishCurrentTeamSetup() {
  if (gameState.phase !== "SETUP") return false;

  const team = getCurrentSetupTeam();
  if (!team) return false;

  const requiredShips = gameState.modeConfig?.shipsPerTeam || 0;

  if (team.ships.length < requiredShips) {
    updateMessage(
      `${team.name} needs ${requiredShips - team.ships.length} more ship${requiredShips - team.ships.length === 1 ? "" : "s"}.`,
      "#ff4c4c"
    );
    return false;
  }

  saveHistory();

  team.setupDone = true;

  const nextSetupTeamIndex = gameState.setupTeamIndex + 1;

  if (nextSetupTeamIndex < gameState.teams.length) {
    gameState.nextSetupTeamIndex = nextSetupTeamIndex;
    gameState.phase = "SETUP_TRANSITION";
    updateMessage(`${team.name} fleet locked.`, "#facc15");
    return true;
  }

  gameState.nextSetupTeamIndex = null;
  gameState.phase = "SETUP_COMPLETE";
  updateMessage("All fleets are locked.", "#facc15");
  return true;
}

export function continueSetupTransition() {
  if (gameState.phase !== "SETUP_TRANSITION") return false;

  saveHistory();

  gameState.setupTeamIndex = gameState.nextSetupTeamIndex;
  gameState.nextSetupTeamIndex = null;
  gameState.phase = "SETUP";
  gameState.lastMessage = "";

  return true;
}

export function startGameplay() {
  if (gameState.phase !== "SETUP_COMPLETE") return false;

  saveHistory();

  gameState.currentTeamIndex = 0;
  gameState.phase = "GAME";
  resetTurnTracking();
  updateMessage(`${gameState.teams[0].name} fires first.`, "#facc15");

  return true;
}

/* -------------------------
   GAMEPLAY
--------------------------*/

export function submitThrow(hitType, target = null) {
  if (gameState.phase !== "GAME") return false;
  if (gameState.winner) return false;

  const attackingTeam = getCurrentTeam();
  if (!attackingTeam) return false;

  if (gameState.throwsThisTurn >= 3) {
    updateMessage("Turn complete. Tap Next Team.", "#facc15");
    return false;
  }

  if (hitType !== "miss") {
    if (target == null || target < 1 || (target > 20 && target !== 25)) {
      updateMessage("Choose a valid target.", "#ff4c4c");
      return false;
    }

    if (target === 25 && hitType === "triple") {
      updateMessage("Trip Bull is not available.", "#ff4c4c");
      return false;
    }
  }

  saveHistory();

  const damage = getGameplayDamage(hitType);
  const results = [];
  const hadLiveTarget =
    target != null && hasLiveEnemyShipOnTarget(gameState.currentTeamIndex, target);

  gameState.throwsThisTurn++;
  attackingTeam.stats.throws += 1;

  if (hadLiveTarget && !gameState.currentTurnLiveTargets.includes(target)) {
    gameState.currentTurnLiveTargets.push(target);
  }

  if (hitType === "miss") {
    attackingTeam.stats.misses += 1;

    const throwRecord = {
      teamIndex: gameState.currentTeamIndex,
      teamName: attackingTeam.name,
      dartNumber: gameState.throwsThisTurn,
      hitType,
      target: null,
      damage: 0,
      results: [],
      summary: "Miss Board"
    };

    gameState.currentTurnThrows.push(throwRecord);
    gameState.allThrows.push(throwRecord);

    updateMessage(
      gameState.throwsThisTurn >= 3
        ? `${attackingTeam.name} misses. Turn complete.`
        : `${attackingTeam.name} misses the board.`,
      gameState.throwsThisTurn >= 3 ? "#facc15" : "#ffffff"
    );

    return true;
  }

  for (let i = 0; i < gameState.teams.length; i++) {
    if (i === gameState.currentTeamIndex) continue;

    const defendingTeam = gameState.teams[i];

    defendingTeam.ships.forEach(ship => {
      if (ship.target !== target) return;

      if (ship.lives <= 0) {
        results.push({
          targetTeamIndex: i,
          targetTeamName: defendingTeam.name,
          shipTarget: ship.target,
          result: "already_sunk",
          damage: 0,
          livesRemaining: 0
        });
        return;
      }

      const beforeLives = ship.lives;
      ship.lives = Math.max(0, ship.lives - damage);
      const actualDamage = beforeLives - ship.lives;

      attackingTeam.stats.damageDealt += actualDamage;
      updateIntelForTarget(attackingTeam, target, actualDamage, ship.lives <= 0);

      if (ship.lives <= 0) {
        ship.isSunk = true;
        attackingTeam.stats.shipsSunk += 1;

        results.push({
          targetTeamIndex: i,
          targetTeamName: defendingTeam.name,
          shipTarget: ship.target,
          result: "sunk",
          damage: actualDamage,
          livesRemaining: 0
        });
      } else {
        attackingTeam.stats.hits += 1;

        results.push({
          targetTeamIndex: i,
          targetTeamName: defendingTeam.name,
          shipTarget: ship.target,
          result: "hit",
          damage: actualDamage,
          livesRemaining: ship.lives
        });
      }
    });
  }

  if (results.length === 0) {
    attackingTeam.stats.misses += 1;
  }

  const summary = buildThrowResultSummary(results);

  const throwRecord = {
    teamIndex: gameState.currentTeamIndex,
    teamName: attackingTeam.name,
    dartNumber: gameState.throwsThisTurn,
    hitType,
    target,
    damage,
    results,
    summary
  };

  gameState.currentTurnThrows.push(throwRecord);
  gameState.allThrows.push(throwRecord);

  const impactColor = getHighestImpactColor(results);

  updateMessage(
    gameState.throwsThisTurn >= 3
      ? `${attackingTeam.name}: ${getHitTypeLabel(hitType)} ${formatTarget(target)} — ${summary} Turn complete.`
      : `${attackingTeam.name}: ${getHitTypeLabel(hitType)} ${formatTarget(target)} — ${summary}`,
    gameState.throwsThisTurn >= 3 ? "#facc15" : impactColor
  );

  if (
    target != null &&
    gameState.currentTurnLiveTargets.includes(target) &&
    hasShanghaiThisTurn(target)
  ) {
    finishShanghaiWin(gameState.currentTeamIndex, target);
    return true;
  }

  maybeDeclareWinner();

  return true;
}

export function nextTeam() {
  if (gameState.phase !== "GAME") return false;

  saveHistory();
  finishTurn();
  return true;
}

export function startNextTurn() {
  if (gameState.phase !== "TURN_TRANSITION") return false;

  if (gameState.nextTeamIndex == null) {
    maybeDeclareWinner();
    return false;
  }

  saveHistory();

  gameState.currentTeamIndex = gameState.nextTeamIndex;
  gameState.lastTurnTeamIndex = null;
  gameState.nextTeamIndex = null;
  gameState.phase = "GAME";
  resetTurnTracking();

  updateMessage(`${gameState.teams[gameState.currentTeamIndex].name} is up.`, "#facc15");

  return true;
}

export function endGameEarly() {
  if (gameState.phase === "GAME_OVER") return false;

  saveHistory();

  const activeTeamIndexes = getActiveTeamIndexes();

  if (activeTeamIndexes.length > 0) {
    const leaderIndex = [...activeTeamIndexes].sort((a, b) => {
      const teamA = gameState.teams[a];
      const teamB = gameState.teams[b];

      const livesDiff = getTeamRemainingLives(teamB) - getTeamRemainingLives(teamA);
      if (livesDiff !== 0) return livesDiff;

      return countRemainingShips(teamB) - countRemainingShips(teamA);
    })[0];

    gameState.winnerTeamIndex = leaderIndex;
    gameState.winner = gameState.teams[leaderIndex].name;
  } else {
    gameState.winnerTeamIndex = null;
    gameState.winner = "No Winner";
  }

  gameState.winnerReason = "ended_early";
  gameState.phase = "GAME_OVER";
  gameState.finalStats = getStats();

  updateMessage("Game ended early.", "#facc15");

  return true;
}

/* -------------------------
   SHARED ACTIONS
--------------------------*/

export function undo() {
  if (!history.length) return false;
  gameState = history.pop();
  return true;
}

export function isGameOver() {
  return gameState.phase === "GAME_OVER";
}

export function getRotatedPlayersForReplay() {
  const players = gameState.originalPlayers || [];

  if (players.length <= 1) return [...players];

  return [...players.slice(1), players[0]];
}
