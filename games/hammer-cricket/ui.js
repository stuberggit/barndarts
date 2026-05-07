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

function formatThrowValue(value) {
  const map = {
    0: "Miss",
    1: "Single",
    2: "Dub",
    3: "Trip"
  };

  return map[value] || "";
}

function formatScore(score) {
  if (score > 0) return `+${score}`;
  return String(score);
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

function getLiveMeta(throws, round) {
  if (!throws.length) return { score: 0, label: "", color: "#ffffff" };

  const score = getLiveRoundScore(throws, round);
  const meta = getMeta(score);

  return {
    score,
    label: meta.label,
    color: meta.color
  };
}

function buttonStyle() {
  return `
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
    text-align:center;
    user-select:none;
    position:relative;
  `;
}

function lightButtonStyle() {
  return `
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
    text-align:center;
    user-select:none;
  `;
}

function undoButtonStyle() {
  return `
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
    text-align:center;
    user-select:none;
  `;
}

function dangerButtonStyle() {
  return `
    background:#7f1d1d;
    color:#ffffff;
    border:1px solid #fca5a5;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    text-align:center;
    user-select:none;
  `;
}

function attachButtonClick(el, handler) {
  el.onclick = handler;
  el.ontouchstart = e => {
    e.preventDefault();
    handler();
  };
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.innerHTML = "";
}

function renderModalShell(innerHtml) {
  const modal = document.getElementById("modal");
  if (!modal) return;

  modal.innerHTML = `
    <div id="overlayModal" style="
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
      <div id="overlayCard" style="
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
        ${innerHtml}
      </div>
    </div>
  `;

  const overlay = document.getElementById("overlayModal");
  const card = document.getElementById("overlayCard");

  overlay.onclick = e => {
    if (e.target === overlay) closeModal();
  };

  card.onclick = e => {
    e.stopPropagation();
  };
}

function getSelectedCount(throws, value) {
  return (throws || []).filter(v => v === value).length;
}

function getBadgeHtml(count) {
  if (!count) return "";

  return `
    <span style="
      position:absolute;
      top:5px;
      right:7px;
      min-width:22px;
      height:22px;
      padding:0 6px;
      border-radius:999px;
      background:#facc15;
      color:#111111;
      border:1px solid #111111;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      line-height:1;
      font-weight:bold;
      box-sizing:border-box;
    ">
      ${count}
    </span>
  `;
}

function getTopTiePlayers(state) {
  if (!state.players?.length) return [];

  const highestTotal = Math.max(...state.players.map(player => player.total));
  return state.players.filter(player => player.total === highestTotal);
}

/* -------------------------
   MAIN UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  const round = state.rounds[state.currentRound];
  const currentPlayer = state.players[state.currentPlayer];

  const scoreMessageHtml = state.lastScoreMessage
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        color:${state.lastScoreColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
      ">
        ${state.lastScoreMessage}
      </div>
    `
    : "";

  const feedbackHtml = scoreMessageHtml || `<div></div>`;

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:10px;">
      <div style="
        font-size:14px;
        opacity:0.75;
        letter-spacing:0.5px;
      ">${state.suddenDeathActive ? "SUDDEN DEATH TARGET" : "TARGET"}</div>

      <div style="
        font-size:36px;
        font-weight:bold;
        line-height:1.1;
        color:${round.type === "bonus" || state.suddenDeathActive ? "#facc15" : round.target === 25 ? "#3b82f6" : "#ffffff"};
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
      🎯 ${currentPlayer.name}
      (Dart ${Math.min(state.dartsThrown + 1, 3)}/3)
    </h3>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerTiles(state);
  renderControls(container);
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
    const isSuddenDeathPlayer =
      state.suddenDeathActive && state.suddenDeathPlayerIndexes?.includes(index);

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
      border:${isActive ? "2px solid #facc15" : isSuddenDeathPlayer ? "1px solid #facc15" : "1px solid #ffffff"};
      opacity:${state.suddenDeathActive && !isSuddenDeathPlayer ? 0.5 : 1};
      gap:10px;
    `;

    tile.innerHTML = `
      <span style="font-weight:bold;min-width:0;word-break:break-word;">
        ${player.name}
        ${isSuddenDeathPlayer ? `<span style="font-size:12px;color:#facc15;margin-left:4px;">SD</span>` : ""}
      </span>
      <span style="font-weight:bold;">${player.total}</span>
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
  const canThrow = state.dartsThrown < 3;

  const topOptions = round.target === 25
    ? [
        { label: "Sing Bull", value: 1 },
        { label: "Dub Bull", value: 2 }
      ]
    : [
        { label: "Single", value: 1 },
        { label: "Dub", value: 2 },
        { label: "Trip", value: 3 }
      ];

  const controlsWrap = document.createElement("div");
  controlsWrap.style = `
    display:flex;
    flex-direction:column;
    gap:8px;
    margin-top:8px;
  `;

  const topRow = document.createElement("div");
  topRow.style = `
    display:grid;
    grid-template-columns:${round.target === 25 ? "1fr 1fr" : "1fr 1fr 1fr"};
    gap:8px;
  `;

  topOptions.forEach(opt => {
    const count = getSelectedCount(state.currentTurnThrows, opt.value);

    const btn = document.createElement("div");
    btn.innerHTML = `${opt.label}${getBadgeHtml(count)}`;
    btn.style = `
      ${buttonStyle()}
      padding:10px 8px;
      font-size:16px;
      min-height:44px;
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attachButtonClick(btn, () => {
      if (!canThrow) return;
      recordThrow(opt.value);
      renderUI(container);
    });

    topRow.appendChild(btn);
  });

  const middleRow = document.createElement("div");
  middleRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerHTML = `❌ Miss${getBadgeHtml(getSelectedCount(state.currentTurnThrows, 0))}`;
  missBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
    ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;
  attachButtonClick(missBtn, () => {
    if (!canThrow) return;
    recordThrow(0);
    renderUI(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  attachButtonClick(nextBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  middleRow.appendChild(missBtn);
  middleRow.appendChild(nextBtn);

  const summaryWrap = document.createElement("div");
  summaryWrap.innerHTML = buildThrowSummaryHtml(state, round);

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
  `;

  const statsBtn = document.createElement("div");
  statsBtn.innerText = "Stats";
  statsBtn.style = `
    ${lightButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(statsBtn, () => {
    renderStatsModal(getState());
  });

  const undoBtn = document.createElement("div");
  undoBtn.innerText = "Undo";
  undoBtn.style = `
    ${undoButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(undoBtn, () => {
    undo();
    renderUI(container);
  });

  const endBtn = document.createElement("div");
  endBtn.innerText = "End";
  endBtn.style = `
    ${dangerButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(endBtn, () => {
    renderEndGameConfirm(container);
  });

  utilityRow.appendChild(statsBtn);
  utilityRow.appendChild(undoBtn);
  utilityRow.appendChild(endBtn);

  controlsWrap.appendChild(topRow);
  controlsWrap.appendChild(middleRow);
  controlsWrap.appendChild(summaryWrap);
  controlsWrap.appendChild(utilityRow);

  controls.appendChild(controlsWrap);
}

function buildThrowSummaryHtml(state, round) {
  const throws = state.currentTurnThrows || [];
  const live = getLiveMeta(throws, round);

  return `
    <div style="
      margin-top:4px;
      padding:12px;
      border-radius:12px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    ">
      <div style="
        text-align:center;
        font-size:18px;
        font-weight:bold;
        margin-bottom:10px;
      ">
        Turn
      </div>

      ${
        throws.length === 0
          ? `
            <div style="text-align:center;opacity:0.85;font-weight:bold;">
              No darts thrown.
            </div>
          `
          : throws.map((throwValue, index) => {
            const dartMultiplier = round.multipliers[index] || 0;
            const effectiveMultiplier = Math.max(0, Math.min(3, throwValue)) * dartMultiplier;

            return `
              <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                padding:8px 0;
                border-top:${index === 0 ? "none" : "1px solid rgba(255,255,255,0.2)"};
                font-weight:bold;
              ">
                <div>Dart ${index + 1}: ${formatThrowValue(throwValue)}</div>
                <div style="color:#facc15;">
                  ${round.target === 25 ? "Bull" : round.target}
                  × ${effectiveMultiplier}
                </div>
              </div>
            `;
          }).join("")
      }

      ${
        throws.length > 0
          ? `
            <div style="
              margin-top:10px;
              padding-top:10px;
              border-top:1px solid rgba(255,255,255,0.2);
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              font-weight:bold;
            ">
              <div>Live Score</div>
              <div style="color:${live.color};">
                ${live.label}: ${formatScore(live.score)}
              </div>
            </div>
          `
          : ""
      }

      ${
        throws.length >= 3
          ? `
            <div style="
              margin-top:8px;
              text-align:center;
              color:#facc15;
              font-weight:bold;
              font-size:13px;
            ">
              Turn complete. Tap Next Player to score and advance.
            </div>
          `
          : ""
      }
    </div>
  `;
}

/* -------------------------
   STATS MODAL
--------------------------*/

function renderStatsModal(state) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Stats</h2>
    <div id="scorecard"></div>
    <div id="closeModalBtn" style="
      ${buttonStyle()}
      padding:10px;
      min-height:44px;
      margin-top:12px;
      border:1px solid #ff4c4c;
    ">Close</div>
  `);

  renderScorecard(state);

  const closeBtn = document.getElementById("closeModalBtn");
  attachButtonClick(closeBtn, closeModal);
}

function renderStatsList(state) {
  const list = document.getElementById("statsList");
  if (!list) return;

  const rankedPlayers = [...state.players].sort((a, b) => b.total - a.total);

  list.innerHTML = `
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
      ${rankedPlayers.map((player, index) => `
        <div style="
          padding:10px;
          border-radius:10px;
          background:#1e293b;
          border:1px solid #ffffff;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          font-weight:bold;
        ">
          <span>${index + 1}. ${player.name}</span>
          <span>${player.total}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/* -------------------------
   SCORECARD
--------------------------*/

function renderScorecard(state) {
  const div = document.getElementById("scorecard");
  if (!div) return;

  let html = `<table style="
    width:100%;
    border-collapse:collapse;
    font-size:12px;
    text-align:center;
    background:#ffffff;
    color:#111111;
    border:1px solid #cfcfcf;
  ">`;

  html += `<tr style="background:#f4f4f4;"><th style="padding:6px;border:1px solid #d6d6d6;"></th>`;

  state.rounds.forEach((round, i) => {
    const active = i === state.currentRound;
    const isSuddenDeath = round.label?.startsWith("SD ");

    html += `<th style="
      padding:6px 4px;
      border:1px solid #d6d6d6;
      ${active ? "outline:2px solid #22c55e;outline-offset:-2px;" : ""}
      ${isSuddenDeath ? "background:#fef9c3;color:#111111;" : ""}
    ">
      ${round.label}
    </th>`;
  });

  html += `<th style="padding:6px;border:1px solid #d6d6d6;">Total</th></tr>`;

  state.players.forEach((player, index) => {
    const activePlayer = index === state.currentPlayer;
    const isSuddenDeathPlayer =
      state.suddenDeathActive && state.suddenDeathPlayerIndexes?.includes(index);

    html += `<tr style="${activePlayer ? "background:#f7fff8;" : state.suddenDeathActive && !isSuddenDeathPlayer ? "background:#f3f4f6;color:#777;" : "background:#ffffff;"}">`;

    html += `<td style="
      padding:6px 8px;
      border:1px solid #d6d6d6;
      font-weight:bold;
      text-align:left;
      white-space:nowrap;
    ">
      ${player.name}${isSuddenDeathPlayer ? " <span style='color:#b45309;'>SD</span>" : ""}
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
   END GAME CONFIRM
--------------------------*/

function renderEnd(container, state) {
  const winner = state.shanghaiWinner
    ? state.shanghaiWinner
    : [...state.players].sort((a, b) => b.total - a.total)[0]?.name;

  const isShanghai = !!state.shanghaiWinner;

  const rankedPlayers = [...state.players].sort((a, b) => {
    if (state.shanghaiWinner) {
      if (a.name === state.shanghaiWinner) return -1;
      if (b.name === state.shanghaiWinner) return 1;
    }

    return b.total - a.total;
  });

  container.innerHTML = `
    <style>
      @keyframes hammeredGlow {
        0% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(59,130,246,0.0); }
        50% { box-shadow: 0 0 22px rgba(250,204,21,0.48), 0 0 38px rgba(59,130,246,0.25); }
        100% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(59,130,246,0.0); }
      }

      @keyframes hammerFloat {
        0% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-6px) rotate(3deg); }
        100% { transform: translateY(0px) rotate(0deg); }
      }

      @keyframes tapeFlash {
        0% { opacity: 0.8; }
        50% { opacity: 1; }
        100% { opacity: 0.8; }
      }

      @keyframes trophyPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
    </style>

    <div style="
      position:relative;
      overflow:hidden;
      border-radius:18px;
      padding:18px 16px 20px;
      background:
        radial-gradient(circle at top, rgba(250,204,21,0.20), transparent 36%),
        linear-gradient(180deg, #172033 0%, #0b0f17 100%);
      border:2px solid #facc15;
      animation:hammeredGlow 2.8s infinite ease-in-out;
    ">
      <div style="
        position:absolute;
        top:10px;
        left:-24px;
        right:-24px;
        display:flex;
        justify-content:space-between;
        pointer-events:none;
        font-size:26px;
        opacity:0.15;
      ">
        <span style="animation:hammerFloat 2.2s infinite ease-in-out;">🔨</span>
        <span style="animation:hammerFloat 2.6s infinite ease-in-out;">🎯</span>
        <span style="animation:hammerFloat 2.1s infinite ease-in-out;">🔨</span>
        <span style="animation:hammerFloat 2.8s infinite ease-in-out;">💥</span>
      </div>

      <div style="
        text-align:center;
        margin:0 auto 12px;
        max-width:340px;
        background:#facc15;
        color:#111111;
        font-weight:bold;
        font-size:15px;
        padding:8px 12px;
        border-radius:999px;
        animation:tapeFlash 1.5s infinite ease-in-out;
      ">
        ! MOST HAMMERED !
      </div>

      <div style="
        text-align:center;
        font-size:54px;
        line-height:1;
        margin-bottom:8px;
        animation:trophyPulse 1.7s infinite ease-in-out;
      ">
        ${isShanghai ? "🏆💥🔨" : "🏆🔨🏆"}
      </div>

      <h2 style="
        text-align:center;
        margin:0 0 6px;
        font-size:28px;
        color:#ffffff;
      ">
        ${winner} Got Hammered!
      </h2>

      <div style="
        text-align:center;
        font-size:18px;
        color:#facc15;
        font-weight:bold;
        margin-bottom:10px;
      ">
        ${isShanghai ? "Shanghai with a hammer swing. Absolutely rude." : "The hammer found its champion."}
      </div>

      <div style="
        text-align:center;
        font-size:15px;
        color:#dbeafe;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        padding:12px;
        margin-bottom:16px;
      ">
        ${
          isShanghai
            ? `${winner} did not just win — they dropped the hammer, rang the bell, and left the scoreboard hiding under the workbench.`
            : `${winner} got hammered the absolute most. Hammers hide when ${winner} walks in the room. There is no hammer they cannot hammer.`
        }
      </div>

      <div style="
        margin-bottom:16px;
        padding:12px;
        border-radius:14px;
        background:rgba(0,0,0,0.22);
        border:1px solid rgba(255,255,255,0.14);
      ">
        <div style="
          text-align:center;
          color:#facc15;
          font-weight:bold;
          font-size:16px;
          margin-bottom:10px;
        ">
          Final Order
        </div>

        <div style="
          display:flex;
          flex-direction:column;
          gap:8px;
        ">
          ${rankedPlayers.map((player, index) => `
            <div style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              padding:10px 12px;
              border-radius:10px;
              background:${index === 0 ? "rgba(250,204,21,0.16)" : "rgba(255,255,255,0.06)"};
              border:${index === 0 ? "1px solid #facc15" : "1px solid rgba(255,255,255,0.12)"};
              color:#ffffff;
              font-weight:bold;
            ">
              <span style="min-width:0;word-break:break-word;">
                ${index + 1}. ${player.name}
              </span>
              <span style="
                color:${index === 0 ? "#facc15" : "#ffffff"};
                flex-shrink:0;
              ">
                ${player.total}
              </span>
            </div>
          `).join("")}
        </div>
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
      ">
        <div id="playAgainBtn" style="
          ${buttonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
          border:2px solid #facc15;
        ">Play Again</div>

        <div id="statsBtn" style="
          ${lightButtonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
        ">Stats</div>

        <div id="mainMenuBtn" style="
          ${buttonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
        ">Main Menu</div>
      </div>
    </div>

    <div id="modal"></div>
  `;

  const playAgainBtn = document.getElementById("playAgainBtn");
  const statsBtn = document.getElementById("statsBtn");
  const mainMenuBtn = document.getElementById("mainMenuBtn");

  attachButtonClick(playAgainBtn, () => {
    const rotatedPlayers = getRotatedPlayersForReplay();
    initGame(rotatedPlayers);
    renderUI(container);
  });

  attachButtonClick(statsBtn, () => {
    renderStatsModal(state);
  });

  attachButtonClick(mainMenuBtn, () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}
