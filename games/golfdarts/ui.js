import {
  getState,
  getStats,
  recordThrow,
  isGameOver,
  undo,
  nextPlayer,
  submitHazards,
  getMeta,
  initGame,
  confirmShanghaiWinner,
  cancelPendingShanghai,
  getRotatedPlayersForReplay
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

function formatCurrentHits(hits = []) {
  if (!hits.length) return "";

  const map = {
    0: "Miss",
    1: "Single",
    2: "Dub",
    3: "Trip"
  };

  return hits.map(v => map[v] || "").filter(Boolean).join(", ");
}

function getPreviewScoreFromHits(hits) {
  const cappedHits = Math.max(0, Math.min(9, hits));

  if (cappedHits === 0) return 5;

  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return scores[cappedHits - 1] ?? 5;
}

function getLiveHits(state) {
  if (state.hammerHoles?.includes(state.currentHole)) {
    return Math.min(
      (state.currentTurnThrows || []).reduce(
        (sum, val, i) => sum + val * [1, 2, 3][i],
        0
      ),
      9
    );
  }

  return Math.min(state.turnHitsCount || 0, 9);
}

function getPreviewMeta(state) {
  const previewHits = getLiveHits(state);
  const previewScore = getPreviewScoreFromHits(previewHits);
  const previewMeta = getMeta(previewScore);

  return {
    hits: previewHits,
    score: previewScore,
    label: previewScore === 1 ? "Hole in One" : previewMeta.label,
    color: previewMeta.color
  };
}

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

function playAgainButtonStyle() {
  return `
    ${buttonStyle()}
    border:2px solid #facc15;
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

function pluralize(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function getFrontTotal(player) {
  return player.scores
    .slice(0, 9)
    .reduce((sum, score) => sum + (score ?? 0), 0);
}

function getBackTotal(player) {
  return player.scores
    .slice(9, 18)
    .reduce((sum, score) => sum + (score ?? 0), 0);
}

function getStatsLabelEntries(scoreLabels = {}) {
  const preferredOrder = [
    "Buster",
    "Quad Bogey",
    "Triple Bogey",
    "Double Bogey",
    "Bogey",
    "Barn Dart Par",
    "Par",
    "Birdie",
    "Hole in One",
    "Goose Egg",
    "Icicle",
    "Polar Bear",
    "Frostbite",
    "Snowman",
    "Avalanche"
  ];

  return Object.entries(scoreLabels).sort((a, b) => {
    const ai = preferredOrder.indexOf(a[0]);
    const bi = preferredOrder.indexOf(b[0]);

    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
    if (ai === -1) return 1;
    if (bi === -1) return -1;

    return ai - bi;
  });
}

function renderHitBadge(number) {
  return `
    <span style="
      width:26px;
      height:26px;
      border-radius:999px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      background:#111111;
      color:#facc15;
      border:2px solid #facc15;
      font-size:14px;
      font-weight:bold;
      margin-right:8px;
      flex-shrink:0;
    ">
      ${number}
    </span>
  `;
}

/* -------------------------
   MODAL SHELLS
--------------------------*/

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
        border-radius:10px;
        width:90%;
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

function renderShanghaiConfirm(container, playerName) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">🔥 SHANGHAI? 🔥</h2>

    <div style="text-align:center;margin-bottom:14px;line-height:1.45;">
      ${playerName} hit Single + Dub + Trip.<br>
      Confirm Shanghai and end the game?
    </div>

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    ">
      <div id="cancelShanghaiBtn" style="
        ${leaderboardButtonStyle()}
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
        ${leaderboardButtonStyle()}
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
   STATS MODAL
--------------------------*/

function renderStatsModal(stats) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Game Stats</h2>
    <div id="statsList"></div>

    <div style="
      display:flex;
      justify-content:center;
      margin-top:12px;
    ">
      <div id="closeStatsBtn" style="
        ${buttonStyle()}
        padding:10px;
        min-height:42px;
        width:120px;
        border:1px solid #ff4c4c;
      ">Close</div>
    </div>
  `);

  const list = document.getElementById("statsList");
  list.innerHTML = "";

  stats.forEach(player => {
    const statsData = player.stats || {};
    const scoreLabels = statsData.scoreLabels || {};
    const labelEntries = getStatsLabelEntries(scoreLabels);

    const scoreBreakdown = labelEntries.length
      ? labelEntries.map(([label, count]) => `• ${pluralize(count, label)}`).join("<br>")
      : "• No completed holes yet";

    const row = document.createElement("div");
    row.style = `
      margin-bottom:12px;
      padding:14px;
      border-radius:10px;
      background:#1e293b;
      border:1px solid #ffffff;
      color:#ffffff;
    `;

    row.innerHTML = `
      <div style="
        font-size:18px;
        font-weight:bold;
        margin-bottom:8px;
        color:#facc15;
      ">
        ${player.name}
      </div>

      <div style="font-size:14px;line-height:1.65;">
        ${scoreBreakdown}
      </div>
    `;

    list.appendChild(row);
  });

  attachButtonClick(document.getElementById("closeStatsBtn"), closeModal);
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

  if (state.awaitingHazardInput) {
    renderHazardPrompt(container, state);
    return;
  }

  renderGame(container, state);

  if (state.pendingShanghai) {
    renderShanghaiConfirm(container, state.pendingShanghai);
  }
}

