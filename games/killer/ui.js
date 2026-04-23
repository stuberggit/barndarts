import {
  getState,
  getStats,
  getCurrentTargetDisplay,
  getCurrentTargetOptions,
  submitNDHThrow,
  submitGameThrow,
  submitRedemskiThrow,
  submitShanghai,
  nextPlayer,
  endGameEarly,
  undo,
  isGameOver,
  initGame
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

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

function isPlayerSelectableTarget(player) {
  return !!player && player.target != null && (player.isActive || player.isDormantDead);
}

function formatAssignment(player) {
  if (!player.target) return "Unassigned";

  if (player.target === 25) {
    return player.hitType === "redBull" ? "Red Bull" : "Green Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labelMap[player.hitType]} ${player.target}`;
}

function formatTargetNumber(target) {
  return target === 25 ? "Bull" : String(target);
}

function getPlayerStatusHtml(player) {
  const parts = [];

  if (player.isKiller) {
    parts.push(`<span style="color:#ff4c4c;">Killer</span>`);
  }

  if (player.isRedemski && !player.isDormantDead) {
    const count = player.redemskiCount || 0;
    parts.push(
      `<span style="color:#facc15;">Redemski${count > 1 ? ` x${count}` : ""}</span>`
    );
  }

  if (player.isZombie) {
    parts.push(`<span style="color:#84cc16;">🧟 Zombie</span>`);
  }

  if (player.isDormantDead) {
    parts.push(`<span style="color:#9ca3af;">💀 Dormant Dead</span>`);
  }

  return parts.join(" | ");
}

function getRowBackground(player, isHighlighted) {
  if (player.isDormantDead) {
    return isHighlighted ? "#374151" : "#1f2937";
  }

  if (player.isZombie) {
    return isHighlighted ? "#365314" : "#283618";
  }

  return isHighlighted ? "#11361a" : "#111111";
}

function getRowBorder(player, isHighlighted) {
  if (isHighlighted) {
    return "3px solid #39ff14";
  }

  if (player.isDormantDead) {
    return "1px solid #6b7280";
  }

  if (player.isZombie) {
    return "1px solid #65a30d";
  }

  return "1px solid #ffffff";
}

function getRowOpacity(player) {
  if (player.isDormantDead) return 0.7;
  return player.isActive ? 1 : 0.75;
}

function getLivesEmoji(player) {
  if (player.isDormantDead) {
    return "💀";
  }

  const lives = Math.max(0, Math.min(6, player.lives || 0));
  const hearts = "💚".repeat(lives);
  const empties = "⚪".repeat(6 - lives);
  return hearts + empties;
}

function buildFlashHtml(state) {
  const age = Date.now() - (state.lastMessageTimestamp || 0);
  const showFlash = state.lastMessage && age < 2500;

  const flashHtml = showFlash
    ? `
      <div style="
        padding:8px 10px;
        border-radius:10px;
        background:rgba(255,255,255,0.08);
        color:${state.lastMessageColor || "#ffffff"};
        font-weight:bold;
        text-align:center;
        opacity:${age > 1800 ? 0.35 : 1};
        transition:opacity 0.6s ease;
      ">
        ${state.lastMessage}
      </div>
    `
    : `<div></div>`;

  return { showFlash, flashHtml };
}

function stateSnapshot() {
  return getState();
}

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
}

function attachButtonClick(el, handler) {
  el.onclick = handler;
  el.ontouchstart = e => {
    e.preventDefault();
    handler();
  };
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

  if (state.phase === "NDH") {
    renderNDH(container, state);
    return;
  }

  if (state.phase === "REDEMSKI") {
    renderRedemski(container, state);
    return;
  }

  renderGame(container, state);
}

/* -------------------------
   SHARED BOARD
--------------------------*/

function renderPlayerBoard(state, activeIndex) {
  const board = document.getElementById("playerBoard");
  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isHighlighted = index === activeIndex;
    rowForPlayer(board, player, isHighlighted);
  });
}

