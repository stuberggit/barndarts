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
    border:${isReady ? "3px solid #facc15" : "1px solid #ffffff"};
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
  if (throwRecord.hitType === "greenBull") return "Sing Bull";
  if (throwRecord.hitType === "redBull") return "Dub Bull";

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
    border:1px solid rgba(209,213,219,0.58);
    color:#ffffff;
    display:flex;
    align-items:center;
    justify-content:center;
    box-sizing:border-box;
    min-width:0;
    min-height:40px;
    font-weight:700;
    line-height:1;
    user-select:none;
    touch-action:manipulation;
    margin:-1px 0 0 -1px;
    ${extra}
  `;
}

function getScoreCellHtml(number, marker = "") {
  return `
    <div style="
      display:grid;
      grid-template-rows:1fr 9px;
      align-items:center;
      justify-items:center;
      width:100%;
      height:100%;
      line-height:1;
      padding-top:2px;
      box-sizing:border-box;
    ">
      <div style="
        font-size:clamp(13px, 1.65vw, 19px);
        font-weight:700;
        line-height:1;
      ">
        ${number}
      </div>

      <div style="
        font-size:clamp(6px, 0.72vw, 8px);
        font-weight:700;
        letter-spacing:0.5px;
        opacity:${marker ? "0.95" : "0"};
        line-height:1;
      ">
        ${marker || "xx"}
      </div>
    </div>
  `;
}

function getBullCellHtml(label, valueLabel) {
  return `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      width:100%;
      height:100%;
      line-height:1;
      box-sizing:border-box;
      transform:translateY(-1px);
    ">
      <div style="
        font-size:clamp(12px, 1.35vw, 16px);
        font-weight:800;
        line-height:1;
        letter-spacing:0.2px;
      ">
        ${label}
      </div>
      <div style="
        font-size:clamp(12px, 1.35vw, 16px);
        font-weight:800;
        line-height:1;
        margin-top:2px;
        letter-spacing:0.2px;
      ">
        Bull
      </div>
      <div style="
        font-size:clamp(8px, 0.95vw, 11px);
        font-weight:700;
        opacity:0.9;
        line-height:1;
        margin-top:3px;
      ">
        (${valueLabel})
      </div>
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
    </div>

    <div id="scoringGrid"></div>
    <div id="primaryControls"></div>
    <div id="turnSummary"></div>
    <div id="utilityControls"></div>
    <div id="modal"></div>
  `;

  renderScoreStrip(state);
  renderScoringGrid(container, state);
  renderPrimaryControls(container, state);
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
    grid-template-columns:repeat(14, minmax(0, 1fr));
    grid-template-rows:repeat(5, minmax(40px, 1fr));
    gap:0;
    width:100%;
    box-sizing:border-box;
    border:1px solid rgba(209,213,219,0.7);
    border-radius:12px;
    overflow:hidden;
    background:#0b0f0d;
    margin-top:0;
  `;

  const bullStack = document.createElement("div");
  bullStack.style = `
    grid-column:1 / span 2;
    grid-row:1 / span 5;
    display:grid;
    grid-template-rows:1fr 1fr;
    min-width:0;
    min-height:0;
  `;

  addBullCell(bullStack, {
    label: getBullCellHtml("Sing", "25"),
    disabled: !canThrow,
    onClick: () => {
      submitThrow("greenBull");
      renderUI(container);
    }
  });

  addBullCell(bullStack, {
    label: getBullCellHtml("Dub", "50"),
    disabled: !canThrow,
    onClick: () => {
      submitThrow("redBull");
      renderUI(container);
    }
  });

  grid.appendChild(bullStack);

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
        shade: "rgba(255,255,255,0.085)",
        disabled: !canThrow,
        container
      });

      addScoreCell(grid, {
        number,
        hitType: "double",
        marker: "xx",
        gridColumn: `${7 + numberIndex} / span 1`,
        gridRow: `${rowIndex + 1} / span 1`,
        shade: "rgba(34,197,94,0.22)",
        disabled: !canThrow,
        container
      });

      addScoreCell(grid, {
        number,
        hitType: "triple",
        marker: "xxx",
        gridColumn: `${11 + numberIndex} / span 1`,
        gridRow: `${rowIndex + 1} / span 1`,
        shade: "rgba(250,204,21,0.22)",
        disabled: !canThrow,
        container
      });
    });
  });
}

