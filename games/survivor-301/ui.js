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
let selectedType = null;
let rulesOpen = false;

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
      <div style="${styles.titleWrap}">
        <h1 style="${styles.title}">☣️ Survivor 301 ☣️</h1>
      </div>

      ${renderCurrentPlayer(state)}
      ${renderPlayers(state)}
      ${renderThrowArea(state)}
      ${renderTurnSummary(state)}
      ${renderBottomActions(state)}
      ${renderWinner(state)}
      ${renderRulesModal()}
    </div>
  `;

  bindEvents();
  syncRulesVisibility();
}

function renderCurrentPlayer(state) {
  const player = state.currentPlayer;

  if (!player) {
    return `
      <div style="${styles.panel}">
        <div style="${styles.sectionTitle}">Current Player</div>
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
      <div style="${styles.sectionTitleCenter}">Current Player</div>
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
                    ${
                      isOut
                        ? "☠️ OUT"
                        : isCurrent
                        ? "ACTIVE"
                        : "ALIVE"
                    }
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

function renderThrowArea(state) {
  const canThrow =
    !state.gameOver &&
    state.gameStarted &&
    state.currentPlayer &&
    !state.currentPlayer.eliminated &&
    state.turnDarts.length < MAX_DARTS_PER_TURN &&
    !state.turnDarts.some((dart) => dart.eliminated);

  return `
    <div style="${styles.panel}">
      <div style="${styles.sectionTitleCenter}">Throw</div>

      <div style="${styles.buttonRow}">
        <button
          type="button"
          data-throw-type="${DART_TYPES.MISS}"
          style="${throwButtonStyle(canThrow, false)}"
          ${!canThrow ? "disabled" : ""}
        >
          Miss
        </button>

        <button
          type="button"
          data-select-type="${DART_TYPES.SINGLE}"
          style="${throwButtonStyle(canThrow, selectedType === DART_TYPES.SINGLE)}"
          ${!canThrow ? "disabled" : ""}
        >
          Single
        </button>

        <button
          type="button"
          data-select-type="${DART_TYPES.DOUBLE}"
          style="${throwButtonStyle(canThrow, selectedType === DART_TYPES.DOUBLE)}"
          ${!canThrow ? "disabled" : ""}
        >
          Dub
        </button>

        <button
          type="button"
          data-select-type="${DART_TYPES.TRIPLE}"
          style="${throwButtonStyle(canThrow, selectedType === DART_TYPES.TRIPLE)}"
          ${!canThrow ? "disabled" : ""}
        >
          Trip
        </button>
      </div>

      <div style="${styles.buttonRow}">
        <button
          type="button"
          data-throw-type="${DART_TYPES.GREEN_BULL}"
          style="${throwButtonStyle(canThrow, false)}"
          ${!canThrow ? "disabled" : ""}
        >
          Green Bull
        </button>

        <button
          type="button"
          data-throw-type="${DART_TYPES.RED_BULL}"
          style="${throwButtonStyle(canThrow, false)}"
          ${!canThrow ? "disabled" : ""}
        >
          Red Bull
        </button>
      </div>

      ${
        selectedType && isNumberType(selectedType) && canThrow
          ? `
            <div style="${styles.numberWrap}">
              <div style="${styles.numberPrompt}">
                ${labelForType(selectedType)}
              </div>

              <div style="${styles.numberGrid}">
                ${Array.from({ length: 20 }, (_, i) => i + 1)
                  .map(
                    (n) => `
                      <button
                        type="button"
                        data-throw-number="${n}"
                        style="${styles.numberButton}"
                      >
                        ${n}
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
          : ""
      }
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
      selectedType = null;
      submitTurn();
    });
  });

  rootEl.querySelectorAll("[data-action='undo']").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedType = null;
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
      selectedType = null;
      clearTurnDarts();
    });
  });

  rootEl.querySelectorAll("[data-action='rules']").forEach((btn) => {
    btn.addEventListener("click", () => {
      rulesOpen = true;
      syncRulesVisibility();
    });
  });

  rootEl.querySelectorAll("[data-action='close-rules']").forEach((btn) => {
    btn.addEventListener("click", () => {
      rulesOpen = false;
      syncRulesVisibility();
    });
  });

  rootEl.querySelectorAll("[data-action='new-game']").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedType = null;
      restartGame();
    });
  });

  rootEl.querySelectorAll("[data-action='rotate-game']").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedType = null;
      rotatePlayersForNewGame();
    });
  });

  rootEl.querySelectorAll("[data-throw-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-throw-type");
      selectedType = null;
      addDart(type);
    });
  });

  rootEl.querySelectorAll("[data-select-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedType = btn.getAttribute("data-select-type");
      draw();
    });
  });

  rootEl.querySelectorAll("[data-throw-number]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = Number(btn.getAttribute("data-throw-number"));
      if (!selectedType) return;
      addDart(selectedType, number);
      selectedType = null;
      draw();
    });
  });

  const overlay = rootEl.querySelector("#survivor301-rules-overlay");
  if (overlay) {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        rulesOpen = false;
        syncRulesVisibility();
      }
    });
  }
}

function syncRulesVisibility() {
  const overlay = rootEl.querySelector("#survivor301-rules-overlay");
  if (!overlay) return;
  overlay.style.display = rulesOpen ? "flex" : "none";
}

function isNumberType(type) {
  return (
    type === DART_TYPES.SINGLE ||
    type === DART_TYPES.DOUBLE ||
    type === DART_TYPES.TRIPLE
  );
}

function labelForType(type) {
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

function throwButtonStyle(enabled, selected) {
  return `
    ${styles.gameButton}
    ${selected ? styles.selectedButton : ""}
    ${enabled ? "" : "opacity:0.45;cursor:not-allowed;"}
  `;
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
  titleWrap: `
    text-align:center;
    margin-bottom:14px;
  `,
  title: `
    margin:0;
    font-size:32px;
    line-height:1.1;
    font-weight:900;
    color:#ffffff;
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
  sectionTitle: `
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
    gap:8px;
    justify-content:center;
    margin-bottom:10px;
  `,
  gameButton: `
    border:none;
    border-radius:10px;
    padding:10px 14px;
    background:#1f8f3a;
    color:#ffffff;
    font-size:15px;
    font-weight:800;
    cursor:pointer;
  `,
  selectedButton: `
    box-shadow:0 0 0 3px #f2dc5d inset;
  `,
  numberWrap: `
    margin-top:6px;
  `,
  numberPrompt: `
    text-align:center;
    font-size:15px;
    font-weight:800;
    margin-bottom:10px;
  `,
  numberGrid: `
    display:grid;
    grid-template-columns:repeat(5, minmax(0, 1fr));
    gap:8px;
  `,
  numberButton: `
    border:none;
    border-radius:10px;
    padding:12px 0;
    background:#1f8f3a;
    color:#ffffff;
    font-size:16px;
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
  ruleP: `
    margin:0 0 10px 0;
  `,
  modalActions: `
    display:flex;
    justify-content:center;
    margin-top:14px;
  `
};
