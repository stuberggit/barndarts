import {
  subscribe,
  getState,
  addDart,
  removeLastDart,
  clearTurnDarts,
  submitTurn,
  undoLastTurn,
  restartGame,
  rotatePlayersForNewGame,
  getConstants
} from "./logic.js";

const { DART_TYPES, MAX_DARTS_PER_TURN, STARTING_SCORE, RED_BULL_BONUS } = getConstants();

let rootEl = null;
let unsubscribe = null;
let rulesOpen = false;
let throwModalType = null;

export function renderUI(container) {
  rootEl = container;

  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  unsubscribe = subscribe(() => {
    draw();
  });

  draw();
}

function draw() {
  if (!rootEl) return;

  const state = getState();

  rootEl.innerHTML = `
    <div style="${styles.screen}">
      ${renderCurrentPlayer(state)}
      ${(state)}
      ${renderPlayers(state)}
      ${renderTurnSummary(state)}
      ${renderBottomActions(state)}
      ${renderWinner(state)}
      ${renderThrowModal(state)}
      ${renderRulesModal()}
    </div>
  `;

  bindEvents();
  syncOverlayVisibility();
}

function renderCurrentPlayer(state) {
  const player = state.currentPlayer;

  if (!player) {
    return `
      <div style="${styles.panel}">
        <div style="${styles.sectionTitleCenter}">☣️ Current Player ☣️</div>
        <div style="${styles.emptyText}">No active player.</div>
      </div>
    `;
  }

  const previewScore =
    state.turnDarts.length > 0
      ? state.turnDarts[state.turnDarts.length - 1].scoreAfter
      : player.score;

  return `
    <div style="${styles.currentPlayerPanel}">
      <div style="${styles.sectionTitleCenter}">☣️ Current Player ☣️</div>
      <div style="${styles.currentPlayerName}">${escapeHtml(player.name)}</div>

      <div style="${styles.currentMetaRow}">
        <div style="${styles.scoreBox}">
          <div style="${styles.scoreLabel}">Score</div>
          <div style="${styles.scoreValue}">${player.score}</div>
        </div>

        <div style="${styles.scoreBox}">
          <div style="${styles.scoreLabel}">Turn</div>
          <div style="${styles.turnValue}">${state.turnDarts.length} / ${MAX_DARTS_PER_TURN}</div>
        </div>

        <div style="${styles.scoreBox}">
          <div style="${styles.scoreLabel}">Preview</div>
          <div style="${styles.previewValue}">${previewScore}</div>
        </div>
      </div>
    </div>
  `;
}

function renderThrowArea(container, state) {
  const controls = document.getElementById("controls");
  if (!controls) return;

  controls.innerHTML = "";

  const canThrow =
    !state.gameOver &&
    state.gameStarted &&
    state.currentPlayer &&
    !state.currentPlayer.eliminated &&
    state.turnDarts.length < 3 &&
    !state.turnDarts.some(d => d.eliminated);

  const row = document.createElement("div");
  row.style = `
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
      ${!canThrow ? "opacity:0.45;" : ""}
    `;

    attachButtonClick(btn, () => {
      if (!canThrow) return;
      renderSurvivorNumberPicker(container, type.value);
    });

    row.appendChild(btn);
  });

  controls.appendChild(row);
}

function renderSurvivorNumberPicker(container, hitType) {
  const isTriple = hitType === "triple";

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
        padding:12px;
        min-height:52px;
        font-size:20px;
        ${isTriple ? "background:#555;color:#bbb;border:1px solid #999;cursor:not-allowed;" : ""}
      ">Bull</div>

      <div id="missBtn" style="
        ${buttonStyle()}
        padding:12px;
        min-height:52px;
        font-size:20px;
      ">Miss</div>
    </div>

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
      addDart(hitType, i);
      closeModal();
      renderUI(container);
    });

    grid.appendChild(btn);
  }

  const bullBtn = document.getElementById("bullBtn");
  const missBtn = document.getElementById("missBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  // Bull behavior (matches Killer logic style)
  if (!isTriple) {
    attachButtonClick(bullBtn, () => {
      if (hitType === "single") {
        addDart("greenBull");
      } else if (hitType === "double") {
        addDart("redBull");
      }
      closeModal();
      renderUI(container);
    });
  }

  attachButtonClick(missBtn, () => {
    addDart("miss");
    closeModal();
    renderUI(container);
  });

  attachButtonClick(closeBtn, closeModal);
}

