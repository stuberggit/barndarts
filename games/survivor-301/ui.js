// Survivor 301 - ui.js

import {
  initGame,
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
    <div class="survivor301-app" style="${styles.app}">
      <div style="${styles.headerRow}">
        <div>
          <div style="${styles.title}">☣️ Survivor 301</div>
          <div style="${styles.subtitle}">
            Stay alive. Everything hurts except the bull.
          </div>
        </div>
        <div style="${styles.headerButtons}">
          <button type="button" data-action="rules" style="${styles.secondaryButton}">Rules</button>
          <button
            type="button"
            data-action="undo"
            style="${buttonStyle(state.history.length > 0)}"
            ${state.history.length === 0 ? "disabled" : ""}
          >
            Undo
          </button>
        </div>
      </div>

      ${
        !state.gameStarted
          ? renderStartScreen()
          : `
            <div style="${styles.mainGrid}">
              <div style="${styles.leftColumn}">
                ${renderScoreboard(state)}
                ${renderWinnerPanel(state)}
              </div>

              <div style="${styles.rightColumn}">
                ${renderActivePlayerPanel(state)}
                ${renderTurnPanel(state)}
                ${renderControlsPanel(state)}
              </div>
            </div>
          `
      }

      ${renderRulesModal()}
    </div>
  `;

  bindEvents();
  updateRulesVisibility();
}

function renderStartScreen() {
  return `
    <div style="${styles.card}">
      <div style="${styles.sectionTitle}">Start Game</div>
      <div style="${styles.helpText}">
        Enter at least 2 players. Everyone starts at <strong>${STARTING_SCORE}</strong>.
        Green Bull costs nothing. Red Bull adds <strong>+${RED_BULL_BONUS}</strong>.
        Hit 0 or lower and you are out.
      </div>

      <div style="${styles.startGrid}">
        ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `
          <label style="${styles.playerField}">
            <span style="${styles.playerFieldLabel}">Player ${n}</span>
            <input
              type="text"
              data-player-input="${n}"
              placeholder="Player ${n}"
              style="${styles.input}"
            />
          </label>
        `).join("")}
      </div>

      <div style="${styles.startActions}">
        <button type="button" data-action="start-game" style="${styles.primaryButton}">
          Start Survivor 301
        </button>
      </div>
    </div>
  `;
}

function renderScoreboard(state) {
  const players = state.players || [];

  return `
    <div style="${styles.card}">
      <div style="${styles.sectionTitle}">Scoreboard</div>
      <div style="${styles.scoreboardList}">
        ${players.map((player) => {
          const isCurrent = state.currentPlayer?.id === player.id && !state.gameOver;
          const isOut = player.eliminated;

          return `
            <div style="${scoreRowStyle(isCurrent, isOut)}">
              <div style="${styles.playerNameBlock}">
                <div style="${styles.playerName}">${escapeHtml(player.name)}</div>
                <div style="${styles.playerStatus}">
                  ${
                    isOut
                      ? `☠️ OUT${player.eliminatedPlace ? ` · ${ordinal(player.eliminatedPlace)} out` : ""}`
                      : isCurrent
                      ? "ACTIVE"
                      : "ALIVE"
                  }
                </div>
              </div>
              <div style="${scoreValueStyle(isOut)}">
                ${isOut ? player.score : player.score}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderWinnerPanel(state) {
  if (!state.gameOver) return "";

  if (!state.winner) {
    return `
      <div style="${styles.winnerCard}">
        <div style="${styles.winnerTitle}">No Survivor</div>
        <div style="${styles.winnerCopy}">
          Somehow everybody is gone.
        </div>
        <div style="${styles.endButtons}">
          <button type="button" data-action="new-game" style="${styles.primaryButton}">New Game</button>
          <button type="button" data-action="rotate-game" style="${styles.secondaryButton}">Rotate Order</button>
        </div>
      </div>
    `;
  }

  return `
    <div style="${styles.winnerCard}">
      <div style="${styles.winnerTitle}">🏆 SURVIVOR</div>
      <div style="${styles.winnerName}">${escapeHtml(state.winner.name)}</div>
      <div style="${styles.winnerCopy}">
        Everyone else ran out of points. ${escapeHtml(state.winner.name)} is the last one standing.
      </div>
      <div style="${styles.endButtons}">
        <button type="button" data-action="new-game" style="${styles.primaryButton}">New Game</button>
        <button type="button" data-action="rotate-game" style="${styles.secondaryButton}">Rotate Order</button>
      </div>
    </div>
  `;
}

function renderActivePlayerPanel(state) {
  const player = state.currentPlayer;

  if (!player) {
    return `
      <div style="${styles.card}">
        <div style="${styles.sectionTitle}">Current Player</div>
        <div style="${styles.helpText}">No active player.</div>
      </div>
    `;
  }

  const previewScore =
    state.turnDarts.length > 0
      ? state.turnDarts[state.turnDarts.length - 1].scoreAfter
      : player.score;

  return `
    <div style="${styles.card}">
      <div style="${styles.sectionTitle}">Current Player</div>
      <div style="${styles.activePlayerWrap}">
        <div>
          <div style="${styles.activePlayerName}">${escapeHtml(player.name)}</div>
          <div style="${styles.activeMeta}">
            Turn ${state.turnNumber} · ${state.turnDarts.length}/${MAX_DARTS_PER_TURN} darts entered
          </div>
        </div>

        <div style="${styles.scorePreviewBox}">
          <div style="${styles.scorePreviewLabel}">Score</div>
          <div style="${styles.scorePreviewValue}">${player.score}</div>
          ${
            previewScore !== player.score
              ? `<div style="${styles.scorePreviewSub}">Preview: ${previewScore}</div>`
              : `<div style="${styles.scorePreviewSub}">Still breathing</div>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderTurnPanel(state) {
  const darts = state.turnDarts || [];
  const eliminatedThisTurn = darts.some((dart) => dart.eliminated);
  const previewScore =
    darts.length > 0
      ? darts[darts.length - 1].scoreAfter
      : state.currentPlayer?.score ?? "";

  return `
    <div style="${styles.card}">
      <div style="${styles.sectionTitle}">Turn Summary</div>

      ${
        darts.length === 0
          ? `<div style="${styles.helpText}">No darts entered yet.</div>`
          : `
            <div style="${styles.turnList}">
              ${darts.map((dart, index) => `
                <div style="${styles.turnRow}">
                  <div style="${styles.turnLeft}">
                    <div style="${styles.turnDartIndex}">Dart ${index + 1}</div>
                    <div style="${styles.turnDartLabel}">${escapeHtml(dart.label)}</div>
                  </div>
                  <div style="${styles.turnRight}">
                    <div style="${styles.turnDelta}">
                      ${formatDelta(dart)}
                    </div>
                    <div style="${styles.turnAfter}>
                      ${dart.scoreBefore} → ${dart.scoreAfter}
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>
          `
      }

      <div style="${styles.turnFooter}">
        <div style="${styles.turnFooterText}">
          Preview score: <strong>${previewScore}</strong>
          ${
            eliminatedThisTurn
              ? `<span style="${styles.elimWarning}"> · ELIMINATED if submitted</span>`
              : ""
          }
        </div>

        <div style="${styles.turnFooterButtons}">
          <button
            type="button"
            data-action="remove-last-dart"
            style="${buttonStyle(darts.length > 0)}"
            ${darts.length === 0 ? "disabled" : ""}
          >
            Remove Last
          </button>
          <button
            type="button"
            data-action="clear-turn"
            style="${buttonStyle(darts.length > 0)}"
            ${darts.length === 0 ? "disabled" : ""}
          >
            Clear Turn
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderControlsPanel(state) {
  const canThrow = !state.gameOver
    && state.gameStarted
    && state.currentPlayer
    && !state.currentPlayer.eliminated
    && state.turnDarts.length < MAX_DARTS_PER_TURN
    && !state.turnDarts.some((dart) => dart.eliminated);

  const canSubmit = state.turnDarts.length > 0 && !state.gameOver;

  return `
    <div style="${styles.card}">
      <div style="${styles.sectionTitle}">Throw Controls</div>

      <div style="${styles.controlLabel}">Quick throws</div>
      <div style="${styles.quickButtons}">
        <button
          type="button"
          data-throw-type="${DART_TYPES.MISS}"
          style="${throwButtonStyle(canThrow, selectedType === DART_TYPES.MISS)}"
          ${!canThrow ? "disabled" : ""}
        >
          Miss
        </button>

        <button
          type="button"
          data-throw-type="${DART_TYPES.GREEN_BULL}"
          style="${throwButtonStyle(canThrow, selectedType === DART_TYPES.GREEN_BULL)}"
          ${!canThrow ? "disabled" : ""}
        >
          Green Bull
        </button>

        <button
          type="button"
          data-throw-type="${DART_TYPES.RED_BULL}"
          style="${throwButtonStyle(canThrow, selectedType === DART_TYPES.RED_BULL)}"
          ${!canThrow ? "disabled" : ""}
        >
          Red Bull
        </button>
      </div>

      <div style="${styles.controlLabel}">Number throws</div>
      <div style="${styles.quickButtons}">
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
          Double
        </button>

        <button
          type="button"
          data-select-type="${DART_TYPES.TRIPLE}"
          style="${throwButtonStyle(canThrow, selectedType === DART_TYPES.TRIPLE)}"
          ${!canThrow ? "disabled" : ""}
        >
          Triple
        </button>
      </div>

      ${
        selectedType && isNumberType(selectedType) && canThrow
          ? `
            <div style="${styles.numberPanel}">
              <div style="${styles.numberPrompt}">
                Choose a number for <strong>${labelForType(selectedType)}</strong>
              </div>
              <div style="${styles.numberGrid}">
                ${Array.from({ length: 20 }, (_, i) => i + 1).map((n) => `
                  <button
                    type="button"
                    data-throw-number="${n}"
                    style="${styles.numberButton}"
                  >
                    ${n}
                  </button>
                `).join("")}
              </div>
            </div>
          `
          : ""
      }

      <div style="${styles.submitRow}">
        <button
          type="button"
          data-action="submit-turn"
          style="${buttonStyle(canSubmit, true)}"
          ${!canSubmit ? "disabled" : ""}
        >
          Submit Turn
        </button>
      </div>
    </div>
  `;
}

function renderRulesModal() {
  return `
    <div id="survivor301-rules-overlay" style="${styles.rulesOverlayHidden}">
      <div style="${styles.rulesModal}">
        <div style="${styles.rulesTitle}">Survivor 301 Rules</div>
        <div style="${styles.rulesBody}">
          <p style="${styles.ruleP}">
            Every player starts with <strong>${STARTING_SCORE}</strong>.
          </p>
          <p style="${styles.ruleP}">
            Your goal is to <strong>avoid running out of points</strong>.
          </p>
          <p style="${styles.ruleP}">
            <strong>Single / Double / Triple</strong> subtract their normal dart values.
          </p>
          <p style="${styles.ruleP}">
            <strong>Green Bull</strong> subtracts <strong>0</strong>.
          </p>
          <p style="${styles.ruleP}">
            <strong>Red Bull</strong> subtracts <strong>0</strong> and adds <strong>${RED_BULL_BONUS}</strong>.
          </p>
          <p style="${styles.ruleP}">
            If your score reaches <strong>0 or below</strong>, you are eliminated.
          </p>
          <p style="${styles.ruleP}">
            Last player standing wins.
          </p>
        </div>
        <div style="${styles.rulesActions}">
          <button type="button" data-action="close-rules" style="${styles.primaryButton}">Close</button>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  rootEl.querySelectorAll("[data-action='start-game']").forEach((btn) => {
    btn.addEventListener("click", handleStartGameClick);
  });

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
    btn.addEventListener("click", openRules);
  });

  rootEl.querySelectorAll("[data-action='close-rules']").forEach((btn) => {
    btn.addEventListener("click", closeRules);
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
        closeRules();
      }
    });
  }
}

