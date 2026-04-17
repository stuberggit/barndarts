import { getState, recordThrow, isGameOver, undo } from "./logic.js";

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
