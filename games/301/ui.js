import {
  getState,
  submitThrow,
  nextPlayer,
  undo,
  isGameOver
} from "./logic.js";

/* -------------------------
   BUTTON STYLES
--------------------------*/

function buttonStyle() {
  return `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ffffff;
    border-radius:10px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    cursor:pointer;
  `;
}

function lightButtonStyle() {
  return `
    background:#ffffff;
    color:#206a1e;
    border:1px solid #000;
    border-radius:10px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    cursor:pointer;
  `;
}

function undoButtonStyle() {
  return `
    background:#206a1e;
    color:#fff;
    border:1px solid #ff4c4c;
    border-radius:10px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    cursor:pointer;
  `;
}

function dangerButtonStyle() {
  return `
    background:#7f1d1d;
    color:#fff;
    border:1px solid #fca5a5;
    border-radius:10px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    cursor:pointer;
  `;
}

function attach(el, fn) {
  el.onclick = fn;
  el.ontouchstart = e => {
    e.preventDefault();
    fn();
  };
}

/* -------------------------
   MAIN UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    container.innerHTML = `
      <h2 style="text-align:center;">🏆 ${state.winner} Wins!</h2>
    `;
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
    <div id="playerBoard"></div>
    <div id="modal"></div>
  `;

  renderControls(container);
  renderPlayers(container);
}

/* -------------------------
   PLAYER BOARD
--------------------------*/

function renderPlayers(container) {
  const state = getState();
  const board = document.getElementById("playerBoard");

  board.innerHTML = state.players
    .map((p, i) => {
      const active = i === state.currentPlayer;
      return `
        <div style="
          padding:8px;
          margin:4px;
          border-radius:8px;
          border:${active ? "2px solid #f0970a" : "1px solid #444"};
          background:${active ? "#11361a" : "#111"};
          display:flex;
          justify-content:space-between;
        ">
          <span>${p.name}</span>
          <span>${p.score}</span>
        </div>
      `;
    })
    .join("");
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const state = getState();
  const controls = document.getElementById("controls");

  const canThrow =
    !state.winner &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  const wrap = document.createElement("div");

  // top row
  const row1 = document.createElement("div");
  row1.style = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px";

  ["single", "double", "triple"].forEach(type => {
    const btn = document.createElement("div");
    btn.innerText = type === "single" ? "Single" : type === "double" ? "Dub" : "Trip";
    btn.style = `${buttonStyle()}padding:12px`;

    attach(btn, () => {
      if (!canThrow) return;
      openNumberModal(container, type);
    });

    row1.appendChild(btn);
  });

  // bottom row
  const row2 = document.createElement("div");
  row2.style = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px";

  const miss = document.createElement("div");
  miss.innerText = "Miss";
  miss.style = `${buttonStyle()}padding:12px`;
  attach(miss, () => {
    if (!canThrow) return;
    submitThrow("miss");
    renderUI(container);
  });

  const next = document.createElement("div");
  next.innerText = "Next Player";
  next.style = `${buttonStyle()}padding:12px`;
  attach(next, () => {
    nextPlayer();
    renderUI(container);
  });

  row2.appendChild(miss);
  row2.appendChild(next);

  // utility row
  const row3 = document.createElement("div");
  row3.style = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px";

  const leaderboard = document.createElement("div");
  leaderboard.innerText = "Leaderboard";
  leaderboard.style = `${lightButtonStyle()}padding:8px`;

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `${undoButtonStyle()}padding:8px`;
  attach(undoBtn, () => {
    undo();
    renderUI(container);
  });

  const end = document.createElement("div");
  end.innerText = "End";
  end.style = `${dangerButtonStyle()}padding:8px`;

  row3.appendChild(leaderboard);
  row3.appendChild(undoBtn);
  row3.appendChild(end);

  wrap.appendChild(row1);
  wrap.appendChild(row2);
  wrap.appendChild(row3);

  controls.appendChild(wrap);
}

/* -------------------------
   MODAL
--------------------------*/

function openNumberModal(container, type) {
  const modal = document.getElementById("modal");

  modal.innerHTML = `
    <div style="background:#111;padding:10px;border:1px solid #fff;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
        ${Array.from({ length: 20 }, (_, i) => `
          <div class="numBtn" data-num="${i + 1}" style="${buttonStyle()}padding:10px">
            ${i + 1}
          </div>
        `).join("")}
      </div>

      <div style="display:flex;gap:6px;margin-top:8px;">
        <div id="bull" style="${buttonStyle()}padding:10px">Bull</div>
        <div id="close" style="${buttonStyle()}padding:10px;border:1px solid red;">Close</div>
      </div>
    </div>
  `;

  modal.querySelectorAll(".numBtn").forEach(btn => {
    attach(btn, () => {
      submitThrow(type, Number(btn.dataset.num));
      renderUI(container);
      openNumberModal(container, type);
    });
  });

  attach(document.getElementById("bull"), () => {
    submitThrow(type === "single" ? "greenBull" : "redBull");
    renderUI(container);
    openNumberModal(container, type);
  });

  attach(document.getElementById("close"), () => {
    modal.innerHTML = "";
  });
}