function addBullCell(parent, options) {
  const btn = document.createElement("div");
  btn.innerHTML = options.label;
  btn.dataset.disabled = options.disabled ? "true" : "false";

  btn.style = `
    ${getCellBaseStyle()}
    background:#206a1e;
    color:#ffffff;
    border-color:rgba(209,213,219,0.65);
    padding:3px;
    font-size:clamp(10px, 1.25vw, 15px);
    line-height:1.08;
    min-height:0;
    cursor:${options.disabled ? "not-allowed" : "pointer"};
    opacity:${options.disabled ? "0.42" : "1"};
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
   PRIMARY CONTROLS
--------------------------*/

function renderPrimaryControls(container, state) {
  const controls = document.getElementById("primaryControls");
  if (!controls) return;

  const canThrow =
    !state.winner &&
    !state.pendingWinner &&
    !state.pendingShanghai &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  const readyForNext = state.turnReadyForNext || state.pendingWinner;

  controls.innerHTML = "";

  const row = document.createElement("div");
  row.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss";
  missBtn.dataset.disabled = !canThrow ? "true" : "false";
  missBtn.style = `
    ${buttonStyle()}
    padding:8px;
    min-height:40px;
    font-size:15px;
    ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;
  attachButtonClick(missBtn, () => {
    if (!canThrow) return;
    submitThrow("miss");
    renderUI(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.dataset.disabled = state.pendingShanghai ? "true" : "false";
  nextBtn.style = `
    ${nextPlayerButtonStyle(readyForNext)}
    padding:8px;
    min-height:40px;
    font-size:15px;
    ${state.pendingShanghai ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;
  attachButtonClick(nextBtn, () => {
    if (state.pendingShanghai) return;
    nextPlayer();
    renderUI(container);
  });

  row.appendChild(missBtn);
  row.appendChild(nextBtn);

  controls.appendChild(row);
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
   WIN COPY
--------------------------*/

const THREE_OH_ONE_WIN_COPY = {
  banners: [
    "CHECKOUT COMPLETE",
    "ZEROED OUT",
    "PERFECTLY COMPLIANT",
    "THE MATH CHECKED OUT",
    "FINISHED ON TIME",
    "DIRECTIONS FOLLOWED",
    "CLEAN EXIT",
    "NO POINTS LEFT BEHIND",
    "MISSION ACTUALLY ACCOMPLISHED",
    "THE ASSIGNMENT WAS UNDERSTOOD",
    "FINAL DART FILED",
    "COMPLIANCE HAS ENTERED THE CHAT"
  ],

  headlines: [
    "{winnerName} Wins 301!",
    "{winnerName} Checked Out Like a Damn Professional!",
    "{winnerName} Hit Zero and Left No Crumbs!",
    "{winnerName} Finished the Job!",
    "{winnerName} Followed Directions All the Way to Zero!",
    "{winnerName} Submitted a Perfectly Legal Checkout!",
    "{winnerName} Did the Math and Made It Hurt!",
    "{winnerName} Turned 301 Into 0!",
    "{winnerName} Closed the Books!",
    "{winnerName} Got to Zero Without Asking for an Extension!",
    "{winnerName} Completed the Assignment!",
    "{winnerName} Is Your 301 Finisher!"
  ],

  subheads: [
    "Zero points. Zero excuses. Maximum compliance.",
    "The scoreboard asked for zero, and they actually listened.",
    "A rare case of darts, math, and basic instructions working together.",
    "Finished clean, on time, and suspiciously competent.",
    "That checkout was filed, approved, and emotionally damaging.",
    "The dartboard gave directions. They followed every damn one.",
    "No late work. No extra credit. Just zero.",
    "A tidy little finish with just enough disrespect.",
    "This is what happens when someone reads the instructions.",
    "The assignment was 301. The answer was domination.",
    "Compliance never looked this annoying.",
    "A clean finish from someone who clearly understood the rubric."
  ],

  bodyCopies: [
    "Some players wandered through the math. {winnerName} showed up, followed directions, and checked out before things got weird.",
    "There were points to remove, darts to throw, and a very simple goal. {winnerName} handled all three without making it everyone else’s problem.",
    "The board demanded precision, the score demanded discipline, and {winnerName} delivered a checkout that was almost too responsible.",
    "A lesser player might have busted, panicked, or blamed the lighting. {winnerName} simply got to zero and let the rest of the room process it.",
    "That was less of a win and more of a strongly worded memo to everyone still stuck above zero.",
    "{winnerName} took 301 points, followed the instructions, and returned them to sender with interest.",
    "The math was clean, the finish was rude, and the rest of the field is now reviewing their life choices.",
    "No loopholes. No nonsense. No points remaining. {winnerName} completed the task like a dartboard tax auditor.",
    "Everybody had the same assignment. {winnerName} was the only one who turned it in on time and made it look slightly personal.",
    "That checkout had structure, discipline, and just enough bastard energy to make it memorable.",
    "The score hit zero, the room got quiet, and {winnerName} walked away like they had read the damn syllabus.",
    "A beautiful little act of compliance: start at 301, subtract correctly, end everyone’s evening."
  ]
};

function pickRandomCopy(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(Math.random() * items.length)];
}

function personalizeCopyText(text, winnerName) {
  return String(text || "").replaceAll("{winnerName}", winnerName || "Winner");
}

function getThreeOhOneWinCopy(winnerName) {
  return {
    banner: personalizeCopyText(pickRandomCopy(THREE_OH_ONE_WIN_COPY.banners), winnerName),
    headline: personalizeCopyText(pickRandomCopy(THREE_OH_ONE_WIN_COPY.headlines), winnerName),
    subhead: personalizeCopyText(pickRandomCopy(THREE_OH_ONE_WIN_COPY.subheads), winnerName),
    bodyCopy: personalizeCopyText(pickRandomCopy(THREE_OH_ONE_WIN_COPY.bodyCopies), winnerName)
  };
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  const winnerName = state.winner || "Winner";
  const winCopy = getThreeOhOneWinCopy(winnerName);

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
        text-transform:uppercase;
      ">
        ${winCopy.banner}
      </div>

      <div style="
        font-size:28px;
        line-height:1;
        margin-bottom:10px;
      ">
        🏆 🎯 🏆
      </div>

      <div style="
        font-size:30px;
        line-height:1.15;
        color:#ffffff;
      ">
        ${winCopy.headline}
      </div>

      <div style="
        font-size:17px;
        color:#facc15;
        margin-top:8px;
        line-height:1.35;
      ">
        ${winCopy.subhead}
      </div>

      <div style="
        font-size:14px;
        color:#bfdbfe;
        margin-top:8px;
        line-height:1.45;
      ">
        ${winCopy.bodyCopy}
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
  controls.appendChild(mainMenuBtn);
}

function renderEndScoreStrip(state) {
  const wrap = document.getElementById("endScoreStrip");
  if (!wrap) return;

  const rankedPlayers = [...(state.players || [])].sort((a, b) => a.score - b.score);

  wrap.innerHTML = "";
  wrap.style = `
    display:flex;
    flex-direction:column;
    gap:8px;
    margin-top:12px;
  `;

  rankedPlayers.forEach((player, index) => {
    const isWinner = player.name === state.winner;

    const row = document.createElement("div");
    row.style = `
      padding:12px 14px;
      border-radius:12px;
      background:${isWinner ? "#11361a" : "#111111"};
      border:${isWinner ? "2px solid #facc15" : "1px solid #ffffff"};
      color:#ffffff;
      font-weight:bold;
      display:grid;
      grid-template-columns:44px 1fr auto;
      align-items:center;
      gap:10px;
      box-sizing:border-box;
    `;

    row.innerHTML = `
      <div style="
        width:32px;
        height:32px;
        border-radius:999px;
        background:${isWinner ? "#facc15" : "rgba(255,255,255,0.12)"};
        color:${isWinner ? "#111111" : "#ffffff"};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:14px;
        font-weight:900;
      ">
        ${index + 1}
      </div>

      <div style="
        min-width:0;
        text-align:left;
      ">
        <div style="
          font-size:17px;
          line-height:1.15;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          color:${isWinner ? "#facc15" : "#ffffff"};
        ">
          ${player.name}
        </div>

        <div style="
          font-size:12px;
          opacity:0.82;
          margin-top:3px;
        ">
          PPD ${getPpd(player)}
        </div>
      </div>

      <div style="
        text-align:right;
        flex-shrink:0;
      ">
        <div style="
          font-size:24px;
          line-height:1.05;
          color:${isWinner ? "#facc15" : "#ffffff"};
        ">
          ${player.score}
        </div>
        <div style="
          font-size:11px;
          opacity:0.78;
          margin-top:2px;
        ">
          remaining
        </div>
      </div>
    `;

    wrap.appendChild(row);
  });
}