function renderPlayers(state) {
  const players = state.players || [];

  return `
    <div style="${styles.panel}">
      <div style="${styles.sectionTitleCenter}">Players</div>

      <div style="${styles.playersList}">
        ${players
          .map((player) => {
            const isCurrent = state.currentPlayer?.id === player.id && !state.gameOver;
            const isOut = player.eliminated;

            return `
              <div style="${playerRowStyle(isCurrent, isOut)}">
                <div style="${styles.playerLeft}">
                  <div style="${styles.playerName}">${escapeHtml(player.name)}</div>
                  <div style="${styles.playerStatus}">
                    ${isOut ? "☠️ OUT" : isCurrent ? "ACTIVE" : "ALIVE"}
                  </div>
                </div>

                <div style="${playerScoreStyle(isOut)}">${player.score}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderTurnSummary(state) {
  const darts = state.turnDarts || [];
  const previewScore =
    darts.length > 0
      ? darts[darts.length - 1].scoreAfter
      : state.currentPlayer?.score ?? "";
  const eliminated = darts.some((dart) => dart.eliminated);

  return `
    <div style="${styles.panel}">
      <div style="${styles.sectionTitleCenter}">Turn</div>

      ${
        darts.length === 0
          ? `<div style="${styles.emptyText}">No darts entered.</div>`
          : `
            <div style="${styles.turnList}">
              ${darts
                .map(
                  (dart, index) => `
                    <div style="${styles.turnRow}">
                      <div style="${styles.turnLabel}">
                        Dart ${index + 1}: ${escapeHtml(shortDartLabel(dart))}
                      </div>
                      <div style="${styles.turnDelta}">
                        ${formatDelta(dart)}
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
      }

      <div style="${styles.previewRow}">
        <div style="${styles.previewText}">
          Preview: <strong>${previewScore}</strong>
          ${eliminated ? `<span style="${styles.outText}"> · ☠️ ELIMINATED</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderBottomActions(state) {
  const canSubmit = state.turnDarts.length > 0 && !state.gameOver;
  const canEditTurn = state.turnDarts.length > 0 && !state.gameOver;
  const canUndo = state.history.length > 0;

  return `
    <div style="${styles.bottomActions}">
      <button
        type="button"
        data-action="submit-turn"
        style="${buttonStyle(canSubmit, true)}"
        ${!canSubmit ? "disabled" : ""}
      >
        Submit Turn
      </button>

      <button
        type="button"
        data-action="undo"
        style="${buttonStyle(canUndo, false)}"
        ${!canUndo ? "disabled" : ""}
      >
        Undo
      </button>

      <button
        type="button"
        data-action="remove-last-dart"
        style="${buttonStyle(canEditTurn, false)}"
        ${!canEditTurn ? "disabled" : ""}
      >
        Remove Last
      </button>

      <button
        type="button"
        data-action="clear-turn"
        style="${buttonStyle(canEditTurn, false)}"
        ${!canEditTurn ? "disabled" : ""}
      >
        Clear
      </button>

      <button
        type="button"
        data-action="rules"
        style="${buttonStyle(true, false)}"
      >
        Rules
      </button>
    </div>
  `;
}

function renderWinner(state) {
  if (!state.gameOver) return "";

  if (!state.winner) {
    return `
      <div style="${styles.winnerPanel}">
        <div style="${styles.winnerTitle}">No Survivor</div>
        <div style="${styles.winnerCopy}">Everybody is out.</div>

        <div style="${styles.bottomActions}">
          <button type="button" data-action="new-game" style="${buttonStyle(true, true)}">
            New Game
          </button>
          <button type="button" data-action="rotate-game" style="${buttonStyle(true, false)}">
            Rotate Order
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div style="${styles.winnerPanel}">
      <div style="${styles.winnerTitle}">🏆 SURVIVOR</div>
      <div style="${styles.winnerName}">${escapeHtml(state.winner.name)} Wins!</div>
      <div style="${styles.winnerCopy}">Last player standing.</div>

      <div style="${styles.bottomActions}">
        <button type="button" data-action="new-game" style="${buttonStyle(true, true)}">
          New Game
        </button>
        <button type="button" data-action="rotate-game" style="${buttonStyle(true, false)}">
          Rotate Order
        </button>
      </div>
    </div>
  `;
}

function renderThrowModal(state) {
  const open = Boolean(throwModalType);
  const isTrip = throwModalType === DART_TYPES.TRIPLE;
  const label = throwModalLabel(throwModalType);

  return `
    <div id="survivor301-throw-overlay" style="${styles.modalOverlay}">
      <div style="${styles.modalContent}">
        <h2 style="${styles.modalTitle}">${label || "Throw"}</h2>

        <div style="${styles.modalBody}">
          <div style="${styles.modalNumberGrid}">
            ${Array.from({ length: 20 }, (_, i) => i + 1)
              .map(
                (n) => `
                  <button
                    type="button"
                    data-modal-number="${n}"
                    style="${styles.modalGameButton}"
                    ${!open ? "disabled" : ""}
                  >
                    ${n}
                  </button>
                `
              )
              .join("")}
          </div>

          <div style="${styles.modalSpecialRow}">
            <button
              type="button"
              data-modal-bull="green"
              style="${specialBullButtonStyle(!isTrip && open)}"
              ${!open || isTrip ? "disabled" : ""}
            >
              Green Bull
            </button>

            <button
              type="button"
              data-modal-bull="red"
              style="${specialBullButtonStyle(!isTrip && open)}"
              ${!open || isTrip ? "disabled" : ""}
            >
              Red Bull
            </button>

            <button
              type="button"
              data-modal-miss="true"
              style="${buttonStyle(open, false)}"
              ${!open ? "disabled" : ""}
            >
              Miss
            </button>
          </div>
        </div>

        <div style="${styles.modalActions}">
          <button type="button" data-action="close-throw-modal" style="${buttonStyle(true, true)}">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderRulesModal() {
  return `
    <div id="survivor301-rules-overlay" style="${styles.modalOverlay}">
      <div style="${styles.modalContent}">
        <h2 style="${styles.modalTitle}">Survivor 301 Rules</h2>

        <div style="${styles.modalBody}">
          <p style="${styles.ruleP}">Each player starts with <strong>${STARTING_SCORE}</strong>.</p>
          <p style="${styles.ruleP}">The goal is to stay above zero longer than everyone else.</p>
          <p style="${styles.ruleP}"><strong>Single / Dub / Trip</strong> subtract normal dart values.</p>
          <p style="${styles.ruleP}"><strong>Green Bull</strong> subtracts <strong>0</strong>.</p>
          <p style="${styles.ruleP}"><strong>Red Bull</strong> subtracts <strong>0</strong> and adds <strong>${RED_BULL_BONUS}</strong>.</p>
          <p style="${styles.ruleP}">If your score reaches <strong>0 or below</strong>, you are eliminated.</p>
          <p style="${styles.ruleP}">Last player standing wins.</p>
        </div>

        <div style="${styles.modalActions}">
          <button type="button" data-action="close-rules" style="${buttonStyle(true, true)}">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  rootEl.querySelectorAll("[data-action='submit-turn']").forEach((btn) => {
    btn.addEventListener("click", () => {
      submitTurn();
    });
  });

  rootEl.querySelectorAll("[data-action='undo']").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeThrowModal();
      undoLastTurn();
    });
  });

  rootEl.querySelectorAll("[data-action='remove-last-dart']").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeLastDart();
    });
  });

  rootEl.querySelectorAll("[data-action='clear-turn']").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeThrowModal();
      clearTurnDarts();
    });
  });

  rootEl.querySelectorAll("[data-action='rules']").forEach((btn) => {
    btn.addEventListener("click", () => {
      rulesOpen = true;
      syncOverlayVisibility();
    });
  });

  rootEl.querySelectorAll("[data-action='close-rules']").forEach((btn) => {
    btn.addEventListener("click", () => {
      rulesOpen = false;
      syncOverlayVisibility();
    });
  });

  rootEl.querySelectorAll("[data-action='new-game']").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeThrowModal();
      restartGame();
    });
  });

  rootEl.querySelectorAll("[data-action='rotate-game']").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeThrowModal();
      rotatePlayersForNewGame();
    });
  });

  rootEl.querySelectorAll("[data-open-throw-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      throwModalType = btn.getAttribute("data-open-throw-modal");
      syncOverlayVisibility();
    });
  });

  rootEl.querySelectorAll("[data-action='close-throw-modal']").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeThrowModal();
    });
  });

  rootEl.querySelectorAll("[data-modal-number]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = Number(btn.getAttribute("data-modal-number"));
      if (!throwModalType) return;
      addDart(throwModalType, number);
      closeThrowModal();
    });
  });

  rootEl.querySelectorAll("[data-modal-bull='green']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (throwModalType === DART_TYPES.TRIPLE) return;
      addDart(DART_TYPES.GREEN_BULL);
      closeThrowModal();
    });
  });

  rootEl.querySelectorAll("[data-modal-bull='red']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (throwModalType === DART_TYPES.TRIPLE) return;
      addDart(DART_TYPES.RED_BULL);
      closeThrowModal();
    });
  });

  rootEl.querySelectorAll("[data-modal-miss='true']").forEach((btn) => {
    btn.addEventListener("click", () => {
      addDart(DART_TYPES.MISS);
      closeThrowModal();
    });
  });

  const rulesOverlay = rootEl.querySelector("#survivor301-rules-overlay");
  if (rulesOverlay) {
    rulesOverlay.addEventListener("click", (event) => {
      if (event.target === rulesOverlay) {
        rulesOpen = false;
        syncOverlayVisibility();
      }
    });
  }

  const throwOverlay = rootEl.querySelector("#survivor301-throw-overlay");
  if (throwOverlay) {
    throwOverlay.addEventListener("click", (event) => {
      if (event.target === throwOverlay) {
        closeThrowModal();
      }
    });
  }
}