function handleStartGameClick() {
  const inputs = Array.from(rootEl.querySelectorAll("[data-player-input]"));
  const names = inputs
    .map((input) => input.value.trim())
    .filter(Boolean);

  if (names.length < 2) {
    window.alert("Enter at least 2 players to start Survivor 301.");
    return;
  }

  selectedType = null;
  initGame(names);
}

function openRules() {
  const overlay = rootEl.querySelector("#survivor301-rules-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
}

function closeRules() {
  const overlay = rootEl.querySelector("#survivor301-rules-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
}

function updateRulesVisibility() {
  const overlay = rootEl.querySelector("#survivor301-rules-overlay");
  if (!overlay) return;
  if (!overlay.dataset.open) {
    overlay.style.display = "none";
  }
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
  if (type === DART_TYPES.DOUBLE) return "Double";
  if (type === DART_TYPES.TRIPLE) return "Triple";
  if (type === DART_TYPES.GREEN_BULL) return "Green Bull";
  if (type === DART_TYPES.RED_BULL) return "Red Bull";
  return "Throw";
}

function formatDelta(dart) {
  if (dart.type === DART_TYPES.RED_BULL) return "+10";
  if (dart.type === DART_TYPES.GREEN_BULL) return "0";
  if (dart.type === DART_TYPES.MISS) return "0";
  return `-${dart.amount}`;
}

function ordinal(num) {
  if (num % 100 >= 11 && num % 100 <= 13) return `${num}th`;
  if (num % 10 === 1) return `${num}st`;
  if (num % 10 === 2) return `${num}nd`;
  if (num % 10 === 3) return `${num}rd`;
  return `${num}th`;
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
  const disabled = enabled ? "" : "opacity:0.45;cursor:not-allowed;";
  return `${base}${disabled}`;
}

function throwButtonStyle(enabled, selected) {
  return `
    ${styles.throwButton}
    ${selected ? styles.throwButtonSelected : ""}
    ${enabled ? "" : "opacity:0.45;cursor:not-allowed;"}
  `;
}

function scoreRowStyle(isCurrent, isOut) {
  return `
    ${styles.scoreRow}
    ${isCurrent ? styles.scoreRowCurrent : ""}
    ${isOut ? styles.scoreRowOut : ""}
  `;
}

function scoreValueStyle(isOut) {
  return `
    ${styles.scoreValue}
    ${isOut ? "opacity:0.55;" : ""}
  `;
}

const styles = {
  app: `
    box-sizing:border-box;
    width:100%;
    color:#f5f5f5;
    font-family:Arial, Helvetica, sans-serif;
    padding:16px;
  `,
  headerRow: `
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:12px;
    margin-bottom:16px;
    flex-wrap:wrap;
  `,
  title: `
    font-size:28px;
    font-weight:800;
    line-height:1.1;
    margin-bottom:4px;
  `,
  subtitle: `
    font-size:14px;
    opacity:0.85;
  `,
  headerButtons: `
    display:flex;
    gap:8px;
    flex-wrap:wrap;
  `,
  mainGrid: `
    display:grid;
    grid-template-columns:minmax(260px, 340px) minmax(320px, 1fr);
    gap:16px;
  `,
  leftColumn: `
    display:flex;
    flex-direction:column;
    gap:16px;
  `,
  rightColumn: `
    display:flex;
    flex-direction:column;
    gap:16px;
  `,
  card: `
    background:rgba(0,0,0,0.22);
    border:1px solid rgba(255,255,255,0.14);
    border-radius:16px;
    padding:16px;
    box-sizing:border-box;
  `,
  sectionTitle: `
    font-size:20px;
    font-weight:800;
    margin-bottom:12px;
  `,
  helpText: `
    font-size:14px;
    line-height:1.45;
    opacity:0.92;
  `,
  startGrid: `
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));
    gap:12px;
    margin-top:16px;
  `,
  playerField: `
    display:flex;
    flex-direction:column;
    gap:6px;
  `,
  playerFieldLabel: `
    font-size:13px;
    font-weight:700;
    opacity:0.92;
  `,
  input: `
    box-sizing:border-box;
    width:100%;
    border-radius:10px;
    border:1px solid rgba(255,255,255,0.2);
    padding:10px 12px;
    font-size:15px;
    background:rgba(255,255,255,0.08);
    color:#fff;
    outline:none;
  `,
  startActions: `
    margin-top:16px;
    display:flex;
    justify-content:flex-start;
  `,
  primaryButton: `
    border:none;
    border-radius:12px;
    padding:10px 14px;
    font-size:14px;
    font-weight:800;
    cursor:pointer;
    background:#1f8f3a;
    color:#fff;
  `,
  secondaryButton: `
    border:1px solid rgba(255,255,255,0.2);
    border-radius:12px;
    padding:10px 14px;
    font-size:14px;
    font-weight:800;
    cursor:pointer;
    background:rgba(255,255,255,0.08);
    color:#fff;
  `,
  scoreboardList: `
    display:flex;
    flex-direction:column;
    gap:10px;
  `,
  scoreRow: `
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
    border-radius:12px;
    padding:12px;
    background:rgba(255,255,255,0.06);
    border:1px solid transparent;
  `,
  scoreRowCurrent: `
    border-color:#f2dc5d;
    box-shadow:0 0 0 1px rgba(242,220,93,0.15) inset;
  `,
  scoreRowOut: `
    opacity:0.72;
    background:rgba(120,120,120,0.18);
  `,
  playerNameBlock: `
    display:flex;
    flex-direction:column;
    gap:4px;
  `,
  playerName: `
    font-size:17px;
    font-weight:800;
  `,
  playerStatus: `
    font-size:12px;
    opacity:0.82;
    letter-spacing:0.02em;
  `,
  scoreValue: `
    font-size:28px;
    font-weight:900;
    min-width:56px;
    text-align:right;
  `,
  winnerCard: `
    background:linear-gradient(180deg, rgba(255,214,10,0.16), rgba(255,255,255,0.06));
    border:1px solid rgba(255,214,10,0.35);
    border-radius:16px;
    padding:18px;
  `,
  winnerTitle: `
    font-size:24px;
    font-weight:900;
    margin-bottom:8px;
  `,
  winnerName: `
    font-size:28px;
    font-weight:900;
    margin-bottom:8px;
  `,
  winnerCopy: `
    font-size:15px;
    line-height:1.45;
    margin-bottom:14px;
  `,
  endButtons: `
    display:flex;
    flex-wrap:wrap;
    gap:10px;
  `,
  activePlayerWrap: `
    display:flex;
    justify-content:space-between;
    gap:14px;
    align-items:flex-start;
    flex-wrap:wrap;
  `,
  activePlayerName: `
    font-size:28px;
    font-weight:900;
    line-height:1.1;
    margin-bottom:6px;
  `,
  activeMeta: `
    font-size:14px;
    opacity:0.85;
  `,
  scorePreviewBox: `
    min-width:120px;
    background:rgba(255,255,255,0.06);
    border-radius:14px;
    padding:12px;
    text-align:right;
  `,
  scorePreviewLabel: `
    font-size:12px;
    opacity:0.8;
    margin-bottom:4px;
  `,
  scorePreviewValue: `
    font-size:30px;
    font-weight:900;
    line-height:1;
    margin-bottom:4px;
  `,
  scorePreviewSub: `
    font-size:13px;
    opacity:0.82;
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
    gap:12px;
    border-radius:12px;
    padding:10px 12px;
    background:rgba(255,255,255,0.06);
  `,
  turnLeft: `
    display:flex;
    flex-direction:column;
    gap:4px;
  `,
  turnRight: `
    display:flex;
    flex-direction:column;
    gap:4px;
    text-align:right;
  `,
  turnDartIndex: `
    font-size:12px;
    opacity:0.75;
  `,
  turnDartLabel: `
    font-size:16px;
    font-weight:800;
  `,
  turnDelta: `
    font-size:18px;
    font-weight:900;
  `,
  turnAfter: `
    font-size:12px;
    opacity:0.78;
  `,
  turnFooter: `
    margin-top:14px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    flex-wrap:wrap;
  `,
  turnFooterText: `
    font-size:14px;
  `,
  turnFooterButtons: `
    display:flex;
    gap:8px;
    flex-wrap:wrap;
  `,
  elimWarning: `
    color:#ff9a9a;
    font-weight:800;
  `,
  controlLabel: `
    font-size:14px;
    font-weight:800;
    margin-bottom:8px;
    margin-top:2px;
  `,
  quickButtons: `
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    margin-bottom:12px;
  `,
  throwButton: `
    border:1px solid rgba(255,255,255,0.16);
    border-radius:12px;
    padding:10px 14px;
    font-size:14px;
    font-weight:800;
    cursor:pointer;
    background:rgba(255,255,255,0.08);
    color:#fff;
  `,
  throwButtonSelected: `
    border-color:#f2dc5d;
    box-shadow:0 0 0 1px rgba(242,220,93,0.18) inset;
    background:rgba(242,220,93,0.14);
  `,
  numberPanel: `
    margin-top:4px;
    margin-bottom:14px;
    border-radius:14px;
    padding:12px;
    background:rgba(255,255,255,0.05);
  `,
  numberPrompt: `
    font-size:14px;
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
    padding:10px 0;
    font-size:15px;
    font-weight:800;
    cursor:pointer;
    background:rgba(255,255,255,0.1);
    color:#fff;
  `,
  submitRow: `
    margin-top:2px;
    display:flex;
    justify-content:flex-start;
  `,
  rulesOverlayHidden: `
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.6);
    align-items:center;
    justify-content:center;
    padding:20px;
    z-index:9999;
    box-sizing:border-box;
  `,
  rulesModal: `
    width:min(560px, 100%);
    background:#0e3d1d;
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.16);
    padding:20px;
    box-sizing:border-box;
  `,
  rulesTitle: `
    font-size:24px;
    font-weight:900;
    margin-bottom:12px;
  `,
  rulesBody: `
    font-size:15px;
    line-height:1.5;
  `,
  ruleP: `
    margin:0 0 10px 0;
  `,
  rulesActions: `
    margin-top:14px;
    display:flex;
    justify-content:flex-end;
  `
};
