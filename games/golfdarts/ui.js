import { getState, recordThrow, isGameOver, undo, nextPlayer, submitHazards, submitHammer } from "./logic.js";

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

function headerCellStyle({ active, isHazard }) {
  let style = `
    padding:4px;
    border-bottom:1px solid #555;
  `;

  if (active) {
    style += "font-weight:bold;color:#22c55e;";
  } else if (isHazard) {
    style += "color:#ff4c4c;";
  }

  return style;
}

function scoreCellStyle({ active, isHazard }) {
  let style = `
    padding:4px;
    border-bottom:1px solid #333;
  `;

  if (isHazard) {
    style += "background:#2a1515;";
  }

  if (active) {
    style += "color:#22c55e;font-weight:bold;";
  }

  return style;
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
   HAMMER PROMPT
--------------------------*/

function renderHammerPrompt(container, state) {
  const player = state.players[state.currentPlayer];
  const hitsText = formatCurrentHits(state.currentTurnHits);

  container.innerHTML = `
    <h2>🔵 Hammer Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

    <h3>
      ${player.name}
      ${hitsText ? ` | Hits ${hitsText}` : ""}
    </h3>

    <p>Select hammer modifier:</p>

    <div id="hammerControls"></div>

    <div class="button" id="undoBtn">Undo</div>
  `;

  renderScorecard(state);

  const hammerControls = document.getElementById("hammerControls");

  [-2, -1, 0, 1, 2].forEach(val => {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = val >= 0 ? `+${val}` : val;

    btn.onclick = () => {
      submitHammer(val);
      renderUI(container);
    };

    hammerControls.appendChild(btn);
  });

  document.getElementById("undoBtn").onclick = () => {
    undo();
    renderUI(container);
  };
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

  let html = `<table style="
    width:100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: center;
  ">`;

  html += "<tr><th></th>";

  for (let i = 0; i < 18; i++) {
    const active = i === state.currentHole;
    const isHazard = hazardHoles.includes(i);
    const isHammer = state.hammerHoles?.includes(i);

    html += `<th style="${headerCellStyle({ active, isHazard })}">
      ${i + 1}
    </th>`;
  }

  ${isHammer ? "color:#3b82f6;" : ""}
  ${isHammer ? "background:#14223a;" : ""} 

  html += `<th>Total</th></tr>`;

  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    const activePlayer = i === state.currentPlayer;

    html += `<tr style="${activePlayer ? "background:#1e293b;" : ""}">`;

    html += `<td style="padding:6px;font-weight:bold;text-align:left;">
      ${p.name}
    </td>`;

    for (let h = 0; h < p.scores.length; h++) {
      const active = h === state.currentHole;
      const isHazard = hazardHoles.includes(h);

      html += `<td style="${scoreCellStyle({ active, isHazard })}">
        ${p.scores[h] ?? ""}
      </td>`;
    }

    html += `<td style="padding:6px;font-weight:bold;">
      ${p.total}
    </td>`;

    html += "</tr>";
  }

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
