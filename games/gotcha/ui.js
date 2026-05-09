import {
  getState,
  submitThrow,
  nextPlayer,
  undo,
  isGameOver,
  initGame,
  endGameEarly,
  getWinningScore,
  getTargetHints,
  confirmShanghaiWinner,
  cancelPendingShanghai,
  getThrowLog
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

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
}

function pickRandomCopy(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function formatThrowLabel(throwRecord) {
  if (!throwRecord) return "";

  if (throwRecord.label) return throwRecord.label;
  if (throwRecord.hitType === "miss") return "Miss";
  if (throwRecord.hitType === "greenBull") return "Sing Bull";
  if (throwRecord.hitType === "redBull") return "Dub Bull";

  const labels = {
    single: "Single",
    double: "Dub",
    triple: "Trip"
  };

  return `${labels[throwRecord.hitType] || "Hit"} ${throwRecord.target}`;
}

function getThrowValue(throwRecord) {
  if (!throwRecord) return 0;
  if (typeof throwRecord.value === "number") return throwRecord.value;
  return 0;
}

function getTurnTotal(throws = []) {
  return throws.reduce((sum, throwRecord) => sum + getThrowValue(throwRecord), 0);
}

function getPpd(player) {
  const darts = player.stats?.dartsThrown || 0;
  const points = player.stats?.totalPoints || 0;
  if (!darts) return "0.00";
  return (points / darts).toFixed(2);
}

function buildTargetHintsHtml() {
  const hints = getTargetHints();
  const hasWinHint = typeof hints.winNeeded === "number";
  const hasResetHints = Array.isArray(hints.resetTargets) && hints.resetTargets.length > 0;

  if (!hasWinHint && !hasResetHints) {
    return "";
  }

  return `
    <div style="
      margin:0 0 10px;
      padding:10px;
      border-radius:12px;
      background:#111111;
      border:1px solid rgba(250,204,21,0.8);
      color:#ffffff;
      font-weight:bold;
    ">
      <div style="
        text-align:center;
        color:#facc15;
        font-size:15px;
        margin-bottom:8px;
      ">
        🎯 Targets in Range
      </div>

      ${
        hasWinHint
          ? `
            <div style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              padding:7px 8px;
              border-radius:9px;
              background:rgba(34,197,94,0.12);
              border:1px solid rgba(34,197,94,0.5);
              margin-bottom:${hasResetHints ? "8px" : "0"};
            ">
              <span>Win</span>
              <span style="color:#22c55e;">Need ${hints.winNeeded}</span>
            </div>
          `
          : ""
      }

      ${
        hasResetHints
          ? hints.resetTargets.map(target => `
            <div style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              padding:7px 8px;
              border-radius:9px;
              background:rgba(250,204,21,0.10);
              border:1px solid rgba(250,204,21,0.35);
              margin-top:6px;
            ">
              <span>Reset ${target.playerName}</span>
              <span style="color:#facc15;">Need ${target.needed}</span>
            </div>
          `).join("")
          : ""
      }
    </div>
  `;
}

function getFinalOrder(state) {
  const winnerName = state.winner;

  return [...(state.players || [])].sort((a, b) => {
    if (a.name === winnerName) return -1;
    if (b.name === winnerName) return 1;
    return b.score - a.score;
  });
}

function getVictoryCopy(state, winner) {
  const isShanghai = !!state.shanghaiWinner;
  const checkout = winner?.stats?.checkout || 0;
  const ungentlemanlyWins = winner?.stats?.ungentlemanlyWins || 0;

  const banners = isShanghai
    ? [
        "🔥 SHANGHAI STING OPERATION 🔥",
        "🚨 CAUGHT IN THREE DARTS 🚨",
        "🎯 GOTCHA TASK FORCE RAID 🎯",
        "🕵️ CASE CLOSED: SHANGHAI 🕵️",
        "⚠️ FULL-BLOWN GOTCHA EMERGENCY ⚠️",
        "🏴‍☠️ THREE-DART HEIST COMPLETE 🏴‍☠️",
        "🚔 NOBODY ESCAPES SHANGHAI 🚔",
        "💰 CLEAN GETAWAY, DIRTY LOOKS 💰",
        "🔥 SINGLE. DUB. TRIP. DONE. 🔥",
        "🕵️ THE PERFECT CRIME SCENE 🕵️"
      ]
    : [
        "🚨 GOTCHA! 🚨",
        "🕵️ CASE CLOSED 🕵️",
        "🏴‍☠️ SCOREBOARD HEIST COMPLETE 🏴‍☠️",
        "⚠️ SOMEBODY GOT CAUGHT ⚠️",
        "💰 THE POINT BANDIT STRIKES 💰",
        "🚔 GOTCHA POLICE REPORT FILED 🚔",
        "🎯 CAUGHT RED-HANDED 🎯",
        "🕵️ NO ALIBI. NO MERCY. 🕵️",
        "🔥 THE TRAP WAS SET 🔥",
        "🏆 GENTLEMAN OR MENACE? YES. 🏆"
      ];

  const announcements = [
    `${state.winner} wins Gotcha 301!`,
    `${state.winner} got away clean!`,
    `${state.winner} caught the room sleeping!`,
    `${state.winner} closed the case!`,
    `${state.winner} pulled off the dartboard robbery!`,
    `${state.winner} made the final arrest!`,
    `${state.winner} walked everyone into the trap!`,
    `${state.winner} hit 301 and vanished into the night!`,
    `${state.winner} gotcha'd the whole damn bar!`,
    `${state.winner} is officially wanted for scoreboard crimes!`
  ];

  const subheads = isShanghai
    ? [
        "Single, Dub, Trip — that is not a turn, that is evidence.",
        "The old Shanghai warrant has been served.",
        "Three darts. One target. Zero survivors.",
        "That was less of a win and more of a public mugging.",
        "The gentlemanly committee has requested a full investigation.",
        "The board saw it coming. Nobody else did.",
        "That was a clean sweep with filthy intentions.",
        "A three-dart confession, signed and witnessed.",
        "Somebody call security. The scoreboard was robbed.",
        "A perfect little dart crime scene."
      ]
    : ungentlemanlyWins > 0
      ? [
          "The win counts. The manners committee is disgusted.",
          "That checkout was legal, but emotionally questionable.",
          "A gentleman would have considered the room. This was not that.",
          "A single to win? Bold. Dirty. Effective.",
          "Not illegal. Not polite. Very Gotcha.",
          "The scoreboard says winner. The streets say menace.",
          "The victory is official. The etiquette is missing.",
          "Somebody won. Somebody also owes the room an apology.",
          "A filthy finish, but the trophy does not care.",
          "The gentleman’s rulebook has been set on fire."
        ]
      : [
          "A gentlemanly finish with just enough villain energy.",
          "Clean checkout. Dirty consequences.",
          "The trap closed and the scoreboard squealed.",
          "That was a proper Gotcha finish.",
          "No fingerprints. Just points.",
          "Calm, classy, and slightly criminal.",
          "That is how you catch a crowd leaning.",
          "The darts were polite. The result was rude.",
          "A tidy little robbery at the finish line.",
          "The room got caught. The winner got paid."
        ];

  const bodies = isShanghai
    ? [
        `${state.winner} did not just win — they assembled the whole Single-Dub-Trip evidence board and slapped it on the table.`,
        `Nobody likes getting caught by Shanghai, mostly because there is no graceful way to pretend you saw it coming.`,
        `That was a three-dart heist. Quick entry, clean exit, and a whole room full of witnesses.`,
        `${state.winner} turned the target into a crime scene and left everyone else holding chalk outlines.`,
        `The scoreboard barely had time to blink before ${state.winner} kicked the door in and yelled Gotcha.`,
        `Some wins are earned slowly. This one was delivered with sirens, paperwork, and a suspicious lack of remorse.`,
        `Single. Dub. Trip. The kind of sequence that makes friends question why they invited you.`,
        `${state.winner} caught everyone slipping and converted the moment into a full-blown dartboard felony.`,
        `This was not catching up. This was catching bodies, mathematically speaking.`,
        `A gentleman may shake hands after this. An ungentleman may ask for the security footage.`
      ]
    : ungentlemanlyWins > 0
      ? [
          `${state.winner} reached 301 and immediately triggered a small ethics investigation near the dartboard.`,
          `The win is real. The finish was a little greasy. Somewhere, a gentleman just spit out his beer.`,
          `A single-checkout finish is like stealing candy from a baby, except the baby had darts and still lost.`,
          `${state.winner} got caught being effective, which is the most annoying kind of guilty.`,
          `The scoreboard does not care about manners, and apparently neither does ${state.winner}.`,
          `Was it legal? Yes. Was it gentlemanly? Absolutely the hell not.`,
          `${state.winner} walked out with the win and left the etiquette manual face-down in the parking lot.`,
          `This was not a clean getaway. This was a getaway with fingerprints, witnesses, and applause anyway.`,
          `Everyone saw the single. Everyone judged it. Nobody can take the win away.`,
          `${state.winner} played the villain, cashed the ticket, and made the room live with it.`
        ]
      : [
          `${state.winner} finished the job, caught the room slipping, and kept it just gentlemanly enough for the record books.`,
          `That was a clean Gotcha finish — enough class to shake hands, enough bite to ruin someone’s night.`,
          `${state.winner} did the dartboard equivalent of a smooth getaway in a suspiciously clean getaway car.`,
          `Nobody got robbed under 150, nobody needed a lawyer, and the winner still left with everything.`,
          `A proper finish: composed, calculated, and only slightly criminal.`,
          `${state.winner} worked the room, closed the gap, and delivered the final catch without making it weird.`,
          `The trap was patient. The finish was clean. The rest of the room was late to the investigation.`,
          `That was a gentleman’s Gotcha: sharp suit, dirty fingerprints, trophy in hand.`,
          `${state.winner} caught up, cashed out, and left the scoreboard wondering what happened.`,
          `No sirens needed. Just a quiet little scoreboard robbery with excellent manners.`
        ];

  return {
    banner: pickRandomCopy(banners),
    icon: "🏆🕵️🏆",
    announcement: pickRandomCopy(announcements),
    subhead: pickRandomCopy(subheads),
    body: pickRandomCopy(bodies),
    checkout
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

  renderGame(container, state);
}

/* -------------------------
   GAME SCREEN
--------------------------*/

function renderGame(container, state) {
  const currentPlayer = state.players[state.currentPlayer];
  const dartDisplay = state.turnReadyForNext
    ? state.pendingWinner
      ? "Winning dart hit — tap Next Player"
      : "Turn complete — tap Next Player"
    : `Dart ${state.dartsThrown + 1}/3`;

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
      margin-bottom:12px;
      font-size:24px;
      font-weight:bold;
      color:#facc15;
    ">
      🎯 Current Player 🎯
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
      <div style="font-size:26px;margin-bottom:6px;">
        ${currentPlayer ? currentPlayer.name : "—"}
      </div>
      <div style="font-size:34px;line-height:1;margin-bottom:6px;">
        ${currentPlayer ? currentPlayer.score : "—"} / ${getWinningScore()}
      </div>
      <div style="font-size:16px;color:#facc15;">
        ${dartDisplay}
      </div>
    </div>

    ${buildTargetHintsHtml()}

    <div style="
      min-height:42px;
      margin:8px 0 10px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${messageHtml}
      </div>
    </div>

    <div id="throwControls"></div>
    <div id="playerBoard"></div>
    <div id="turnSummary"></div>
    <div id="utilityControls"></div>
    <div id="modal"></div>
  `;

  renderThrowControls(container, state);
  renderPlayerBoard(state);
  renderTurnSummary(state);
  renderUtilityControls(container);

  if (state.pendingShanghai) {
    renderShanghaiConfirm(container, state.pendingShanghai);
  }
}

/* -------------------------
   THROW CONTROLS
--------------------------*/

function renderThrowControls(container, state) {
  const controls = document.getElementById("throwControls");
  controls.innerHTML = "";

  const canThrow =
    !state.winner &&
    !state.pendingWinner &&
    !state.pendingShanghai &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

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
  missBtn.innerText = "Miss";
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
  nextBtn.innerText = "Next Player";
  nextBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
    ${state.pendingWinner ? "border:2px solid #facc15;box-shadow:0 0 12px rgba(250,204,21,0.45);" : ""}
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

/* -------------------------
   PLAYER BOARD / TURN SUMMARY
--------------------------*/

function renderPlayerBoard(state) {
  const board = document.getElementById("playerBoard");
  board.style = "margin-top:18px;";
  board.innerHTML = "";

  state.players.forEach((player, index) => {
    const isHighlighted = index === state.currentPlayer;

    const row = document.createElement("div");
    row.style = `
      margin-bottom:10px;
      padding:12px 14px;
      border-radius:12px;
      background:${isHighlighted ? "#11361a" : "#111111"};
      border:${isHighlighted ? "3px solid #facc15" : "1px solid #ffffff"};
      display:flex;
      justify-content:space-between;
      align-items:center;
      color:#ffffff;
      font-weight:bold;
      font-size:16px;
      gap:12px;
    `;

    row.innerHTML = `
      <div style="font-size:18px;line-height:1.2;word-break:break-word;">
        ${player.name}
        ${isHighlighted ? `<span style="font-size:15px;margin-left:8px;color:#facc15;">ACTIVE</span>` : ""}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:26px;line-height:1.2;">${player.score}</div>
        <div style="font-size:12px;opacity:0.8;">PPD ${getPpd(player)}</div>
      </div>
    `;

    board.appendChild(row);
  });
}

function renderTurnSummary(state) {
  const summary = document.getElementById("turnSummary");
  const throws = state.currentTurnThrows || [];
  const turnTotal = getTurnTotal(throws);

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
              <div style="color:#22c55e;">+${getThrowValue(throwRecord)}</div>
            </div>
          `).join("")
      }

      ${
        throws.length > 0
          ? `
            <div style="
              margin-top:10px;
              padding-top:10px;
              border-top:1px solid rgba(255,255,255,0.25);
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              font-weight:bold;
            ">
              <div>Round Total</div>
              <div style="color:#facc15;">+${turnTotal}</div>
            </div>
          `
          : ""
      }

      ${
        state.pendingWinner
          ? `
            <div style="
              margin-top:8px;
              text-align:center;
              color:#22c55e;
              font-weight:bold;
              font-size:13px;
            ">
              Checkout hit. Tap Next Player to go to the winner screen.
            </div>
          `
          : ""
      }
    </div>
  `;
}

/* -------------------------
   UTILITY CONTROLS
--------------------------*/

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
   NUMBER PICKER
--------------------------*/

function renderNumberPicker(container, hitType) {
  const state = getState();
  const isTriple = hitType === "triple";
  const canThrow =
    !state.winner &&
    !state.pendingWinner &&
    !state.pendingShanghai &&
    !state.turnReadyForNext &&
    state.dartsThrown < 3;

  function getHitCountFor(target) {
    return (state.currentTurnThrows || []).filter(throwRecord => {
      return throwRecord.hitType === hitType && throwRecord.target === target;
    }).length;
  }

  const bullHitType =
    hitType === "single" ? "greenBull" :
    hitType === "double" ? "redBull" :
    null;

  const bullHitCount = bullHitType
    ? (state.currentTurnThrows || []).filter(throwRecord => throwRecord.hitType === bullHitType).length
    : 0;

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">
      ${hitType === "single" ? "Single" : hitType === "double" ? "Dub" : "Trip"}
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
  `);

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

    attachButtonClick(btn, () => {
      const freshState = getState();

      if (
        freshState.winner ||
        freshState.pendingWinner ||
        freshState.pendingShanghai ||
        freshState.turnReadyForNext ||
        freshState.dartsThrown >= 3
      ) return;

      submitThrow(hitType, i);

      const updatedState = getState();

      renderUI(container);

      if (
        !updatedState.winner &&
        !updatedState.pendingWinner &&
        !updatedState.pendingShanghai &&
        !updatedState.turnReadyForNext &&
        updatedState.dartsThrown < 3
      ) {
        renderNumberPicker(container, hitType);
      }
    });

    grid.appendChild(btn);
  }

  const bullBtn = document.getElementById("bullBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (!isTriple && canThrow) {
    attachButtonClick(bullBtn, () => {
      const freshState = getState();

      if (
        freshState.winner ||
        freshState.pendingWinner ||
        freshState.pendingShanghai ||
        freshState.turnReadyForNext ||
        freshState.dartsThrown >= 3
      ) return;

      submitThrow(hitType === "single" ? "greenBull" : "redBull");

      const updatedState = getState();

      renderUI(container);

      if (
        !updatedState.winner &&
        !updatedState.pendingWinner &&
        !updatedState.pendingShanghai &&
        !updatedState.turnReadyForNext &&
        updatedState.dartsThrown < 3
      ) {
        renderNumberPicker(container, hitType);
      }
    });
  }

  attachButtonClick(closeBtn, closeModal);
}

