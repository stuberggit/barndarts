import {
  getState,
  getStats,
  getCurrentTargetDisplay,
  getCurrentDartDisplay,
  getCurrentTargetOptions,
  canCurrentPlayerThrow,
  submitNDHThrow,
  submitMiss,
  clearNDHTarget,
  startGame,
  submitGameThrow,
  submitRedemskiThrow,
  nextPlayer,
  endGameEarly,
  undo,
  isGameOver,
  initGame
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   STYLES / HELPERS
--------------------------*/

const KILLER_WIN_COPY = {
  banners: [
    "LAST HUMAN STANDING",
    "HORDE CLEARED",
    "GRAVEYARD CLOSED",
    "BRAINS PROTECTED",
    "APOCALYPSE SURVIVED",
    "UNDEAD DENIED",
    "ZOMBIE PROBLEM SOLVED",
    "NO BITES LEFT",
    "FINAL HEART BEATING",
    "REDemski REJECTED",
    "THE HORDE GOT HUMBLED"
  ],

  normalHeadlines: [
    "{winnerName} Survived the Horde!",
    "{winnerName} Made It Out Alive!",
    "{winnerName} Is Not on the Menu!",
    "{winnerName} Beat the Apocalypse!",
    "{winnerName} Outran the Graveyard!",
    "{winnerName} Stayed Human-ish!",
    "{winnerName} Cleared the Board!",
    "{winnerName} Sent the Horde Packing!",
    "{winnerName} Refused to Become a Snack!",
    "{winnerName} Is Your Killer Champion!"
  ],

  shanghaiHeadlines: [
    "{winnerName} Cleared the Horde!",
    "{winnerName} Ended It With Style!",
    "{winnerName} Went Full Zombie Slayer!",
    "{winnerName} Brought the Boomstick!",
    "{winnerName} Hit the Apocalypse Walk-Off!",
    "{winnerName} Just Buried the Horde!",
    "{winnerName} Dropped a Shanghai Headshot!",
    "{winnerName} Turned the Graveyard Silent!",
    "{winnerName} Made the Undead Regret Everything!",
    "{winnerName} Closed the Coffin With Shanghai!"
  ],

  normalSubheads: [
    "Brains protected. Zombies defeated. Glory secured.",
    "The horde swung first. Bad idea.",
    "The zombies wanted brains. They got humbled.",
    "Survival rating: extremely annoying to zombies.",
    "Not dead. Not dormant. Definitely dangerous.",
    "Close enough. We are counting it.",
    "The last heartbeat on the board belongs to the winner.",
    "The graveyard asked for mercy. Denied.",
    "The undead came hungry and left embarrassed.",
    "Somebody check the pulse. Actually, never mind."
  ],

  shanghaiSubheads: [
    "Shanghai headshot. Absolutely unnecessary. Absolutely beautiful.",
    "Single. Dub. Trip. Goodnight, undead.",
    "Shanghai landed. The graveyard got quiet.",
    "A Shanghai finish with maximum disrespect.",
    "One perfect turn. Zero zombie morale.",
    "The horde got lined up and deleted.",
    "That was not survival. That was pest control.",
    "The undead saw Shanghai and chose retirement.",
    "A three-dart horror movie with a very short runtime.",
    "That finish belongs in the zombie safety manual."
  ],

  normalBodyCopies: [
    "Against skulls, zombies, and Redemskis, one survivor outlasted the apocalypse and claimed the crown.",
    "When the dust settled, the moaning stopped, and the last target fell, one player was still standing with darts in hand.",
    "Some players joined the undead. Some stayed down. One player walked through the chaos like they had cheat codes.",
    "Redemskis were attempted. Zombies returned. Hearts disappeared. Somehow, one survivor refused to become a snack.",
    "The board turned into a horror movie, and this player still found a way to be the final scene.",
    "After all the bites, revives, and questionable life choices, one player had just enough pulse left to win.",
    "{winnerName} dodged the dead, buried the comeback attempts, and left the rest of the field groaning in the dirt.",
    "The horde kept coming, the hearts kept dropping, and {winnerName} kept refusing to die.",
    "Every zombie movie needs one survivor with bad ideas and great timing. Tonight, that survivor was {winnerName}.",
    "{winnerName} turned the board into a graveyard and somehow walked out cleaner than they had any right to."
  ],

  shanghaiBodyCopies: [
    "The zombies lined up, the darts flew, and one perfect turn turned the apocalypse into target practice.",
    "That was not just a win. That was a full zombie eviction notice delivered point-first.",
    "No Redemski, no comeback, no groaning from the cheap seats. Just one perfect turn and a whole lot of silence.",
    "The undead came hungry. They left educated. Never stand in front of that throw again.",
    "{winnerName} did not survive the apocalypse. They ended it with three darts and a deeply disrespectful Shanghai.",
    "The graveyard had plans. {winnerName} hit Shanghai and cancelled the whole undead itinerary.",
    "The horde wanted brains. {winnerName} gave them Single, Dub, Trip, and a permanent nap.",
    "Shanghai usually wins the game. This one also lowered property values in the cemetery.",
    "{winnerName} stepped up, threw three clean hits, and made every zombie reconsider the career path.",
    "That was less of a finish and more of a public service announcement for the undead."
  ]
};

function pickRandomCopy(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(Math.random() * items.length)];
}

