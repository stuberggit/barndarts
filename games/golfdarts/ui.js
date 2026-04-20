import {
  getState,
  recordThrow,
  isGameOver,
  undo,
  nextPlayer,
  submitHazards,
  submitHammer,
  getMeta
} from "./logic.js";

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

  const previewLabelHtml =
    state.dartsThrown > 0
      ? `
        <div style="
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.08);
          color:${previewMeta.color};
          font-weight:bold;
          text-align:center;
        ">
          ${state.players[state.currentPlayer].name}
          (${hitsDisplay ? hitsDisplay.replace(" | ", "") + " | " : ""}${previewScore === 1 ? "Hole in One" : previewMeta.label})
        </div>
      `
      : "";

  const scoreAge = Date.now() - (state.lastScoreTimestamp || 0);
  const showScoreFlash = state.lastScoreMessage && scoreAge < 2500;
  const flashOpacity = scoreAge > 1800 ? 0.35 : 1;

  const scoreFlashHtml = showScoreFlash
    ? `
      <div style="
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255,255,255,0.08);
        color: ${state.lastScoreColor || "#ffffff"};
        font-weight: bold;
        text-align: center;
        opacity: ${flashOpacity};
        transition: opacity 0.6s ease;
      ">
        ${state.lastScoreMessage}
      </div>
    `
    : "";

  const feedbackHtml = scoreFlashHtml || previewLabelHtml || `<div></div>`;

  container.innerHTML = `
    <h2>Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

    <div style="
      min-height: 54px;
      margin: 8px 0 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width:100%;">
        ${feedbackHtml}
      </div>
    </div>

    <h3>
      🎯 ${state.players[state.currentPlayer].name}
      (Dart ${state.dartsThrown + 1}/3${hitsDisplay})
    </h3>

    <div id="controls"></div>

    <div class="button" id="undoBtn">Undo</div>
  `;

  renderScorecard(state);
  renderControls(container);

  document.getElementById("undoBtn").onclick = () => {
    undo();
    renderUI(container);
  };

  if (showScoreFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}
function getPreviewScore(hits) {
  if (hits === 0) return 5;

  const scores = [3, 2, 1, 0, -1, -2, -3, -4, -5];
  return scores[hits - 1] ?? 5;
}

/* -------------------------
   HAZARD PROMPT
--------------------------*/

function renderHazardPrompt(container, state) {
  const player = state.players[state.currentPlayer];
  const hitsText = formatCurrentHits(state.currentTurnHits);
  const hitsDisplay = hitsText ? ` | Hits ${hitsText}` : "";

  container.innerHTML = `
    <h2>Hazard Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

    <h3>
      🎯 ${player.name}${hitsDisplay}
    </h3>

    <p>How many hazards were hit?</p>

    <div id="hazardControls"></div>

    <div class="button" id="undoBtn">Undo</div>
  `;

  renderScorecard(state);

  const hazardControls = document.getElementById("hazardControls");

  [0, 1, 2, 3].forEach(count => {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = `${count} Hazard${count === 1 ? "" : "s"}`;

    btn.onclick = () => {
      submitHazards(count);
      renderUI(container);
    };

    hazardControls.appendChild(btn);
  });

  document.getElementById("undoBtn").onclick = () => {
    undo();
    renderUI(container);
  };
}

/* -------------------------
   HAMMER PROMPT
--------------------------*/

function renderHammerPrompt(container, state) {
  const player = state.players[state.currentPlayer];
  const hitsText = formatCurrentHits(state.currentTurnHits);
  const hitsDisplay = hitsText ? ` | Hits ${hitsText}` : "";

  container.innerHTML = `
    <h2>Hammer Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

    <h3>
      🎯 ${player.name}${hitsDisplay}
    </h3>

    <p>Hammer scoring uses dart order: 1st ×1, 2nd ×2, 3rd ×3.</p>

    <div id="hammerControls"></div>

    <div class="button" id="undoBtn">Undo</div>
  `;

  renderScorecard(state);

  const hammerControls = document.getElementById("hammerControls");

  const applyBtn = document.createElement("div");
  applyBtn.className = "button";
  applyBtn.innerText = "Apply Hammer Score";

  applyBtn.onclick = () => {
    submitHammer();
    renderUI(container);
  };

  hammerControls.appendChild(applyBtn);

  document.getElementById("undoBtn").onclick = () => {
    undo();
    renderUI(container);
  };
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const options = [
    { label: "❌ MISS", value: 0 },
    { label: "Single", value: 1 },
    { label: "Double", value: 2 },
    { label: "Triple", value: 3 }
  ];

  options.forEach(opt => {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = opt.label;

    btn.onclick = () => {
      recordThrow(opt.value);
      renderUI(container);
    };

    controls.appendChild(btn);
  });

  const nextBtn = document.createElement("div");
  nextBtn.className = "button";
  nextBtn.innerText = "➡️ Next Player";

  nextBtn.onclick = () => {
    nextPlayer();
    renderUI(container);
  };

  controls.appendChild(nextBtn);
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
  if (state.shanghaiWinner) {
    container.innerHTML = `
      <h2>🔥 SHANGHAI 🔥</h2>
      <h3>🏆 Winner: ${state.shanghaiWinner}</h3>
      <div id="scorecard"></div>
    `;

    renderScorecard(state);
    return;
  }

  const winner = [...state.players].sort((a, b) => a.total - b.total)[0];

  container.innerHTML = `
    <h2>Game Over</h2>
    <h3>🏆 Winner: ${winner.name}</h3>
    <div id="scorecard"></div>
  `;

  renderScorecard(state);
}
