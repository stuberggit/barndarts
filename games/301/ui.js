import {
  getState,
  submitThrow,
  nextPlayer,
  undo,
  isGameOver,
  initGame,
  confirmShanghaiWinner,
  cancelPendingShanghai,
  getThrowLog
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
    user-select:none;
    touch-action:manipulation;
  `;
}

function lightButtonStyle() {
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
    user-select:none;
    touch-action:manipulation;
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
    user-select:none;
    touch-action:manipulation;
  `;
}

function nextPlayerButtonStyle(isReady = false) {
  return `
    background:#206a1e;
    color:#ffffff;
    border:${isReady ? "3px solid #facc15" : "2px solid #facc15"};
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    text-align:center;
    user-select:none;
    touch-action:manipulation;
    box-shadow:${isReady ? "0 0 14px rgba(250,204,21,0.35)" : "none"};
  `;
}

function dangerButtonStyle() {
  return `
    background:#7f1d1d;
    color:#ffffff;
    border:1px solid #fca5a5;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    text-align:center;
    user-select:none;
    touch-action:manipulation;
  `;
}

function attachButtonClick(el, handler) {
  if (!el) return;

  let locked = false;

  const run = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (locked) return;
    if (el.dataset.disabled === "true") return;

    locked = true;

    try {
      handler(e);
    } finally {
      setTimeout(() => {
        locked = false;
      }, 250);
    }
  };

  el.onclick = null;
  el.ontouchstart = null;
  el.ontouchend = null;
  el.onpointerup = null;

  if (window.PointerEvent) {
    el.onpointerup = run;
  } else {
    el.ontouchend = run;
    el.onclick = run;
  }
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.innerHTML = "";
}

function renderModalShell(innerHtml) {
  const modal = document.getElementById("modal");
  if (!modal) return;

  modal.innerHTML = `
    <div id="overlayModal" style="
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
      padding:16px;
      box-sizing:border-box;
    ">
      <div id="overlayCard" style="
        background:#111111;
        color:#ffffff;
        padding:20px;
        border-radius:12px;
        width:100%;
        max-width:700px;
        max-height:90vh;
        overflow:auto;
        border:1px solid #ffffff;
      ">
        ${innerHtml}
      </div>
    </div>
  `;

  const overlay = document.getElementById("overlayModal");
  const card = document.getElementById("overlayCard");

  overlay.onclick = e => {
    if (e.target === overlay) closeModal();
  };

  card.onclick = e => {
    e.stopPropagation();
  };
}

function formatThrowLabel(throwRecord) {
  if (!throwRecord) return "";
  if (throwRecord.label) return throwRecord.label;

  if (throwRecord.hitType === "miss") return "Miss";
  if (throwRecord.hitType === "greenBull") return "BULL";
  if (throwRecord.hitType === "redBull") return "BULL";

  const labels = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labels[throwRecord.hitType] || "Hit"} ${throwRecord.target}`;
}

function getThrowValue(throwRecord) {
  if (!throwRecord) return 0;
  if (typeof throwRecord.value === "number") return throwRecord.value;
  return 0;
}

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
}

function getPpd(player) {
  const darts = player.stats?.dartsThrown || 0;
  const points = player.stats?.totalPoints || 0;
  if (!darts) return "0.00";
  return (points / darts).toFixed(2);
}

function getCellBaseStyle(extra = "") {
  return `
    border:1px solid rgba(209,213,219,0.55);
    color:#ffffff;
    display:flex;
    align-items:center;
    justify-content:center;
    box-sizing:border-box;
    min-width:0;
    min-height:31px;
    font-weight:900;
    line-height:1;
    user-select:none;
    touch-action:manipulation;
    margin:-1px 0 0 -1px;
    ${extra}
  `;
}

function getScoreCellHtml(number, marker = "") {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1;">
      <div style="font-size:clamp(12px, 1.55vw, 18px);font-weight:900;">${number}</div>
      ${marker ? `<div style="font-size:clamp(6px, 0.72vw, 8px);font-weight:900;letter-spacing:0.5px;opacity:0.9;line-height:1;">${marker}</div>` : ""}
    </div>
  `;
}

