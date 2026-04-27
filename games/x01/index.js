import { initGame } from "./logic.js";
import { renderUI } from "./ui.js";

export default {
  id: "x01",
  name: "X01",
  start(players) {
    initGame(players);
  },
  render(container) {
    renderUI(container);
  }
};
