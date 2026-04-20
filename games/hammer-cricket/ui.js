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
    ? `
      <div style="
        margin: 8px 0 12px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255,255,255,0.08);
        color: ${state.lastScoreColor || "#ffffff"};
        font-weight: bold;
        text-align: center;
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

  const liveLabelHtml =
    liveScore !== null
      ? `
        <div style="
          margin: 8px 0 12px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.08);
          color: ${liveMeta.color};
          font-weight: bold;
          text-align: center;
        ">
          ${state.players[state.currentPlayer].name}
          (${throwsDisplay ? throwsDisplay.replace(" | ", "") + " | " : ""}${liveMeta.label}: ${liveScore > 0 ? "+" : ""}${liveScore})
        </div>
      `
      : "";

  container.innerHTML = `
    <h2>${round.label}</h2>

    <div id="scorecard"></div>

    ${scoreFlashHtml}
    ${liveLabelHtml}

    <h3>
      🎯 ${state.players[state.currentPlayer].name}
      (Dart ${state.dartsThrown + 1}/3 | Target ${formatTarget(round.target)})
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

  if (showScoreFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const options = [
    { label: "❌ MISS", value: 0 },
    { label: "Single", value: 1 },
    { label: "Double", value: 2 },
    { label: "Triple", value: 3 }
  ];

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
