import { getState, recordThrow, isGameOver, undo } from "./logic.js";

/* -------------------------
   HELPERS
--------------------------*/

function formatCurrentHits(currentTurnHits = []) {
  if (!currentTurnHits.length) return "";

  const hitLabels = {
    1: "Single",
    2: "Dub",
    3: "Trip"
  };

  return currentTurnHits
    .map(hit => hitLabels[hit] || "")
    .filter(Boolean)
    .join(", ");
}

/* -------------------------
   MAIN RENDER
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  const currentHitsText = formatCurrentHits(state.currentTurnHits);
  const hitsDisplay = currentHitsText ? " | Hits " + currentHitsText : "";

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

  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) {
    undoBtn.onclick = () => {
      undo();
      renderUI(container);
    };
  }
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const buttons = [
    { label: "❌ MISS", value: 0 },
    { label: "Single", value: 1 },
    { label: "Double", value: 2 },
    { label: "Triple", value: 3 }
  ];

  buttons.forEach(btnData => {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = btnData.label;

    btn.onclick = () => {
      recordThrow(btnData.value);
      renderUI(container);
    };

    controls.appendChild(btn);
  });
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

  html += "<tr><th></th>";

  for (let i = 0; i < 18; i++) {
    const isCurrentHole = i === state.currentHole;

    html += `<th style="
      padding:4px;
      border-bottom: 1px solid #555;
      ${isCurrentHole ? "color: #22c55e; font-weight: bold;" : ""}
    ">${i + 1}</th>`;
  }

  html += `<th style="padding:4px;">Total</th></tr>`;

  state.players.forEach((player, index) => {
    const isCurrentPlayer = index === state.currentPlayer;

    html += `<tr style="${isCurrentPlayer ? "background:#1e293b;" : ""}">`;

    html += `<td style="
      padding:6px;
      font-weight:bold;
      text-align:left;
    ">${player.name}</td>`;

    player.scores.forEach((score, holeIndex) => {
      const isCurrentHole = holeIndex === state.currentHole;

      html += `<td style="
        padding:4px;
        border-bottom: 1px solid #333;
        ${isCurrentHole ? "color:#22c55e; font-weight:bold;" : ""}
      ">${score !== null ? score : ""}</td>`;
    });

    html += `<td style="
      padding:6px;
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
}import { getState, recordThrow, isGameOver, undo } from "./logic.js";

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  const currentHitsText = formatCurrentHits(state.currentTurnHits);
  const hitsDisplay = currentHitsText ? " | Hits " + currentHitsText : "";

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

  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) {
    undoBtn.onclick = () => {
      undo();
      renderUI(container);
    };
  }
}

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const buttons = [
    { label: "❌ MISS", value: 0 },
    { label: "Single", value: 1 },
    { label: "Double", value: 2 },
    { label: "Triple", value: 3 }
  ];

  buttons.forEach(({ label, value }) => {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = label;

    btn.onclick = () => {
      recordThrow(value);
      renderUI(container);
    };

    controls.appendChild(btn);
  });
}

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
