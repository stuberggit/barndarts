import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "hammer-cricket",
  name: "Hammer Cricket",

  start(players) {
    initGame(players);
  },

  render(container) {
    renderUI(container);
  }
};