function personalizeCopyText(text, winnerName) {
  return String(text || "").replaceAll("{winnerName}", winnerName || "Winner");
}

function getKillerWinCopy(winnerName, isShanghai) {
  const headlinePool = isShanghai
    ? KILLER_WIN_COPY.shanghaiHeadlines
    : KILLER_WIN_COPY.normalHeadlines;

  const subheadPool = isShanghai
    ? KILLER_WIN_COPY.shanghaiSubheads
    : KILLER_WIN_COPY.normalSubheads;

  const bodyCopyPool = isShanghai
    ? KILLER_WIN_COPY.shanghaiBodyCopies
    : KILLER_WIN_COPY.normalBodyCopies;

  return {
    banner: personalizeCopyText(pickRandomCopy(KILLER_WIN_COPY.banners), winnerName),
    headline: personalizeCopyText(pickRandomCopy(headlinePool), winnerName),
    subhead: personalizeCopyText(pickRandomCopy(subheadPool), winnerName),
    bodyCopy: personalizeCopyText(pickRandomCopy(bodyCopyPool), winnerName)
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
    touch-action:manipulation;
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
    touch-action:manipulation;
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
    touch-action:manipulation;
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
    touch-action:manipulation;
  `;
}

function attachButtonClick(el, handler) {
  let locked = false;

  const run = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (locked) return;
    if (el.dataset.disabled === "true") return;

    locked = true;

    try {
      handler(e);
    } finally {
      setTimeout(() => {
        locked = false;
      }, 450);
    }
  };

  el.onclick = null;
  el.ontouchstart = null;
  el.ontouchend = null;
  el.onpointerup = null;

  if (window.PointerEvent) {
    el.onpointerup = run;
  } else {
    el.ontouchend = run;
    el.onclick = run;
  }
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

function formatTargetNumber(target) {
  return target === 25 ? "Bull" : String(target);
}

function formatAssignment(player) {
  if (!player.target) return "Unassigned";

  if (player.target === 25) {
    return player.hitType === "redBull" ? "Dub Bull" : "Sing Bull";
  }

  const labelMap = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labelMap[player.hitType] || "Hit"} ${player.target}`;
}

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
}

function buildFlashHtml(state) {
  if (!state.lastMessage) return `<div></div>`;

  return `
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
  `;
}

