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
const GD_WIN_COPY = {
  banners: [
    "GOLFDARTS CHAMPION",
    "CLUBHOUSE LEADER",
    "FINAL ROUND FINISHED",
    "SCORECARD SIGNED",
    "WALKING IT IN",
    "LOW ROUND LOCKED",
    "FAIRWAY FINISH",
    "SUNDAY RED ENERGY",
    "THE PUTT DROPPED",
    "THE 18TH BELONGED TO THEM",
    "IT'S IN THE HOLE"
  ],

  headlines: [
    "{winnerName} Wins GolfDarts!",
    "{winnerName} Is Your GolfDarts Champion!",
    "{winnerName} Walked Off the 18th With the Win!",
    "{winnerName} Just Signed the Winning Scorecard!",
    "{winnerName} Took the Clubhouse Lead and Never Gave It Back!",
    "{winnerName} Played It Like a Weekend Legend!",
    "{winnerName} Found the Fairway When It Mattered!",
    "{winnerName} Went Low and Left Everyone Chasing!",
    "{winnerName} Finished Stronger Than a Cart Girl Bloody Mary!",
    "{winnerName} Just Put the Round on Ice!",
    "{winnerName} Owns the Clubhouse!"
  ],

  subheads: [
    "Final score posted. Bragging rights secured.",
    "That round had touch, timing, and questionable course management.",
    "Not exactly Augusta, but the jacket still fits.",
    "The gallery is stunned. Mostly because there is no gallery.",
    "They avoided disaster, found a few birdies, and survived the card.",
    "A clean finish with just enough bar-golf nonsense.",
    "Somewhere, a scorekeeper is nodding respectfully.",
    "They didn’t need a caddie. They needed three darts and a little swagger.",
    "The leaderboard bent the knee.",
    "That was a full 18-hole problem for everyone else.",
    "Low score, high swagger, questionable cart etiquette."
  ],

  bodyCopies: [
    "They worked the card, dodged the blowups, and walked into the clubhouse with the number everyone else had to chase.",
    "A few darts found trouble, a few found magic, and somehow the final scorecard says champion.",
    "This round had everything: pars, birdies, chaos, and one player who knew exactly when to stop bleeding strokes.",
    "The course tried to fight back, but the winner kept it together long enough to own the leaderboard.",
    "They played smart, scored low, and made the rest of the field explain what happened on the ride home.",
    "The darts were flying, the scorecard got weird, and one player still managed to bring it home clean.",
    "That was less of a golf round and more of a controlled demolition of the leaderboard.",
    "Every great round needs a little luck, a little nerve, and at least one shot nobody wants to admit was accidental.",
    "They didn’t just finish the round. They left the rest of the group staring at totals and doing uncomfortable math.",
    "Some players chase birdies. Some players avoid snowmen. This one did enough of both to win the damn thing.",
    "They walked into the clubhouse like they owned the jacket, the cart path, and at least two questionable mulligans. Somewhere, a gopher is nodding in respect." 
  ]
};

function pickRandomCopy(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(Math.random() * items.length)];
}

function personalizeCopyText(text, winnerName) {
  return String(text || "").replaceAll("{winnerName}", winnerName || "Winner");
}

function getGdWinCopy(winnerName) {
  return {
    banner: personalizeCopyText(pickRandomCopy(GD_WIN_COPY.banners), winnerName),
    headline: personalizeCopyText(pickRandomCopy(GD_WIN_COPY.headlines), winnerName),
    subhead: personalizeCopyText(pickRandomCopy(GD_WIN_COPY.subheads), winnerName),
    bodyCopy: personalizeCopyText(pickRandomCopy(GD_WIN_COPY.bodyCopies), winnerName)
  };
}

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

function getHitCountForValue(state, value) {
  return (state.currentTurnThrows || []).filter(hit => hit === value).length;
}

