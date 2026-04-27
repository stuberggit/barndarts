import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "cricket-standard",
  name: "Standard Cricket",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
