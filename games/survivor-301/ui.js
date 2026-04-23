import {
  getState,
  getStats,
  getCurrentTargetDisplay,
  submitThrow,
  nextPlayer,
  endGameEarly,
  undo,
  isGameOver,
  initGame
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
    if (e.target === overlay) {
      closeModal();
    }
  };

  card.onclick = e => {
    e.stopPropagation();
  };
}

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
}

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

function formatThrowLabel(throwRecord) {
  if (!throwRecord) return "";

  if (throwRecord.hitType === "miss") return "Miss";
  if (throwRecord.hitType === "greenBull") return "Green Bull";
  if (throwRecord.hitType === "redBull") return "Red Bull";

  const labels = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labels[throwRecord.hitType]} ${throwRecord.target}`;
}

function formatScoreChange(change) {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return "0";
}

function getPlayerRowBackground(player, isHighlighted) {
  if (player.isEliminated) {
    return isHighlighted ? "#374151" : "#1f2937";
  }

  return isHighlighted ? "#11361a" : "#111111";
}

function getPlayerRowBorder(player, isHighlighted) {
  if (isHighlighted) return "2px solid #f0970a";
  if (player.isEliminated) return "1px solid #6b7280";
  return "1px solid #ffffff";
}

function getPlayerRowOpacity(player) {
  return player.isEliminated ? 0.65 : 1;
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
  const { showFlash, flashHtml } = buildFlashHtml(state);
  const currentPlayer = state.players[state.currentPlayer];

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      ☣️ Current Player ☣️
    </div>

    <div style="
      margin-bottom:12px;
      padding:14px;
      border-radius:12px;
      background:#11361a;
      border:3px solid #facc15;
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="font-size:26px;margin-bottom:6px;">
        ${currentPlayer ? currentPlayer.name : "—"}
      </div>
      <div style="font-size:34px;line-height:1;margin-bottom:6px;">
        ${currentPlayer ? currentPlayer.score : "—"}
      </div>
      <div style="font-size:16px;color:#facc15;">
        ${getCurrentTargetDisplay()}
      </div>
    </div>

    <div id="controls"></div>

    <div id="playerBoard"></div>

    <div style="
      min-height:54px;
      margin:12px 0;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${flashHtml}
      </div>
    </div>

    <div id="turnSummary"></div>
    <div id="utilityControls"></div>
    <div id="modal"></div>
  `;

  renderThrowControls(container, state);
  renderPlayerBoard(state);
  renderTurnSummary(state);
  renderUtilityControls(container);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

function renderThrowControls(container, state) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const currentPlayer = state.players[state.currentPlayer];
  const canThrow =
    currentPlayer &&
    currentPlayer.isActive &&
    !currentPlayer.isEliminated &&
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
      padding:12px;
      min-height:52px;
      font-size:18px;
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
    margin-top:10px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "Miss";
  missBtn.style = `
    ${buttonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
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
    padding:12px;
    min-height:52px;
    font-size:18px;
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

function renderPlayerBoard(state) {
  const board = document.getElementById("playerBoard");
  board.style = "margin-top:18px;";
  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isHighlighted = index === state.currentPlayer && !player.isEliminated;

    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:12px 14px;
      border-radius:12px;
      background:${getPlayerRowBackground(player, isHighlighted)};
      border:${getPlayerRowBorder(player, isHighlighted)};
      display:flex;
      justify-content:space-between;
      align-items:center;
      color:#ffffff;
      font-weight:bold;
      font-size:16px;
      opacity:${getPlayerRowOpacity(player)};
      gap:12px;
    `;

    row.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;">
        <div style="font-size:18px;line-height:1.2;word-break:break-word;">
          ${player.name}
          ${
            player.isEliminated
              ? `<span style="font-size:15px;margin-left:8px;color:#9ca3af;">☠️ OUT</span>`
              : isHighlighted
                ? `<span style="font-size:15px;margin-left:8px;color:#facc15;">ACTIVE</span>`
                : `<span style="font-size:15px;margin-left:8px;color:#22c55e;">ALIVE</span>`
          }
        </div>
      </div>

      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:26px;line-height:1.2;">
          ${player.score}
        </div>
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
              <div style="color:${throwRecord.scoreChange > 0 ? "#22c55e" : throwRecord.scoreChange < 0 ? "#facc15" : "#ffffff"};">
                ${formatScoreChange(throwRecord.scoreChange)}
              </div>
            </div>
          `).join("")
      }
    </div>
  `;
}

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
    renderStatsModal(getStats());
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

function renderNumberPicker(container, hitType) {
  const isTriple = hitType === "triple";

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
        padding:12px;
        min-height:52px;
        font-size:20px;
        ${isTriple ? "background:#555;color:#bbb;border:1px solid #999;cursor:not-allowed;" : ""}
      ">Bull</div>

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
    const btn = document.createElement("div");
    btn.innerText = i;
    btn.style = `
      ${buttonStyle()}
      padding:12px;
      min-height:52px;
      font-size:20px;
    `;

    attachButtonClick(btn, () => {
      submitThrow(hitType, i);
      closeModal();
      renderUI(container);
    });

    grid.appendChild(btn);
  }

  const bullBtn = document.getElementById("bullBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (!isTriple) {
    attachButtonClick(bullBtn, () => {
      submitThrow(hitType === "single" ? "greenBull" : "redBull");
      closeModal();
      renderUI(container);
    });
  }

  attachButtonClick(closeBtn, closeModal);
}