function rowForPlayer(parent, player, isHighlighted) {
  const row = document.createElement("div");
  row.style = `
    margin-bottom:10px;
    padding:12px 14px;
    border-radius:12px;
    background:${getRowBackground(player, isHighlighted)};
    border:${getRowBorder(player, isHighlighted)};
    display:flex;
    justify-content:space-between;
    align-items:center;
    color:#ffffff;
    font-weight:bold;
    font-size:16px;
    opacity:${getRowOpacity(player)};
    gap:12px;
  `;

  const leftMeta = getPlayerStatusHtml(player);

  row.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
      <div style="font-size:18px;line-height:1.2;word-break:break-word;">
        ${player.name}
        ${leftMeta ? `<span style="font-size:15px;margin-left:8px;">${leftMeta}</span>` : ""}
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0;">
      <div style="font-size:16px;line-height:1.2;">${getLivesEmoji(player)}</div>
    </div>
  `;

  parent.appendChild(row);
}

/* -------------------------
   NDH SCREEN
--------------------------*/

function renderNDH(container, state) {
  const { showFlash, flashHtml } = buildFlashHtml(state);
  const currentPlayer = state.players[state.currentPlayer];

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:12px;font-size:22px;font-weight:bold;">
      NDH Throw: ${currentPlayer.name}
    </div>

    <div id="playerBoard"></div>

    <div style="
      min-height:54px;
      margin:12px 0;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${flashHtml}
      </div>
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerBoard(state, state.currentPlayer);
  renderNDHControls(container);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

function renderNDHControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

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
      padding:12px;
      min-height:52px;
      font-size:18px;
    `;
    attachButtonClick(btn, () => {
      renderNumberPicker(container, type.value);
    });
    hitTypeRow.appendChild(btn);
  });

  const bullRow = document.createElement("div");
  bullRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const greenBullBtn = document.createElement("div");
  greenBullBtn.innerText = "Green Bull";
  greenBullBtn.style = `
    ${buttonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
  `;
  attachButtonClick(greenBullBtn, () => {
    submitNDHThrow("greenBull");
    renderUI(container);
  });

  const redBullBtn = document.createElement("div");
  redBullBtn.innerText = "Red Bull";
  redBullBtn.style = `
    ${buttonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
  `;
  attachButtonClick(redBullBtn, () => {
    submitNDHThrow("redBull");
    renderUI(container);
  });

  bullRow.appendChild(greenBullBtn);
  bullRow.appendChild(redBullBtn);

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const viewBtn = document.createElement("div");
  viewBtn.innerText = "Assigned";
  viewBtn.style = `
    ${lightButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(viewBtn, () => {
    renderTargetsModal();
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

  utilityRow.appendChild(viewBtn);
  utilityRow.appendChild(undoBtn);
  utilityRow.appendChild(endBtn);

  controls.appendChild(hitTypeRow);
  controls.appendChild(bullRow);
  controls.appendChild(utilityRow);
}

/* -------------------------
   GAME SCREEN
--------------------------*/

function renderGame(container, state) {
  const { showFlash, flashHtml } = buildFlashHtml(state);

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
    ">
      🎯 Target: ${getCurrentTargetDisplay()} | Dart ${state.dartsThrown + 1}/3
    </div>

    <div id="playerBoard"></div>

    <div style="
      min-height:54px;
      margin:12px 0;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${flashHtml}
      </div>
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerBoard(state, state.currentPlayer);
  renderGameControls(container, state);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

function renderGameControls(container, state) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const currentPlayer = state.players[state.currentPlayer];
  const targets = getCurrentTargetOptions();

  const targetRow = document.createElement("div");
  targetRow.style = `
    display:grid;
    grid-template-columns:repeat(${Math.min(Math.max(targets.length, 1), 3)}, 1fr);
    gap:8px;
    margin-top:8px;
  `;

  targets.forEach(target => {
    const btn = document.createElement("div");
    btn.innerHTML = `
      <div style="font-size:34px;line-height:1;">${formatTargetNumber(target)}</div>
    `;
    btn.style = `
      ${buttonStyle()}
      padding:14px 10px;
      min-height:88px;
      font-size:20px;
      flex-direction:column;
    `;
    attachButtonClick(btn, () => {
      const hitType = target === 25 ? "greenBull" : "single";
      submitGameThrow(hitType, target);
      renderUI(container);
    });
    targetRow.appendChild(btn);
  });

  if (!targets.length) {
    const noTarget = document.createElement("div");
    noTarget.innerText = "No Targets";
    noTarget.style = `
      ${lightButtonStyle()}
      padding:14px 10px;
      min-height:88px;
      font-size:20px;
    `;
    targetRow.appendChild(noTarget);
  }

  const actionRow = document.createElement("div");
  actionRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const selfBtn = document.createElement("div");
  selfBtn.innerText = currentPlayer.isKiller ? "Self Hit" : "Unlock Killer";
  selfBtn.style = `
    ${buttonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
  `;
  attachButtonClick(selfBtn, () => {
    const hitType = currentPlayer.target === 25 ? "greenBull" : "single";
    submitGameThrow(hitType, currentPlayer.target);
    renderUI(container);
  });

  const shanghaiBtn = document.createElement("div");
  shanghaiBtn.innerText = "Shanghai";
  shanghaiBtn.style = `
    ${lightButtonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
    ${!currentPlayer.isKiller ? "opacity:0.45;" : ""}
  `;
  attachButtonClick(shanghaiBtn, () => {
    if (!currentPlayer.isKiller) return;
    renderShanghaiConfirm(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:12px;
    min-height:52px;
    font-size:18px;
  `;
  attachButtonClick(nextBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  actionRow.appendChild(selfBtn);
  actionRow.appendChild(shanghaiBtn);
  actionRow.appendChild(nextBtn);

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
    renderStatsModal(getStats());
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

  controls.appendChild(targetRow);
  controls.appendChild(actionRow);
  controls.appendChild(utilityRow);
}

/* -------------------------
   REDEMSKI SCREEN
--------------------------*/

function renderRedemski(container, state) {
  const { showFlash, flashHtml } = buildFlashHtml(state);
  const redemskiPlayer = state.players[state.redemskiPlayerIndex];

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      ⚡ Redemski: ${redemskiPlayer.name}
    </div>

    <div id="playerBoard"></div>

    <div style="
      min-height:54px;
      margin:12px 0;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${flashHtml}
      </div>
    </div>

    <div style="
      text-align:center;
      margin-bottom:10px;
      font-size:20px;
      font-weight:bold;
    ">
      Hit Dub or Trip ${formatTargetNumber(redemskiPlayer.target)} to stay alive
    </div>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:18px;
      color:#facc15;
      font-weight:bold;
    ">
      Dart ${state.dartsThrown + 1}/3
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerBoard(state, state.redemskiPlayerIndex);
  renderRedemskiControls(container, redemskiPlayer);

  if (showFlash) {
    setTimeout(() => {
      renderUI(container);
    }, 700);
  }
}

function renderRedemskiControls(container, player) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const typeRow = document.createElement("div");
  typeRow.style = `
    display:grid;
    grid-template-columns:${player.target === 25 ? "1fr 1fr" : "1fr 1fr"};
    gap:8px;
    margin-top:8px;
  `;

  const validTypes = player.target === 25
    ? [
        { label: "Green Bull", value: "greenBull" },
        { label: "Red Bull", value: "redBull" }
      ]
    : [
        { label: "Dub", value: "double" },
        { label: "Trip", value: "triple" }
      ];

  validTypes.forEach(type => {
    const btn = document.createElement("div");
    btn.innerText = type.label;
    btn.style = `
      ${buttonStyle()}
      padding:14px;
      min-height:64px;
      font-size:22px;
    `;
    attachButtonClick(btn, () => {
      submitRedemskiThrow(type.value, player.target);
      renderUI(container);
    });
    typeRow.appendChild(btn);
  });

  const bottomRow = document.createElement("div");
  bottomRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const failBtn = document.createElement("div");
  failBtn.innerText = "Fail";
  failBtn.style = `
    ${dangerButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(failBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  const statsBtn = document.createElement("div");
  statsBtn.innerText = "Stats";
  statsBtn.style = `
    ${lightButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(statsBtn, () => {
    renderStatsModal(getStats());
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

  bottomRow.appendChild(failBtn);
  bottomRow.appendChild(statsBtn);
  bottomRow.appendChild(undoBtn);

  controls.appendChild(typeRow);
  controls.appendChild(bottomRow);
}

/* -------------------------
   MODALS
--------------------------*/

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
      modal.innerHTML = "";
    }
  };

  card.onclick = e => {
    e.stopPropagation();
  };
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.innerHTML = "";
}

function renderNumberPicker(container, hitType) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">
      ${hitType === "single" ? "Single" : hitType === "double" ? "Dub" : "Trip"} Target
    </h2>
    <div id="numberGrid"></div>
    <div id="closeModalBtn" style="
      ${buttonStyle()}
      padding:12px;
      min-height:48px;
      margin-top:12px;
    ">Close</div>
  `);

  const grid = document.getElementById("numberGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
  `;

  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement("div");
    btn.innerText = i;
    btn.style = `
      ${buttonStyle()}
      padding:12px;
      min-height:52px;
      font-size:20px;
    `;
    attachButtonClick(btn, () => {
      submitNDHThrow(hitType, i);
      closeModal();
      renderUI(container);
    });
    grid.appendChild(btn);
  }

  const closeBtn = document.getElementById("closeModalBtn");
  attachButtonClick(closeBtn, closeModal);
}

