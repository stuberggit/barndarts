import {
  getState,
  submitThrow,
  nextPlayer,
  undo,
  isGameOver
} from "./logic.js";

/* -------------------------
   UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    container.innerHTML = `<h2 style="text-align:center;">🏆 ${state.winner} Wins!</h2>`;
    return;
  }

  const player = state.players[state.currentPlayer];

  container.innerHTML = `
    <div style="text-align:center;font-size:24px;margin-bottom:10px;">
      🎯 ${player.name}
    </div>

    <div style="text-align:center;font-size:36px;margin-bottom:10px;">
      ${player.score}
    </div>

    <div style="text-align:center;margin-bottom:10px;">
      Dart ${state.dartsThrown + 1}/3
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderControls(container);
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const controls = document.getElementById("controls");

  controls.innerHTML = `
    <button id="single">Single</button>
    <button id="double">Dub</button>
    <button id="triple">Trip</button>
    <button id="bull">Bull</button>
    <button id="miss">Miss</button>
    <button id="next">Next</button>
  `;

  document.getElementById("single").onclick = () => openNumberModal(container, "single");
  document.getElementById("double").onclick = () => openNumberModal(container, "double");
  document.getElementById("triple").onclick = () => openNumberModal(container, "triple");

  document.getElementById("bull").onclick = () => submitThrow("greenBull");
  document.getElementById("miss").onclick = () => submitThrow("miss");
  document.getElementById("next").onclick = () => {
    nextPlayer();
    renderUI(container);
  };
}

/* -------------------------
   MODAL
--------------------------*/

function openNumberModal(container, type) {
  const modal = document.getElementById("modal");

  modal.innerHTML = `
    <div>
      ${Array.from({ length: 20 }, (_, i) => `
        <button onclick="window.pick(${i + 1})">${i + 1}</button>
      `).join("")}
      <button onclick="window.closeModal()">Close</button>
    </div>
  `;

  window.pick = (num) => {
    submitThrow(type, num);
    renderUI(container);
    openNumberModal(container, type);
  };

  window.closeModal = () => {
    modal.innerHTML = "";
  };
}
