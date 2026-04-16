import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

export function renderGame(container) {
  container.innerHTML = `
    <h1>${store.selectedGame}</h1>

    <div id="players"></div>

    <div class="button" id="end">End Game</div>
  `;

  const playersDiv = document.getElementById("players");

  playersDiv.innerHTML = store.players
    .map(p => `<div>${p}: 0</div>`)
    .join("");

  document.getElementById("end").onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };
}
