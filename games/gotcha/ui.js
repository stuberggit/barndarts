import {
  getState,
  submitThrow,
  nextPlayer,
  undo,
  isGameOver,
  initGame,
  endGameEarly,
  getWinningScore,
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
  `;
}

function attachButtonClick(el, handler) {
  el.onclick = handler;
  el.ontouchstart = e => {
    e.preventDefault();
    handler();
  };
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

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
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

function getPpd(player) {
  const darts = player.stats?.dartsThrown || 0;
  const points = player.stats?.totalPoints || 0;
  if (!darts) return "0.00";
  return (points / darts).toFixed(2);
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
  const dartDisplay = state.turnReadyForNext
    ? "Turn complete — tap Next Player"
    : `Dart ${state.dartsThrown + 1}/3`;

  const messageHtml = state.lastMessage
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        color:${state.lastMessageColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
      ">
        ${state.lastMessage}
      </div>
    `
    : `<div></div>`;

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      🎯 Current Player 🎯
    </div>

    <div style="
      margin-bottom:8px;
      padding:14px;
      border-radius:12px;
      background:#11361a;
      border:2px solid #f0970a;
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="font-size:26px;margin-bottom:6px;">
        ${currentPlayer ? currentPlayer.name : "—"}
      </div>
      <div style="font-size:34px;line-height:1;margin-bottom:6px;">
        ${currentPlayer ? currentPlayer.score : "—"} / ${getWinningScore()}
      </div>
      <div style="font-size:16px;color:#facc15;">
        ${dartDisplay}
      </div>
    </div>

    <div style="
      min-height:42px;
      margin:8px 0 10px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${messageHtml}
      </div>
    </div>

    <div id="throwControls"></div>
    <div id="playerBoard"></div>
    <div id="turnSummary"></div>
    <div id="utilityControls"></div>
    <div id="modal"></div>
  `;

  renderThrowControls(container, state);
  renderPlayerBoard(state);
  renderTurnSummary(state);
  renderUtilityControls(container);

  if (state.pendingShanghai) {
    renderShanghaiConfirm(container, state.pendingShanghai);
  }
}

/* -------------------------
   THROW CONTROLS
--------------------------*/

function renderThrowControls(container, state) {
  const controls = document.getElementById("throwControls");
  controls.innerHTML = "";

  const canThrow =
    !state.winner &&
    !state.pendingShanghai &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

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
      min-height:42px;
      font-size:15px;
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attachButtonClick(btn, () => {
      if (!canThrow) return;
      renderNumberPicker(container, type.value);
    });

    hitTypeRow.appendChild(btn);
  });

  const bottomRow = document.createElement("div");
  bottomRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "Miss";
  missBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
    ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;
  attachButtonClick(missBtn, () => {
    if (!canThrow) return;
    submitThrow("miss");
    renderUI(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(nextBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  bottomRow.appendChild(missBtn);
  bottomRow.appendChild(nextBtn);

  controls.appendChild(hitTypeRow);
  controls.appendChild(bottomRow);
}

/* -------------------------
   PLAYER BOARD / TURN SUMMARY
--------------------------*/

function renderPlayerBoard(state) {
  const board = document.getElementById("playerBoard");
  board.style = "margin-top:18px;";
  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isHighlighted = index === state.currentPlayer;

    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:12px 14px;
      border-radius:12px;
      background:${isHighlighted ? "#11361a" : "#111111"};
      border:${isHighlighted ? "3px solid #facc15" : "1px solid #ffffff"};
      display:flex;
      justify-content:space-between;
      align-items:center;
      color:#ffffff;
      font-weight:bold;
      font-size:16px;
      gap:12px;
    `;

    row.innerHTML = `
      <div style="font-size:18px;line-height:1.2;word-break:break-word;">
        ${player.name}
        ${isHighlighted ? `<span style="font-size:15px;margin-left:8px;color:#facc15;">ACTIVE</span>` : ""}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:26px;line-height:1.2;">${player.score}</div>
        <div style="font-size:12px;opacity:0.8;">PPD ${getPpd(player)}</div>
      </div>
    `;

    board.appendChild(row);
  });
}

function renderTurnSummary(state) {
  const summary = document.getElementById("turnSummary");
  const throws = state.currentTurnThrows || [];

  summary.innerHTML = `
    <div style="
      margin-top:12px;
      padding:12px;
      border-radius:12px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    ">
      <div style="
        text-align:center;
        font-size:18px;
        font-weight:bold;
        margin-bottom:10px;
      ">
        Turn
      </div>

      ${
        throws.length === 0
          ? `
            <div style="text-align:center;opacity:0.85;font-weight:bold;">
              No darts thrown.
            </div>
          `
          : throws.map((throwRecord, index) => `
            <div style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              padding:8px 0;
              border-top:${index === 0 ? "none" : "1px solid rgba(255,255,255,0.2)"};
              font-weight:bold;
            ">
              <div>Dart ${index + 1}: ${formatThrowLabel(throwRecord)}</div>
              <div style="color:#22c55e;">+${getThrowValue(throwRecord)}</div>
            </div>
          `).join("")
      }
    </div>
  `;
}

/* -------------------------
   UTILITY CONTROLS
--------------------------*/

