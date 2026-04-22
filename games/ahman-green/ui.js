import {
  getState,
  advancePlayer,
  missBoard,
  partyJump,
  nextPlayer,
  undo,
  isGameOver,
  initGame,
  getRotatedPlayersForReplay
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

const COLORS = [
  { name: "Black", bg: "#111111", text: "#ffffff" },
  { name: "White", bg: "#ffffff", text: "#111111" },
  { name: "Green", bg: "#22c55e", text: "#ffffff" },
  { name: "Red", bg: "#ef4444", text: "#ffffff" }
];

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
  `;
}

function leaderboardButtonStyle() {
  return `
    background:#ffffff;
    color:#206a1e;
    border:1px solid #000000;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
  `;
}

function undoButtonStyle() {
  return `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ff4c4c;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
  `;
}

function getNeedsColor(progress) {
  return COLORS[progress]?.name || "Done";
}

/* -------------------------
   MAIN UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  const age = Date.now() - (state.lastMessageTimestamp || 0);
  const showFlash = state.lastMessage && age < 2500;

  const flashHtml = showFlash
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        color:${state.lastMessageColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
        opacity:${age > 1800 ? 0.35 : 1};
        transition:opacity 0.6s ease;
      ">
        ${state.lastMessage}
      </div>
    `
    : `<div></div>`;

  const currentPlayer = state.players[state.currentPlayer];

  container.innerHTML = `
    <h2 style="
      text-align:center;
      margin-bottom:6px;
      font-family: Georgia, 'Times New Roman', serif;
      letter-spacing:0.5px;
    ">
      Ahman Green
    </h2>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:16px;
      font-weight:bold;
    ">
      🎯 ${currentPlayer.name} | Needs ${getNeedsColor(currentPlayer.progress)}
    </div>

    <div id="playerGrid"></div>

    <div style="
      min-height:54px;
      margin:10px 0 12px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${flashHtml}
      </div>
    </div>

    <div id="controls"></div>
  `;

  renderPlayerGrid(container, state);
  renderControls(container);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

/* -------------------------
   PLAYER GRID
--------------------------*/

function renderPlayerGrid(container, state) {
  const grid = document.getElementById("playerGrid");
  grid.innerHTML = "";

  state.players.forEach((player, index) => {
    const isActive = index === state.currentPlayer;

    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:10px;
      border-radius:10px;
      background:${isActive ? "#1e293b" : "#111111"};
      border:1px solid #ffffff;
    `;

    const header = document.createElement("div");
    header.style = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:8px;
      color:#ffffff;
      font-weight:bold;
    `;
    header.innerHTML = `
      <span>${player.name}</span>
      <span>Needs | ${getNeedsColor(player.progress)}</span>
    `;

    const colorRow = document.createElement("div");
    colorRow.style = `
      display:grid;
      grid-template-columns:repeat(4, 1fr);
      gap:8px;
    `;

    COLORS.forEach((color, colorIndex) => {
      const cell = document.createElement("div");

      const completed = player.progress > colorIndex;
      const target = player.progress === colorIndex;
      const locked = player.progress < colorIndex;

      cell.style = `
        min-height:56px;
        border-radius:10px;
        border:2px solid ${target ? "#a855f7" : "#ffffff"};
        background:${color.bg};
        color:${color.text};
        display:flex;
        align-items:center;
        justify-content:center;
        position:relative;
        font-weight:bold;
        font-size:14px;
        opacity:${locked ? 0.45 : 1};
        cursor:${target && isActive ? "pointer" : "default"};
        user-select:none;
      `;

      cell.innerText = color.name;

      if (completed) {
        const xOverlay = document.createElement("div");
        xOverlay.innerText = "✕";
        xOverlay.style = `
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#a855f7;
          font-size:34px;
          font-weight:bold;
          pointer-events:none;
        `;
        cell.appendChild(xOverlay);
      }

      if (target && isActive) {
        cell.onclick = () => {
          advancePlayer(color.name);
          renderUI(container);
        };
      }

      colorRow.appendChild(cell);
    });

    row.appendChild(header);
    row.appendChild(colorRow);
    grid.appendChild(row);
  });
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const middleRow = document.createElement("div");
  middleRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss Board";
  missBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  missBtn.onclick = () => {
    missBoard();
    renderUI(container);
  };

  const partyBtn = document.createElement("div");
  partyBtn.innerText = "🎉 Party";
  partyBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  partyBtn.onclick = () => {
    partyJump();
    renderUI(container);
  };

  middleRow.appendChild(missBtn);
  middleRow.appendChild(partyBtn);

  const lowerRow = document.createElement("div");
  lowerRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  nextBtn.onclick = () => {
    nextPlayer();
    renderUI(container);
  };

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  undoBtn.onclick = () => {
    undo();
    renderUI(container);
  };

  lowerRow.appendChild(nextBtn);
  lowerRow.appendChild(undoBtn);

  const endRow = document.createElement("div");
  endRow.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-top:8px;
  `;

  const endBtn = document.createElement("div");
  endBtn.innerText = "Main Menu";
  endBtn.style = `
    ${buttonStyle()}
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  endBtn.onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };

  endRow.appendChild(endBtn);

  controls.appendChild(middleRow);
  controls.appendChild(lowerRow);
  controls.appendChild(endRow);
}

/* -------------------------
   END SCREEN
--------------------------*/

function renderEnd(container, state) {
  container.innerHTML = `
    <h2 style="
      text-align:center;
      margin-bottom:6px;
      font-family: Georgia, 'Times New Roman', serif;
      letter-spacing:0.5px;
    ">
      Ahman Green
    </h2>

    <h3 style="text-align:center;">🏆 Winner: ${state.winner}</h3>

    <div id="playerGrid"></div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:12px;
    " id="endControls"></div>
  `;

  renderPlayerGrid(container, state);

  const controls = document.getElementById("endControls");

  const playAgainBtn = document.createElement("div");
  playAgainBtn.innerText = "Play Again";
  playAgainBtn.style = `
    ${buttonStyle()}
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  playAgainBtn.onclick = () => {
    const rotatedPlayers = getRotatedPlayersForReplay();
    initGame(rotatedPlayers);
    renderUI(container);
  };

  const mainMenuBtn = document.createElement("div");
  mainMenuBtn.innerText = "Main Menu";
  mainMenuBtn.style = `
    ${buttonStyle()}
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  mainMenuBtn.onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };

  controls.appendChild(playAgainBtn);
  controls.appendChild(mainMenuBtn);
}
