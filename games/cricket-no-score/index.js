import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "cricket-no-score",
  name: "Cricket (No Score)",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
