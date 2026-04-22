import { getState, submitNDHThrow, submitGameThrow, nextPlayer, undo, isGameOver } from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

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

function formatAssignment(player) {
  if (!player.target) return "Unassigned";

  if (player.target === 25) {
    return player.hitType === "redBull" ? "Red Bull" : "Green Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Double",
    triple: "Triple"
  };

  return `${labelMap[player.hitType]} ${player.target}`;
}

function formatTargetNumber(target) {
  return target === 25 ? "Bull" : String(target);
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

  if (state.phase === "NDH") {
    renderNDH(container, state);
    return;
  }

  renderGame(container, state);
}

/* -------------------------
   FEEDBACK
--------------------------*/

function buildFlashHtml(state) {
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

  return { showFlash, flashHtml };
}

/* -------------------------
   NDH SCREEN
--------------------------*/

function renderNDH(container, state) {
  const { showFlash, flashHtml } = buildFlashHtml(state);
  const currentPlayer = state.players[state.currentPlayer];

  container.innerHTML = `
    <h2 style="text-align:center;margin-bottom:8px;">Killer</h2>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:16px;
      font-weight:bold;
    ">
      NDH Throw: ${currentPlayer.name}
    </div>

    <div id="assignmentBoard"></div>

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

    <div id="modal"></div>
  `;

  renderAssignmentBoard(state);
  renderNDHControls(container);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

function renderAssignmentBoard(state) {
  const board = document.getElementById("assignmentBoard");
  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isActive = index === state.currentPlayer;

    const row = document.createElement("div");
    row.style = `
      margin-bottom:8px;
      padding:10px;
      border-radius:10px;
      background:${isActive ? "#1e293b" : "#111111"};
      border:1px solid #ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      color:#ffffff;
      font-weight:bold;
      font-size:14px;
    `;

    row.innerHTML = `
      <span>${player.name}</span>
      <span>${formatAssignment(player)}${player.isKiller ? " | Killer" : ""}</span>
    `;

    board.appendChild(row);
  });
}

function renderNDHControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const hitTypeRow = document.createElement("div");
  hitTypeRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const types = [
    { label: "Single", value: "single" },
    { label: "Double", value: "double" },
    { label: "Triple", value: "triple" }
  ];

  types.forEach(type => {
    const btn = document.createElement("div");
    btn.innerText = type.label;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:44px;
      font-size:16px;
    `;
    btn.onclick = () => {
      renderNumberPicker(container, type.value, "NDH");
    };
    hitTypeRow.appendChild(btn);
  });

  const bullRow = document.createElement("div");
  bullRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const greenBullBtn = document.createElement("div");
  greenBullBtn.innerText = "Green Bull";
  greenBullBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:44px;
    font-size:16px;
  `;
  greenBullBtn.onclick = () => {
    submitNDHThrow("greenBull");
    renderUI(container);
  };

  const redBullBtn = document.createElement("div");
  redBullBtn.innerText = "Red Bull";
  redBullBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:44px;
    font-size:16px;
  `;
  redBullBtn.onclick = () => {
    submitNDHThrow("redBull");
    renderUI(container);
  };

  bullRow.appendChild(greenBullBtn);
  bullRow.appendChild(redBullBtn);

  const bottomRow = document.createElement("div");
  bottomRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const viewBtn = document.createElement("div");
  viewBtn.innerText = "Assigned Targets";
  viewBtn.style = `
    ${leaderboardButtonStyle()}
    padding:8px;
    min-height:40px;
    font-size:15px;
  `;
  viewBtn.onclick = () => {
    renderTargetsModal(state);
  };

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:8px;
    min-height:40px;
    font-size:15px;
  `;
  undoBtn.onclick = () => {
    undo();
    renderUI(container);
  };

  bottomRow.appendChild(viewBtn);
  bottomRow.appendChild(undoBtn);

  const endRow = document.createElement("div");
  endRow.style = `
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
    min-height:44px;
    font-size:16px;
  `;
  endBtn.onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };

  endRow.appendChild(endBtn);

  controls.appendChild(hitTypeRow);
  controls.appendChild(bullRow);
  controls.appendChild(bottomRow);
  controls.appendChild(endRow);
}

/* -------------------------
   GAME SCREEN
--------------------------*/