/* -------------------------
   GAME SCREEN
--------------------------*/

function renderGame(container, state) {
  const player = state.players[state.currentPlayer];
  const preview = getPreviewMeta(state);

  const scoreMessageHtml = state.lastScoreMessage
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        color:${state.lastScoreColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
      ">
        ${state.lastScoreMessage}
      </div>
    `
    : `<div></div>`;

  const topLabel = state.hazardHoles?.includes(state.currentHole)
    ? `Hazard Hole ${state.currentHole + 1}`
    : state.hammerHoles?.includes(state.currentHole)
      ? `Hammer Hole ${state.currentHole + 1}`
      : `Hole ${state.currentHole + 1}`;

  container.innerHTML = `
    <div style="
      margin-bottom:12px;
      padding:14px;
      border-radius:14px;
      background:#11361a;
      border:3px solid #facc15;
      box-shadow:0 0 18px rgba(250,204,21,0.35);
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="
        font-size:13px;
        letter-spacing:0.7px;
        color:#facc15;
        margin-bottom:4px;
      ">
        ${topLabel}
      </div>

      <div style="font-size:28px;line-height:1.1;">
        🎯 ${player.name}
      </div>

      <div style="
        font-size:15px;
        margin-top:5px;
        opacity:0.95;
      ">
        Dart ${Math.min(state.dartsThrown + 1, 3)}/3
      </div>
    </div>

    <div id="scorecard"></div>

    <div style="
      min-height:54px;
      margin:8px 0 12px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${scoreMessageHtml}
      </div>
    </div>

    <div id="controls"></div>
    <div id="turnSummary"></div>
    <div id="utilityControls"></div>
    <div id="modal"></div>
  `;

  renderScorecard(state);
  renderThrowControls(container, state);
  renderTurnSummary(state, preview);
  renderUtilityControls(container);
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderThrowControls(container, state) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const canThrow = state.dartsThrown < 3;

  const topRow = document.createElement("div");
  topRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
  `;

  const topOptions = [
    { label: "Single", value: 1 },
    { label: "Dub", value: 2 },
    { label: "Trip", value: 3 }
  ];

  topOptions.forEach(opt => {
    const btn = document.createElement("div");
    btn.innerHTML = `
      <span style="
        display:flex;
        align-items:center;
        justify-content:center;
        gap:0;
      ">
        ${renderHitBadge(opt.value)}
        <span>${opt.label}</span>
      </span>
    `;
    btn.style = `
      ${buttonStyle()}
      padding:10px 8px;
      font-size:16px;
      min-height:44px;
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attachButtonClick(btn, () => {
      if (!canThrow) return;
      recordThrow(opt.value);
      renderUI(container);
    });

    topRow.appendChild(btn);
  });

  const middleRow = document.createElement("div");
  middleRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss";
  missBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
    ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;

  attachButtonClick(missBtn, () => {
    if (!canThrow) return;
    recordThrow(0);
    renderUI(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;

  attachButtonClick(nextBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  middleRow.appendChild(missBtn);
  middleRow.appendChild(nextBtn);

  controls.appendChild(topRow);
  controls.appendChild(middleRow);
}

function renderTurnSummary(state, preview) {
  const summary = document.getElementById("turnSummary");
  if (!summary) return;

  const throws = state.currentTurnThrows || [];

  const badges = [0, 1, 2].map(index => {
    const value = throws[index];
    const hasThrow = value !== undefined;

    const label = hasThrow
      ? value === 0
        ? "M"
        : String(value)
      : String(index + 1);

    const background = !hasThrow
      ? "rgba(255,255,255,0.08)"
      : value === 0
        ? "#7f1d1d"
        : "#206a1e";

    const border = hasThrow
      ? "2px solid #facc15"
      : "1px solid rgba(255,255,255,0.35)";

    return `
      <span style="
        width:34px;
        height:34px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:${background};
        border:${border};
        color:#ffffff;
        font-weight:bold;
        font-size:16px;
        opacity:${hasThrow ? "1" : "0.55"};
      ">
        ${label}
      </span>
    `;
  }).join("");

  summary.innerHTML = `
    <div style="
      margin-top:10px;
      padding:12px;
      border-radius:12px;
      background:#111111;
      border:1px solid rgba(255,255,255,0.85);
      color:#ffffff;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
      ">
        <div style="
          font-weight:bold;
          font-size:16px;
        ">
          Throw Summary
        </div>

        <div style="
          display:flex;
          gap:8px;
        ">
          ${badges}
        </div>
      </div>

      <div style="
        margin-top:9px;
        padding-top:9px;
        border-top:1px solid rgba(255,255,255,0.16);
        text-align:center;
        font-weight:bold;
        color:${throws.length ? preview.color : "#ffffff"};
      ">
        ${
          throws.length
            ? `${formatCurrentHits(throws)} • ${preview.label} (${preview.score > 0 ? "+" : ""}${preview.score})`
            : "No darts thrown yet."
        }
      </div>
    </div>
  `;
}

function renderUtilityControls(container) {
  const utilityControls = document.getElementById("utilityControls");
  utilityControls.innerHTML = "";

  const row = document.createElement("div");
  row.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const statsBtn = document.createElement("div");
  statsBtn.innerText = "Stats";
  statsBtn.style = `
    ${leaderboardButtonStyle()}
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

  row.appendChild(statsBtn);
  row.appendChild(undoBtn);
  row.appendChild(endBtn);

  utilityControls.appendChild(row);
}

/* -------------------------
   PROMPTS
--------------------------*/

function renderHazardPrompt(container, state) {
  const player = state.players[state.currentPlayer];
  const hitsText = formatCurrentHits(state.currentTurnThrows);
  const hitsDisplay = hitsText ? ` | Hits ${hitsText}` : "";

  container.innerHTML = `
    <h2 style="text-align:center;">Hazard Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

    <div style="
      min-height:54px;
      margin:8px 0 12px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        <div style="
          padding:8px 10px;
          border-radius:10px;
          background:rgba(255,255,255,0.08);
          color:#ffffff;
          font-weight:bold;
          text-align:center;
        ">
          🎯 ${player.name}${hitsDisplay}
        </div>
      </div>
    </div>

    <p style="text-align:center;">How many hazards were hit?</p>

    <div id="hazardControls"></div>

    <div id="modal"></div>
  `;

  renderScorecard(state);

  const hazardControls = document.getElementById("hazardControls");
  hazardControls.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  [0, 1, 2, 3].forEach(count => {
    const btn = document.createElement("div");
    btn.innerText = `${count} Hazard${count === 1 ? "" : "s"}`;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:44px;
      font-size:16px;
    `;

    attachButtonClick(btn, () => {
      submitHazards(count);
      renderUI(container);
    });

    hazardControls.appendChild(btn);
  });

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:10px;
    min-height:44px;
    font-size:16px;
    grid-column:1 / -1;
  `;

  attachButtonClick(undoBtn, () => {
    undo();
    renderUI(container);
  });

  hazardControls.appendChild(undoBtn);
}

/* -------------------------
   SCORECARD
--------------------------*/

function renderScorecard(state, options = {}) {
  const div = document.getElementById("scorecard");
  if (!div) return;

  if (options.showFull) {
    div.innerHTML = `
      <div style="
        display:flex;
        flex-direction:column;
        gap:12px;
      ">
        ${buildScorecardTable(state, 0, 9, "Out", true)}
        ${buildScorecardTable(state, 9, 18, "In", true)}
      </div>
    `;
    return;
  }

  const showingFront = state.currentHole < 9;
  const startHole = showingFront ? 0 : 9;
  const endHole = showingFront ? 9 : 18;
  const subtotalLabel = showingFront ? "Out" : "In";

  div.innerHTML = buildScorecardTable(state, startHole, endHole, subtotalLabel, false);
}

function buildScorecardTable(state, startHole, endHole, subtotalLabel, forceComplete = false) {
  const hazardHoles = state.hazardHoles || [];
  const hammerHoles = state.hammerHoles || [];

  let html = `<div style="overflow-x:auto;width:100%;"><table style="
    width:100%;
    border-collapse:collapse;
    font-size:12px;
    text-align:center;
    background:#ffffff;
    color:#111111;
    border:1px solid #cfcfcf;
    border-radius:8px;
    overflow:hidden;
  ">`;

  html += `<tr style="background:#f4f4f4;"><th style="
    padding:6px;
    border:1px solid #d6d6d6;
    min-width:72px;
  "></th>`;

  for (let i = startHole; i < endHole; i++) {
    const isHazard = hazardHoles.includes(i);
    const isHammer = hammerHoles.includes(i);

    let holeStyle = `
      padding:6px 4px;
      border:1px solid #d6d6d6;
      min-width:28px;
      background:#fdfdfd;
      color:#111111;
      font-weight:600;
    `;

    if (isHazard) {
      holeStyle += "background:#fff4f5;color:#d22;";
    }

    if (isHammer) {
      holeStyle += "background:#eef5ff;color:#2563eb;";
    }

    html += `<th style="${holeStyle}">${i + 1}</th>`;
  }

  html += `<th style="
    padding:6px 4px;
    border:1px solid #d6d6d6;
    background:#f4f4f4;
    min-width:36px;
  ">${subtotalLabel}</th>`;

  html += `<th style="
    padding:6px 4px;
    border:1px solid #d6d6d6;
    background:#f4f4f4;
    min-width:42px;
  ">Total</th></tr>`;

  state.players.forEach((player, index) => {
    const activePlayer = !forceComplete && index === state.currentPlayer;
    const frontTotal = getFrontTotal(player);
    const backTotal = getBackTotal(player);
    const subtotal = startHole === 0 ? frontTotal : backTotal;

    html += `<tr style="background:#ffffff;">`;

    html += `<td style="
      padding:6px 8px;
      border:1px solid #d6d6d6;
      font-weight:bold;
      text-align:left;
      white-space:nowrap;
      ${activePlayer ? "background:#facc15;color:#111111;" : ""}
    ">${activePlayer ? "▶ " : ""}${player.name}</td>`;

    for (let h = startHole; h < endHole; h++) {
      const score = player.scores[h];
      const isHazard = hazardHoles.includes(h);
      const isHammer = hammerHoles.includes(h);

      let cellStyle = `
        padding:6px 4px;
        border:1px solid #d6d6d6;
        background:#ffffff;
        color:#111111;
        min-width:28px;
      `;

      if (isHazard) {
        cellStyle += "background:#fff4f5;";
      }

      if (isHammer) {
        cellStyle += "background:#eef5ff;";
      }

      html += `<td style="${cellStyle}">${score ?? ""}</td>`;
    }

    html += `<td style="
      padding:6px 4px;
      border:1px solid #d6d6d6;
      background:#fafafa;
      font-weight:bold;
    ">${subtotal || ""}</td>`;

    html += `<td style="
      padding:6px 4px;
      border:1px solid #d6d6d6;
      background:#fafafa;
      font-weight:bold;
    ">${player.total}</td>`;

    html += "</tr>";
  });

  html += "</table></div>";

  return html;
}

/* -------------------------
   END GAME
--------------------------*/

function renderEnd(container, state) {
  const winner = state.shanghaiWinner
    ? state.shanghaiWinner
    : [...state.players].sort((a, b) => a.total - b.total)[0].name;

  const stats = state.finalStats || getStats();

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      padding:14px;
      border-radius:16px;
      background:#11361a;
      border:2px solid #facc15;
      box-shadow:0 0 18px rgba(250,204,21,0.28);
    ">
      <h2 style="
        margin:0 0 8px;
        text-align:center;
      ">
        ${state.shanghaiWinner ? "🔥 SHANGHAI 🔥" : "Game Over"}
      </h2>

      <h3 style="
        margin:0;
        font-size:24px;
        color:#facc15;
        text-align:center;
      ">
        🏆 Winner: ${winner} 🏆
      </h3>
    </div>

    <div id="scorecard"></div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:12px;
    " id="endControls"></div>

    <div id="modal"></div>
  `;

  renderScorecard(state, { showFull: true });

  const controls = document.getElementById("endControls");

  const statsBtn = document.createElement("div");
  statsBtn.innerText = "Stats";
  statsBtn.style = `
    ${leaderboardButtonStyle()}
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;

  attachButtonClick(statsBtn, () => {
    renderStatsModal(stats);
  });

  const playAgainBtn = document.createElement("div");
  playAgainBtn.innerText = "Play Again";
  playAgainBtn.style = `
    ${playAgainButtonStyle()}
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;

  attachButtonClick(playAgainBtn, () => {
    const rotatedPlayers = getRotatedPlayersForReplay();
    store.players = [...rotatedPlayers];
    initGame(rotatedPlayers);
    renderUI(container);
  });

  const mainMenuBtn = document.createElement("div");
  mainMenuBtn.innerText = "Main Menu";
  mainMenuBtn.style = `
    ${buttonStyle()}
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;

  attachButtonClick(mainMenuBtn, () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });

  controls.appendChild(statsBtn);
  controls.appendChild(playAgainBtn);
  controls.appendChild(mainMenuBtn);
}
