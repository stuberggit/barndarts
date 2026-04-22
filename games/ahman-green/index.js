import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "ahman-green",
  name: "Ahman Green",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
