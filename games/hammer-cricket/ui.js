import {
  getState,
  recordThrow,
  nextPlayer,
  undo,
  isGameOver,
  getMeta,
  initGame,
  getRotatedPlayersForReplay
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

function formatTarget(target) {
  return target === 25 ? "Bull" : String(target);
}

function formatCurrentThrows(throws = []) {
  if (!throws.length) return "";

  const map = {
    0: "Miss",
    1: "Single",
    2: "Dub",
    3: "Trip"
  };

  return throws.map(v => map[v] || "").join(", ");
}

function getLiveRoundScore(throws, round) {
  if (!round || !Array.isArray(throws)) return 0;

  const safeThrows = throws.slice(0, 3);
  const allMisses = safeThrows.length === 3 && safeThrows.every(v => v === 0);

  if (allMisses) {
    const penaltyMultiplier = round.type === "bonus" ? 5 : 3;
    return -(round.target * penaltyMultiplier);
  }

  let total = 0;

  for (let i = 0; i < safeThrows.length; i++) {
    const hitValue = Math.max(0, Math.min(3, safeThrows[i]));
    total += round.target * hitValue * round.multipliers[i];
  }

  return total;
}

/* -------------------------
   MAIN UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    (container, state);
    return;
  }

  const round = state.rounds[state.currentRound];
  const scoreAge = Date.now() - (state.lastScoreTimestamp || 0);
  const showScoreFlash = state.lastScoreMessage && scoreAge < 2500;

  const scoreFlashHtml = showScoreFlash
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background: rgba(255,255,255,0.08);
        color:${state.lastScoreColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
        opacity:${scoreAge > 1800 ? 0.35 : 1};
        transition: opacity 0.6s ease;
      ">
        ${state.lastScoreMessage}
      </div>
    `
    : "";

  const throwsText = formatCurrentThrows(state.currentTurnThrows);
  const throwsDisplay = throwsText ? ` | Hits ${throwsText}` : "";

  const liveScore =
    state.dartsThrown > 0 ? getLiveRoundScore(state.currentTurnThrows, round) : null;

  const liveMeta =
    liveScore !== null ? getMeta(liveScore) : { label: "", color: "#ffffff" };

  const liveLabel =
    state.dartsThrown > 0
      ? ` | <span style="color:${liveMeta.color};font-weight:bold;">${liveMeta.label}: ${liveScore > 0 ? "+" : ""}${liveScore}</span>`
      : "";

  const feedbackHtml = scoreFlashHtml || `<div></div>`;

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:10px;">
      <div style="
        font-size:14px;
        opacity:0.75;
        letter-spacing:0.5px;
      ">TARGET -</div>

      <div style="
        font-size:36px;
        font-weight:bold;
        line-height:1.1;
        color:${round.type === "bonus" ? "#facc15" : round.type === "bull" ? "#3b82f6" : "#ffffff"};
      ">
        ${formatTarget(round.target)}
      </div>
    </div>

    <div id="playerTiles"></div>

    <div style="
      min-height:54px;
      margin:8px 0 12px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${feedbackHtml}
      </div>
    </div>

    <h3 style="text-align:center;margin:8px 0 12px;">
      🎯 ${state.players[state.currentPlayer].name}
      (Dart ${state.dartsThrown + 1}/3${throwsDisplay}${liveLabel})
    </h3>

    <div id="controls"></div>

    <div id="modal"></div>
  `;

  renderPlayerTiles(state);
  renderControls(container);

  if (showScoreFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

/* -------------------------
   PLAYER TILES
--------------------------*/

function renderPlayerTiles(state) {
  const container = document.getElementById("playerTiles");

  container.innerHTML = "";
  container.style = `
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));
    gap:8px;
    margin-bottom:8px;
  `;

  state.players.forEach((player, index) => {
    const isActive = index === state.currentPlayer;

    const tile = document.createElement("div");
    tile.style = `
      padding:12px 10px;
      border-radius:10px;
      background:${isActive ? "#1e293b" : "#111111"};
      color:#ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      font-size:18px;
      border:1px solid #ffffff;
    `;

    tile.innerHTML = `
      <span style="font-weight:bold;">${player.name}</span>
      <span>${player.total}</span>
    `;

    container.appendChild(tile);
  });
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const state = getState();
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const round = state.rounds[state.currentRound];

  let topOptions;

    if (round.target === 25) {
    topOptions = [
      { label: "Single Bull", value: 1 },
      { label: "Double Bull", value: 2 }
    ];
  } else {
    topOptions = [
      { label: "Single", value: 1 },
      { label: "Dub", value: 2 },
      { label: "Trip", value: 3 }
    ];
  }

  const controlsWrap = document.createElement("div");
  controlsWrap.style = `
    display:flex;
    flex-direction:column;
    gap:8px;
    margin-top:8px;
  `;

  const greenButtonStyle = `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ffffff;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
  `;

  // Top row
  const topRow = document.createElement("div");
  topRow.style = `
    display:grid;
    grid-template-columns:${round.type === "bull" ? "1fr 1fr" : "1fr 1fr 1fr"};
    gap:8px;
  `;

  topOptions.forEach(opt => {
    const btn = document.createElement("div");
    btn.innerText = opt.label;
    btn.style = `
      ${greenButtonStyle}
      padding:10px 8px;
      font-size:16px;
      min-height:44px;
    `;

    btn.onclick = () => {
      recordThrow(opt.value);
      renderUI(container);
    };

    topRow.appendChild(btn);
  });

  // Middle row
  const middleRow = document.createElement("div");
  middleRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss";
  missBtn.style = `
    ${greenButtonStyle}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  missBtn.onclick = () => {
    recordThrow(0);
    renderUI(container);
  };

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.style = `
    ${greenButtonStyle}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  nextBtn.onclick = () => {
    nextPlayer();
    renderUI(container);
  };

  middleRow.appendChild(missBtn);
  middleRow.appendChild(nextBtn);

  // Lower row
  const lowerRow = document.createElement("div");
  lowerRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
  `;

  const leaderboardBtn = document.createElement("div");
  leaderboardBtn.innerText = "Leaderboard";
  leaderboardBtn.style = `
    background:#ffffff;
    color:#206a1e;
    border:1px solid #000000;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  leaderboardBtn.onclick = () => {
    renderLeaderboardModal(getState());
  };

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ff4c4c;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  undoBtn.onclick = () => {
    undo();
    renderUI(container);
  };

  lowerRow.appendChild(leaderboardBtn);
  lowerRow.appendChild(undoBtn);

  // End game row
  const endRow = document.createElement("div");
  endRow.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
  `;

  const endBtn = document.createElement("div");
  endBtn.innerText = "End Game";
  endBtn.style = `
    ${greenButtonStyle}
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  endBtn.onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };

  endRow.appendChild(endBtn);

  controlsWrap.appendChild(topRow);
  controlsWrap.appendChild(middleRow);
  controlsWrap.appendChild(lowerRow);
  controlsWrap.appendChild(endRow);

  controls.appendChild(controlsWrap);
}

