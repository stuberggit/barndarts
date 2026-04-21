import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

import golfdarts from "../games/golfdarts/index.js";
import HammerCricket from "../games/hammer-cricket/index.js";

const gameMap = {
  "GolfDarts": golfdarts,
  "hammer-cricket": HammerCricket
};

export function renderGame(container) {
  const gameId = store.selectedGame;
  const game = gameMap[gameId];

  if (!game) {
    container.innerHTML = `<h2>Game not found: ${gameId}</h2>`;
    return;
  }

  container.innerHTML = `
    <h1>${game.name}</h1>
    <div id="gameArea"></div>
  `;

  const gameArea = document.getElementById("gameArea");

  game.start(store.players);
  game.render(gameArea);

}