function renderHitCountBadge(count) {
  if (!count) return "";

  return `
    <span style="
      position:absolute;
      top:5px;
      right:7px;
      min-width:22px;
      height:22px;
      padding:0 6px;
      border-radius:999px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#facc15;
      color:#111111;
      border:1px solid #111111;
      font-size:13px;
      font-weight:bold;
      line-height:1;
      box-sizing:border-box;
    ">
      ${count}
    </span>
  `;
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

function getRankedPlayers(state) {
  const players = [...(state.players || [])];

  if (state.shanghaiWinner) {
    return players.sort((a, b) => {
      if (a.name === state.shanghaiWinner) return -1;
      if (b.name === state.shanghaiWinner) return 1;
      return a.total - b.total;
    });
  }

  return players.sort((a, b) => a.total - b.total);
}

function formatGolfScore(score) {
  if (score > 0) return `+${score}`;
  if (score < 0) return `${score}`;
  return "E";
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
        max-width:760px;
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

function renderStatsModal(stats, stateForScorecard = getState()) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">Game Stats</h2>

    <div id="scorecard"></div>
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

  renderScorecard(stateForScorecard, { showFull: true });

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
      margin-top:12px;
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
    const count = getHitCountForValue(state, opt.value);

    const btn = document.createElement("div");
    btn.innerHTML = `
      <span>${opt.label}</span>
      ${renderHitCountBadge(count)}
    `;

    btn.style = `
      ${buttonStyle()}
      position:relative;
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
    renderStatsModal(getStats(), getState());
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

  const isShanghai = !!state.shanghaiWinner;
  const winCopy = getGdWinCopy(winner, isShanghai);
  const stats = state.finalStats || getStats();
  const rankedPlayers = getRankedPlayers(state);

  container.innerHTML = `
    <style>
      @keyframes golfGlow {
        0% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
        50% { box-shadow: 0 0 22px rgba(250,204,21,0.48), 0 0 38px rgba(34,197,94,0.22); }
        100% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
      }

      @keyframes golferFloat {
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
        radial-gradient(circle at top, rgba(250,204,21,0.20), transparent 36%),
        linear-gradient(180deg, #14351f 0%, #0b0f17 100%);
      border:2px solid #facc15;
      animation:golfGlow 2.8s infinite ease-in-out;
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
        <span style="animation:golferFloat 2.2s infinite ease-in-out;">⛳</span>
        <span style="animation:golferFloat 2.6s infinite ease-in-out;">🏌️‍♂️</span>
        <span style="animation:golferFloat 2.1s infinite ease-in-out;">🌲</span>
        <span style="animation:golferFloat 2.8s infinite ease-in-out;">🏆</span>
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
        ${winCopy.banner}
      </div>

      <div style="
        text-align:center;
        font-size:54px;
        line-height:1;
        margin-bottom:8px;
        animation:trophyPulse 1.7s infinite ease-in-out;
      ">
        ${isShanghai ? "🏆💥🏌️‍♂️" : "🏆🏌️‍♂️🏆"}
      </div>

      <h2 style="
        text-align:center;
        margin:0 0 6px;
        font-size:28px;
        color:#ffffff;
      ">
        ${winCopy.headline}
      </h2>

      <div style="
        text-align:center;
        font-size:18px;
        color:#facc15;
        font-weight:bold;
        margin-bottom:10px;
      ">
        ${winCopy.subhead}
      </div>

      <div style="
        text-align:center;
        font-size:15px;
        color:#dbeafe;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        padding:12px;
        margin-bottom:16px;
      ">
        ${winCopy.bodyCopy}
      </div>

      <div style="
        margin-bottom:16px;
        padding:12px;
        border-radius:14px;
        background:rgba(0,0,0,0.22);
        border:1px solid rgba(255,255,255,0.14);
      ">
        <div style="
          text-align:center;
          color:#facc15;
          font-weight:bold;
          font-size:16px;
          margin-bottom:10px;
        ">
          Final Leaderboard
        </div>

        <div style="
          display:flex;
          flex-direction:column;
          gap:8px;
        ">
          ${rankedPlayers.map((player, index) => `
            <div style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              padding:10px 12px;
              border-radius:10px;
              background:${index === 0 ? "rgba(250,204,21,0.16)" : "rgba(255,255,255,0.06)"};
              border:${index === 0 ? "1px solid #facc15" : "1px solid rgba(255,255,255,0.12)"};
              color:#ffffff;
              font-weight:bold;
            ">
              <span style="min-width:0;word-break:break-word;">
                ${index + 1}. ${player.name}
              </span>
              <span style="
                color:${index === 0 ? "#facc15" : "#ffffff"};
                flex-shrink:0;
              ">
                ${formatGolfScore(player.total)}
              </span>
            </div>
          `).join("")}
        </div>
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
      ">
        <div id="playAgainBtn" style="
          ${playAgainButtonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
        ">Play Again</div>

        <div id="statsBtn" style="
          ${leaderboardButtonStyle()}
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

  attachButtonClick(document.getElementById("playAgainBtn"), () => {
    const rotatedPlayers = getRotatedPlayersForReplay();
    store.players = [...rotatedPlayers];
    initGame(rotatedPlayers);
    renderUI(container);
  });

  attachButtonClick(document.getElementById("statsBtn"), () => {
    renderStatsModal(stats, state);
  });

  attachButtonClick(document.getElementById("mainMenuBtn"), () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}
