import {
  getState,
  submitNDHThrow,
  submitGameThrow,
  submitRedemskiThrow,
  nextPlayer,
  undo,
  isGameOver
} from "./logic.js";
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
    text-align:center;
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
    text-align:center;
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
    text-align:center;
  `;
}

function isPlayerSelectableTarget(player) {
  return !!player && player.target != null && (player.isActive || player.isDormantDead);
}

function formatAssignment(player) {
  if (!player.target) return "Unassigned";

  if (player.target === 25) {
    return player.hitType === "redBull" ? "Red Bull" : "Green Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labelMap[player.hitType]} ${player.target}`;
}

function formatTargetNumber(target) {
  return target === 25 ? "Bull" : String(target);
}

function getTargetOptions(state, currentPlayer) {
  const seen = new Set();
  const options = [];

  state.players.forEach(player => {
    if (!isPlayerSelectableTarget(player)) return;

    if (!seen.has(player.target)) {
      seen.add(player.target);
      options.push(player.target);
    }
  });

  if (currentPlayer.target != null && !seen.has(currentPlayer.target)) {
    options.unshift(currentPlayer.target);
  }

  return options.sort((a, b) => {
    if (a === 25) return 1;
    if (b === 25) return -1;
    return a - b;
  });
}

function getPlayerStatusHtml(player) {
  const parts = [];

  if (player.isZombie) {
    parts.push(`<span style="color:#f97316;">🧟 Zombie</span>`);
  }

  if (player.isDormantDead) {
    parts.push(`<span style="color:#9ca3af;">💀 Dormant Dead</span>`);
  }

  if (player.isKiller) {
    parts.push(`<span style="color:#ff4c4c;">Killer</span>`);
  }

  if (player.isRedemski && !player.isDormantDead) {
    parts.push(`<span style="color:#facc15;">Redemski</span>`);
  }

  return parts.join(" | ");
}

function getRowBackground(player, isHighlighted) {
  if (player.isDormantDead) {
    return isHighlighted ? "#374151" : "#1f2937";
  }

  if (player.isZombie) {
    return isHighlighted ? "#7c2d12" : "#431407";
  }

  return isHighlighted ? "#1e293b" : "#111111";
}

function getRowOpacity(player) {
  if (player.isDormantDead) return 0.65;
  return player.isActive ? 1 : 0.75;
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

  if (state.phase === "REDEMSKI") {
    renderRedemski(container, state);
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
    rowForPlayer(board, player, isActive, false);
  });
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

/* -------------------------
   REDEMSKI SCREEN
--------------------------*/

function renderRedemski(container, state) {
  const { showFlash, flashHtml } = buildFlashHtml(state);
  const redemskiPlayer = state.players[state.redemskiPlayerIndex];

  container.innerHTML = `
    <h2 style="text-align:center;margin-bottom:8px;">Killer</h2>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:18px;
      font-weight:bold;
      color:#facc15;
    ">
      ⚡ Redemski: ${redemskiPlayer.name}
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

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:16px;
      font-weight:bold;
    ">
      Hit Dub or Trip ${formatTargetNumber(redemskiPlayer.target)} to stay alive
    </div>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:15px;
      color:#facc15;
      font-weight:bold;
    ">
      Dart ${state.dartsThrown + 1}/3
    </div>

    <div id="controls"></div>

    <div id="modal"></div>
  `;

  renderPlayerBoard(state);
  renderRedemskiControls(container, redemskiPlayer);

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
    const isActiveTurn =
      state.phase === "REDEMSKI"
        ? index === state.redemskiPlayerIndex
        : index === state.currentPlayer;

    rowForPlayer(board, player, isActiveTurn, true);
  });
}

function rowForPlayer(parent, player, isHighlighted, includeLives) {
  const row = document.createElement("div");
  row.style = `
    margin-bottom:8px;
    padding:10px;
    border-radius:10px;
    background:${getRowBackground(player, isHighlighted)};
    border:1px solid #ffffff;
    display:flex;
    justify-content:space-between;
    align-items:center;
    color:#ffffff;
    font-weight:bold;
    font-size:14px;
    opacity:${getRowOpacity(player)};
    gap:12px;
  `;

  const statusHtml = getPlayerStatusHtml(player);
  const rightCore = includeLives
    ? `${formatAssignment(player)} | Lives ${player.lives}`
    : `${formatAssignment(player)}`;

  const rightSide = statusHtml
    ? `${rightCore} | ${statusHtml}`
    : rightCore;

  row.innerHTML = `
    <span>${player.name}</span>
    <span style="text-align:right;">${rightSide}</span>
  `;

  parent.appendChild(row);
}

