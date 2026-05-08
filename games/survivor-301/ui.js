import {
  getState,
  getStats,
  getThrowLog,
  getCurrentTargetDisplay,
  getCurrentBonusDisplay,
  submitThrow,
  nextPlayer,
  endGameEarly,
  undo,
  isGameOver,
  confirmShanghaiWinner,
  cancelPendingShanghai,
  confirmPendingWinner,
  cancelPendingWinner,
  initGame
} from "./logic.js";

import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

const SURVIVOR_WIN_COPY = {
  banners: [
    "LAST PLAYER STANDING",
    "SURVIVOR SECURED",
    "CONTAINMENT COMPLETE",
    "HAZMAT HERO",
    "ABOVE ZERO",
    "FALLOUT FINISHED",
    "BIOHAZARD BRAGGING RIGHTS",
    "POINTS STILL PULSING",
    "THE SAFE ZONE HAS A WINNER",
    "GEIGER COUNTER APPROVED",
    "MUTATION DENIED"
  ],

  headlines: [
    "{winnerName} Survived 301!",
    "{winnerName} Is the Last Player Standing!",
    "{winnerName} Escaped the Fallout!",
    "{winnerName} Stayed Above Zero!",
    "{winnerName} Outlasted the Blast Zone!",
    "{winnerName} Claimed the Safe Zone!",
    "{winnerName} Survived the Meltdown!",
    "{winnerName} Beat the Biohazard!",
    "{winnerName} Made It Through the Containment Breach!",
    "{winnerName} Is Your Survivor 301 Champion!"
  ],

  subheads: [
    "Last player standing.",
    "Everyone else hit zero. They hit victory.",
    "The points got low. The drama got weird. The winner stayed alive.",
    "Containment failed for everyone else.",
    "Above zero and above the chaos.",
    "The fallout cleared, and one score was still breathing.",
    "No meltdown. No collapse. Just survival.",
    "The board tried to erase everybody. One player declined.",
    "Survival was optional. Winning was not.",
    "The safe zone had room for exactly one."
  ],

  bodyCopies: [
    "Everyone else ran out of points. One survivor stayed above zero and claimed the crown.",
    "{winnerName} watched the field melt down, stayed above zero, and walked out of the blast zone with the win.",
    "The scores dropped, the pressure climbed, and {winnerName} survived long enough to make the rest of the field glow in the dark.",
    "Some players got cooked. Some got crispy. {winnerName} stayed alive and claimed the only clean exit.",
    "The game turned radioactive, the points started vanishing, and {winnerName} somehow kept the Geiger counter from screaming.",
    "Everyone else crossed the danger line. {winnerName} kept just enough score alive to own the final order.",
    "Survivor 301 did what Survivor 301 does: punished bad turns, rewarded chaos, and left one player standing in the smoke.",
    "{winnerName} did not need comfort. They needed points, nerve, and everyone else to make worse decisions.",
    "The blast zone got crowded fast. {winnerName} found the exit while everyone else became a cautionary tale.",
    "A little strategy, a little luck, and a whole lot of not being eliminated. That was enough for {winnerName}."
  ]
};

function pickRandomCopy(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(Math.random() * items.length)];
}

function personalizeCopyText(text, winnerName) {
  return String(text || "").replaceAll("{winnerName}", winnerName || "Winner");
}

function getSurvivorWinCopy(winnerName) {
  return {
    banner: personalizeCopyText(pickRandomCopy(SURVIVOR_WIN_COPY.banners), winnerName),
    headline: personalizeCopyText(pickRandomCopy(SURVIVOR_WIN_COPY.headlines), winnerName),
    subhead: personalizeCopyText(pickRandomCopy(SURVIVOR_WIN_COPY.subheads), winnerName),
    bodyCopy: personalizeCopyText(pickRandomCopy(SURVIVOR_WIN_COPY.bodyCopies), winnerName)
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
    if (e.target === overlay) {
      closeModal();
    }
  };

  card.onclick = e => {
    e.stopPropagation();
  };
}

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
}