function renderTargetsModal() {
  const state = stateSnapshot();

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Assigned Targets</h2>
    <div id="targetsList"></div>
    <div id="closeModalBtn" style="
      ${buttonStyle()}
      padding:12px;
      min-height:48px;
      margin-top:12px;
    ">Close</div>
  `);

  const list = document.getElementById("targetsList");
  list.innerHTML = "";

  state.players.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:12px;
      border-radius:10px;
      background:#111111;
      border:1px solid #ffffff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      font-weight:bold;
    `;

    row.innerHTML = `
      <div>${player.name}</div>
      <div>${formatAssignment(player)}</div>
    `;

    list.appendChild(row);
  });

  const closeBtn = document.getElementById("closeModalBtn");
  attachButtonClick(closeBtn, closeModal);
}

function renderStatsModal(stats) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Game Stats</h2>
    <div id="statsList"></div>
    <div id="closeModalBtn" style="
      ${buttonStyle()}
      padding:12px;
      min-height:48px;
      margin-top:12px;
    ">Close</div>
  `);

  const list = document.getElementById("statsList");
  list.innerHTML = "";

  stats.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:12px;
      padding:14px;
      border-radius:10px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    `;

    const targetText = player.stats?.targetClaim || (player.target ? formatAssignment(player) : "Unassigned");

    row.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">${player.name}</div>
      <div style="font-size:14px;line-height:1.6;">
        • Target: ${targetText}<br>
        • Total Kills: ${player.stats?.totalKills || 0}<br>
        • Hits to Self: ${player.stats?.selfHits || 0}<br>
        • Redemskis: ${player.stats?.redemskis || 0}<br>
        • Revives: ${player.stats?.revives || 0}<br>
        • Times Zombied: ${player.stats?.zombied || 0}
      </div>
    `;

    list.appendChild(row);
  });

  const closeBtn = document.getElementById("closeModalBtn");
  attachButtonClick(closeBtn, closeModal);
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

function renderShanghaiConfirm(container) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">Confirm Shanghai</h2>
    <div style="text-align:center;margin-bottom:14px;">
      Did the player hit a valid Shanghai this turn?
    </div>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    ">
      <div id="cancelShanghaiBtn" style="
        ${lightButtonStyle()}
        padding:12px;
        min-height:48px;
      ">Cancel</div>
      <div id="confirmShanghaiBtn" style="
        ${buttonStyle()}
        padding:12px;
        min-height:48px;
      ">Shanghai</div>
    </div>
  `);

  const cancelBtn = document.getElementById("cancelShanghaiBtn");
  const confirmBtn = document.getElementById("confirmShanghaiBtn");

  attachButtonClick(cancelBtn, closeModal);
  attachButtonClick(confirmBtn, () => {
    closeModal();
    submitShanghai();
    renderUI(container);
  });
}

/* -------------------------
   END
--------------------------*/

function renderEnd(container, state) {
  const winnerName = state.winner || state.shanghaiWinner;
  const isShanghai = !!state.shanghaiWinner;
  const stats = state.finalStats || getStats();

  container.innerHTML = `
    <h2 style="text-align:center;margin-bottom:6px;">Game Over</h2>
    <h3 style="text-align:center;margin-top:0;">
      ${isShanghai ? "🏆 SHANGHAI Winner:" : "🏆 Winner:"} ${winnerName}
    </h3>

    <div style="
      display:grid;
      grid-template-columns:1fr;
      gap:10px;
      margin-top:16px;
    ">
      <div id="playAgainBtn" style="
        ${buttonStyle()}
        padding:14px;
        min-height:52px;
        font-size:18px;
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
    renderStatsModal(stats);
  });

  attachButtonClick(mainMenuBtn, () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}