/* -------------------------
   LEADERBOARD MODAL
--------------------------*/

function renderLeaderboardModal(state) {
  const modal = document.getElementById("modal");

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
    ">
      <div style="
        background:#fff;
        color:#000;
        padding:20px;
        border-radius:10px;
        width:90%;
        max-width:600px;
        max-height:90vh;
        overflow:auto;
      ">
        <h2>Leaderboard</h2>
        <div id="scorecard"></div>
        <div class="button" id="closeModal" style="
          background:#206a1e;
          color:#ffffff;
          border:1px solid #ffffff;
          margin-top:12px;
        ">Close</div>
      </div>
    </div>
  `;

  renderScorecard(state);

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
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
    background:#ffffff;
    color:#111111;
    border:1px solid #cfcfcf;
  ">`;

  html += `<tr style="background:#f4f4f4;"><th style="padding:6px;border:1px solid #d6d6d6;"></th>`;

  state.rounds.forEach((round, i) => {
    const active = i === state.currentRound;

    html += `<th style="
      padding:6px 4px;
      border:1px solid #d6d6d6;
      ${active ? "outline:2px solid #22c55e;outline-offset:-2px;" : ""}
    ">
      ${round.label}
    </th>`;
  });

  html += `<th style="padding:6px;border:1px solid #d6d6d6;">Total</th></tr>`;

  state.players.forEach((player, index) => {
    const activePlayer = index === state.currentPlayer;

    html += `<tr style="${activePlayer ? "background:#f7fff8;" : "background:#ffffff;"}">`;

    html += `<td style="
      padding:6px 8px;
      border:1px solid #d6d6d6;
      font-weight:bold;
      text-align:left;
    ">
      ${player.name}
    </td>`;

    player.roundScores.forEach((score, i) => {
      const active = i === state.currentRound;

      html += `<td style="
        padding:6px 4px;
        border:1px solid #d6d6d6;
        ${active ? "font-weight:bold;" : ""}
      ">
        ${score ?? ""}
      </td>`;
    });

    html += `<td style="
      padding:6px 4px;
      border:1px solid #d6d6d6;
      font-weight:bold;
    ">
      ${player.total}
    </td>`;

    html += "</tr>";
  });

  html += "</table>";
  div.innerHTML = html;
}

/* -------------------------
   END GAME
--------------------------*/

function renderEnd(container, state) {
  const winner = state.shanghaiWinner
    ? state.shanghaiWinner
    : [...state.players].sort((a, b) => b.total - a.total)[0].name;

  container.innerHTML = `
    <h2>${state.shanghaiWinner ? "🔥 SHANGHAI 🔥" : "Game Over"}</h2>
    <h3>🏆 Winner: ${winner}</h3>

    <div id="scorecard"></div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:12px;
    " id="endControls"></div>

    <div id="modal"></div>
  `;

  renderScorecard(state);

  const controls = document.getElementById("endControls");

  const playAgainBtn = document.createElement("div");
  playAgainBtn.innerText = "Play Again";
  playAgainBtn.style = `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ffffff;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  playAgainBtn.onclick = () => {
    const rotatedPlayers = getRotatedPlayersForReplay();
    initGame(rotatedPlayers);
    renderUI(container);
  };

  const mainMenuBtn = document.createElement("div");
  mainMenuBtn.innerText = "Main Menu";
  mainMenuBtn.style = `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ffffff;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    padding:10px;
    font-size:16px;
    min-height:44px;
  `;
  mainMenuBtn.onclick = () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  };

  controls.appendChild(playAgainBtn);
  controls.appendChild(mainMenuBtn);
}
