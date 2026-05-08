import {
  getState,
  getStats,
  advancePlayer,
  missBoard,
  partyJump,
  acdcJump,
  nextPlayer,
  undo,
  isGameOver,
  initGame,
  getRotatedPlayersForReplay
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   HELPERS
--------------------------*/

const COLORS = [
  { name: "Black", bg: "#111111", text: "#ffffff" },
  { name: "White", bg: "#ffffff", text: "#111111" },
  { name: "Green", bg: "#22c55e", text: "#ffffff" },
  { name: "Red", bg: "#ef4444", text: "#ffffff" }
];

const AG_WIN_COPY = {
  banners: [
    "TOUCHDOWN RUN",
    "BACK IN BLACK, OUT IN FRONT",
    "PARTY IN THE END ZONE",
    "GREEN MEANS GONE",
    "RED ZONE RAID",
    "FOUR-COLOR FINISH",
    "BROKE ONE LOOSE",
    "LAMBEAU LEAP LOADED",
    "COLOR ROUTE COMPLETE",
    "HOUSE CALL",
    "IT AIN'T EASY BEING GREEN"
  ],

  headlines: [
    "{winnerName} Took It to the House!",
    "{winnerName} Wins Ahman Green!",
    "{winnerName} Hit the Red Zone and Never Looked Back!",
    "{winnerName} Just Ran Through the Whole Damn Color Wheel!",
    "{winnerName} Finished the Drive!",
    "{winnerName} Went Black, White, Green, Red… Ballgame!",
    "{winnerName} Found Daylight!",
    "{winnerName} Broke the Tackle and Hit Paydirt!",
    "{winnerName} Just Put Six on the Board!",
    "{winnerName} Is Your Ahman Green Champion!",
    "{winnerName} Followed Orders!"
  ],

  subheads: [
    "No flags. No review. Just victory.",
    "That was a full-speed color-route clinic.",
    "Somebody call the equipment guy — ankles were broken.",
    "The defense guessed wrong on every color.",
    "Red was waiting, and they punched it in.",
    "A clean drive with just enough chaos.",
    "Black to White to Green to Red. Textbook carnage.",
    "The party button was jealous of that finish.",
    "AC/DC can’t drag that one Back to Black.",
    "A victory drive worthy of the highlight reel.",
    "Black, White, Green, Red — no detours, no refunds."
  ],

  bodyCopies: [
    "They worked through every color, survived the board, and crossed the goal line before anyone could catch them.",
    "One player found the lane, hit the gas, and turned the color sequence into a victory parade.",
    "Black tried to reset them, White tried to slow them down, Green opened the lane, and Red sealed the deal.",
    "That was less of a darts turn and more of a running back lowering the shoulder at the goal line.",
    "The board gave them four colors. They gave the board a problem.",
    "Everyone else was still reading the playbook while they were already dancing in the end zone.",
    "A little luck, a little touch, and one nasty finish through Red.",
    "They didn’t just win — they marched the whole damn field one color at a time.",
    "The route was simple: don’t miss, don’t panic, and absolutely do not get sent Back in Black.",
    "That finish had everything: speed, chaos, and just enough bar-league nonsense to make it beautiful.",
    "Stayed on assignment, dodged Back in Black, kept the partying under control, and cashed in the green. Compliance has never looked so profitable."
  ]
};

function pickRandomCopy(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(Math.random() * items.length)];
}

function personalizeCopy(text, winnerName) {
  return String(text || "").replaceAll("{winnerName}", winnerName || "Winner");
}