function buildFlashHtml(state) {
  const showFlash = !!state.lastMessage;

  const flashHtml = showFlash
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        color:${state.lastMessageColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
      ">
        ${state.lastMessage}
      </div>
    `
    : `<div></div>`;

  return { showFlash, flashHtml };
}

function formatThrowLabel(throwRecord) {
  if (!throwRecord) return "";

  if (throwRecord.hitType === "miss") return "Miss";
  if (throwRecord.hitType === "greenBull") return "Sing Bull";
  if (throwRecord.hitType === "redBull") return "Dub Bull";

  const labels = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labels[throwRecord.hitType]} ${throwRecord.target}`;
}

function formatScoreChange(change) {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return "0";
}

function getPlayerRowBackground(player, isHighlighted) {
  if (player.isEliminated) {
    return isHighlighted ? "#374151" : "#1f2937";
  }

  return isHighlighted ? "#11361a" : "#111111";
}

function getPlayerRowBorder(player, isHighlighted) {
  if (isHighlighted) return "3px solid #facc15";
  if (player.isEliminated) return "1px solid #6b7280";
  return "1px solid #ffffff";
}

function getPlayerRowOpacity(player) {
  return player.isEliminated ? 0.65 : 1;
}

/* -------------------------
   MAIN UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (state.pendingWinnerConfirmation) {
    renderPendingWinnerConfirm(container, state);
    return;
  }

  if (state.pendingShanghai) {
    renderPendingShanghaiConfirm(container, state);
    return;
  }

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  renderGame(container, state);
}

/* -------------------------
   GAME SCREEN
--------------------------*/

function renderGame(container, state) {
  const { flashHtml } = buildFlashHtml(state);
  const currentPlayer = state.players[state.currentPlayer];
  const bonusDisplay = getCurrentBonusDisplay();

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      ☣️ Current Player ☣️
    </div>

    <div style="
      margin-bottom:8px;
      padding:14px;
      border-radius:12px;
      background:#11361a;
      border:2px solid #f0970a;
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="font-size:26px;margin-bottom:8px;">
        ${currentPlayer ? currentPlayer.name : "—"}
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        align-items:stretch;
        margin-bottom:8px;
      ">
        <div style="
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.16);
          border-radius:10px;
          padding:10px;
        ">
          <div style="font-size:13px;color:#d1d5db;margin-bottom:4px;">
            Score
          </div>
          <div style="font-size:38px;line-height:1;">
            ${currentPlayer ? currentPlayer.score : "—"}
          </div>
        </div>

        <div style="
          background:${bonusDisplay.active ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)"};
          border:${bonusDisplay.active ? "2px solid #facc15" : "1px solid rgba(255,255,255,0.16)"};
          border-radius:10px;
          padding:10px;
        ">
          <div style="font-size:13px;color:#d1d5db;margin-bottom:4px;">
            ${bonusDisplay.active ? "Bonus Number" : "Bonus"}
          </div>
          <div style="
            font-size:${bonusDisplay.active ? "38px" : "30px"};
            line-height:1;
            color:${bonusDisplay.active ? "#facc15" : "#9ca3af"};
          ">
            ${bonusDisplay.active ? bonusDisplay.target : "—"}
          </div>
        </div>
      </div>

      <div style="font-size:16px;color:#facc15;">
        ${getCurrentTargetDisplay()}
      </div>
    </div>

    <div style="
      min-height:42px;
      margin:8px 0 10px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${flashHtml}
      </div>
    </div>

    <div id="controls"></div>
    <div id="playerBoard"></div>
    <div id="turnSummary"></div>
    <div id="utilityControls"></div>
    <div id="modal"></div>
  `;

  renderThrowControls(container, state);
  renderPlayerBoard(state);
  renderTurnSummary(state);
  renderUtilityControls(container);
}

function renderThrowControls(container, state) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const currentPlayer = state.players[state.currentPlayer];
  const canThrow =
    currentPlayer &&
    currentPlayer.isActive &&
    !currentPlayer.isEliminated &&
    state.dartsThrown < 3 &&
    !state.turnReadyForNext;

  const hitTypeRow = document.createElement("div");
  hitTypeRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const types = [
    { label: "Single", value: "single" },
    { label: "Dub", value: "double" },
    { label: "Trip", value: "triple" }
  ];

  types.forEach(type => {
    const btn = document.createElement("div");
    btn.innerText = type.label;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:42px;
      font-size:15px;
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attachButtonClick(btn, () => {
      if (!canThrow) return;
      renderNumberPicker(container, type.value);
    });

    hitTypeRow.appendChild(btn);
  });

  const bottomRow = document.createElement("div");
  bottomRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss";
  missBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
    ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;
  attachButtonClick(missBtn, () => {
    if (!canThrow) return;
    submitThrow("miss");
    renderUI(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(nextBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  bottomRow.appendChild(missBtn);
  bottomRow.appendChild(nextBtn);

  controls.appendChild(hitTypeRow);
  controls.appendChild(bottomRow);
}

function renderPlayerBoard(state) {
  const board = document.getElementById("playerBoard");
  board.style = "margin-top:18px;";
  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isHighlighted = index === state.currentPlayer && !player.isEliminated;

    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:12px 14px;
      border-radius:12px;
      background:${getPlayerRowBackground(player, isHighlighted)};
      border:${getPlayerRowBorder(player, isHighlighted)};
      display:flex;
      justify-content:space-between;
      align-items:center;
      color:#ffffff;
      font-weight:bold;
      font-size:16px;
      opacity:${getPlayerRowOpacity(player)};
      gap:12px;
    `;

    row.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;">
        <div style="font-size:18px;line-height:1.2;word-break:break-word;">
          ${player.name}
          ${
            player.isEliminated
              ? `<span style="font-size:15px;margin-left:8px;color:#9ca3af;">☠️ OUT</span>`
              : isHighlighted
                ? `<span style="font-size:15px;margin-left:8px;color:#facc15;">ACTIVE</span>`
                : `<span style="font-size:15px;margin-left:8px;color:#22c55e;">ALIVE</span>`
          }
        </div>
      </div>

      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:26px;line-height:1.2;">
          ${player.score}
        </div>
      </div>
    `;

    board.appendChild(row);
  });
}

function renderTurnSummary(state) {
  const summary = document.getElementById("turnSummary");
  const throws = state.currentTurnThrows || [];

  summary.innerHTML = `
    <div style="
      margin-top:12px;
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
          : throws.map((throwRecord, index) => `
            <div style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              padding:8px 0;
              border-top:${index === 0 ? "none" : "1px solid rgba(255,255,255,0.2)"};
              font-weight:bold;
            ">
              <div>Dart ${index + 1}: ${formatThrowLabel(throwRecord)}</div>
              <div style="color:${throwRecord.scoreChange > 0 ? "#22c55e" : throwRecord.scoreChange < 0 ? "#facc15" : "#ffffff"};">
                ${formatScoreChange(throwRecord.scoreChange)}
              </div>
            </div>
          `).join("")
      }
    </div>
  `;
}

function renderUtilityControls(container) {
  const utilityControls = document.getElementById("utilityControls");
  utilityControls.innerHTML = "";

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
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
    renderStatsModal(getThrowLog());
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

  utilityControls.appendChild(utilityRow);
}

/* -------------------------
   MODALS
--------------------------*/

function renderNumberPicker(container, hitType) {
  const state = getState();
  const bonusDisplay = getCurrentBonusDisplay();
  const isTriple = hitType === "triple";
  const canThrow =
    !state.winner &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  function getHitCountFor(target, buttonHitType = hitType) {
    return (state.currentTurnThrows || []).filter(throwRecord => {
      return throwRecord.hitType === buttonHitType && throwRecord.target === target;
    }).length;
  }

  const bullHitType = hitType === "single" ? "greenBull" : hitType === "double" ? "redBull" : null;
  const bullHitCount = bullHitType
    ? (state.currentTurnThrows || []).filter(throwRecord => throwRecord.hitType === bullHitType).length
    : 0;

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">
      ${hitType === "single" ? "Single" : hitType === "double" ? "Dub" : "Trip"}
    </h2>

    <div style="
      text-align:center;
      margin-bottom:12px;
      color:${bonusDisplay.active ? "#facc15" : "#9ca3af"};
      font-weight:bold;
    ">
      ${bonusDisplay.active ? `Bonus Number: ${bonusDisplay.target}` : "No Bonus This Round"}
    </div>

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
  `);

  const grid = document.getElementById("numberGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
  `;

  for (let i = 1; i <= 20; i++) {
    const isBonus = bonusDisplay.active && i === bonusDisplay.target;
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
      ${isBonus ? "border:2px solid #facc15;color:#facc15;" : ""}
      ${hitCount > 0 ? "border:3px solid #facc15;box-shadow:0 0 12px rgba(250,204,21,0.55);" : ""}
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
    `;

    attachButtonClick(btn, () => {
      if (!canThrow) return;

      submitThrow(hitType, i);
      renderUI(container);

      if (!isGameOver()) {
        renderNumberPicker(container, hitType);
      }
    });

    grid.appendChild(btn);
  }

  const bullBtn = document.getElementById("bullBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (!isTriple && canThrow) {
    attachButtonClick(bullBtn, () => {
      submitThrow(hitType === "single" ? "greenBull" : "redBull");
      renderUI(container);

      if (!isGameOver()) {
        renderNumberPicker(container, hitType);
      }
    });
  }

  attachButtonClick(closeBtn, closeModal);
}

