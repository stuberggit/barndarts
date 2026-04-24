import {
  getState,
  recordThrow,
  isGameOver,
  undo,
  nextPlayer,
  submitHazards,
  submitHammer,
  getMeta,
  initGame
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

function formatCurrentHits(hits = []) {
  if (!hits.length) return "";

  const map = {
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

function getRotatedPlayersForReplay(state) {
  const currentPlayers = state.players.map(p => p.name);

  if (currentPlayers.length <= 1) return currentPlayers;

  return [...currentPlayers.slice(1), currentPlayers[0]];
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
  `;
}

function renderLeaderboardModal(state) {
  const modal = document.getElementById("modal");
  if (!modal) return;

  const rankedPlayers = [...state.players].sort((a, b) => a.total - b.total);

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
      padding:16px;
      box-sizing:border-box;
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

        <div id="leaderboardList"></div>

        <div id="closeModal" style="
          ${buttonStyle()}
          padding:10px;
          min-height:44px;
          margin-top:12px;
        ">Close</div>
      </div>
    </div>
  `;

  const list = document.getElementById("leaderboardList");
  list.innerHTML = "";

  rankedPlayers.forEach((player, index) => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:10px;
      border-radius:10px;
      background:#1e293b;
      border:1px solid #ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      font-weight:bold;
    `;

    row.innerHTML = `
      <span>${index + 1}. ${player.name}</span>
      <span>${player.total}</span>
    `;

    list.appendChild(row);
  });

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
}

function renderEndGameConfirm(container) {
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
      </div>
    </div>
  `;

  document.getElementById("cancelEndBtn").onclick = () => {
    modal.innerHTML = "";
  };

  document.getElementById("confirmEndBtn").onclick = () => {
    modal.innerHTML = "";
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };
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

  if (state.awaitingHazardInput) {
    renderHazardPrompt(container, state);
    return;
  }

  if (state.awaitingHammerInput) {
    renderHammerPrompt(container, state);
    return;
  }

  const hitsText = formatCurrentHits(state.currentTurnHits);
  const hitsDisplay = hitsText ? ` | Hits ${hitsText}` : "";

  const previewHits = state.hammerHoles?.includes(state.currentHole)
    ? Math.min(
        (state.currentTurnThrows || []).reduce(
          (sum, val, i) => sum + val * [1, 2, 3][i],
          0
        ),
        9
      )
    : Math.min(state.turnHitsCount || 0, 9);

  const previewScore = getPreviewScoreFromHits(previewHits);
  const previewMeta = getMeta(previewScore);
  const previewLabel = previewScore === 1 ? "Hole in One" : previewMeta.label;

  const previewLabelHtml =
    state.dartsThrown > 0
      ? `
        <div style="
          padding:8px 10px;
          border-radius:10px;
          background:rgba(255,255,255,0.08);
          color:${previewMeta.color};
          font-weight:bold;
          text-align:center;
        ">
          ${state.players[state.currentPlayer].name}
          (${hitsDisplay ? hitsDisplay.replace(" | ", "") + " | " : ""}${previewLabel})
        </div>
      `
      : "";

  const scoreAge = Date.now() - (state.lastScoreTimestamp || 0);
  const showScoreFlash = state.lastScoreMessage && scoreAge < 2500;
  const flashOpacity = scoreAge > 1800 ? 0.35 : 1;

  const scoreFlashHtml = showScoreFlash
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        color:${state.lastScoreColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
        opacity:${flashOpacity};
        transition:opacity 0.6s ease;
      ">
        ${state.lastScoreMessage}
      </div>
    `
    : "";

  const feedbackHtml = scoreFlashHtml || previewLabelHtml || `<div></div>`;

  container.innerHTML = `
    <h2 style="text-align:center;margin-bottom:10px;">Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

    <div style="
      min-height:54px;
      margin:8px 0 12px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${feedbackHtml}
      </div>
    </div>

    <h3 style="text-align:center;margin:8px 0 12px;">
      🎯 ${state.players[state.currentPlayer].name}
      (Dart ${state.dartsThrown + 1}/3${hitsDisplay})
    </h3>

    <div id="controls"></div>

    <div id="modal"></div>
  `;

  renderScorecard(state);
  renderControls(container);

  if (showScoreFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

/* -------------------------
   PROMPTS
--------------------------*/

function renderHazardPrompt(container, state) {
  const player = state.players[state.currentPlayer];
  const hitsText = formatCurrentHits(state.currentTurnHits);
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
    btn.onclick = () => {
      submitHazards(count);
      renderUI(container);
    };
    hazardControls.appendChild(btn);
  });
}

function renderHammerPrompt(container, state) {
  const player = state.players[state.currentPlayer];
  const hitsText = formatCurrentHits(state.currentTurnHits);
  const hitsDisplay = hitsText ? ` | Hits ${hitsText}` : "";

  container.innerHTML = `
    <h2 style="text-align:center;">Hammer Hole ${state.currentHole + 1}</h2>

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

    <p style="text-align:center;">Hammer scoring uses dart order: 1st ×1, 2nd ×2, 3rd ×3.</p>

    <div id="hammerControls"></div>

    <div id="modal"></div>
  `;

  renderScorecard(state);

  const hammerControls = document.getElementById("hammerControls");
  hammerControls.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-top:8px;
  `;

  const applyBtn = document.createElement("div");
  applyBtn.innerText = "Apply Hammer Score";
  applyBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:44px;
    font-size:16px;
  `;
  applyBtn.onclick = () => {
    submitHammer();
    renderUI(container);
  };

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:10px;
    min-height:44px;
    font-size:16px;
  `;
  undoBtn.onclick = () => {
    undo();
    renderUI(container);
  };

  hammerControls.appendChild(applyBtn);
  hammerControls.appendChild(undoBtn);
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const state = getState();
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

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
    btn.innerText = opt.label;
    btn.style = `
      ${buttonStyle()}
      padding:10px 8px;
      font-size:16px;
      min-height:44px;
    `;
    btn.onclick = () => {
      recordThrow(opt.value);
      renderUI(container);
    };
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
  `;
  missBtn.onclick = () => {
    recordThrow(0);
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

  middleRow.appendChild(missBtn);
  middleRow.appendChild(nextBtn);

  const lowerRow = document.createElement("div");
  lowerRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const leaderboardBtn = document.createElement("div");
  leaderboardBtn.innerText = "Leaderboard";
  leaderboardBtn.style = `
    ${leaderboardButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  leaderboardBtn.onclick = () => {
    renderLeaderboardModal(getState());
  };

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  undoBtn.onclick = () => {
    undo();
    renderUI(container);
  };

  const endBtn = document.createElement("div");
  endBtn.innerText = "End";
  endBtn.style = `
    ${dangerButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  endBtn.onclick = () => {
    renderEndGameConfirm(container);
  };

  lowerRow.appendChild(leaderboardBtn);
  lowerRow.appendChild(undoBtn);
  lowerRow.appendChild(endBtn);

  controls.appendChild(topRow);
  controls.appendChild(middleRow);
  controls.appendChild(lowerRow);
}
/* -------------------------
   SCORECARD
--------------------------*/

function renderScorecard(state) {
  const div = document.getElementById("scorecard");
  const hazardHoles = state.hazardHoles || [];
  const hammerHoles = state.hammerHoles || [];

  const showingFront = state.currentHole < 9;
  const startHole = showingFront ? 0 : 9;
  const endHole = showingFront ? 9 : 18;
  const subtotalLabel = showingFront ? "Out" : "In";

  let html = `<table style="
    width:100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: center;
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
    const active = i === state.currentHole;
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

    if (active) {
      holeStyle += "outline:2px solid #22c55e;outline-offset:-2px;";
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
    const activePlayer = index === state.currentPlayer;
    const frontTotal = player.scores
      .slice(0, 9)
      .reduce((sum, score) => sum + (score ?? 0), 0);
    const backTotal = player.scores
      .slice(9, 18)
      .reduce((sum, score) => sum + (score ?? 0), 0);
    const subtotal = showingFront ? frontTotal : backTotal;

    html += `<tr style="${activePlayer ? "background:#f7fff8;" : "background:#ffffff;"}">`;

    html += `<td style="
      padding:6px 8px;
      border:1px solid #d6d6d6;
      font-weight:bold;
      text-align:left;
      white-space:nowrap;
    ">${player.name}</td>`;

    for (let h = startHole; h < endHole; h++) {
      const score = player.scores[h];
      const active = h === state.currentHole;
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

      if (active) {
        cellStyle += "font-weight:bold;";
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

  html += "</table>";

  div.innerHTML = html;
}

/* -------------------------
   END GAME
--------------------------*/

function renderEnd(container, state) {
  const winner = state.shanghaiWinner
    ? state.shanghaiWinner
    : [...state.players].sort((a, b) => a.total - b.total)[0].name;

  container.innerHTML = `
    <h2>${state.shanghaiWinner ? "🔥 SHANGHAI 🔥" : "Game Over"}</h2>
    <h3>🏆 Winner: ${winner}</h3>

    <div id="scorecard"></div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:12px;
    " id="endControls"></div>

    <div id="modal"></div>
  `;

  renderScorecard(state);

  const controls = document.getElementById("endControls");

  const leaderboardBtn = document.createElement("div");
  leaderboardBtn.innerText = "Leaderboard";
  leaderboardBtn.style = `
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
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  leaderboardBtn.onclick = () => {
    renderLeaderboardModal(state);
  };

  const playAgainBtn = document.createElement("div");
  playAgainBtn.innerText = "Play Again";
  playAgainBtn.style = `
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
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  mainMenuBtn.onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };

  controls.appendChild(leaderboardBtn);
  controls.appendChild(playAgainBtn);
  controls.appendChild(mainMenuBtn);
}
