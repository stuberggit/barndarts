import { getState, recordThrow, nextPlayer, undo, isGameOver, getMeta } from "./logic.js";

function formatTarget(target) {
  return target === 25 ? "Bull" : String(target);
}

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  const round = state.rounds[state.currentRound];

  const scoreAge = Date.now() - (state.lastScoreTimestamp || 0);
  const showScoreFlash = state.lastScoreMessage && scoreAge < 2500;

  const scoreFlashHtml = showScoreFlash
    ? `<div style="
        padding:8px;
        border-radius:10px;
        color:${state.lastScoreColor};
        font-weight:bold;
        text-align:center;
      ">
        ${state.lastScoreMessage}
      </div>`
    : "";

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:10px;">
      <div style="
        font-size:14px;
        opacity:0.7;
      ">TARGET</div>

      <div style="
        font-size:36px;
        font-weight:bold;
      ">
        ${formatTarget(round.target)}
      </div>
    </div>

    <div id="playerTiles"></div>

    <div style="
      min-height:50px;
      margin:8px 0;
    ">
      ${scoreFlashHtml || ""}
    </div>

    <h3>
      🎯 ${state.players[state.currentPlayer].name}
      (Dart ${state.dartsThrown + 1}/3)
    </h3>

    <div id="controls"></div>

    <div style="display:flex;gap:8px;margin-top:10px;">
      <div class="button" id="leaderboard">Leaderboard</div>
      <div class="button" id="undoBtn">Undo</div>
    </div>

    <div id="modal"></div>
  `;

  renderPlayerTiles(state);
  renderControls(container);

  document.getElementById("undoBtn").onclick = () => {
    undo();
    renderUI(container);
  };

  document.getElementById("leaderboard").onclick = () => {
    renderLeaderboardModal(state);
  };

  if (showScoreFlash) {
    setTimeout(() => renderUI(container), 700);
  }
}

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const state = getState();

  const round = state.rounds[state.currentRound];

let options;

if (round.type === "bull") {
  options = [
    { label: "❌ MISS", value: 0 },
    { label: "Single Bull", value: 1 },
    { label: "Double Bull", value: 2 }
  ];
} else {
  options = [
    { label: "❌ MISS", value: 0 },
    { label: "Single", value: 1 },
    { label: "Double", value: 2 },
    { label: "Triple", value: 3 }
  ];
}

  options.forEach(opt => {
    const btn = document.createElement("div");
    btn.className = "card";
    btn.innerText = opt.label;

    btn.onclick = () => {
      recordThrow(opt.value);
      renderUI(container);
    };

    controls.appendChild(btn);
  });

  const nextBtn = document.createElement("div");
  nextBtn.className = "button";
  nextBtn.innerText = "➡️ Next Player";

  nextBtn.onclick = () => {
    nextPlayer();
    renderUI(container);
  };

  controls.appendChild(nextBtn);
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

function renderPlayerTiles(state) {
  const container = document.getElementById("playerTiles");

  container.innerHTML = "";

  state.players.forEach((p, i) => {
    const isActive = i === state.currentPlayer;

    const tile = document.createElement("div");

    tile.style = `
      padding:12px;
      margin-bottom:6px;
      border-radius:10px;
      background:${isActive ? "#1e293b" : "#111"};
      color:#fff;
      display:flex;
      justify-content:space-between;
      font-size:18px;
    `;

    tile.innerHTML = `
      <span>${p.name}</span>
      <span>${p.total}</span>
    `;

    container.appendChild(tile);
  });
}

function renderLeaderboardModal(state) {
  const modal = document.getElementById("modal");

  let html = `
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
      ">
        <h2>Leaderboard</h2>
        <div id="scorecard"></div>
        <div class="button" id="closeModal">Close</div>
      </div>
    </div>
  `;

  modal.innerHTML = html;

  renderScorecard(state);

  document.getElementById("closeModal").onclick = () => {
    modal.innerHTML = "";
  };
}

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

    html += `<td style="padding:6px 8px;border:1px solid #d6d6d6;font-weight:bold;text-align:left;">
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

    html += `<td style="padding:6px 4px;border:1px solid #d6d6d6;font-weight:bold;">
      ${player.total}
    </td>`;

    html += "</tr>";
  });

  html += "</table>";
  div.innerHTML = html;
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

  const winner = [...state.players].sort((a, b) => b.total - a.total)[0];

  container.innerHTML = `
    <h2>Game Over</h2>
    <h3>🏆 Winner: ${winner.name}</h3>
    <div id="scorecard"></div>
  `;

  renderScorecard(state);
}
