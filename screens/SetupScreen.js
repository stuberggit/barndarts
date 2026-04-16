import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

export function renderSetup(container) {
  container.innerHTML = `
    <h1>${store.selectedGame}</h1>

    <input id="playerName" placeholder="Enter player name" />
    <div class="button" id="addPlayer">Add Player</div>

    <div id="players"></div>

    <div class="button" id="start">Start Game</div>
    <div class="button" id="back">Back</div>
  `;

  const playersDiv = document.getElementById("players");

  function renderPlayers() {
    playersDiv.innerHTML = store.players
      .map(p => `<div>${p}</div>`)
      .join("");
  }

  document.getElementById("addPlayer").onclick = () => {
    const name = document.getElementById("playerName").value;
    if (name) {
      store.players.push(name);
      renderPlayers();
    }
  };

  document.getElementById("start").onclick = () => {
    store.screen = "GAME";
    renderApp();
  };

  document.getElementById("back").onclick = () => {
    store.screen = "CATEGORY";
    renderApp();
  };

  renderPlayers();
}
