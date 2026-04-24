import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

function buttonStyle() {
  return `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ffffff;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    text-align:center;
    user-select:none;
    padding:10px;
    min-height:44px;
    margin-top:8px;
  `;
}

function backButtonStyle() {
  return `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ffffff;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    text-align:center;
    user-select:none;
    padding:10px;
    min-height:44px;
    margin-top:8px;
  `;
}

export function renderSetup(container) {
  container.innerHTML = `
    <h1>${store.selectedGame}</h1>

    <input id="playerName" placeholder="Enter player name" />

    <div id="addPlayer" style="${buttonStyle()}">Add Player</div>

    <div id="players" style="margin:12px 0;"></div>

    <div id="start" style="${buttonStyle()}">Start Game</div>
    <div id="back" style="${backButtonStyle()}">Back</div>
  `;

  const playersDiv = document.getElementById("players");

  function renderPlayers() {
    playersDiv.innerHTML = store.players
      .map(p => `
        <div style="
          background:#111111;
          color:#ffffff;
          border:1px solid #9ca3af;
          border-radius:10px;
          padding:10px;
          margin-bottom:8px;
          font-weight:bold;
          text-align:center;
        ">
          ${p}
        </div>
      `)
      .join("");
  }

  document.getElementById("addPlayer").onclick = () => {
    const input = document.getElementById("playerName");
    const name = input.value.trim();

    if (name) {
      store.players.push(name);
      input.value = "";
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
