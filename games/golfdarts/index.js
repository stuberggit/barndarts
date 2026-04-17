import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "golfdarts",
  name: "GolfDarts",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
