import {
  getState,
  advancePlayer,
  missBoard,
  partyJump,
  acdcJump,
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

function getNeedsColorMeta(progress) {
  return COLORS[progress] || { name: "Done", bg: "#666666", text: "#ffffff" };
}

function getProgressCells(player, isInteractive, container) {
  const colorRow = document.createElement("div");
  colorRow.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
    width:100%;
  `;

  COLORS.forEach((color, colorIndex) => {
    const completed = player.progress > colorIndex;
    const target = player.progress === colorIndex;
    const locked = player.progress < colorIndex;

    const cell = document.createElement("div");
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
      cursor:${target && isInteractive ? "pointer" : "default"};
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

    if (target && isInteractive) {
      cell.onclick = () => {
        advancePlayer(color.name);
        renderUI(container);
      };
    }

    colorRow.appendChild(cell);
  });

  return colorRow;
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
  const currentPlayer = state.players[state.currentPlayer];
  const needsMeta = getNeedsColorMeta(currentPlayer.progress);

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

  container.innerHTML = `
    <div style="
      text-align:center;
      margin:0 0 12px;
      font-size:16px;
      font-weight:bold;
      line-height:1.4;
    ">
      <div>Current Player: ${currentPlayer.name}</div>
      <div>
        Needs |
        <span style="color:${needsMeta.bg === "#ffffff" ? "#ffffff" : needsMeta.bg}; font-weight:bold;">
          ${needsMeta.name}
        </span>
      </div>
    </div>

    <div id="activeColorBlock"></div>

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

    <h3 style="text-align:center;margin:8px 0 12px;">
      🎯 ${currentPlayer.name}
      (Dart ${state.dartsThrown + 1}/3)
    </h3>

    <div id="controls"></div>

    <div id="modal"></div>
  `;

  const activeColorBlock = document.getElementById("activeColorBlock");
  activeColorBlock.appendChild(getProgressCells(currentPlayer, true, container));

  renderControls(container);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const row1 = document.createElement("div");
  row1.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:10px;
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

  row1.appendChild(missBtn);
  row1.appendChild(partyBtn);

  const row2 = document.createElement("div");
  row2.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const acdcBtn = document.createElement("div");
  acdcBtn.innerText = "⚡ AC/DC";
  acdcBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  acdcBtn.onclick = () => {
    acdcJump();
    renderUI(container);
  };

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

  row2.appendChild(acdcBtn);
  row2.appendChild(nextBtn);

  const row3 = document.createElement("div");
  row3.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const leaderboardBtn = document.createElement("div");
  leaderboardBtn.innerText = "Leaderboard";
  leaderboardBtn.style = `
    ${leaderboardButtonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  leaderboardBtn.onclick = () => {
    renderLeaderboardModal(container, getState());
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

  row3.appendChild(leaderboardBtn);
  row3.appendChild(undoBtn);

  const row4 = document.createElement("div");
  row4.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-top:8px;
  `;

  const endBtn = document.createElement("div");
  endBtn.innerText = "End Game";
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

  row4.appendChild(endBtn);

  controls.appendChild(row1);
  controls.appendChild(row2);
  controls.appendChild(row3);
  controls.appendChild(row4);
}

/* -------------------------
   LEADERBOARD MODAL
--------------------------*/

function renderLeaderboardModal(container, state) {
  const modal = document.getElementById("modal");

  modal.innerHTML = `
    <div style="
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.7);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:999;
    ">
      <div style="
        background:#111111;
        color:#ffffff;
        padding:20px;
        border-radius:10px;
        width:90%;
        max-width:600px;
        max-height:90vh;
        overflow:auto;
        border:1px solid #ffffff;
      ">
        <h2 style="text-align:center;margin-top:0;">Leaderboard</h2>
        <div id="leaderboardGrid"></div>
        <div id="closeModal" style="
          ${buttonStyle()}
          padding:10px;
          min-height:44px;
          margin-top:12px;
        ">Close</div>
      </div>
    </div>
  `;

  const leaderboardGrid = document.getElementById("leaderboardGrid");
  leaderboardGrid.innerHTML = "";

  state.players.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:10px;
      border-radius:10px;
      background:#1e293b;
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
      font-size:14px;
    `;
    header.innerHTML = `
      <span>${player.name}</span>
      <span>Needs | ${getNeedsColor(player.progress)}</span>
    `;

    row.appendChild(header);
    row.appendChild(getProgressCells(player, false, container));
    leaderboardGrid.appendChild(row);
  });

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
}

/* -------------------------
   END SCREEN
--------------------------*/

function renderEnd(container, state) {
  container.innerHTML = `
    <h3 style="text-align:center;">🏆 Winner: ${state.winner}</h3>

    <div id="finalBoard"></div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:12px;
    " id="endControls"></div>

    <div id="modal"></div>
  `;

  renderLeaderboardContent(container, state);

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

function renderLeaderboardContent(container, state) {
  const finalBoard = document.getElementById("finalBoard");
  finalBoard.innerHTML = "";

  state.players.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:10px;
      border-radius:10px;
      background:#1e293b;
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
      font-size:14px;
    `;
    header.innerHTML = `
      <span>${player.name}</span>
      <span>${player.progress >= 4 ? "Finished" : `Needs | ${getNeedsColor(player.progress)}`}</span>
    `;

    row.appendChild(header);
    row.appendChild(getProgressCells(player, false, container));
    finalBoard.appendChild(row);
  });
}
