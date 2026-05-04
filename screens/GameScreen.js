import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

import golfdarts from "../games/golfdarts/index.js";
import HammerCricket from "../games/hammer-cricket/index.js";
import AhmanGreen from "../games/ahman-green/index.js";
import Killer from "../games/killer/index.js";
import Survivor301 from "../games/survivor-301/index.js";
import ThreeOhOne from "../games/301/index.js";
import X01 from "../games/x01/index.js";
import CricketStandard from "../games/cricket-standard/index.js";
import CricketNoScore from "../games/cricket-no-score/index.js";
import Gotcha from "../games/gotcha/index.js";
import BattleDarts from "../games/battledarts/index.js";

const gameMap = {
  "GolfDarts": golfdarts,
  "hammer-cricket": HammerCricket,
  "ahman-green": AhmanGreen,
  "killer": Killer,
  "survivor-301": Survivor301,
  "301": ThreeOhOne,
  "x01": X01,
  "cricket-standard": CricketStandard,
  "cricket-no-score": CricketNoScore,
  "gotcha": Gotcha,
  "BattleDarts": BattleDarts
};

const gameDisplayNames = {
  "ahman-green": "Ahman Green",
  "GolfDarts": "GolfDarts",
  "hammer-cricket": "Hammered",
  "killer": "Killer",
  "survivor-301": "Survivor 301",
  "gotcha": "Gotcha 301",
  "301": "301",
  "x01": "X01",
  "cricket-standard": "Cricket (Points)",
  "cricket-no-score": "Cricket (No Points)"
};

function getGameDisplayName(gameId, game) {
  return gameDisplayNames[gameId] || game?.name || gameId;
}

export function renderGame(container) {
  const gameId = store.selectedGame;
  const game = gameMap[gameId];

  if (!game) {
    container.innerHTML = `<h2>Game not found: ${gameId}</h2>`;
    return;
  }

  container.innerHTML = `
    <h1>${getGameDisplayName(gameId, game)}</h1>
    <div id="gameArea"></div>
  `;

  const gameArea = document.getElementById("gameArea");

  game.start(store.players);
  game.render(gameArea);
}
