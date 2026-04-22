import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "killer",
  name: "Killer",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