function buildMessageHtml(state) {
  if (!state.lastMessage) return `<div></div>`;

  const isRoutineScoreMessage = /\s scores \d+$/.test(state.lastMessage);

  if (isRoutineScoreMessage) {
    return `<div></div>`;
  }

  return `
    <div style="
      padding:7px 10px;
      border-radius:10px;
      background:rgba(255,255,255,0.08);
      color:${state.lastMessageColor || "#ffffff"};
      font-weight:bold;
      text-align:center;
      font-size:14px;
    ">
      ${state.lastMessage}
    </div>
  `;
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

  renderGame(container, state);
}

/* -------------------------
   GAME SCREEN
--------------------------*/

function renderGame(container, state) {
  const currentPlayer = state.players[state.currentPlayer];
  const dartDisplay = state.pendingWinner
    ? "Checkout hit — tap Next Player"
    : state.turnReadyForNext
      ? "Turn complete — tap Next Player"
      : `Dart ${Math.min(state.dartsThrown + 1, 3)}/3`;

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:8px;
      font-size:22px;
      font-weight:bold;
      color:#facc15;
    ">
      🎯 Current Player 🎯
    </div>

    <div style="
      margin-bottom:8px;
      padding:10px;
      border-radius:12px;
      background:#11361a;
      border:2px solid #f0970a;
      color:#ffffff;
      font-weight:bold;
    ">
      <div style="
        display:grid;
        grid-template-columns:repeat(${Math.max(1, Math.min((state.players || []).length, 5))}, minmax(0, 1fr));
        gap:7px;
      " id="scoreStrip"></div>

      <div style="
        margin-top:7px;
        text-align:center;
        font-size:14px;
        color:#facc15;
      ">
        ${currentPlayer ? currentPlayer.name : "—"} | ${dartDisplay}
      </div>
    </div>

    <div style="
      min-height:36px;
      margin:6px 0 8px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${buildMessageHtml(state)}
      </div>
    </div>

    <div id="scoringGrid"></div>
    <div id="turnSummary"></div>
    <div id="utilityControls"></div>
    <div id="modal"></div>
  `;

  renderScoreStrip(state);
  renderScoringGrid(container, state);
  renderTurnSummary(state);
  renderUtilityControls(container);

  if (state.pendingShanghai) {
    renderShanghaiConfirm(container, state.pendingShanghai);
  }
}

function renderScoreStrip(state) {
  const strip = document.getElementById("scoreStrip");
  if (!strip) return;

  strip.innerHTML = "";

  state.players.forEach((player, index) => {
    const isActive = index === state.currentPlayer;

    const tile = document.createElement("div");
    tile.style = `
      min-width:0;
      padding:7px 6px;
      border-radius:10px;
      background:${isActive ? "#1f4b25" : "rgba(0,0,0,0.35)"};
      border:${isActive ? "2px solid #facc15" : "1px solid rgba(255,255,255,0.45)"};
      box-shadow:${isActive ? "0 0 10px rgba(250,204,21,0.25)" : "none"};
      text-align:center;
      color:#ffffff;
      box-sizing:border-box;
      overflow:hidden;
    `;

    tile.innerHTML = `
      <div style="
        font-size:clamp(11px, 1.25vw, 15px);
        line-height:1.1;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        color:${isActive ? "#facc15" : "#ffffff"};
      ">
        ${isActive ? "➤ " : ""}${player.name}
      </div>
      <div style="font-size:clamp(18px, 2.5vw, 30px);line-height:1.05;margin-top:2px;">
        ${player.score}
      </div>
      <div style="font-size:clamp(9px, 1vw, 12px);opacity:0.82;line-height:1.1;margin-top:2px;">
        PPD ${getPpd(player)}
      </div>
    `;

    strip.appendChild(tile);
  });
}

/* -------------------------
   SCORING GRID
--------------------------*/

function renderScoringGrid(container, state) {
  const grid = document.getElementById("scoringGrid");
  if (!grid) return;

  const canThrow =
    !state.winner &&
    !state.pendingWinner &&
    !state.pendingShanghai &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  grid.innerHTML = "";
  grid.style = `
    display:grid;
    grid-template-columns:repeat(16, minmax(0, 1fr));
    grid-template-rows:repeat(5, minmax(31px, 1fr));
    gap:0;
    width:100%;
    box-sizing:border-box;
    border:1px solid rgba(209,213,219,0.65);
    overflow:hidden;
    background:#0b0f0d;
  `;

  addActionCell(grid, {
    label: "MISS",
    gridColumn: "1 / span 2",
    gridRow: "1 / span 1",
    kind: "standard",
    disabled: !canThrow,
    onClick: () => {
      submitThrow("miss");
      renderUI(container);
    }
  });

  addActionCell(grid, {
    label: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">
        <div>BULL</div>
        <div style="font-size:10px;opacity:0.9;line-height:1;">(25)</div>
      </div>
    `,
    gridColumn: "1 / span 2",
    gridRow: "2 / span 2",
    kind: "standard",
    disabled: !canThrow,
    onClick: () => {
      submitThrow("greenBull");
      renderUI(container);
    }
  });

  addActionCell(grid, {
    label: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">
        <div>BULL</div>
        <div style="font-size:10px;opacity:0.9;line-height:1;">(50)</div>
      </div>
    `,
    gridColumn: "1 / span 2",
    gridRow: "4 / span 2",
    kind: "standard",
    disabled: !canThrow,
    onClick: () => {
      submitThrow("redBull");
      renderUI(container);
    }
  });

  const rows = [
    [20, 19, 18, 17],
    [16, 15, 14, 13],
    [12, 11, 10, 9],
    [8, 7, 6, 5],
    [4, 3, 2, 1]
  ];

  rows.forEach((numbers, rowIndex) => {
    numbers.forEach((number, numberIndex) => {
      addScoreCell(grid, {
        number,
        hitType: "single",
        marker: "",
        gridColumn: `${3 + numberIndex} / span 1`,
        gridRow: `${rowIndex + 1} / span 1`,
        shade: "rgba(255,255,255,0.045)",
        disabled: !canThrow,
        container
      });

      addScoreCell(grid, {
        number,
        hitType: "double",
        marker: "xx",
        gridColumn: `${7 + numberIndex} / span 1`,
        gridRow: `${rowIndex + 1} / span 1`,
        shade: "rgba(34,197,94,0.13)",
        disabled: !canThrow,
        container
      });

      addScoreCell(grid, {
        number,
        hitType: "triple",
        marker: "xxx",
        gridColumn: `${11 + numberIndex} / span 1`,
        gridRow: `${rowIndex + 1} / span 1`,
        shade: "rgba(250,204,21,0.11)",
        disabled: !canThrow,
        container
      });
    });
  });

  addActionCell(grid, {
    label: "Undo",
    gridColumn: "15 / span 2",
    gridRow: "1 / span 2",
    kind: "undo",
    disabled: false,
    onClick: () => {
      undo();
      renderUI(container);
    }
  });

  addActionCell(grid, {
    label: "Next<br>Player",
    gridColumn: "15 / span 2",
    gridRow: "3 / span 3",
    kind: "next",
    ready: state.turnReadyForNext || state.pendingWinner,
    disabled: !!state.pendingShanghai,
    onClick: () => {
      nextPlayer();
      renderUI(container);
    }
  });
}

function addActionCell(parent, options) {
  const btn = document.createElement("div");
  btn.innerHTML = options.label;
  btn.dataset.disabled = options.disabled ? "true" : "false";

  let background = "#206a1e";
  let color = "#ffffff";
  let borderColor = "rgba(209,213,219,0.65)";
  let boxShadow = "none";

  if (options.kind === "undo") {
    background = "#206a1e";
    borderColor = "#ff4c4c";
  }

  if (options.kind === "next") {
    background = "#206a1e";
    borderColor = "#facc15";
    boxShadow = options.ready ? "inset 0 0 0 2px rgba(250,204,21,0.55)" : "none";
  }

  btn.style = `
    ${getCellBaseStyle()}
    grid-column:${options.gridColumn};
    grid-row:${options.gridRow};
    background:${background};
    color:${color};
    border-color:${borderColor};
    padding:3px;
    font-size:clamp(10px, 1.25vw, 15px);
    line-height:1.08;
    min-height:0;
    cursor:${options.disabled ? "not-allowed" : "pointer"};
    opacity:${options.disabled ? "0.42" : "1"};
    box-shadow:${boxShadow};
  `;

  attachButtonClick(btn, () => {
    if (options.disabled) return;
    options.onClick();
  });

  parent.appendChild(btn);
}

function addScoreCell(parent, options) {
  const btn = document.createElement("div");
  btn.innerHTML = getScoreCellHtml(options.number, options.marker);
  btn.dataset.disabled = options.disabled ? "true" : "false";
  btn.style = `
    ${getCellBaseStyle()}
    grid-column:${options.gridColumn};
    grid-row:${options.gridRow};
    background:${options.shade};
    cursor:${options.disabled ? "not-allowed" : "pointer"};
    opacity:${options.disabled ? "0.42" : "1"};
  `;

  attachButtonClick(btn, () => {
    if (options.disabled) return;
    submitThrow(options.hitType, options.number);
    renderUI(options.container);
  });

  parent.appendChild(btn);
}

/* -------------------------
   TURN SUMMARY / UTILITIES
--------------------------*/

function renderTurnSummary(state) {
  const summary = document.getElementById("turnSummary");
  if (!summary) return;

  const throws = state.currentTurnThrows || [];

  const total = throws.reduce((sum, throwRecord) => {
    if (throwRecord.result === "bust") return sum;
    return sum + getThrowValue(throwRecord);
  }, 0);

  summary.innerHTML = `
    <div style="
      margin-top:8px;
      padding:10px;
      border-radius:12px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-bottom:8px;
      ">
        <div style="font-size:17px;font-weight:bold;">Turn</div>
        <div style="font-size:14px;color:#facc15;font-weight:bold;">Total: ${total}</div>
      </div>

      ${
        throws.length === 0
          ? `
            <div style="text-align:center;opacity:0.85;font-weight:bold;font-size:14px;">
              No darts thrown.
            </div>
          `
          : throws.map((throwRecord, index) => {
              const value = getThrowValue(throwRecord);
              const sign = value > 0 ? "-" : "";
              const resultColor = throwRecord.result === "bust"
                ? "#ff4c4c"
                : throwRecord.result === "checkout"
                  ? "#22c55e"
                  : "#facc15";

              return `
                <div style="
                  display:grid;
                  grid-template-columns:64px 1fr auto;
                  align-items:center;
                  gap:8px;
                  padding:6px 0;
                  border-top:${index === 0 ? "none" : "1px solid rgba(255,255,255,0.2)"};
                  font-weight:bold;
                  font-size:14px;
                ">
                  <div style="opacity:0.85;">Dart ${index + 1}</div>
                  <div>${formatThrowLabel(throwRecord)}</div>
                  <div style="color:${resultColor};">${sign}${value}</div>
                </div>
              `;
            }).join("")
      }
    </div>
  `;
}

function renderUtilityControls(container) {
  const utilityControls = document.getElementById("utilityControls");
  if (!utilityControls) return;

  utilityControls.innerHTML = "";

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const statsBtn = document.createElement("div");
  statsBtn.innerText = "Stats";
  statsBtn.style = `
    ${lightButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(statsBtn, () => {
    renderStatsModal(getThrowLog());
  });

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(undoBtn, () => {
    undo();
    renderUI(container);
  });

  const endBtn = document.createElement("div");
  endBtn.innerText = "End";
  endBtn.style = `
    ${dangerButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(endBtn, () => {
    renderEndGameConfirm(container);
  });

  utilityRow.appendChild(statsBtn);
  utilityRow.appendChild(undoBtn);
  utilityRow.appendChild(endBtn);

  utilityControls.appendChild(utilityRow);
}

/* -------------------------
   MODALS
--------------------------*/

function renderShanghaiConfirm(container, pendingShanghai) {
  const isBullShanghai = !!pendingShanghai.isBullShanghai;

  const shanghaiMessage = isBullShanghai
    ? `${pendingShanghai.playerName} hit 3 Bulls this turn.<br>
       Confirm Bull Shanghai and end the game?`
    : `${pendingShanghai.playerName} hit Single + Dub + Trip on ${pendingShanghai.target}.<br>
       Confirm Shanghai and end the game?`;

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">
      ${isBullShanghai ? "BULL SHANGHAI?" : "SHANGHAI?"}
    </h2>

    <div style="text-align:center;margin-bottom:14px;line-height:1.45;">
      ${shanghaiMessage}
    </div>

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    ">
      <div id="cancelShanghaiBtn" style="
        ${lightButtonStyle()}
        padding:12px;
        min-height:48px;
      ">Cancel</div>

      <div id="confirmShanghaiBtn" style="
        ${buttonStyle()}
        padding:12px;
        min-height:48px;
        border:1px solid #facc15;
      ">Confirm</div>
    </div>
  `);

  attachButtonClick(document.getElementById("cancelShanghaiBtn"), () => {
    cancelPendingShanghai();
    closeModal();
    renderUI(container);
  });

  attachButtonClick(document.getElementById("confirmShanghaiBtn"), () => {
    confirmShanghaiWinner();
    closeModal();
    renderUI(container);
  });
}

function renderLeaderboardModal(state) {
  const rankedPlayers = [...state.players].sort((a, b) => a.score - b.score);

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">Leaderboard</h2>
    <div id="leaderboardList"></div>
    <div style="
      display:flex;
      justify-content:center;
      margin-top:12px;
    ">
      <div id="closeModalBtn" style="
        ${buttonStyle()}
        width:110px;
        min-height:38px;
        font-size:15px;
        border:1px solid #ff4c4c;
      ">Close</div>
    </div>
  `);

  const list = document.getElementById("leaderboardList");
  list.innerHTML = "";

  rankedPlayers.forEach((player, index) => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:12px;
      border-radius:10px;
      background:#111111;
      border:1px solid #ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      color:#ffffff;
      font-weight:bold;
    `;

    row.innerHTML = `
      <div>${index + 1}. ${player.name}</div>
      <div>${player.score}</div>
    `;

    list.appendChild(row);
  });

  attachButtonClick(document.getElementById("closeModalBtn"), closeModal);
}

