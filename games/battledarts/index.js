import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "battledarts",
  name: "BattleDarts",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
