const GAME_HISTORY_KEY = "barndarts_game_history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(GAME_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(history));
}

export function getGameHistory() {
  return loadHistory();
}

export function saveGameResult(result) {
  const history = loadHistory();

  const record = {
    id: `game_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    playedAt: new Date().toISOString(),
    ...result
  };

  history.unshift(record);
  saveHistory(history);

  return record;
}

export function clearGameHistory() {
  saveHistory([]);
}