function getPlayerStatusHtml(player) {
  const parts = [];

  if (player.isKiller) {
    parts.push(`<span style="color:#ff4c4c;font-weight:900;">K</span>`);
  }

  if (player.isRedemski && !player.isDormantDead) {
    const count = player.redemskiCount || 0;

    parts.push(
      count <= 1
        ? `<span style="color:#facc15;">Redemski</span>`
        : `<span style="color:#facc15;">Rx${count}</span>`
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
  if (isHighlighted) return "3px solid #facc15";
  if (player.isDormantDead) return "1px solid #6b7280";
  if (player.isZombie) return "1px solid #65a30d";
  return "1px solid #ffffff";
}

function getRowOpacity(player) {
  if (player.isDormantDead) return 0.7;
  return player.isActive ? 1 : 0.75;
}

function getLivesEmoji(player) {
  if (player.isDormantDead) {
    return `<span style="font-size:18px;">💀</span>`;
  }

  const lives = Math.max(0, Math.min(6, player.lives || 0));

  let heartColor = "#22c55e";
  if (lives === 1) {
    heartColor = "#ef4444";
  } else if (lives === 2 || lives === 3) {
    heartColor = "#facc15";
  }

  let html = "";

  for (let i = 0; i < 6; i++) {
    const isFilled = i < lives;

    html += `
      <span style="
        display:inline-block;
        margin-right:${i < 5 ? "5px" : "0"};
        opacity:${isFilled ? "1" : "0.18"};
        color:${isFilled ? heartColor : "#ffffff"};
        font-size:20px;
        line-height:1;
        font-weight:bold;
      ">
        ♥
      </span>
    `;
  }

  return html;
}

/* -------------------------
   MAIN UI ROUTER
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

  if (state.phase === "READY") {
    renderReady(container, state);
    return;
  }

  if (state.phase === "REDEMSKI") {
    renderRedemski(container, state);
    return;
  }

  renderGame(container, state);
}

/* -------------------------
   PLAYER BOARD
--------------------------*/

function renderPlayerBoard(state, activeIndex) {
  const board = document.getElementById("playerBoard");
  if (!board) return;

  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isHighlighted = index === activeIndex;
    rowForPlayer(board, player, isHighlighted, state.phase === "NDH" || state.phase === "READY");
  });
}