function closeThrowModal() {
  throwModalType = null;
  syncOverlayVisibility();
}

function syncOverlayVisibility() {
  const rulesOverlay = rootEl.querySelector("#survivor301-rules-overlay");
  if (rulesOverlay) {
    rulesOverlay.style.display = rulesOpen ? "flex" : "none";
  }

  const throwOverlay = rootEl.querySelector("#survivor301-throw-overlay");
  if (throwOverlay) {
    throwOverlay.style.display = throwModalType ? "flex" : "none";
  }
}

function throwModalLabel(type) {
  if (type === DART_TYPES.SINGLE) return "Single";
  if (type === DART_TYPES.DOUBLE) return "Dub";
  if (type === DART_TYPES.TRIPLE) return "Trip";
  return "";
}

function shortDartLabel(dart) {
  if (dart.type === DART_TYPES.MISS) return "Miss";
  if (dart.type === DART_TYPES.GREEN_BULL) return "Green Bull";
  if (dart.type === DART_TYPES.RED_BULL) return "Red Bull";
  if (dart.type === DART_TYPES.SINGLE) return `Single ${dart.number}`;
  if (dart.type === DART_TYPES.DOUBLE) return `Dub ${dart.number}`;
  if (dart.type === DART_TYPES.TRIPLE) return `Trip ${dart.number}`;
  return dart.label || "";
}

