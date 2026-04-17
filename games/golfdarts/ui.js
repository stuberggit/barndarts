import { getState, recordThrow, isGameOver, undo } from "./logic.js";

console.log("UNDO IMPORT:", undo);

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  container.innerHTML = `
    <h2>Hole ${state.currentHole + 1}</h2>

    <div id="scorecard"></div>

<h3>
  Player: ${state.players[state.currentPlayer].name}  
  (Dart ${state.dartsThrown + 1}/3)
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

function renderScorecard(state) {
  const div = document.getElementById("scorecard");

  let html = `<table style="
    width:100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: center;
  ">`;

  // Header row
  html += "<tr><th></th>";

  for (let i = 0; i < 18; i++) {
    const isCurrentHole = i === state.currentHole;

    html += `<th style="
      padding:4px;
      border-bottom: 1px solid #555;
      ${isCurrentHole ? 'color: #22c55e; font-weight: bold;' : ''}
    ">${i + 1}</th>`;
  }

  html += `<th style="padding:4px;">Total</th></tr>`;

  // Player rows
  state.players.forEach((p, index) => {
    const isCurrentPlayer = index === state.currentPlayer;

    html += `<tr style="
      ${isCurrentPlayer ? 'background:#1e293b;' : ''}
    ">`;

    // Player name
    html += `<td style="
      padding:6px;
      font-weight: bold;
      text-align:left;
    ">${p.name}</td>`;

    // Scores
    p.scores.forEach((score, i) => {
      const isCurrentHole = i === state.currentHole;

      html += `<td style="
        padding:4px;
        border-bottom: 1px solid #333;
        ${isCurrentHole ? 'color:#22c55e; font-weight:bold;' : ''}
      ">
        ${score !== null ? score : ""}
      </td>`;
    });

    // Total
    html += `<td style="
      padding:6px;
      font-weight:bold;
    ">${p.total}</td>`;

    html += "</tr>";
  });

  html += "</table>";

  div.innerHTML = html;
}

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  [1,2,3,4,5].forEach(score => {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = score;

    btn.onclick = () => {
      recordThrow(true)   // for HIT
      recordThrow(false)  // for MISS
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
    `;
    return;
  }

  const winner = [...state.players].sort((a,b) => a.total - b.total)[0];

  container.innerHTML = `
    <h2>Game Over</h2>
    <h3>🏆 Winner: ${winner.name}</h3>

    <div id="scorecard"></div>
  `;

  renderScorecard(state);
}