function renderGame(container, state) {
  const { showFlash, flashHtml } = buildFlashHtml(state);
  const currentPlayer = state.players[state.currentPlayer];

  container.innerHTML = `
    <h2 style="text-align:center;margin-bottom:8px;">Killer</h2>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:16px;
      font-weight:bold;
    ">
      Current Player: ${currentPlayer.name}
    </div>

    <div id="playerBoard"></div>

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

    <div style="text-align:center;margin-bottom:12px;font-size:16px;font-weight:bold;">
      🎯 Target: ${formatTargetNumber(currentPlayer.target)} | Dart ${state.dartsThrown + 1}/3
    </div>

    <div id="controls"></div>

    <div id="modal"></div>
  `;

  renderPlayerBoard(state);
  renderGameControls(container);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

function renderPlayerBoard(state) {
  const board = document.getElementById("playerBoard");
  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isActiveTurn = index === state.currentPlayer;

    const row = document.createElement("div");
    row.style = `
      margin-bottom:8px;
      padding:10px;
      border-radius:10px;
      background:${isActiveTurn ? "#1e293b" : "#111111"};
      border:1px solid #ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      color:#ffffff;
      font-weight:bold;
      font-size:14px;
      opacity:${player.isActive ? 1 : 0.5};
    `;

    row.innerHTML = `
      <span>${player.name}</span>
      <span>
        ${formatAssignment(player)} |
        Lives ${player.lives} |
        ${player.isKiller ? "Killer" : "Not Killer"}
      </span>
    `;

    board.appendChild(row);
  });
}

function renderGameControls(container) {
  const state = getState();
  const currentPlayer = state.players[state.currentPlayer];
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const typeRow = document.createElement("div");
  typeRow.style = `
    display:grid;
    grid-template-columns:${currentPlayer.target === 25 ? "1fr 1fr" : "1fr 1fr 1fr"};
    gap:8px;
    margin-top:8px;
  `;

  const types = currentPlayer.target === 25
    ? [
        { label: "Green Bull", value: "greenBull" },
        { label: "Red Bull", value: "redBull" }
      ]
    : [
        { label: "Single", value: "single" },
        { label: "Double", value: "double" },
        { label: "Triple", value: "triple" }
      ];

  types.forEach(type => {
    const btn = document.createElement("div");
    btn.innerText = type.label;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:44px;
      font-size:16px;
    `;
    btn.onclick = () => {
      if (currentPlayer.target === 25) {
        submitGameThrow(type.value, 25);
        renderUI(container);
      } else {
        renderNumberPicker(container, type.value, "GAME");
      }
    };
    typeRow.appendChild(btn);
  });

  const bottomRow = document.createElement("div");
  bottomRow.style = `
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
    min-height:40px;
    font-size:15px;
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
    min-height:40px;
    font-size:15px;
  `;
  undoBtn.onclick = () => {
    undo();
    renderUI(container);
  };

  bottomRow.appendChild(nextBtn);
  bottomRow.appendChild(undoBtn);

  const endRow = document.createElement("div");
  endRow.style = `
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
    min-height:44px;
    font-size:16px;
  `;
  endBtn.onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };

  endRow.appendChild(endBtn);

  controls.appendChild(typeRow);
  controls.appendChild(bottomRow);
  controls.appendChild(endRow);
}

/* -------------------------
   MODALS
--------------------------*/

function renderNumberPicker(container, hitType, mode) {
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
        <h2 style="text-align:center;margin-top:0;">${hitType[0].toUpperCase() + hitType.slice(1)} Target</h2>
        <div id="numberGrid"></div>
        <div id="closeModal" style="
          ${buttonStyle()}
          padding:10px;
          min-height:44px;
          margin-top:12px;
        ">Close</div>
      </div>
    </div>
  `;

  const grid = document.getElementById("numberGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
  `;

  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement("div");
    btn.innerText = i;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:44px;
      font-size:16px;
    `;
    btn.onclick = () => {
      if (mode === "NDH") {
        submitNDHThrow(hitType, i);
      } else {
        submitGameThrow(hitType, i);
      }
      modal.innerHTML = "";
      renderUI(container);
    };
    grid.appendChild(btn);
  }

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
}

function renderTargetsModal(state) {
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
        <h2 style="text-align:center;margin-top:0;">Assigned Targets</h2>
        <div id="targetsList"></div>
        <div id="closeModal" style="
          ${buttonStyle()}
          padding:10px;
          min-height:44px;
          margin-top:12px;
        ">Close</div>
      </div>
    </div>
  `;

  const list = document.getElementById("targetsList");
  list.innerHTML = "";

  state.players.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:8px;
      padding:10px;
      border-radius:10px;
      background:#1e293b;
      border:1px solid #ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      font-weight:bold;
    `;
    row.innerHTML = `
      <span>${player.name}</span>
      <span>${formatAssignment(player)}${player.isKiller ? " | Killer" : ""}</span>
    `;
    list.appendChild(row);
  });

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  container.innerHTML = `
    <h2 style="text-align:center;">Game Over</h2>
    <h3 style="text-align:center;">🏆 Winner: ${state.winner || state.shanghaiWinner}</h3>
  `;
}