function formatDelta(dart) {
  if (dart.type === DART_TYPES.RED_BULL) return "+10";
  if (dart.type === DART_TYPES.GREEN_BULL) return "0";
  if (dart.type === DART_TYPES.MISS) return "0";
  return `-${dart.amount}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buttonStyle(enabled, primary = false) {
  const base = primary ? styles.primaryButton : styles.secondaryButton;
  return `${base}${enabled ? "" : "opacity:0.45;cursor:not-allowed;"}`;
}

function gameButtonStyle(enabled) {
  return `${styles.gameButton}${enabled ? "" : "opacity:0.45;cursor:not-allowed;"}`;
}

function specialBullButtonStyle(enabled) {
  return `${styles.secondaryButton}${enabled ? "" : "opacity:0.45;cursor:not-allowed;background:#666666;color:#dddddd;"}`;
}

function playerRowStyle(isCurrent, isOut) {
  return `
    ${styles.playerRow}
    ${isCurrent ? styles.playerRowCurrent : ""}
    ${isOut ? styles.playerRowOut : ""}
  `;
}

function playerScoreStyle(isOut) {
  return `
    ${styles.playerScore}
    ${isOut ? "opacity:0.6;" : ""}
  `;
}

const styles = {
  screen: `
    width:100%;
    max-width:760px;
    margin:0 auto;
    padding:16px 12px 28px;
    box-sizing:border-box;
    color:#ffffff;
    font-family:Arial, Helvetica, sans-serif;
  `,
  panel: `
    background:#0b4f12;
    border:2px solid #ffffff22;
    border-radius:14px;
    padding:14px;
    margin-bottom:14px;
    box-sizing:border-box;
  `,
  currentPlayerPanel: `
    background:#0b4f12;
    border:3px solid #f2dc5d;
    border-radius:14px;
    padding:16px;
    margin-bottom:14px;
    box-sizing:border-box;
    text-align:center;
  `,
  sectionTitleCenter: `
    text-align:center;
    font-size:18px;
    font-weight:800;
    margin-bottom:10px;
    color:#ffffff;
  `,
  currentPlayerName: `
    font-size:30px;
    font-weight:900;
    margin-bottom:12px;
    color:#ffffff;
  `,
  currentMetaRow: `
    display:grid;
    grid-template-columns:repeat(3, minmax(0, 1fr));
    gap:10px;
  `,
  scoreBox: `
    background:#ffffff12;
    border-radius:10px;
    padding:10px 8px;
  `,
  scoreLabel: `
    font-size:12px;
    font-weight:700;
    opacity:0.9;
    margin-bottom:4px;
  `,
  scoreValue: `
    font-size:28px;
    font-weight:900;
    line-height:1;
  `,
  turnValue: `
    font-size:24px;
    font-weight:900;
    line-height:1;
  `,
  previewValue: `
    font-size:24px;
    font-weight:900;
    line-height:1;
  `,
  playersList: `
    display:flex;
    flex-direction:column;
    gap:10px;
  `,
  playerRow: `
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    background:#ffffff10;
    border:2px solid transparent;
    border-radius:12px;
    padding:12px;
  `,
  playerRowCurrent: `
    border-color:#f2dc5d;
  `,
  playerRowOut: `
    background:#77777733;
    border-color:#99999966;
  `,
  playerLeft: `
    display:flex;
    flex-direction:column;
    gap:4px;
  `,
  playerName: `
    font-size:18px;
    font-weight:800;
    color:#ffffff;
  `,
  playerStatus: `
    font-size:12px;
    font-weight:700;
    opacity:0.9;
  `,
  playerScore: `
    font-size:30px;
    font-weight:900;
    line-height:1;
    min-width:64px;
    text-align:right;
  `,
  buttonRow: `
    display:flex;
    flex-wrap:wrap;
    gap:10px;
    justify-content:center;
  `,
  gameButton: `
    border:none;
    border-radius:10px;
    padding:10px 16px;
    background:#1f8f3a;
    color:#ffffff;
    font-size:15px;
    font-weight:800;
    cursor:pointer;
  `,
  turnList: `
    display:flex;
    flex-direction:column;
    gap:8px;
  `,
  turnRow: `
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
    background:#ffffff10;
    border-radius:10px;
    padding:10px 12px;
  `,
  turnLabel: `
    font-size:15px;
    font-weight:700;
  `,
  turnDelta: `
    font-size:17px;
    font-weight:900;
  `,
  previewRow: `
    margin-top:10px;
    text-align:center;
  `,
  previewText: `
    font-size:15px;
    font-weight:700;
  `,
  outText: `
    color:#ffb3b3;
    font-weight:900;
  `,
  bottomActions: `
    display:flex;
    flex-wrap:wrap;
    gap:10px;
    justify-content:center;
    margin-bottom:14px;
  `,
  primaryButton: `
    border:none;
    border-radius:10px;
    padding:10px 16px;
    background:#1f8f3a;
    color:#ffffff;
    font-size:15px;
    font-weight:800;
    cursor:pointer;
  `,
  secondaryButton: `
    border:none;
    border-radius:10px;
    padding:10px 16px;
    background:#2d6a31;
    color:#ffffff;
    font-size:15px;
    font-weight:800;
    cursor:pointer;
  `,
  winnerPanel: `
    background:#0b4f12;
    border:3px solid #f2dc5d;
    border-radius:14px;
    padding:18px 14px;
    text-align:center;
    margin-top:4px;
  `,
  winnerTitle: `
    font-size:28px;
    font-weight:900;
    margin-bottom:8px;
  `,
  winnerName: `
    font-size:30px;
    font-weight:900;
    margin-bottom:6px;
  `,
  winnerCopy: `
    font-size:16px;
    font-weight:700;
    margin-bottom:14px;
  `,
  emptyText: `
    text-align:center;
    font-size:14px;
    opacity:0.9;
  `,
  modalOverlay: `
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.6);
    align-items:center;
    justify-content:center;
    padding:20px;
    box-sizing:border-box;
    z-index:9999;
  `,
  modalContent: `
    width:min(600px, 100%);
    background:#0b4f12;
    border:2px solid #ffffff22;
    border-radius:16px;
    padding:20px;
    box-sizing:border-box;
    color:#ffffff;
  `,
  modalTitle: `
    margin:0 0 12px 0;
    font-size:26px;
    font-weight:900;
    text-align:center;
  `,
  modalBody: `
    font-size:15px;
    line-height:1.5;
  `,
  modalNumberGrid: `
    display:grid;
    grid-template-columns:repeat(5, minmax(0, 1fr));
    gap:8px;
    margin-bottom:14px;
  `,
  modalGameButton: `
    border:none;
    border-radius:10px;
    padding:12px 0;
    background:#1f8f3a;
    color:#ffffff;
    font-size:16px;
    font-weight:800;
    cursor:pointer;
  `,
  modalSpecialRow: `
    display:flex;
    flex-wrap:wrap;
    gap:10px;
    justify-content:center;
  `,
  ruleP: `
    margin:0 0 10px 0;
  `,
  modalActions: `
    display:flex;
    justify-content:center;
    margin-top:14px;
  `
};