function renderStatsModal(stats) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Game Stats</h2>
    <div id="statsList"></div>
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

  const list = document.getElementById("statsList");
  list.innerHTML = "";

  stats.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:12px;
      padding:14px;
      border-radius:10px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    `;

    row.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">${player.name}</div>
      <div style="font-size:14px;line-height:1.6;">
        • Final Score: ${player.score}<br>
        • Status: ${player.isEliminated ? "Out" : "Alive"}<br>
        • Darts Thrown: ${player.stats?.dartsThrown || 0}<br>
        • Points Lost: ${player.stats?.pointsLost || 0}<br>
        • Points Gained: ${player.stats?.pointsGained || 0}<br>
        • Misses: ${player.stats?.misses || 0}<br>
        • Green Bulls: ${player.stats?.greenBulls || 0}<br>
        • Red Bulls: ${player.stats?.redBulls || 0}
      </div>
    `;

    list.appendChild(row);
  });

  const closeBtn = document.getElementById("closeModalBtn");
  attachButtonClick(closeBtn, closeModal);
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

  const cancelBtn = document.getElementById("cancelEndBtn");
  const confirmBtn = document.getElementById("confirmEndBtn");

  attachButtonClick(cancelBtn, closeModal);
  attachButtonClick(confirmBtn, () => {
    closeModal();
    endGameEarly();
    renderUI(container);
  });
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  const winnerName = state.winner;
  const stats = state.finalStats || getStats();

  container.innerHTML = `
    <style>
      @keyframes survivorGlow {
        0% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
        50% { box-shadow: 0 0 20px rgba(250,204,21,0.45), 0 0 36px rgba(34,197,94,0.25); }
        100% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
      }

      @keyframes survivorFloat {
        0% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-6px) rotate(2deg); }
        100% { transform: translateY(0px) rotate(0deg); }
      }

      @keyframes tapeFlash {
        0% { opacity: 0.8; }
        50% { opacity: 1; }
        100% { opacity: 0.8; }
      }

      @keyframes trophyPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
    </style>

    <div style="
      position:relative;
      overflow:hidden;
      border-radius:18px;
      padding:18px 16px 20px;
      background:
        radial-gradient(circle at top, rgba(250,204,21,0.18), transparent 35%),
        linear-gradient(180deg, #102417 0%, #0b0f0c 100%);
      border:2px solid #facc15;
      animation:survivorGlow 2.8s infinite ease-in-out;
    ">
      <div style="
        position:absolute;
        top:10px;
        left:-24px;
        right:-24px;
        display:flex;
        justify-content:space-between;
        pointer-events:none;
        font-size:26px;
        opacity:0.15;
      ">
        <span style="animation:survivorFloat 2.2s infinite ease-in-out;">☣️</span>
        <span style="animation:survivorFloat 2.6s infinite ease-in-out;">💀</span>
        <span style="animation:survivorFloat 2.1s infinite ease-in-out;">🎯</span>
        <span style="animation:survivorFloat 2.8s infinite ease-in-out;">☣️</span>
      </div>

      <div style="
        text-align:center;
        margin:0 auto 12px;
        max-width:340px;
        background:#facc15;
        color:#111111;
        font-weight:bold;
        font-size:15px;
        padding:8px 12px;
        border-radius:999px;
        animation:tapeFlash 1.5s infinite ease-in-out;
      ">
        ⚠️ LAST PLAYER STANDING ⚠️
      </div>

      <div style="
        text-align:center;
        font-size:54px;
        line-height:1;
        margin-bottom:8px;
        animation:trophyPulse 1.7s infinite ease-in-out;
      ">
        🏆☣️🏆
      </div>

      <h2 style="
        text-align:center;
        margin:0 0 6px;
        font-size:28px;
        color:#ffffff;
      ">
        ${winnerName} Survived 301!
      </h2>

      <div style="
        text-align:center;
        font-size:18px;
        color:#facc15;
        font-weight:bold;
        margin-bottom:10px;
      ">
        Last player standing.
      </div>

      <div style="
        text-align:center;
        font-size:15px;
        color:#d1fae5;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        padding:12px;
        margin-bottom:16px;
      ">
        Everyone else ran out of points. One survivor stayed above zero and claimed the crown.
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
      ">
        <div id="playAgainBtn" style="
          ${buttonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
        ">Play Again</div>

        <div id="statsBtn" style="
          ${lightButtonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
        ">Stats</div>

        <div id="mainMenuBtn" style="
          ${buttonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
        ">Main Menu</div>
      </div>
    </div>

    <div id="modal"></div>
  `;

  const playAgainBtn = document.getElementById("playAgainBtn");
  const statsBtn = document.getElementById("statsBtn");
  const mainMenuBtn = document.getElementById("mainMenuBtn");

  attachButtonClick(playAgainBtn, () => {
    const rotatedPlayers = rotatePlayers(state.originalPlayers || store.players || []);
    store.players = [...rotatedPlayers];
    initGame(rotatedPlayers);
    renderUI(container);
  });

  attachButtonClick(statsBtn, () => {
    renderStatsModal(stats);
  });

  attachButtonClick(mainMenuBtn, () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}