/* -------------------------
   MODALS
--------------------------*/

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

function renderShanghaiConfirm(container, pendingShanghai) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;color:#facc15;">🔥 SHANGHAI? 🔥</h2>
    <div style="text-align:center;margin-bottom:14px;line-height:1.45;">
      ${pendingShanghai.playerName} hit Single + Dub + Trip on ${pendingShanghai.target}.<br>
      Confirm Shanghai and end the game?
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
        border:1px solid #facc15;
      ">Confirm</div>
    </div>
  `);

  attachButtonClick(document.getElementById("cancelShanghaiBtn"), () => {
    cancelPendingShanghai();
    closeModal();
    renderUI(container);
  });

  attachButtonClick(document.getElementById("confirmShanghaiBtn"), () => {
    confirmShanghaiWinner();
    closeModal();
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

  attachButtonClick(document.getElementById("cancelEndBtn"), closeModal);

  attachButtonClick(document.getElementById("confirmEndBtn"), () => {
    closeModal();
    endGameEarly();
    renderUI(container);
  });
}

/* -------------------------
   END
--------------------------*/

function renderFinalOrder(state) {
  const finalOrder = getFinalOrder(state);

  return `
    <div style="
      margin-top:14px;
      padding:12px;
      border-radius:14px;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.14);
      color:#ffffff;
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

      <div style="display:flex;flex-direction:column;gap:8px;">
        ${finalOrder.map((player, index) => `
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            padding:9px 10px;
            border-radius:10px;
            background:${player.name === state.winner ? "rgba(250,204,21,0.16)" : "rgba(255,255,255,0.06)"};
            border:${player.name === state.winner ? "1px solid rgba(250,204,21,0.65)" : "1px solid rgba(255,255,255,0.10)"};
            font-weight:bold;
          ">
            <span>${index + 1}. ${player.name}</span>
            <span style="color:${player.name === state.winner ? "#facc15" : "#dbeafe"};">
              ${player.score}
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderEnd(container, state) {
  const winner = state.players.find(player => player.name === state.winner) || null;
  const copy = getVictoryCopy(state, winner);

  container.innerHTML = `
    <style>
      @keyframes gotchaGlow {
        0% { box-shadow:0 0 0 rgba(250,204,21,0), 0 0 0 rgba(59,130,246,0); }
        50% { box-shadow:0 0 22px rgba(250,204,21,0.42), 0 0 38px rgba(59,130,246,0.22); }
        100% { box-shadow:0 0 0 rgba(250,204,21,0), 0 0 0 rgba(59,130,246,0); }
      }

      @keyframes gotchaFloat {
        0% { transform:translateY(0px) rotate(0deg); }
        50% { transform:translateY(-5px) rotate(2deg); }
        100% { transform:translateY(0px) rotate(0deg); }
      }

      @keyframes gotchaBannerFlash {
        0% { opacity:0.88; }
        50% { opacity:1; }
        100% { opacity:0.88; }
      }

      @keyframes gotchaPulse {
        0% { transform:scale(1); }
        50% { transform:scale(1.08); }
        100% { transform:scale(1); }
      }
    </style>

    <div style="
      position:relative;
      overflow:hidden;
      border-radius:18px;
      padding:18px 16px 20px;
      background:
        radial-gradient(circle at top, rgba(250,204,21,0.18), transparent 34%),
        linear-gradient(180deg, #10213f 0%, #070b12 100%);
      border:2px solid #facc15;
      animation:gotchaGlow 2.8s infinite ease-in-out;
    ">
      
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
        animation:gotchaBannerFlash 1.5s infinite ease-in-out;
      ">
        ${copy.banner}
      </div>

      <div style="
        text-align:center;
        font-size:54px;
        line-height:1;
        margin-bottom:8px;
        animation:gotchaPulse 1.7s infinite ease-in-out;
      ">
        ${copy.icon}
      </div>

      <h2 style="
        text-align:center;
        margin:0 0 6px;
        font-size:28px;
        color:#ffffff;
      ">
        ${copy.announcement}
      </h2>

      <div style="
        text-align:center;
        font-size:18px;
        color:#facc15;
        font-weight:bold;
        margin-bottom:10px;
      ">
        ${copy.subhead}
      </div>

      <div style="
        text-align:center;
        font-size:15px;
        color:#dbeafe;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        padding:12px;
        margin-bottom:12px;
        line-height:1.45;
      ">
        ${copy.body}
      </div>

      <div style="
        margin:12px 0;
        padding:14px;
        border-radius:14px;
        background:rgba(17,54,26,0.85);
        border:1px solid rgba(250,204,21,0.75);
        color:#ffffff;
        text-align:center;
        font-weight:bold;
      ">
        <div style="font-size:16px;color:#facc15;margin-bottom:6px;">Final Score</div>
        <div style="font-size:30px;">${winner ? winner.score : getWinningScore()} / ${getWinningScore()}</div>
        <div style="font-size:14px;margin-top:6px;opacity:0.9;">
          PPD ${winner ? getPpd(winner) : "0.00"}
          ${copy.checkout ? ` • Checkout ${copy.checkout}` : ""}
        </div>
      </div>

      ${renderFinalOrder(state)}

      <div style="
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
        margin-top:14px;
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