/* -------------------------
   CONTROLS
--------------------------*/

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
    { label: "Dub", value: "double" },
    { label: "Trip", value: "triple" }
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
      renderNumberPicker(container, type.value);
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
    renderTargetsModal(stateSnapshot());
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

function renderGameControls(container) {
  const state = getState();
  const currentPlayer = state.players[state.currentPlayer];
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const types = currentPlayer.target === 25
    ? [
        { label: "Green Bull", value: "greenBull" },
        { label: "Red Bull", value: "redBull" }
      ]
    : [
        { label: "Single", value: "single" },
        { label: "Dub", value: "double" },
        { label: "Trip", value: "triple" }
      ];

  const typeRow = document.createElement("div");
  typeRow.style = `
    display:grid;
    grid-template-columns:${currentPlayer.target === 25 ? "1fr 1fr" : "1fr 1fr 1fr"};
    gap:8px;
    margin-top:8px;
  `;

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
        renderTargetPicker(container, type.value, stateSnapshot());
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

function renderRedemskiControls(container, player) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const typeRow = document.createElement("div");
  typeRow.style = `
    display:grid;
    grid-template-columns:${player.target === 25 ? "1fr" : "1fr 1fr"};
    gap:8px;
    margin-top:8px;
  `;

  const validTypes = player.target === 25
    ? [{ label: "Red Bull", value: "redBull" }]
    : [
        { label: "Dub", value: "double" },
        { label: "Trip", value: "triple" }
      ];

  validTypes.forEach(type => {
    const btn = document.createElement("div");
    btn.innerText = type.label;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:44px;
      font-size:16px;
    `;
    btn.onclick = () => {
      submitRedemskiThrow(type.value, player.target);
      renderUI(container);
    };
    typeRow.appendChild(btn);
  });

  const missRow = document.createElement("div");
  missRow.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-top:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "Miss";
  missBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:44px;
    font-size:16px;
  `;
  missBtn.onclick = () => {
    submitRedemskiThrow("miss", null);
    renderUI(container);
  };

  missRow.appendChild(missBtn);

  const bottomRow = document.createElement("div");
  bottomRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "Fail Redemski";
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

  controls.appendChild(typeRow);
  controls.appendChild(missRow);
  controls.appendChild(bottomRow);
}

/* -------------------------
   MODALS
--------------------------*/

function stateSnapshot() {
  return getState();
}

function renderNumberPicker(container, hitType) {
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
        <h2 style="text-align:center;margin-top:0;">${hitType === "single" ? "Single" : hitType === "double" ? "Dub" : "Trip"} Target</h2>
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
      submitNDHThrow(hitType, i);
      modal.innerHTML = "";
      renderUI(container);
    };
    grid.appendChild(btn);
  }

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
}

function renderTargetPicker(container, hitType, state) {
  const modal = document.getElementById("modal");
  const currentPlayer = state.players[state.currentPlayer];
  const options = getTargetOptions(state, currentPlayer);

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
        <h2 style="text-align:center;margin-top:0;">${hitType === "single" ? "Single" : hitType === "double" ? "Dub" : "Trip"} Target</h2>
        <div id="targetGrid"></div>
        <div id="closeModal" style="
          ${buttonStyle()}
          padding:10px;
          min-height:44px;
          margin-top:12px;
        ">Close</div>
      </div>
    </div>
  `;

  const grid = document.getElementById("targetGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
  `;

  options.forEach(target => {
    const matchingPlayer = state.players.find(player => player.target === target);
    const isDormantDeadTarget = matchingPlayer?.isDormantDead;

    const btn = document.createElement("div");
    btn.innerHTML = `
      <div>${formatTargetNumber(target)}</div>
      ${isDormantDeadTarget ? `<div style="font-size:12px;color:#f97316;margin-top:4px;">🧟 Zombie Trigger</div>` : ""}
    `;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:54px;
      font-size:16px;
      flex-direction:column;
    `;
    btn.onclick = () => {
      submitGameThrow(hitType, target);
      modal.innerHTML = "";
      renderUI(container);
    };
    grid.appendChild(btn);
  });

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
    rowForPlayer(list, player, false, true);
  });

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  const winnerName = state.winner || state.shanghaiWinner;
  const isShanghai = !!state.shanghaiWinner;

  container.innerHTML = `
    <h2 style="text-align:center;">Game Over</h2>
    <h3 style="text-align:center;">
      ${isShanghai ? "🏆 SHANGHAI Winner:" : "🏆 Winner:"} ${winnerName}
    </h3>
  `;
}