function renderUtilityControls(container) {
  const utilityControls = document.getElementById("utilityControls");
  utilityControls.innerHTML = "";

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
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
   NUMBER PICKER
--------------------------*/

function renderNumberPicker(container, hitType) {
  const state = getState();
  const isTriple = hitType === "triple";
  const canThrow =
    !state.winner &&
    !state.pendingShanghai &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  function getHitCountFor(target) {
    return (state.currentTurnThrows || []).filter(throwRecord => {
      return throwRecord.hitType === hitType && throwRecord.target === target;
    }).length;
  }

  const bullHitType =
    hitType === "single" ? "greenBull" :
    hitType === "double" ? "redBull" :
    null;

  const bullHitCount = bullHitType
    ? (state.currentTurnThrows || []).filter(throwRecord => throwRecord.hitType === bullHitType).length
    : 0;

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">
      ${hitType === "single" ? "Single" : hitType === "double" ? "Dub" : "Trip"}
    </h2>

    <div id="numberGrid"></div>

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin-top:12px;
    ">
      <div id="bullBtn" style="
        ${buttonStyle()}
        position:relative;
        padding:12px;
        min-height:52px;
        font-size:20px;
        ${bullHitCount > 0 ? "border:3px solid #facc15;box-shadow:0 0 12px rgba(250,204,21,0.55);" : ""}
        ${isTriple || !canThrow ? "background:#555;color:#bbb;border:1px solid #999;cursor:not-allowed;" : ""}
      ">
        Bull
        ${
          bullHitCount > 0
            ? `<span style="
                position:absolute;
                top:4px;
                right:6px;
                background:#facc15;
                color:#111111;
                border-radius:999px;
                min-width:22px;
                height:22px;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:13px;
                font-weight:bold;
              ">${bullHitCount}</span>`
            : ""
        }
      </div>

      <div id="closeModalBtn" style="
        ${buttonStyle()}
        padding:12px;
        min-height:52px;
        font-size:20px;
        border:1px solid #ff4c4c;
      ">Close</div>
    </div>
  `);

  const grid = document.getElementById("numberGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
  `;

  for (let i = 1; i <= 20; i++) {
    const hitCount = getHitCountFor(i);

    const btn = document.createElement("div");
    btn.innerHTML = `
      <span>${i}</span>
      ${
        hitCount > 0
          ? `<span style="
              position:absolute;
              top:4px;
              right:6px;
              background:#facc15;
              color:#111111;
              border-radius:999px;
              min-width:22px;
              height:22px;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:13px;
              font-weight:bold;
            ">${hitCount}</span>`
          : ""
      }
    `;

    btn.style = `
      ${buttonStyle()}
      position:relative;
      padding:12px;
      min-height:52px;
      font-size:20px;
      ${hitCount > 0 ? "border:3px solid #facc15;box-shadow:0 0 12px rgba(250,204,21,0.55);" : ""}
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attachButtonClick(btn, () => {
      const freshState = getState();

      if (
        freshState.winner ||
        freshState.pendingShanghai ||
        freshState.turnReadyForNext ||
        freshState.dartsThrown >= 3
      ) return;

      submitThrow(hitType, i);

      const updatedState = getState();

      renderUI(container);

      if (
        !updatedState.winner &&
        !updatedState.pendingShanghai &&
        !updatedState.turnReadyForNext &&
        updatedState.dartsThrown < 3
      ) {
        renderNumberPicker(container, hitType);
      }
    });

    grid.appendChild(btn);
  }

  const bullBtn = document.getElementById("bullBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (!isTriple && canThrow) {
    attachButtonClick(bullBtn, () => {
      const freshState = getState();

      if (
        freshState.winner ||
        freshState.pendingShanghai ||
        freshState.turnReadyForNext ||
        freshState.dartsThrown >= 3
      ) return;

      submitThrow(hitType === "single" ? "greenBull" : "redBull");

      const updatedState = getState();

      renderUI(container);

      if (
        !updatedState.winner &&
        !updatedState.pendingShanghai &&
        !updatedState.turnReadyForNext &&
        updatedState.dartsThrown < 3
      ) {
        renderNumberPicker(container, hitType);
      }
    });
  }

  attachButtonClick(closeBtn, closeModal);
}

/* -------------------------
   MODALS
--------------------------*/

function renderStatsModal(throwLog) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Throw Log</h2>
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

function renderShanghaiConfirm(container, pendingShanghai) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">🔥 SHANGHAI? 🔥</h2>
    <div style="text-align:center;margin-bottom:14px;line-height:1.45;">
      ${pendingShanghai.playerName} hit Single + Dub + Trip on ${pendingShanghai.target}.<br>
      Confirm Shanghai and end the game?
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
    endGameEarly();
    renderUI(container);
  });
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  const winner = state.players.find(player => player.name === state.winner) || null;

  container.innerHTML = `
    <h2 style="text-align:center;">
      ${state.shanghaiWinner ? "🔥 SHANGHAI 🔥" : "🏆"} ${state.winner} Wins Gotcha 301!
    </h2>

    <div style="
      margin:12px 0;
      padding:14px;
      border-radius:12px;
      background:#11361a;
      border:2px solid #facc15;
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="font-size:18px;color:#facc15;margin-bottom:6px;">Final Score</div>
      <div style="font-size:28px;">${winner ? winner.score : getWinningScore()} / ${getWinningScore()}</div>
      <div style="font-size:14px;margin-top:6px;opacity:0.85;">
        PPD ${winner ? getPpd(winner) : "0.00"}
      </div>
    </div>

    <div id="playerBoard"></div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:12px;
    " id="endControls"></div>

    <div id="modal"></div>
  `;

  renderPlayerBoard(state);

  const controls = document.getElementById("endControls");

  const playAgainBtn = document.createElement("div");
  playAgainBtn.innerText = "Play Again";
  playAgainBtn.style = `
    ${buttonStyle()}
    padding:14px;
    min-height:52px;
    font-size:18px;
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
