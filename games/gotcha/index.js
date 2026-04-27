import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "gotcha",
  name: "Gotcha",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
