import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

import golfdarts from "../games/golfdarts/index.js";
import HammerCricket from "../games/hammer-cricket/index.js";
import AhmanGreen from "../games/ahman-green/index.js";
import Killer from "../games/killer/index.js";
import Survivor301 from "../games/survivor-301/index.js";
import ThreeOhOne from "../games/301/index.js";
import X01 from "../games/x01/index.js";

const gameMap = {
  "GolfDarts": golfdarts,
  "hammer-cricket": HammerCricket,
  "ahman-green": AhmanGreen,
  "killer": Killer,
  "survivor-301": Survivor301,
  "301": ThreeOhOne,
  "x01": X01
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