function rowForPlayer(parent, player, isHighlighted, showTargetDetail = false) {
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

  const statusHtml = getPlayerStatusHtml(player);

  const targetBadge = player.target
    ? `
      <div style="
        min-width:54px;
        min-height:42px;
        padding:5px 8px;
        border-radius:10px;
        border:2px solid ${player.isDormantDead ? "#6b7280" : player.isZombie ? "#22c55e" : "#facc15"};
        background:${
          player.isDormantDead
            ? "#27272a"
            : player.isZombie
              ? "linear-gradient(180deg, #14532d 0%, #052e16 100%)"
              : "rgba(250,204,21,0.12)"
        };
        color:${player.isDormantDead ? "#d4d4d8" : player.isZombie ? "#dcfce7" : "#facc15"};
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        line-height:1.05;
        flex-shrink:0;
        box-shadow:${player.isZombie ? "inset 0 0 12px rgba(34,197,94,0.25)" : "none"};
      ">
        <div style="font-size:10px;letter-spacing:0.6px;opacity:0.95;white-space:nowrap;">
          ${player.isZombie ? "🧟 ZOMBIE" : "TARGET"}
        </div>
        <div style="font-size:22px;font-weight:900;text-shadow:${player.isZombie ? "0 0 8px rgba(34,197,94,0.6)" : "none"};">
          ${formatTargetNumber(player.target)}
        </div>
      </div>
    `
    : `
      <div style="
        min-width:54px;
        min-height:42px;
        padding:5px 8px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,0.35);
        color:rgba(255,255,255,0.55);
        display:flex;
        align-items:center;
        justify-content:center;
        flex-shrink:0;
        font-size:13px;
      ">
        —
      </div>
    `;

  const targetDetailHtml = showTargetDetail && player.target
    ? `
      <div style="
        font-size:14px;
        line-height:1.1;
        margin-top:3px;
        color:#facc15;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      ">
        ${formatAssignment(player)}
      </div>
    `
    : "";

  row.innerHTML = `
    ${targetBadge}

    <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;">
      <div style="font-size:18px;line-height:1.2;word-break:break-word;">
        ${player.name}
        ${statusHtml ? `<span style="font-size:15px;margin-left:8px;">${statusHtml}</span>` : ""}
      </div>
      ${targetDetailHtml}
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
  const currentPlayer = state.players[state.currentPlayer];

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:12px;font-size:22px;font-weight:bold;">
      NDH Throw: ${currentPlayer ? currentPlayer.name : "—"}
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
        ${buildFlashHtml(state)}
      </div>
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerBoard(state, state.currentPlayer);
  renderNDHControls(container);
}

function renderNDHControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const state = getState();
  const currentPlayer = state.players[state.currentPlayer];
  const hasTarget = !!currentPlayer?.target;

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
    btn.dataset.disabled = hasTarget ? "true" : "false";
    btn.style = `
      ${buttonStyle()}
      padding:8px;
      min-height:40px;
      font-size:16px;
      ${hasTarget ? "opacity:0.35;cursor:not-allowed;" : ""}
    `;

    attachButtonClick(btn, () => {
      if (hasTarget) return;
      renderNumberPicker(container, type.value);
    });

    hitTypeRow.appendChild(btn);
  });

  const middleRow = document.createElement("div");
  middleRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss";
  missBtn.dataset.disabled = "true";
  missBtn.style = `
    ${buttonStyle()}
    padding:8px;
    min-height:40px;
    font-size:15px;
    opacity:0.35;
    cursor:not-allowed;
  `;

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:8px;
    min-height:40px;
    font-size:15px;
    ${hasTarget ? "border:2px solid #facc15;box-shadow:0 0 12px rgba(250,204,21,0.25);" : ""}
  `;

  attachButtonClick(nextBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  middleRow.appendChild(missBtn);
  middleRow.appendChild(nextBtn);

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
  controls.appendChild(middleRow);
  controls.appendChild(utilityRow);
}

/* -------------------------
   READY SCREEN
--------------------------*/

function renderReady(container, state) {
  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      Review Targets
    </div>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:15px;
      opacity:0.9;
      line-height:1.4;
    ">
      Confirm everyone has the correct target. Use Undo or Clear Current before starting.
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
        ${buildFlashHtml(state)}
      </div>
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerBoard(state, state.currentPlayer);
  renderReadyControls(container);
}

function renderReadyControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const startBtn = document.createElement("div");
  startBtn.innerText = "Start Game";
  startBtn.style = `
    ${buttonStyle()}
    padding:14px;
    min-height:52px;
    font-size:18px;
    border:2px solid #facc15;
  `;
  attachButtonClick(startBtn, () => {
    startGame();
    renderUI(container);
  });

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const clearBtn = document.createElement("div");
  clearBtn.innerText = "Clear Current";
  clearBtn.style = `
    ${lightButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(clearBtn, () => {
    clearNDHTarget();
    renderUI(container);
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

  utilityRow.appendChild(clearBtn);
  utilityRow.appendChild(undoBtn);
  utilityRow.appendChild(endBtn);

  controls.appendChild(startBtn);
  controls.appendChild(utilityRow);
}

/* -------------------------
   GAME SCREEN
--------------------------*/

function renderGame(container, state) {
  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
    ">
      🎯 Target: ${getCurrentTargetDisplay()} | Dart ${getCurrentDartDisplay()}
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
        ${buildFlashHtml(state)}
      </div>
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerBoard(state, state.currentPlayer);
  renderGameControls(container, state);
}

function getTileInfoForTarget(state, target) {
  const currentPlayer = state.players[state.currentPlayer];
  const isOwnTarget = target === currentPlayer.target;

  if (isOwnTarget) {
    return {
      number: formatTargetNumber(target),
      name: currentPlayer.name,
      isDormantDead: false,
      isZombie: !!currentPlayer.isZombie,
      isOwnTarget: true
    };
  }

  const targetPlayer = state.players.find(player => player.target === target);

  return {
    number: formatTargetNumber(target),
    name: targetPlayer?.name || "",
    isDormantDead: !!targetPlayer?.isDormantDead,
    isZombie: !!targetPlayer?.isZombie,
    isOwnTarget: false
  };
}

function renderGameControls(container, state) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const currentPlayer = state.players[state.currentPlayer];
  const targets = getCurrentTargetOptions();
  const canThrow = canCurrentPlayerThrow();

  const targetRow = document.createElement("div");
  targetRow.style = `
    display:grid;
    grid-template-columns:repeat(${Math.min(Math.max(targets.length, 1), 3)}, 1fr);
    gap:8px;
    margin-top:8px;
  `;

  targets.forEach(target => {
    const info = getTileInfoForTarget(state, target);
    const zombieTarget = info.isZombie && !info.isDormantDead;
    const ownTargetIsDanger = info.isOwnTarget && currentPlayer.isKiller && !zombieTarget;
    const ownTargetIsUnlock = info.isOwnTarget && !currentPlayer.isKiller && !zombieTarget;

    const btn = document.createElement("div");
    btn.dataset.disabled = canThrow ? "false" : "true";

    btn.innerHTML = `
      <div style="
        position:relative;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        width:100%;
        height:100%;
      ">
        <div style="
          font-size:${info.isOwnTarget ? "30px" : "34px"};
          line-height:1;
          ${info.isDormantDead ? "color:#d4d4d8;" : ""}
          ${zombieTarget ? "color:#bbf7d0;text-shadow:0 0 8px rgba(34,197,94,0.6);" : ""}
          ${info.isOwnTarget && !zombieTarget ? "color:#facc15;" : ""}
        ">
          ${info.number}
        </div>

        ${
          info.isDormantDead
            ? `
              <div style="
                position:absolute;
                top:18px;
                left:50%;
                transform:translateX(-50%) rotate(-10deg);
                background:rgba(55,65,81,0.95);
                color:#e5e7eb;
                border:1px solid #9ca3af;
                border-radius:6px;
                padding:2px 8px;
                font-size:13px;
                font-weight:bold;
                letter-spacing:1px;
              ">
                DEAD
              </div>
            `
            : ""
        }

        ${
          zombieTarget
            ? `
              <div style="
                position:absolute;
                top:8px;
                left:50%;
                transform:translateX(-50%) rotate(-6deg);
                background:rgba(20,83,45,0.98);
                color:#dcfce7;
                border:1px solid #86efac;
                border-radius:999px;
                padding:2px 8px;
                font-size:12px;
                font-weight:bold;
                letter-spacing:0.5px;
                box-shadow:0 0 10px rgba(34,197,94,0.35);
                white-space:nowrap;
              ">
                🧟 Zombie 🧟
              </div>
            `
            : ""
        }

        ${
          ownTargetIsDanger
            ? `
              <div style="
                position:absolute;
                top:8px;
                left:50%;
                transform:translateX(-50%) rotate(-6deg);
                background:rgba(127,29,29,0.98);
                color:#fecaca;
                border:1px solid #fca5a5;
                border-radius:6px;
                padding:2px 8px;
                font-size:12px;
                font-weight:bold;
                letter-spacing:1px;
              ">
                BEWARE
              </div>
            `
            : ""
        }

        ${
          ownTargetIsUnlock
            ? `
              <div style="
                position:absolute;
                top:8px;
                left:50%;
                transform:translateX(-50%) rotate(-6deg);
                background:rgba(34,197,94,0.98);
                color:#052e16;
                border:1px solid #bbf7d0;
                border-radius:6px;
                padding:2px 8px;
                font-size:12px;
                font-weight:bold;
                letter-spacing:1px;
              ">
                UNLOCK
              </div>
            `
            : ""
        }

        <div style="
          font-size:12px;
          line-height:1.1;
          margin-top:6px;
          opacity:0.9;
          ${info.isDormantDead ? "color:#d4d4d8;" : ""}
          ${zombieTarget ? "color:#dcfce7;font-weight:bold;" : ""}
          ${info.isOwnTarget && !zombieTarget ? "color:#facc15;font-weight:bold;" : ""}
        ">
          ${info.name}
        </div>
      </div>
    `;

    btn.style = `
      ${buttonStyle()}
      padding:14px 10px;
      min-height:88px;
      font-size:20px;
      flex-direction:column;
      position:relative;
      overflow:hidden;
      ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
      ${
        info.isDormantDead
          ? `
            background:#3f3f46;
            color:#d4d4d8;
            border:2px solid #9ca3af;
          `
          : ""
      }
      ${
        zombieTarget
          ? `
            background:
              radial-gradient(circle at top, rgba(134,239,172,0.22), transparent 42%),
              linear-gradient(180deg, #14532d 0%, #052e16 100%);
            color:#dcfce7;
            border:2px solid #22c55e;
            box-shadow:inset 0 0 18px rgba(34,197,94,0.22);
          `
          : ownTargetIsDanger
            ? `
              background:#451a1a;
              color:#facc15;
              border:2px solid #facc15;
            `
            : info.isOwnTarget
              ? `
                background:#11361a;
                color:#facc15;
                border:2px solid #22c55e;
              `
              : ""
      }
    `;

    attachButtonClick(btn, () => {
      if (!canCurrentPlayerThrow()) {
        renderUI(container);
        return;
      }

      const freshState = getState();
      const freshPlayer = freshState.players[freshState.currentPlayer];
      const isOwnTarget = target === freshPlayer.target;

      if (isOwnTarget && !freshPlayer.isKiller) {
        const autoHitType = target === 25 ? "greenBull" : "single";
        submitGameThrow(autoHitType, target);
        renderUI(container);
        return;
      }

      renderGameHitTypePicker(container, target);
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
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss";
  missBtn.dataset.disabled = canThrow ? "false" : "true";
  missBtn.style = `
    ${buttonStyle()}
    padding:8px;
    min-height:40px;
    font-size:15px;
    ${!canThrow ? "opacity:0.45;cursor:not-allowed;" : ""}
  `;
  attachButtonClick(missBtn, () => {
    if (!canCurrentPlayerThrow()) {
      renderUI(container);
      return;
    }

    submitMiss();
    renderUI(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:8px;
    min-height:40px;
    font-size:15px;
  `;
  attachButtonClick(nextBtn, () => {
    nextPlayer();
    renderUI(container);
  });

  actionRow.appendChild(missBtn);
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
  const redemskiPlayer = state.players[state.redemskiPlayerIndex];

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      ⚡ Redemski: ${redemskiPlayer ? redemskiPlayer.name : "—"}
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
        ${buildFlashHtml(state)}
      </div>
    </div>

    <div style="
      text-align:center;
      margin-bottom:10px;
      font-size:20px;
      font-weight:bold;
    ">
      Hit Dub or Trip ${redemskiPlayer ? formatTargetNumber(redemskiPlayer.target) : "—"} to stay alive
    </div>

    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:18px;
      color:#facc15;
      font-weight:bold;
    ">
      Dart ${Math.min((state.dartsThrown || 0) + 1, 3)}/3
    </div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderPlayerBoard(state, state.redemskiPlayerIndex);
  renderRedemskiControls(container, redemskiPlayer);
}