function renderStatsModal(throwLog) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">Throw Log</h2>
    <div id="throwLogList"></div>
    <div style="
      display:flex;
      justify-content:center;
      margin-top:12px;
    ">
      <div id="closeModalBtn" style="
        ${buttonStyle()}
        width:110px;
        min-height:38px;
        font-size:15px;
        border:1px solid #ff4c4c;
      ">Close</div>
    </div>
  `);

  const list = document.getElementById("throwLogList");
  list.innerHTML = "";

  throwLog.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:12px;
      padding:14px;
      border-radius:10px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    `;

    const throwsHtml = player.throws.length
      ? player.throws.map(t => `
          <div style="
            padding:6px 0;
            border-top:1px solid rgba(255,255,255,0.16);
            font-size:14px;
            line-height:1.4;
          ">
            Turn ${t.turnNumber}, Dart ${t.dartNumber}: ${t.label}
            (${t.scoreBefore} → ${t.scoreAfter})
            ${t.result !== "scored" ? `<span style="color:#facc15;"> — ${t.result}</span>` : ""}
          </div>
        `).join("")
      : `<div style="opacity:0.8;">No throws recorded.</div>`;

    row.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">${player.name}</div>
      ${throwsHtml}
    `;

    list.appendChild(row);
  });

  attachButtonClick(document.getElementById("closeModalBtn"), closeModal);
}

function renderEndGameConfirm(container) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">End Game?</h2>
    <div style="text-align:center;margin-bottom:14px;">
      Are you sure you want to end this game early?
    </div>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    ">
      <div id="cancelEndBtn" style="
        ${lightButtonStyle()}
        padding:12px;
        min-height:48px;
      ">Cancel</div>
      <div id="confirmEndBtn" style="
        ${dangerButtonStyle()}
        padding:12px;
        min-height:48px;
      ">End Game</div>
    </div>
  `);

  attachButtonClick(document.getElementById("cancelEndBtn"), closeModal);

  attachButtonClick(document.getElementById("confirmEndBtn"), () => {
    closeModal();
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  container.innerHTML = `
    <div style="
      padding:16px;
      border-radius:16px;
      background:#11361a;
      border:3px solid #facc15;
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="
        background:#facc15;
        color:#111111;
        border-radius:10px;
        padding:10px;
        margin-bottom:14px;
        font-size:20px;
        letter-spacing:0.5px;
      ">
        CHECKOUT COMPLETE
      </div>

      <div style="font-size:30px;line-height:1.15;color:#ffffff;">
        ${state.winner} Wins 301!
      </div>

      <div style="font-size:17px;color:#facc15;margin-top:8px;">
        Zero never looked so good.
      </div>

      <div style="font-size:14px;color:#bfdbfe;margin-top:8px;line-height:1.45;">
        The math is done, the darts are counted, and the checkout belongs to ${state.winner}.
      </div>
    </div>

    <div id="endScoreStrip" style="margin-top:12px;"></div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:12px;
    " id="endControls"></div>

    <div id="modal"></div>
  `;

  renderEndScoreStrip(state);

  const controls = document.getElementById("endControls");

  const playAgainBtn = document.createElement("div");
  playAgainBtn.innerText = "Play Again";
  playAgainBtn.style = `
    ${buttonStyle()}
    padding:14px;
    min-height:52px;
    font-size:18px;
    border:2px solid #facc15;
  `;
  attachButtonClick(playAgainBtn, () => {
    const rotatedPlayers = rotatePlayers(state.originalPlayers || store.players || []);
    store.players = [...rotatedPlayers];
    initGame(rotatedPlayers);
    renderUI(container);
  });

  const statsBtn = document.createElement("div");
  statsBtn.innerText = "Stats";
  statsBtn.style = `
    ${lightButtonStyle()}
    padding:14px;
    min-height:52px;
    font-size:18px;
  `;
  attachButtonClick(statsBtn, () => {
    renderStatsModal(getThrowLog());
  });

  const leaderboardBtn = document.createElement("div");
  leaderboardBtn.innerText = "Leaderboard";
  leaderboardBtn.style = `
    ${lightButtonStyle()}
    padding:14px;
    min-height:52px;
    font-size:18px;
  `;
  attachButtonClick(leaderboardBtn, () => {
    renderLeaderboardModal(getState());
  });

  const mainMenuBtn = document.createElement("div");
  mainMenuBtn.innerText = "Main Menu";
  mainMenuBtn.style = `
    ${buttonStyle()}
    padding:14px;
    min-height:52px;
    font-size:18px;
  `;
  attachButtonClick(mainMenuBtn, () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });

  controls.appendChild(playAgainBtn);
  controls.appendChild(statsBtn);
  controls.appendChild(leaderboardBtn);
  controls.appendChild(mainMenuBtn);
}