function renderStatsModal(throwLog) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Throw Log</h2>
    <div id="throwLogList"></div>
    <div style="
      display:flex;
      justify-content:center;
      margin-top:12px;
    ">
      <div id="closeModalBtn" style="
        ${buttonStyle()}
        width:110px;
        min-height:38px;
        font-size:15px;
        border:1px solid #ff4c4c;
      ">Close</div>
    </div>
  `);

  const list = document.getElementById("throwLogList");
  list.innerHTML = "";

  throwLog.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:12px;
      padding:14px;
      border-radius:10px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    `;

    const throwsHtml = player.throws.length
      ? player.throws.map(t => `
          <div style="
            padding:6px 0;
            border-top:1px solid rgba(255,255,255,0.16);
            font-size:14px;
            line-height:1.4;
          ">
            Turn ${t.turnNumber}, Dart ${t.dartNumber}: ${t.label}
            (${t.scoreBefore} → ${t.scoreAfter})
            ${t.result !== "scored" ? `<span style="color:#facc15;"> — ${t.result}</span>` : ""}
          </div>
        `).join("")
      : `<div style="opacity:0.8;">No throws recorded.</div>`;

    row.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">${player.name}</div>
      ${throwsHtml}
    `;

    list.appendChild(row);
  });

  attachButtonClick(document.getElementById("closeModalBtn"), closeModal);
}

function renderPendingWinnerConfirm(container, state) {
  const winnerName = state.pendingWinner || "No Survivor";

  container.innerHTML = `
    <div style="
      border-radius:18px;
      padding:18px 16px 20px;
      background:
        radial-gradient(circle at top, rgba(250,204,21,0.18), transparent 35%),
        linear-gradient(180deg, #102417 0%, #0b0f0c 100%);
      border:2px solid #facc15;
      color:#ffffff;
      text-align:center;
    ">
      <div style="font-size:46px;line-height:1;margin-bottom:10px;">
        ⚠️☣️⚠️
      </div>

      <h2 style="
        margin:0 0 8px;
        font-size:26px;
        color:#facc15;
      ">
        Confirm Final Elimination
      </h2>

      <div style="
        font-size:18px;
        font-weight:bold;
        margin-bottom:10px;
      ">
        ${winnerName === "No Survivor" ? "No Survivor?" : `${winnerName} Survives?`}
      </div>

      <div style="
        font-size:15px;
        line-height:1.5;
        color:#d1fae5;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        padding:12px;
        margin-bottom:16px;
      ">
        The final player appears to have been eliminated.
        <br><br>
        Confirm the winner, or undo the final hit if this was accidental.
      </div>

      <div id="pendingWinnerBoard"></div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-top:14px;
      ">
        <div id="undoFinalBtn" style="
          ${lightButtonStyle()}
          padding:12px;
          min-height:52px;
          font-size:16px;
        ">Undo Final Hit</div>

        <div id="confirmWinnerBtn" style="
          ${buttonStyle()}
          padding:12px;
          min-height:52px;
          font-size:16px;
          border:2px solid #facc15;
        ">Confirm Winner</div>
      </div>

      <div id="modal"></div>
    </div>
  `;

  const board = document.getElementById("pendingWinnerBoard");
  board.style = "margin-top:12px;text-align:left;";

  state.players.forEach(player => {
    const row = document.createElement("div");

    row.style = `
      margin-bottom:8px;
      padding:10px 12px;
      border-radius:10px;
      background:${player.isEliminated ? "#1f2937" : "#11361a"};
      border:${player.isEliminated ? "1px solid #6b7280" : "1px solid #facc15"};
      color:#ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      font-weight:bold;
      opacity:${player.isEliminated ? 0.72 : 1};
    `;

    row.innerHTML = `
      <span>
        ${player.name}
        ${
          player.isEliminated
            ? `<span style="font-size:13px;margin-left:8px;color:#9ca3af;">☠️ OUT</span>`
            : `<span style="font-size:13px;margin-left:8px;color:#22c55e;">SURVIVING</span>`
        }
      </span>
      <span>${player.score}</span>
    `;

    board.appendChild(row);
  });

  attachButtonClick(document.getElementById("undoFinalBtn"), () => {
    cancelPendingWinner();
    renderUI(container);
  });

  attachButtonClick(document.getElementById("confirmWinnerBtn"), () => {
    confirmPendingWinner();
    renderUI(container);
  });
}

function renderEndGameConfirm(container) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">End Game?</h2>
    <div style="text-align:center;margin-bottom:14px;">
      Are you sure you want to end this game early?
    </div>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    ">
      <div id="cancelEndBtn" style="
        ${lightButtonStyle()}
        padding:12px;
        min-height:48px;
      ">Cancel</div>
      <div id="confirmEndBtn" style="
        ${dangerButtonStyle()}
        padding:12px;
        min-height:48px;
      ">End Game</div>
    </div>
  `);

  const cancelBtn = document.getElementById("cancelEndBtn");
  const confirmBtn = document.getElementById("confirmEndBtn");

  attachButtonClick(cancelBtn, closeModal);
  attachButtonClick(confirmBtn, () => {
    closeModal();
    endGameEarly();
    renderUI(container);
  });
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  const winnerName = state.winner;
  const winCopy = getSurvivorWinCopy(winnerName);
  const stats = state.finalStats || getStats();

  const survivorTags = [
    "Cooked",
    "Toast",
    "Radiation Vacation",
    "Melted",
    "Biohazard BBQ",
    "Glow Stick",
    "Fallout Casualty",
    "Crispy",
    "Nuclear Nap",
    "Hazmat Required",
    "Overexposed",
    "Burnt Ends",
    "Containment Failed",
    "Mutated and Booted",
    "Geiger Counter Hero",
    "Half-Life Crisis"
  ];

  const shuffledSurvivorTags = [...survivorTags].sort(() => Math.random() - 0.5);

  const rankedPlayers = [...(state.players || [])].sort((a, b) => {
    if (a.name === winnerName) return -1;
    if (b.name === winnerName) return 1;

    const aOrder = a.eliminatedOrder ?? 0;
    const bOrder = b.eliminatedOrder ?? 0;

    if (aOrder !== bOrder) {
      return bOrder - aOrder;
    }

    return b.score - a.score;
  });

  function getFinalOrderLabel(player, index) {
    if (!player.isEliminated) {
      return `${player.score}`;
    }

    const tag = shuffledSurvivorTags[index - 1] || "Did Not Survive";
    return `${player.score} • ${tag}`;
  }

  container.innerHTML = `
    <style>
      @keyframes survivorGlow {
        0% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
        50% { box-shadow: 0 0 20px rgba(250,204,21,0.45), 0 0 36px rgba(34,197,94,0.25); }
        100% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
      }

      @keyframes survivorFloat {
        0% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-6px) rotate(2deg); }
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
        radial-gradient(circle at top, rgba(250,204,21,0.18), transparent 35%),
        linear-gradient(180deg, #102417 0%, #0b0f0c 100%);
      border:2px solid #facc15;
      animation:survivorGlow 2.8s infinite ease-in-out;
    ">

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
        ${winCopy.banner}
      </div>

      <div style="
        text-align:center;
        font-size:54px;
        line-height:1;
        margin-bottom:8px;
        animation:trophyPulse 1.7s infinite ease-in-out;
      ">
        🏆☣️🏆
      </div>

      <h2 style="
        text-align:center;
        margin:0 0 6px;
        font-size:28px;
        color:#ffffff;
      ">
        ${winCopy.headline}
      </h2>

      <div style="
        text-align:center;
        font-size:18px;
        color:#facc15;
        font-weight:bold;
        margin-bottom:10px;
      ">
        ${winCopy.subhead}
      </div>

      <div style="
        text-align:center;
        font-size:15px;
        color:#d1fae5;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        padding:12px;
        margin-bottom:16px;
      ">
        ${winCopy.bodyCopy}
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
                color:${index === 0 ? "#facc15" : player.isEliminated ? "#9ca3af" : "#ffffff"};
                flex-shrink:0;
                text-align:right;
              ">
                ${getFinalOrderLabel(player, index)}
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
    const rotatedPlayers = rotatePlayers(state.originalPlayers || store.players || []);
    store.players = [...rotatedPlayers];
    initGame(rotatedPlayers);
    renderUI(container);
  });

  attachButtonClick(statsBtn, () => {
    renderStatsModal(getThrowLog());
  });

  attachButtonClick(mainMenuBtn, () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}