function getAgWinCopy(winnerName) {
  return {
    banner: personalizeCopy(pickRandomCopy(AG_WIN_COPY.banners), winnerName),
    headline: personalizeCopy(pickRandomCopy(AG_WIN_COPY.headlines), winnerName),
    subhead: personalizeCopy(pickRandomCopy(AG_WIN_COPY.subheads), winnerName),
    bodyCopy: personalizeCopy(pickRandomCopy(AG_WIN_COPY.bodyCopies), winnerName)
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

function playAgainButtonStyle() {
  return `
    ${buttonStyle()}
    border:2px solid #facc15;
  `;
}

function leaderboardButtonStyle() {
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

function getNeedsColor(progress) {
  return COLORS[progress]?.name || "Done";
}

function getNeedsColorMeta(progress) {
  return COLORS[progress] || { name: "Done", bg: "#666666", text: "#ffffff" };
}

function getRankedPlayers(state) {
  return [...(state.players || [])]
    .map((player, index) => ({ ...player, originalIndex: index }))
    .sort((a, b) => {
      if (a.name === state.winner) return -1;
      if (b.name === state.winner) return 1;

      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }

      const aDarts = a.stats?.dartsThrown || 0;
      const bDarts = b.stats?.dartsThrown || 0;

      if (aDarts !== bDarts) {
        return aDarts - bDarts;
      }

      return a.originalIndex - b.originalIndex;
    });
}

function formatProgressStatus(player) {
  if (player.progress >= 4) return "Finished";
  return `Needs | ${getNeedsColor(player.progress)}`;
}

function pluralize(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function getProgressCells(player, isInteractive, container) {
  const colorRow = document.createElement("div");
  colorRow.style = `
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    gap:8px;
    width:100%;
  `;

  COLORS.forEach((color, colorIndex) => {
    const completed = player.progress > colorIndex;
    const target = player.progress === colorIndex;
    const locked = player.progress < colorIndex;

    const cell = document.createElement("div");
    cell.style = `
      min-height:56px;
      border-radius:10px;
      border:2px solid ${target ? "#a855f7" : "#ffffff"};
      background:${color.bg};
      color:${color.text};
      display:flex;
      align-items:center;
      justify-content:center;
      position:relative;
      font-weight:bold;
      font-size:14px;
      opacity:${locked ? 0.45 : 1};
      cursor:${target && isInteractive ? "pointer" : "default"};
      user-select:none;
    `;
    cell.innerText = color.name;

    if (completed) {
      const xOverlay = document.createElement("div");
      xOverlay.innerText = "✕";
      xOverlay.style = `
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#a855f7;
        font-size:34px;
        font-weight:bold;
        pointer-events:none;
      `;
      cell.appendChild(xOverlay);
    }

    if (target && isInteractive) {
      cell.onclick = () => {
        advancePlayer(color.name);
        renderUI(container);
      };
    }

    colorRow.appendChild(cell);
  });

  return colorRow;
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
        max-width:760px;
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

/* -------------------------
   MAIN UI
--------------------------*/

export function renderUI(container) {
  const state = getState();

  if (isGameOver()) {
    renderEnd(container, state);
    return;
  }

  const currentPlayer = state.players[state.currentPlayer];
  const needsMeta = getNeedsColorMeta(currentPlayer.progress);

  const messageHtml = state.lastMessage
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

  container.innerHTML = `
    <div style="
      text-align:center;
      margin:0 0 12px;
      font-size:16px;
      font-weight:bold;
      line-height:1.4;
    ">
      <div>Current Player: ${currentPlayer.name}</div>
      <div>
        Needs |
        <span style="color:${needsMeta.bg === "#ffffff" ? "#ffffff" : needsMeta.bg}; font-weight:bold;">
          ${needsMeta.name}
        </span>
      </div>
    </div>

    <div id="activeColorBlock"></div>

    <div style="
      min-height:54px;
      margin:10px 0 12px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${messageHtml}
      </div>
    </div>

    <h3 style="text-align:center;margin:8px 0 12px;">
      🎯 ${currentPlayer.name}
      (Dart ${state.dartsThrown + 1}/3)
    </h3>

    <div id="controls"></div>

    <div id="modal"></div>
  `;

  const activeColorBlock = document.getElementById("activeColorBlock");
  activeColorBlock.appendChild(getProgressCells(currentPlayer, true, container));

  renderControls(container);
}

/* -------------------------
   CONTROLS
--------------------------*/

function renderControls(container) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const row1 = document.createElement("div");
  row1.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const missBtn = document.createElement("div");
  missBtn.innerText = "❌ Miss Board";
  missBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  attachButtonClick(missBtn, () => {
    missBoard();
    renderUI(container);
  });

  const partyBtn = document.createElement("div");
  partyBtn.innerText = "🎉 Party";
  partyBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  attachButtonClick(partyBtn, () => {
    partyJump();
    renderUI(container);
  });

  row1.appendChild(missBtn);
  row1.appendChild(partyBtn);

  const row2 = document.createElement("div");
  row2.style = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const acdcBtn = document.createElement("div");
  acdcBtn.innerText = "⚡ AC/DC";
  acdcBtn.style = `
    ${buttonStyle()}
    padding:8px;
    font-size:15px;
    min-height:40px;
  `;
  attachButtonClick(acdcBtn, () => {
    acdcJump();
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

  row2.appendChild(acdcBtn);
  row2.appendChild(nextBtn);

  const row3 = document.createElement("div");
  row3.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  const statsBtn = document.createElement("div");
  statsBtn.innerText = "Stats";
  statsBtn.style = `
    ${leaderboardButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(statsBtn, () => {
    renderStatsModal(getStats(), getState());
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

  row3.appendChild(statsBtn);
  row3.appendChild(undoBtn);
  row3.appendChild(endBtn);

  controls.appendChild(row1);
  controls.appendChild(row2);
  controls.appendChild(row3);
}

/* -------------------------
   MODALS
--------------------------*/

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
        ${leaderboardButtonStyle()}
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

  attachButtonClick(document.getElementById("cancelEndBtn"), closeModal);

  attachButtonClick(document.getElementById("confirmEndBtn"), () => {
    closeModal();
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}

function renderStatsModal(stats, state) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">Stats</h2>

    <div id="progressBreakdown"></div>
    <div id="statsList"></div>

    <div style="
      display:flex;
      justify-content:center;
      margin-top:12px;
    ">
      <div id="closeStatsBtn" style="
        ${buttonStyle()}
        padding:10px;
        min-height:42px;
        width:120px;
        border:1px solid #ff4c4c;
      ">Close</div>
    </div>
  `);

  renderProgressBreakdown(state, "progressBreakdown");
  renderStatsList(stats, "statsList");

  attachButtonClick(document.getElementById("closeStatsBtn"), closeModal);
}

function renderProgressBreakdown(state, elementId) {
  const progressEl = document.getElementById(elementId);
  if (!progressEl) return;

  progressEl.innerHTML = `
    <div style="
      margin-bottom:14px;
      padding:14px;
      border-radius:12px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
    ">
      <div style="
        text-align:center;
        color:#facc15;
        font-size:17px;
        font-weight:bold;
        margin-bottom:12px;
      ">
        Color Progress Breakdown
      </div>

      <div id="${elementId}Rows"></div>
    </div>
  `;

  const rows = document.getElementById(`${elementId}Rows`);
  rows.innerHTML = "";

  state.players.forEach(player => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:10px;
      border-radius:10px;
      background:#1e293b;
      border:1px solid rgba(255,255,255,0.8);
    `;

    const header = document.createElement("div");
    header.style = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:8px;
      color:#ffffff;
      font-weight:bold;
      font-size:14px;
      gap:10px;
    `;
    header.innerHTML = `
      <span>${player.name}</span>
      <span>${formatProgressStatus(player)}</span>
    `;

    row.appendChild(header);
    row.appendChild(getProgressCells(player, false, null));
    rows.appendChild(row);
  });
}

function renderStatsList(stats, elementId) {
  const list = document.getElementById(elementId);
  if (!list) return;

  const rankedStats = [...stats].sort((a, b) => {
    if (a.isWinner) return -1;
    if (b.isWinner) return 1;

    if ((b.progress || 0) !== (a.progress || 0)) {
      return (b.progress || 0) - (a.progress || 0);
    }

    return (a.originalIndex || 0) - (b.originalIndex || 0);
  });

  list.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      gap:10px;
    ">
      ${rankedStats.map(player => {
        const statsData = player.stats || {};
        const completedColors = statsData.completedColors || {};

        return `
          <div style="
            padding:14px;
            border-radius:10px;
            background:#1e293b;
            border:1px solid #ffffff;
            color:#ffffff;
          ">
            <div style="
              font-size:18px;
              font-weight:bold;
              color:#facc15;
              margin-bottom:8px;
            ">
              ${player.name}${player.isWinner ? " 🏆" : ""}
            </div>

            <div style="font-size:14px;line-height:1.65;">
              • Finish: ${player.status === "finished" ? "Finished" : formatProgressStatus(player)}<br>
              • Total Darts: ${statsData.dartsThrown || 0}<br>
              • Color Hits: ${statsData.colorHits || 0}<br>
              • Miss Boards: ${statsData.misses || 0}<br>
              • Parties: ${statsData.parties || 0}<br>
              • AC/DCs: ${statsData.acdcs || 0}<br>
              • Colors Completed:
                Black ${completedColors.Black || 0},
                White ${completedColors.White || 0},
                Green ${completedColors.Green || 0},
                Red ${completedColors.Red || 0}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/* -------------------------
   END SCREEN
--------------------------*/

function renderEnd(container, state) {
  const winCopy = getAgWinCopy(state.winner);
  const winner = state.winner;
  const rankedPlayers = getRankedPlayers(state);
  const stats = state.finalStats || getStats();

  container.innerHTML = `
    <style>
      @keyframes agGlow {
        0% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
        50% { box-shadow: 0 0 22px rgba(250,204,21,0.48), 0 0 38px rgba(34,197,94,0.22); }
        100% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
      }

      @keyframes moneyFloat {
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
        radial-gradient(circle at top, rgba(250,204,21,0.20), transparent 36%),
        linear-gradient(180deg, #12351d 0%, #0b0f17 100%);
      border:2px solid #facc15;
      animation:agGlow 2.8s infinite ease-in-out;
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
        <span style="animation:moneyFloat 2.2s infinite ease-in-out;">🖤</span>
        <span style="animation:moneyFloat 2.6s infinite ease-in-out;">⚪</span>
        <span style="animation:moneyFloat 2.1s infinite ease-in-out;">🟢</span>
        <span style="animation:moneyFloat 2.8s infinite ease-in-out;">🔴</span>
      </div>

      <div style="
        text-align:center;
        margin:0 auto 12px;
        max-width:360px;
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
        🏆🤑🏆
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
        color:#dbeafe;
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
                color:${index === 0 ? "#facc15" : "#ffffff"};
                flex-shrink:0;
              ">
                ${formatProgressStatus(player)}
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
          ${playAgainButtonStyle()}
          padding:14px;
          min-height:52px;
          font-size:18px;
        ">Play Again</div>

        <div id="statsBtn" style="
          ${leaderboardButtonStyle()}
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

  attachButtonClick(document.getElementById("playAgainBtn"), () => {
    const rotatedPlayers = getRotatedPlayersForReplay();
    store.players = [...rotatedPlayers];
    initGame(rotatedPlayers);
    renderUI(container);
  });

  attachButtonClick(document.getElementById("statsBtn"), () => {
    renderStatsModal(stats, state);
  });

  attachButtonClick(document.getElementById("mainMenuBtn"), () => {
    store.screen = "HOME";
    store.players = [];
    renderApp();
  });
}
