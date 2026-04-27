import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "301",
  name: "301",
  start(players) {
    initGame(players);
  },
  render(container) {
    renderUI(container);
  }
};
