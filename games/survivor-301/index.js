import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "survivor301",
  name: "Survivor 301",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
