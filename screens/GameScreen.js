import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

import golfdarts from "../games/golfdarts/index.js";

const gameMap = {
  "GolfDarts": golfdarts
};

export function renderGame(container) {
  const game = gameMap[store.selectedGame];

  container.innerHTML = `
    <h1>${store.selectedGame}</h1>
    <div id="gameArea"></div>
    <div class="button" id="end">End Game</div>
  `;

  const gameArea = document.getElementById("gameArea");

  game.start(store.players);
  game.render(gameArea);

  document.getElementById("end").onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };
}