function renderRedemskiControls(container, player) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  if (!player) return;

  const typeRow = document.createElement("div");
  typeRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const validTypes = player.target === 25
    ? [
        { label: "Sing Bull", value: "greenBull" },
        { label: "Dub Bull", value: "redBull" }
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

function renderNumberPicker(container, hitType) {
  const allowSingleBull = hitType === "single";
  const allowDoubleBull = hitType === "double";

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">
      ${hitType === "single" ? "Single" : hitType === "double" ? "Dub" : "Trip"} Target
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
        padding:12px;
        min-height:52px;
        font-size:20px;
        ${hitType === "triple" ? "background:#555;color:#bbb;border:1px solid #999;cursor:not-allowed;" : ""}
      ">Bull</div>

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

  const bullBtn = document.getElementById("bullBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (allowSingleBull) {
    attachButtonClick(bullBtn, () => {
      submitNDHThrow("greenBull");
      closeModal();
      renderUI(container);
    });
  } else if (allowDoubleBull) {
    attachButtonClick(bullBtn, () => {
      submitNDHThrow("redBull");
      closeModal();
      renderUI(container);
    });
  } else {
    bullBtn.dataset.disabled = "true";
  }

  attachButtonClick(closeBtn, closeModal);
}

function renderGameHitTypePicker(container, target) {
  if (!canCurrentPlayerThrow()) {
    closeModal();
    renderUI(container);
    return;
  }

  const state = getState();
  const currentPlayer = state.players[state.currentPlayer];
  const isSelfTarget = target === currentPlayer.target;
  const isBull = target === 25;

  const options = isBull
    ? [
        { label: "Sing Bull", value: "greenBull" },
        { label: "Dub Bull", value: "redBull" }
      ]
    : [
        { label: "Single", value: "single" },
        { label: "Dub", value: "double" },
        { label: "Trip", value: "triple" }
      ];

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">
      ${isSelfTarget ? `${currentPlayer.name}'s Target` : `${formatTargetNumber(target)} Target`}
    </h2>

    <div style="text-align:center;margin-bottom:12px;opacity:0.85;">
      Choose hit type
    </div>

    <div id="hitTypeGrid"></div>

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

  const grid = document.getElementById("hitTypeGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(${options.length}, 1fr);
    gap:8px;
  `;

  options.forEach(option => {
    const btn = document.createElement("div");
    btn.innerText = option.label;
    btn.dataset.disabled = "false";
    btn.style = `
      ${buttonStyle()}
      padding:14px;
      min-height:62px;
      font-size:20px;
    `;

    attachButtonClick(btn, () => {
      if (!canCurrentPlayerThrow()) {
        closeModal();
        renderUI(container);
        return;
      }

      btn.dataset.disabled = "true";
      submitGameThrow(option.value, target);
      closeModal();
      renderUI(container);
    });

    grid.appendChild(btn);
  });

  const closeBtn = document.getElementById("closeModalBtn");
  attachButtonClick(closeBtn, closeModal);
}

function renderTargetsModal() {
  const state = getState();

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Assigned Targets</h2>
    <div id="targetsList"></div>
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

/* -------------------------
   END SCREEN
--------------------------*/

function renderEnd(container, state) {
  const winnerName = state.winner || state.shanghaiWinner;
  const isShanghai = !!state.shanghaiWinner;
  const winCopy = getKillerWinCopy(winnerName, isShanghai);
  const stats = state.finalStats || getStats();

  const loserTags = [
    "1st Loser",
    "Faster Than That Guy",
    "Definitely Dead",
    "Mostly Dead",
    "Zombie Snack",
    "Graveyard Regular",
    "Redemski Regret",
    "Board Meat",
    "Undead Adjacent",
    "Ran Out of Hearts",
    "Certified Corpse",
    "Almost Heroic",
    "Bitten and Smitten",
    "No Pulse, No Problem",
    "Brains Were Optional"
  ];

  const shuffledLoserTags = [...loserTags].sort(() => Math.random() - 0.5);

  const rankedPlayers = [...(state.players || [])].sort((a, b) => {
    if (a.name === winnerName) return -1;
    if (b.name === winnerName) return 1;

    const aActiveScore = a.isDormantDead ? 0 : 1;
    const bActiveScore = b.isDormantDead ? 0 : 1;

    if (bActiveScore !== aActiveScore) {
      return bActiveScore - aActiveScore;
    }

    if ((b.lives || 0) !== (a.lives || 0)) {
      return (b.lives || 0) - (a.lives || 0);
    }

    const aZombieScore = a.wasZombied || a.isZombie || (a.stats?.zombied || 0) > 0 ? 1 : 0;
    const bZombieScore = b.wasZombied || b.isZombie || (b.stats?.zombied || 0) > 0 ? 1 : 0;

    if (bZombieScore !== aZombieScore) {
      return bZombieScore - aZombieScore;
    }

    return a.name.localeCompare(b.name);
  });

  function getPlayerFinalTag(player, index) {
    if (index === 0) {
      return player.isZombie || player.wasZombied || (player.stats?.zombied || 0) > 0
        ? "Zombie King"
        : "Survivor";
    }

    return shuffledLoserTags[index - 1] || "Very Dead";
  }

  function getZombieMarker(player) {
    return player.isZombie || player.wasZombied || (player.stats?.zombied || 0) > 0
      ? " 🧟‍♂️"
      : "";
  }

  container.innerHTML = `
    <style>
      @keyframes zombieGlow {
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
      animation:zombieGlow 2.8s infinite ease-in-out;
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
        <span style="animation:survivorFloat 2.2s infinite ease-in-out;">🧟</span>
        <span style="animation:survivorFloat 2.6s infinite ease-in-out;">💀</span>
        <span style="animation:survivorFloat 2.1s infinite ease-in-out;">🧟</span>
        <span style="animation:survivorFloat 2.8s infinite ease-in-out;">☣️</span>
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
        ${winCopy.banner}
      </div>

      <div style="
        text-align:center;
        font-size:54px;
        line-height:1;
        margin-bottom:8px;
        animation:trophyPulse 1.7s infinite ease-in-out;
      ">
        ${isShanghai ? "🏆💥🧟" : "🏆🧟‍♂️🏆"}
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
                ${index + 1}. ${player.name}${getZombieMarker(player)}
              </span>
              <span style="
                color:${index === 0 ? "#facc15" : "#ffffff"};
                flex-shrink:0;
                text-align:right;
              ">
                ${getPlayerFinalTag(player, index)}
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
    renderStatsModal(stats);
  });

  attachButtonClick(mainMenuBtn, () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}
