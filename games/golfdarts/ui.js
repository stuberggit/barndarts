import { getState, recordScore, isGameOver, undo } from "./logic.js";

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

    <h3>Player: ${state.players[state.currentPlayer].name}</h3>

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

  let html = `<table style="width:100%; font-size:12px;">`;

  html += "<tr><th></th>";
  for (let i = 0; i < 18; i++) {
    html += `<th>${i + 1}</th>`;
  }
  html += "<th>Total</th></tr>";

  state.players.forEach(p => {
    html += `<tr><td>${p.name}</td>`;

    p.scores.forEach(score => {
      html += `<td>${score ?? "-"}</td>`;
    });

    html += `<td>${p.total}</td></tr>`;
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
      recordScore(score);
      renderUI(container);
    };

    controls.appendChild(btn);
  });
}

function renderEnd(container, state) {
  const winner = [...state.players].sort((a,b) => a.total - b.total)[0];

  container.innerHTML = `
    <h2>Game Over</h2>
    <h3>🏆 Winner: ${winner.name}</h3>

    <div id="scorecard"></div>
  `;

  renderScorecard(state);
}
