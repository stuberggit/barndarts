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
  const dartDisplay = state.turnReadyForNext
    ? "Turn complete — tap Next Player"
    : `Dart ${state.dartsThrown + 1}/3`;

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      🎯 Current Player
    </div>

    <div style="
      margin-bottom:12px;
      padding:14px;
      border-radius:12px;
      background:#11361a;
      border:2px solid #f0970a;
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="font-size:26px;margin-bottom:6px;">
        ${player.name}
      </div>
      <div style="font-size:34px;line-height:1;margin-bottom:6px;">
        ${player.score}
      </div>
      <div style="font-size:16px;color:#facc15;">
        ${dartDisplay}
      </div>
    </div>

    <div id="controls"></div>
    <div id="playerBoard"></div>
    <div id="turnSummary"></div>
    <div id="modal"></div>
  `;

  renderControls(container);
  renderPlayers(container);
  renderTurnSummary();
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
  controls.innerHTML = "";

  const canThrow =
    !state.winner &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  const row1 = document.createElement("div");
  row1.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  [
    { label: "Single", value: "single" },
    { label: "Dub", value: "double" },
    { label: "Trip", value: "triple" }
  ].forEach(type => {
    const btn = document.createElement("div");
    btn.innerText = type.label;
    btn.style = `
      ${buttonStyle()}
      padding:12px;
      min-height:52px;
      font-size:18px;
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attach(btn, () => {
      if (!canThrow) return;
      openNumberModal(container, type.value);
    });

    row1.appendChild(btn);
  });

  const row2 = document.createElement("div");
  row2.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const miss = document.createElement("div");
  miss.innerText = "Miss";
  miss.style = `
    ${buttonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
    ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;
  attach(miss, () => {
    if (!canThrow) return;
    submitThrow("miss");
    renderUI(container);
  });

  const next = document.createElement("div");
  next.innerText = "Next Player";
  next.style = `
    ${buttonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
  `;
  attach(next, () => {
    nextPlayer();
    renderUI(container);
  });

  row2.appendChild(miss);
  row2.appendChild(next);

  const row3 = document.createElement("div");
  row3.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const leaderboard = document.createElement("div");
  leaderboard.innerText = "Leaderboard";
  leaderboard.style = `
    ${lightButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attach(undoBtn, () => {
    undo();
    renderUI(container);
  });

  const end = document.createElement("div");
  end.innerText = "End";
  end.style = `
    ${dangerButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;

  row3.appendChild(leaderboard);
  row3.appendChild(undoBtn);
  row3.appendChild(end);

  controls.appendChild(row1);
  controls.appendChild(row2);
  controls.appendChild(row3);
}

/* -------------------------
   MODAL
--------------------------*/

function openNumberModal(container, type) {
  const state = getState();
  const modal = document.getElementById("modal");
  const isTriple = type === "triple";

  const canThrow =
    !state.winner &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  function getHitCountFor(target) {
    return (state.currentTurnThrows || []).filter(throwRecord => {
      return throwRecord.hitType === type && throwRecord.target === target;
    }).length;
  }

  const bullHitType = type === "single" ? "greenBull" : type === "double" ? "redBull" : null;

  const bullHitCount = bullHitType
    ? (state.currentTurnThrows || []).filter(throwRecord => {
        return throwRecord.hitType === bullHitType;
      }).length
    : 0;

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
        border-radius:12px;
        width:100%;
        max-width:700px;
        max-height:90vh;
        overflow:auto;
        border:1px solid #ffffff;
      ">
        <h2 style="text-align:center;margin-top:0;">
          ${type === "single" ? "Single" : type === "double" ? "Dub" : "Trip"}
        </h2>

        <div id="numberGrid"></div>

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          margin-top:12px;
        ">
          <div id="bullBtn" style="
            ${buttonStyle()}
            position:relative;
            padding:12px;
            min-height:52px;
            font-size:20px;
            ${bullHitCount > 0 ? "border:3px solid #facc15;box-shadow:0 0 12px rgba(250,204,21,0.55);" : ""}
            ${isTriple || !canThrow ? "background:#555;color:#bbb;border:1px solid #999;cursor:not-allowed;" : ""}
          ">
            Bull
            ${
              bullHitCount > 0
                ? `<span style="
                    position:absolute;
                    top:4px;
                    right:6px;
                    background:#facc15;
                    color:#111111;
                    border-radius:999px;
                    min-width:22px;
                    height:22px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:13px;
                    font-weight:bold;
                  ">${bullHitCount}</span>`
                : ""
            }
          </div>

          <div id="closeModalBtn" style="
            ${buttonStyle()}
            padding:12px;
            min-height:52px;
            font-size:20px;
            border:1px solid #ff4c4c;
          ">Close</div>
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById("numberGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
  `;

  for (let i = 1; i <= 20; i++) {
    const hitCount = getHitCountFor(i);

    const btn = document.createElement("div");
    btn.innerHTML = `
      <span>${i}</span>
      ${
        hitCount > 0
          ? `<span style="
              position:absolute;
              top:4px;
              right:6px;
              background:#facc15;
              color:#111111;
              border-radius:999px;
              min-width:22px;
              height:22px;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:13px;
              font-weight:bold;
            ">${hitCount}</span>`
          : ""
      }
    `;

    btn.style = `
      ${buttonStyle()}
      position:relative;
      padding:12px;
      min-height:52px;
      font-size:20px;
      ${hitCount > 0 ? "border:3px solid #facc15;box-shadow:0 0 12px rgba(250,204,21,0.55);" : ""}
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attach(btn, () => {
      const freshState = getState();

      if (
        freshState.winner ||
        freshState.turnReadyForNext ||
        freshState.dartsThrown >= 3
      ) {
        openNumberModal(container, type);
        return;
      }

      submitThrow(type, i);
      renderUI(container);

      const updatedState = getState();

      if (
        !updatedState.winner &&
        !updatedState.turnReadyForNext &&
        updatedState.dartsThrown < 3
      ) {
        openNumberModal(container, type);
      }
    });

    grid.appendChild(btn);
  }

  const bullBtn = document.getElementById("bullBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (!isTriple && canThrow) {
    attach(bullBtn, () => {
      const freshState = getState();

      if (
        freshState.winner ||
        freshState.turnReadyForNext ||
        freshState.dartsThrown >= 3
      ) {
        openNumberModal(container, type);
        return;
      }

      submitThrow(type === "single" ? "greenBull" : "redBull");
      renderUI(container);

      const updatedState = getState();

      if (
        !updatedState.winner &&
        !updatedState.turnReadyForNext &&
        updatedState.dartsThrown < 3
      ) {
        openNumberModal(container, type);
      }
    });
  }

  attach(closeBtn, () => {
    modal.innerHTML = "";
  });
}
