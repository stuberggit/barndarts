import { getState, recordThrow, isGameOver, undo } from "./logic.js";

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

/* -------------------------
   MAIN UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  const hitsText = formatCurrentHits(state.currentTurnHits);
  const hitsDisplay = hitsText ? ` | Hits ${hitsText}` : "";

  container.innerHTML = `
    <h2>Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

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

  for (const opt of options) {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = opt.label;

    btn.onclick = () => {
      recordThrow(opt.value);
      renderUI(container);
    };

    controls.appendChild(btn);
  }
}

/* -------------------------
   SCORECARD
--------------------------*/

function renderScorecard(state) {
  const div = document.getElementById("scorecard");

  let html = `<table style="
    width:100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: center;
  ">`;

  // ===== HEADER ROW =====
  html += "<tr><th></th>";

  for (let i = 0; i < 9; i++) {
    const active = i === state.currentHole;
    html += `<th style="${cellStyle(active)}">${i + 1}</th>`;
  }

  html += `<th>Out</th>`;

  for (let i = 9; i < 18; i++) {
    const active = i === state.currentHole;
    html += `<th style="${cellStyle(active)}">${i + 1}</th>`;
  }

  html += `<th>In</th><th>Total</th></tr>`;

  // ===== PLAYER ROWS =====
  state.players.forEach((p, index) => {
    const activePlayer = index === state.currentPlayer;

    let outTotal = 0;
    let inTotal = 0;

    html += `<tr style="${activePlayer ? "background:#1e293b;" : ""}">`;

    html += `<td style="padding:6px;font-weight:bold;text-align:left;">
      ${p.name}
    </td>`;

    // FRONT 9
    for (let i = 0; i < 9; i++) {
      const score = p.scores[i];
      if (score !== null) outTotal += score;

      html += `<td style="${cellStyle(i === state.currentHole)}">
        ${score ?? ""}
      </td>`;
    }

    html += `<td style="font-weight:bold;">${outTotal || ""}</td>`;

    // BACK 9
    for (let i = 9; i < 18; i++) {
      const score = p.scores[i];
      if (score !== null) inTotal += score;

      html += `<td style="${cellStyle(i === state.currentHole)}">
        ${score ?? ""}
      </td>`;
    }

    html += `<td style="font-weight:bold;">${inTotal || ""}</td>`;

    html += `<td style="font-weight:bold;">
      ${(outTotal + inTotal) || ""}
    </td>`;

    html += "</tr>";
  });

  html += "</table>";

  div.innerHTML = html;
}

/* helper */
function cellStyle(active) {
  return `
    padding:4px;
    border-bottom:1px solid #333;
    ${active ? "color:#22c55e;font-weight:bold;" : ""}
  `;
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
