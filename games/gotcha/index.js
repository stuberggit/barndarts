import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "gotcha",
  name: "Gotcha 301",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