function renderEndScoreStrip(state) {
  const wrap = document.getElementById("endScoreStrip");
  if (!wrap) return;

  const rankedPlayers = [...(state.players || [])].sort((a, b) => a.score - b.score);

  wrap.innerHTML = "";
  wrap.style = `
    display:grid;
    grid-template-columns:repeat(${Math.max(1, Math.min(rankedPlayers.length, 5))}, minmax(0, 1fr));
    gap:7px;
    margin-top:12px;
  `;

  rankedPlayers.forEach((player, index) => {
    const isWinner = player.name === state.winner;

    const tile = document.createElement("div");
    tile.style = `
      padding:10px 8px;
      border-radius:10px;
      background:${isWinner ? "#11361a" : "#111111"};
      border:${isWinner ? "2px solid #facc15" : "1px solid #ffffff"};
      color:#ffffff;
      text-align:center;
      font-weight:bold;
      min-width:0;
    `;

    tile.innerHTML = `
      <div style="font-size:12px;color:${isWinner ? "#facc15" : "rgba(255,255,255,0.75)"};">
        ${index + 1}
      </div>
      <div style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${player.name}
      </div>
      <div style="font-size:24px;line-height:1.1;margin-top:3px;">
        ${player.score}
      </div>
      <div style="font-size:11px;opacity:0.8;margin-top:2px;">
        PPD ${getPpd(player)}
      </div>
    `;

    wrap.appendChild(tile);
  });
}
