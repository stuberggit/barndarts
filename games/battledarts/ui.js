import {
  getState,
  getModes,
  getStats,
  startMode,
  addSetupShip,
  finishCurrentTeamSetup,
  continueSetupTransition,
  startGameplay,
  submitThrow,
  nextTeam,
  startNextTurn,
  endGameEarly,
  undo,
  isGameOver,
  initGame,
  renameTeam
} from "./logic.js";
import { store } from "../../core/store.js";
import { renderApp } from "../../core/router.js";

/* -------------------------
   UI STATE
--------------------------*/

const revealedTeams = new Set();

/* -------------------------
   HELPERS
--------------------------*/

function getFleetIntelForShip(activeTeam, targetTeamIndex, target) {
  return activeTeam?.fleetIntel?.[`${targetTeamIndex}:${target}`] || null;
}

function sortShipsForDisplay(ships = []) {
  return [...ships].sort((a, b) => {
    const aSunk = a.lives <= 0;
    const bSunk = b.lives <= 0;

    if (aSunk && !bSunk) return -1;
    if (!aSunk && bSunk) return 1;

    return 0;
  });
}

function attachNumberButtonClick(el, handler) {
  let handled = false;

  el.addEventListener(
    "pointerup",
    event => {
      event.preventDefault();
      event.stopPropagation();

      if (handled) return;
      handled = true;

      handler();

      setTimeout(() => {
        handled = false;
      }, 250);
    },
    { passive: false }
  );

  el.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    handler();
  });
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

function formatTarget(target) {
  return target === 25 ? "Bull" : String(target);
}

function getKnownMisses(team) {
  return Object.values(team.missIntel || {}).sort((a, b) => {
    if (a.target === 25) return 1;
    if (b.target === 25) return -1;
    return a.target - b.target;
  });
}

function getKnownTargets(team) {
  return Object.values(team.intel || {}).sort((a, b) => {
    if (a.target === 25) return 1;
    if (b.target === 25) return -1;
    return a.target - b.target;
  });
}

function formatHitType(hitType) {
  if (hitType === "single") return "Single";
  if (hitType === "double") return "Dub";
  if (hitType === "triple") return "Trip";
  if (hitType === "greenBull") return "Sing Bull";
  if (hitType === "redBull") return "Dub Bull";
  if (hitType === "miss") return "Miss";
  return "Hit";
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
        max-width:720px;
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

function getRequiredShipText(mode) {
  return `${mode.shipsPerTeam} ship${mode.shipsPerTeam === 1 ? "" : "s"} each`;
}

function getTeamPlayersText(team) {
  return team.players.join(" / ");
}

function isTeamEliminated(team) {
  return team.ships.length > 0 && team.ships.every(ship => ship.lives <= 0);
}

function getRemainingShips(team) {
  return team.ships.filter(ship => ship.lives > 0).length;
}

function rotatePlayers(players) {
  if (!players || players.length <= 1) return [...(players || [])];
  return [...players.slice(1), players[0]];
}

function getSetupShipPreview(team, hitType) {
  const nextIndex = team.ships.length;
  const base = nextIndex + 2;
  const bonus =
    hitType === "double" || hitType === "redBull"
      ? 1
      : hitType === "triple"
        ? 2
        : 0;

  return base + bonus;
}

function getShipTileWidth(shipCount) {
  if (shipCount <= 3) return "31%";
  if (shipCount === 4) return "23.5%";
  if (shipCount === 5) return "18.5%";
  return "15.25%";
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

  if (state.phase === "MODE_SELECT") {
    renderModeSelect(container, state);
    return;
  }

  if (state.phase === "SETUP") {
    renderSetup(container, state);
    return;
  }

  if (state.phase === "SETUP_TRANSITION") {
    renderSetupTransition(container, state);
    return;
  }

  if (state.phase === "SETUP_COMPLETE") {
    renderSetupComplete(container, state);
    return;
  }

  if (state.phase === "TURN_TRANSITION") {
    renderTurnTransition(container, state);
    return;
  }

  renderGame(container, state);
}

/* -------------------------
   MODE SELECT
--------------------------*/

function renderModeSelect(container, state) {
  const modes = getModes();
  const selectedPlayerCount = state.originalPlayers?.length || 0;
  const { flashHtml } = buildFlashHtml(state);

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:18px;
      font-weight:bold;
      color:#facc15;
    ">
      ⚓ Choose Battle Mode ⚓
    </div>

    <div style="
      padding:12px;
      border-radius:12px;
      background:#111111;
      border:1px solid #ffffff;
      color:#ffffff;
      margin-bottom:12px;
      text-align:center;
      font-weight:bold;
    ">
      ${selectedPlayerCount} player${selectedPlayerCount === 1 ? "" : "s"} selected
    </div>

    <div id="modeGrid"></div>

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

    <div id="modal"></div>
  `;

  const grid = document.getElementById("modeGrid");
  grid.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:10px;
  `;

  modes.forEach(mode => {
    const disabled = selectedPlayerCount < mode.requiredPlayers;

    const card = document.createElement("div");
    card.style = `
      padding:14px;
      border-radius:12px;
      background:${disabled ? "#1f2937" : "#11361a"};
      border:${disabled ? "1px solid #6b7280" : "2px solid #facc15"};
      color:#ffffff;
      cursor:${disabled ? "not-allowed" : "pointer"};
      opacity:${disabled ? 0.6 : 1};
      user-select:none;
    `;

    card.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:center;
        font-weight:bold;
      ">
        <div style="font-size:22px;">${mode.label}</div>
        <div style="font-size:14px;color:#facc15;">${getRequiredShipText(mode)}</div>
      </div>
      <div style="
        margin-top:6px;
        font-size:14px;
        opacity:0.85;
      ">
        ${mode.numTeams} team${mode.numTeams === 1 ? "" : "s"} · ${mode.playersPerTeam} player${mode.playersPerTeam === 1 ? "" : "s"} per team · Needs ${mode.requiredPlayers} players
      </div>
    `;

    attachButtonClick(card, () => {
      if (disabled) return;
      revealedTeams.clear();
      startMode(mode.id);
      renderUI(container);
    });

    grid.appendChild(card);
  });
}

/* -------------------------
   SETUP
--------------------------*/

function renderSetup(container, state) {
  const team = state.teams[state.setupTeamIndex];
  const maxShips = state.modeConfig.shipsPerTeam;
  const { flashHtml } = buildFlashHtml(state);
  const fleetComplete = team.ships.length >= maxShips;

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:12px;
      font-size:22px;
      font-weight:bold;
      color:${team.color};
    ">
      Fleet Setup: ${team.name}
    </div>

    <div style="
      margin-bottom:12px;
      padding:12px;
      border-radius:12px;
      background:#111111;
      border:2px solid ${team.color};
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="font-size:17px;margin-bottom:4px;">${getTeamPlayersText(team)}</div>
      <div style="font-size:14px;color:#facc15;">
        Ship ${Math.min(team.ships.length + 1, maxShips)}/${maxShips}
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr 82px;
        gap:8px;
        margin-top:10px;
      ">
        <input
          id="teamNameInput"
          value="${team.name}"
          style="
            width:100%;
            box-sizing:border-box;
            padding:9px;
            border-radius:10px;
            border:1px solid #9ca3af;
            font-size:16px;
          "
        />
        <div id="saveTeamNameBtn" style="
          ${buttonStyle()}
          padding:8px;
          min-height:38px;
          font-size:13px;
          margin-top:0;
        ">
          Save
        </div>
      </div>
    </div>

    <div id="fleetList"></div>

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

    <div id="setupControls"></div>
    <div id="modal"></div>
  `;

  document.getElementById("saveTeamNameBtn").onclick = () => {
    const value = document.getElementById("teamNameInput").value;
    renameTeam(state.setupTeamIndex, value);
    renderUI(container);
  };

  renderFleetList(team, false);

  const controls = document.getElementById("setupControls");
  controls.innerHTML = "";

  if (!fleetComplete) {
    const instruction = document.createElement("div");
    instruction.style = `
      text-align:center;
      margin-bottom:10px;
      font-size:14px;
      opacity:0.9;
      font-weight:bold;
    `;
    instruction.innerText = "Choose hit type, then ship number.";

    const hitRow = document.createElement("div");
    hitRow.style = `
      display:grid;
      grid-template-columns:1fr 1fr 1fr;
      gap:8px;
    `;

    [
      { label: "Single", value: "single" },
      { label: "Dub", value: "double" },
      { label: "Trip", value: "triple" }
    ].forEach(option => {
      const livesPreview = getSetupShipPreview(team, option.value);

      const btn = document.createElement("div");
      btn.innerHTML = `
        <div>${option.label}</div>
        <div style="font-size:12px;color:#facc15;margin-top:3px;">
          ${livesPreview} lives
        </div>
      `;
      btn.style = `
        ${buttonStyle()}
        padding:12px 8px;
        min-height:58px;
        font-size:18px;
        flex-direction:column;
      `;

      attachButtonClick(btn, () => {
        renderNumberPicker(container, "setup", option.value);
      });

      hitRow.appendChild(btn);
    });

    controls.appendChild(instruction);
    controls.appendChild(hitRow);
  }

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:10px;
  `;

  const finishBtn = document.createElement("div");
  finishBtn.innerText = fleetComplete ? "Lock Fleet" : "Need More Ships";
  finishBtn.style = `
    ${fleetComplete ? buttonStyle() : lightButtonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
    ${fleetComplete ? "" : "opacity:0.5;cursor:not-allowed;"}
  `;
  attachButtonClick(finishBtn, () => {
    if (!fleetComplete) return;
    finishCurrentTeamSetup();
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

  utilityRow.appendChild(finishBtn);
  utilityRow.appendChild(undoBtn);
  utilityRow.appendChild(endBtn);

  controls.appendChild(utilityRow);
}

function renderFleetList(team, hidden) {
  const div = document.getElementById("fleetList");
  if (!div) return;

  div.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.style = `
    display:flex;
    flex-wrap:nowrap;
    gap:6px;
    width:100%;
    overflow:hidden;
  `;

  if (!team.ships.length) {
    const empty = document.createElement("div");
    empty.style = `
      padding:10px;
      border-radius:12px;
      background:#111111;
      border:1px solid rgba(255,255,255,0.35);
      color:#ffffff;
      text-align:center;
      font-weight:bold;
      opacity:0.85;
      width:100%;
      box-sizing:border-box;
    `;
    empty.innerText = hidden ? "Fleet Hidden" : "No ships placed yet.";
    wrap.appendChild(empty);
  }

  const tileWidth = getShipTileWidth(team.ships.length || 1);

  team.ships.forEach(ship => {
    const isSunk = ship.lives <= 0;

    const row = document.createElement("div");
    row.style = `
      padding:8px 6px;
      border-radius:10px;
      background:${isSunk ? "#1f2937" : "#111111"};
      border:${isSunk ? "1px solid #6b7280" : "1px solid #ffffff"};
      color:#ffffff;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      gap:2px;
      font-weight:bold;
      opacity:${isSunk ? 0.7 : 1};
      width:${tileWidth};
      min-width:0;
      box-sizing:border-box;
      text-align:center;
    `;

    row.innerHTML = hidden
      ? `
        <div style="font-size:14px;white-space:nowrap;">🚢 Hidden</div>
        <div style="font-size:11px;color:${isSunk ? "#ff4c4c" : "#facc15"};">
          ${isSunk ? "Sunk" : "Known"}
        </div>
      `
      : `
        <div style="font-size:16px;white-space:nowrap;">
          ${isSunk ? "💥" : "🚢"} ${formatTarget(ship.target)}
        </div>
        <div style="font-size:11px;color:${isSunk ? "#ff4c4c" : "#facc15"};">
          ${ship.lives}/${ship.originalLives}
        </div>
      `;

    wrap.appendChild(row);
  });

  div.appendChild(wrap);
}

/* -------------------------
   SETUP TRANSITIONS
--------------------------*/

function renderSetupTransition(container, state) {
  const lastTeam = state.teams[state.setupTeamIndex];
  const nextTeam = state.teams[state.nextSetupTeamIndex];

  container.innerHTML = `
    <div style="
      padding:18px 16px;
      border-radius:18px;
      background:linear-gradient(180deg, #102417 0%, #0b0f0c 100%);
      border:2px solid #facc15;
      color:#ffffff;
      text-align:center;
    ">
      <div style="font-size:42px;line-height:1;margin-bottom:10px;">⚓</div>
      <h2 style="margin:0 0 8px;">${lastTeam.name} Fleet Locked</h2>
      <div style="font-size:15px;opacity:0.9;margin-bottom:16px;">
        Pass the device to ${nextTeam.name}.
      </div>

      <div id="continueSetupBtn" style="
        ${buttonStyle()}
        padding:14px;
        min-height:52px;
        font-size:18px;
      ">
        Setup ${nextTeam.name}
      </div>
    </div>

    <div id="modal"></div>
  `;

  attachButtonClick(document.getElementById("continueSetupBtn"), () => {
    continueSetupTransition();
    renderUI(container);
  });
}

function renderSetupComplete(container, state) {
  container.innerHTML = `
    <div style="
      padding:18px 16px;
      border-radius:18px;
      background:linear-gradient(180deg, #102417 0%, #0b0f0c 100%);
      border:2px solid #facc15;
      color:#ffffff;
      text-align:center;
    ">
      <div style="font-size:42px;line-height:1;margin-bottom:10px;">🚢🎯🚢</div>
      <h2 style="margin:0 0 8px;">All Fleets Locked</h2>
      <div style="font-size:15px;opacity:0.9;margin-bottom:16px;">
        BattleDarts is ready. Opponent fleets stay hidden during play.
      </div>

      <div id="teamPreview"></div>

      <div id="startBattleBtn" style="
        ${buttonStyle()}
        padding:14px;
        min-height:52px;
        font-size:18px;
        border:2px solid #facc15;
        margin-top:14px;
      ">
        Start Battle
      </div>
    </div>

    <div id="modal"></div>
  `;

  const preview = document.getElementById("teamPreview");
  preview.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-top:12px;
  `;

  state.teams.forEach(team => {
    const row = document.createElement("div");
    row.style = `
      padding:10px;
      border-radius:12px;
      background:#111111;
      border:1px solid ${team.color};
      text-align:left;
      font-weight:bold;
    `;
    row.innerHTML = `
      <div style="color:${team.color};">${team.name}</div>
      <div style="font-size:13px;opacity:0.9;">${getTeamPlayersText(team)}</div>
      <div style="font-size:13px;color:#facc15;margin-top:3px;">
        ${team.ships.length} ships
      </div>
    `;
    preview.appendChild(row);
  });

  attachButtonClick(document.getElementById("startBattleBtn"), () => {
    revealedTeams.clear();
    startGameplay();
    renderUI(container);
  });
}

/* -------------------------
   GAME
--------------------------*/

function renderGame(container, state) {
  const team = state.teams[state.currentTeamIndex];
  const { flashHtml } = buildFlashHtml(state);

  container.innerHTML = `
    <div style="
      text-align:center;
      margin-bottom:10px;
      font-size:22px;
      font-weight:bold;
      color:${team.color};
    ">
      ${team.name} Firing
    </div>

    <div style="
      margin-bottom:8px;
      padding:10px 12px;
      border-radius:12px;
      background:#11361a;
      border:2px solid #f0970a;
      color:#ffffff;
      text-align:center;
      font-weight:bold;
    ">
      <div style="font-size:19px;margin-bottom:2px;">
        ${getTeamPlayersText(team)}
      </div>
      <div style="font-size:14px;color:#facc15;">
        Dart ${Math.min(state.throwsThisTurn + 1, 3)}/3
      </div>
    </div>

    <div style="
      min-height:44px;
      margin:6px 0 8px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="width:100%;">
        ${flashHtml}
      </div>
    </div>

    <div id="teamStatusGrid"></div>

    <div id="controls"></div>
    <div id="modal"></div>
  `;

  renderTeamStatusGrid(container, state);
  renderGameControls(container, state);
}

function renderTeamStatusGrid(container, state) {
  const grid = document.getElementById("teamStatusGrid");
  const activeTeam = state.teams[state.currentTeamIndex];

  grid.innerHTML = "";
  grid.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-bottom:10px;
  `;

  state.teams.forEach((team, index) => {
    const isCurrent = index === state.currentTeamIndex;
    const eliminated = isTeamEliminated(team);
    const activeFleetRevealed = revealedTeams.has(index);
    const visible = isCurrent && activeFleetRevealed;
    const knownTargets = isCurrent ? getKnownTargets(team) : [];
    const knownMisses = isCurrent ? getKnownMisses(team) : [];

    const getShipIntel = ship => {
      if (isCurrent) return null;
      return activeTeam?.fleetIntel?.[`${index}:${ship.target}`] || null;
    };

    const displayShips = [...team.ships].sort((a, b) => {
      const aSunk = a.lives <= 0;
      const bSunk = b.lives <= 0;

      if (aSunk && !bSunk) return -1;
      if (!aSunk && bSunk) return 1;

      const aKnown = !!getShipIntel(a);
      const bKnown = !!getShipIntel(b);

      if (aKnown && !bKnown) return -1;
      if (!aKnown && bKnown) return 1;

      return 0;
    });

    const card = document.createElement("div");
    card.style = `
      padding:9px 10px;
      border-radius:12px;
      background:${isCurrent ? "#11361a" : "#111111"};
      border:${isCurrent ? "2px solid #facc15" : eliminated ? "1px solid #6b7280" : `1px solid ${team.color}`};
      color:#ffffff;
      opacity:${eliminated ? 0.65 : 1};
    `;

    card.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:8px;
        margin-bottom:7px;
        font-weight:bold;
      ">
        <div style="min-width:0;">
          <div style="font-size:16px;color:${team.color};line-height:1.15;">
            ${team.name}
          </div>
          <div style="
            font-size:11px;
            opacity:0.85;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${getTeamPlayersText(team)}
          </div>
        </div>

        <div style="
          text-align:right;
          flex-shrink:0;
          display:flex;
          align-items:center;
          gap:8px;
        ">
          <div>
            <div style="font-size:14px;color:${eliminated ? "#ff4c4c" : "#facc15"};">
              ${eliminated ? "Eliminated" : `${getRemainingShips(team)} ships`}
            </div>
          </div>

          ${
            isCurrent
              ? `
                <div id="revealFleet-${index}" style="
                  ${lightButtonStyle()}
                  padding:6px 8px;
                  min-height:30px;
                  font-size:12px;
                  white-space:nowrap;
                ">
                  ${activeFleetRevealed ? "Hide" : "Reveal"}
                </div>
              `
              : ""
          }
        </div>
      </div>

      <div id="fleet-${index}"></div>
      ${isCurrent ? `<div id="knownTargets-${index}"></div>` : ""}
      ${isCurrent ? `<div id="knownMisses-${index}"></div>` : ""}
    `;

    grid.appendChild(card);

    if (isCurrent) {
      const revealBtn = document.getElementById(`revealFleet-${index}`);
      attachButtonClick(revealBtn, () => {
        if (revealedTeams.has(index)) {
          revealedTeams.delete(index);
        } else {
          revealedTeams.add(index);
        }

        renderUI(container);
      });
    }

    const fleetDiv = document.getElementById(`fleet-${index}`);
    fleetDiv.innerHTML = "";

    const fleetWrap = document.createElement("div");
    fleetWrap.style = `
      display:flex;
      flex-wrap:nowrap;
      gap:5px;
      width:100%;
      overflow:hidden;
    `;

    const tileWidth = getShipTileWidth(displayShips.length || 1);

    displayShips.forEach(ship => {
      const sunk = ship.lives <= 0;
      const intel = getShipIntel(ship);
      const knownToActiveTeam = !!intel;
      const shouldRevealNumber = visible || sunk || knownToActiveTeam;

      const shipCard = document.createElement("div");
      shipCard.style = `
        padding:6px 4px;
        border-radius:9px;
        background:${sunk ? "#1f2937" : knownToActiveTeam ? "rgba(255,76,76,0.08)" : "rgba(255,255,255,0.06)"};
        border:${sunk ? "1px solid #6b7280" : knownToActiveTeam ? "1px solid rgba(255,76,76,0.65)" : "1px solid rgba(255,255,255,0.25)"};
        font-weight:bold;
        text-align:center;
        width:${tileWidth};
        min-width:0;
        box-sizing:border-box;
      `;

      if (shouldRevealNumber) {
        shipCard.innerHTML = `
          <div style="
            font-size:14px;
            line-height:1.1;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${sunk ? "💥" : "🚢"} ${formatTarget(ship.target)}
          </div>
          <div style="font-size:10px;color:${sunk ? "#ff4c4c" : "#facc15"};">
            ${
              visible
                ? `${ship.lives}/${ship.originalLives}`
                : sunk
                  ? "Sunk"
                  : `${intel.damageKnown}/???`
            }
          </div>
        `;
      } else {
        shipCard.innerHTML = `
          <div style="
            font-size:13px;
            line-height:1.1;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            🚢 Hidden
          </div>
          <div style="font-size:10px;color:${isCurrent ? "#facc15" : "#9ca3af"};">
            ${isCurrent ? "Known" : "Unknown"}
          </div>
        `;
      }

      fleetWrap.appendChild(shipCard);
    });

    fleetDiv.appendChild(fleetWrap);

    if (isCurrent) {
      const knownDiv = document.getElementById(`knownTargets-${index}`);
      knownDiv.innerHTML = "";

      if (knownTargets.length > 0) {
        const label = document.createElement("div");
        label.style = `
          font-size:11px;
          color:#facc15;
          font-weight:bold;
          margin:7px 0 4px;
          text-align:left;
        `;
        label.innerText = "Targets Identified";
        knownDiv.appendChild(label);

        const knownWrap = document.createElement("div");
        knownWrap.style = `
          display:flex;
          flex-wrap:wrap;
          gap:5px;
          width:100%;
        `;

        knownTargets.forEach(targetInfo => {
          const tile = document.createElement("div");
          tile.style = `
            padding:6px 8px;
            border-radius:9px;
            background:${targetInfo.hasSunk ? "rgba(255,76,76,0.1)" : "rgba(250,204,21,0.08)"};
            border:${targetInfo.hasSunk ? "1px solid rgba(255,76,76,0.65)" : "1px solid rgba(250,204,21,0.55)"};
            font-weight:bold;
            text-align:center;
            min-width:64px;
            box-sizing:border-box;
          `;

          tile.innerHTML = `
            <div style="font-size:13px;line-height:1.1;">
              ${targetInfo.hasSunk ? "💥" : "🎯"} ${formatTarget(targetInfo.target)}
            </div>
            <div style="font-size:10px;color:${targetInfo.hasSunk ? "#ff4c4c" : "#facc15"};">
              ${targetInfo.hasSunk ? "Sunk" : `${targetInfo.damageKnown} / ???`}
            </div>
          `;

          knownWrap.appendChild(tile);
        });

        knownDiv.appendChild(knownWrap);
      }

      const missesDiv = document.getElementById(`knownMisses-${index}`);
      missesDiv.innerHTML = "";

      if (knownMisses.length > 0) {
        const missLabel = document.createElement("div");
        missLabel.style = `
          font-size:11px;
          color:#ff4c4c;
          font-weight:bold;
          margin:7px 0 4px;
          text-align:left;
        `;
        missLabel.innerText = "Misses Identified";
        missesDiv.appendChild(missLabel);

        const missWrap = document.createElement("div");
        missWrap.style = `
          display:flex;
          flex-wrap:wrap;
          gap:5px;
          width:100%;
        `;

        knownMisses.forEach(missInfo => {
          const tile = document.createElement("div");
          tile.style = `
            padding:5px 8px;
            border-radius:999px;
            background:rgba(255,76,76,0.08);
            border:1px solid rgba(255,76,76,0.55);
            font-weight:bold;
            text-align:center;
            box-sizing:border-box;
            font-size:12px;
            color:#ffffff;
          `;

          tile.innerHTML = `❌ ${formatTarget(missInfo.target)}`;

          missWrap.appendChild(tile);
        });

        missesDiv.appendChild(missWrap);
      }
    }
  });
}

function renderGameControls(container, state) {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";

  const canThrow = state.throwsThisTurn < 3 && !state.pendingWinnerConfirmation;

  const hitRow = document.createElement("div");
  hitRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
  `;

  [
    { label: "Single", value: "single" },
    { label: "Dub", value: "double" },
    { label: "Trip", value: "triple" }
  ].forEach(option => {
    const btn = document.createElement("div");
    btn.innerText = option.label;
    btn.style = `
      ${buttonStyle()}
      padding:10px;
      min-height:42px;
      font-size:15px;
      ${canThrow ? "" : "opacity:0.45;cursor:not-allowed;"}
    `;

    attachButtonClick(btn, () => {
      if (!canThrow) return;
      renderNumberPicker(container, "game", option.value);
    });

    hitRow.appendChild(btn);
  });

  const actionRow = document.createElement("div");
  actionRow.style = `
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
    ${canThrow ? "" : "opacity:0.45;cursor:not-allowed;"}
  `;
  attachButtonClick(missBtn, () => {
    if (!canThrow) return;
    submitThrow("miss");
    renderUI(container);
  });

  const nextBtn = document.createElement("div");
  nextBtn.innerText = "➡️ Next Team";
  nextBtn.style = `
    ${buttonStyle()}
    padding:10px;
    min-height:42px;
    font-size:15px;
  `;
  attachButtonClick(nextBtn, () => {
    nextTeam();
    renderUI(container);
  });

  actionRow.appendChild(missBtn);
  actionRow.appendChild(nextBtn);

  controls.appendChild(hitRow);
  controls.appendChild(actionRow);

  renderTurnSummaryIntoControls(controls, state);

  const utilityRow = document.createElement("div");
  utilityRow.style = `
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:8px;
    margin-top:8px;
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

  controls.appendChild(utilityRow);
}

function renderTurnSummaryIntoControls(parent, state) {
  const throws = state.currentTurnThrows || [];

  const summary = document.createElement("div");
  summary.style = `
    margin-top:10px;
    padding:10px;
    border-radius:12px;
    background:#111111;
    border:1px solid #ffffff;
    color:#ffffff;
  `;

  summary.innerHTML = `
    <div style="
      text-align:center;
      font-size:16px;
      font-weight:bold;
      margin-bottom:8px;
    ">
      Turn Summary
    </div>

    ${
      throws.length === 0
        ? `
          <div style="text-align:center;opacity:0.85;font-weight:bold;font-size:14px;">
            No darts thrown.
          </div>
        `
        : throws.map((throwRecord, index) => `
          <div style="
            padding:7px 0;
            border-top:${index === 0 ? "none" : "1px solid rgba(255,255,255,0.2)"};
            font-weight:bold;
            font-size:14px;
          ">
            <div>
              Dart ${index + 1}:
              ${
                throwRecord.hitType === "miss"
                  ? "Miss Board"
                  : `${formatHitType(throwRecord.hitType)} ${formatTarget(throwRecord.target)}`
              }
            </div>
            <div style="font-size:12px;color:#facc15;margin-top:2px;">
              ${throwRecord.summary}
            </div>
          </div>
        `).join("")
    }
  `;

  parent.appendChild(summary);
}

/* -------------------------
   TURN TRANSITION
--------------------------*/

function renderTurnTransition(container, state) {
  startNextTurn();
  renderUI(container);
}

/* -------------------------
   NUMBER PICKER
--------------------------*/

function renderNumberPicker(container, context, hitType) {
  const isTriple = hitType === "triple";
  const state = getState();
  const setupTeam = state.phase === "SETUP" ? state.teams[state.setupTeamIndex] : null;
  const activeTeam = state.phase === "GAME" ? state.teams[state.currentTeamIndex] : null;
  const setupPreview = setupTeam ? getSetupShipPreview(setupTeam, hitType) : null;

  function getTargetIntel(target) {
    if (!activeTeam || context !== "game") {
      return {
        status: "unknown",
        label: "",
        title: ""
      };
    }

    const key = String(target);
    const hitIntel = activeTeam.intel?.[key] || null;
    const missIntel = activeTeam.missIntel?.[key] || null;

    if (hitIntel?.hasSunk) {
      return {
        status: "sunk",
        label: "Sunk",
        title: `${formatTarget(target)} has a known sunk ship`
      };
    }

    if (hitIntel) {
      return {
        status: "hit",
        label: "Hit",
        title: `${formatTarget(target)} is a known enemy target`
      };
    }

    if (missIntel) {
      return {
        status: "miss",
        label: "Miss",
        title: `${formatTarget(target)} is a known miss`
      };
    }

    return {
      status: "unknown",
      label: "",
      title: ""
    };
  }

  function getTargetButtonStyle(target) {
    const intel = getTargetIntel(target);

    let extra = "";

    if (intel.status === "miss") {
      extra = `
        background:#374151;
        color:#9ca3af;
        border:1px solid #6b7280;
        opacity:0.72;
      `;
    }

    if (intel.status === "hit") {
      extra = `
        background:#111111;
        color:#ffffff;
        border:2px solid #ff4c4c;
        box-shadow:0 0 0 1px rgba(255,76,76,0.25);
      `;
    }

    if (intel.status === "sunk") {
      extra = `
        background:#1f2937;
        color:#ffffff;
        border:2px solid #ff4c4c;
        box-shadow:0 0 0 1px rgba(255,76,76,0.25);
      `;
    }

    return `
      ${buttonStyle()}
      width:100%;
      min-width:0;
      height:58px;
      min-height:58px;
      padding:0;
      margin:0;
      font-size:22px;
      line-height:1;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
      appearance:none;
      -webkit-appearance:none;
      position:relative;
      flex-direction:column;
      gap:2px;
      ${extra}
    `;
  }

  function getTargetButtonHtml(target) {
    const intel = getTargetIntel(target);
    const targetLabel = formatTarget(target);

    if (intel.status === "unknown") {
      return `
        <div style="font-size:22px;line-height:1;">${targetLabel}</div>
      `;
    }

    if (intel.status === "miss") {
      return `
        <div style="font-size:21px;line-height:1;">${targetLabel}</div>
        <div style="font-size:10px;line-height:1;color:#cbd5e1;">Miss</div>
      `;
    }

    if (intel.status === "hit") {
      return `
        <div style="
          position:absolute;
          top:3px;
          right:4px;
          font-size:8px;
          line-height:1;
          color:#ff4c4c;
          font-weight:bold;
          letter-spacing:0.4px;
        ">
          HIT
        </div>
        <div style="font-size:22px;line-height:1;">${targetLabel}</div>
      `;
    }

    return `
      <div style="font-size:20px;line-height:1;">☠️ ${targetLabel}</div>
      <div style="font-size:10px;line-height:1;color:#ff4c4c;">Sunk</div>
    `;
  }

  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">
      ${formatHitType(hitType)} ${context === "setup" ? "Ship" : "Target"}
    </h2>

    ${
      context === "setup"
        ? `
          <div style="
            text-align:center;
            color:#facc15;
            font-weight:bold;
            margin-bottom:12px;
          ">
            This ship will have ${setupPreview} lives.
          </div>
        `
        : `
          <div style="
            text-align:center;
            color:#facc15;
            font-weight:bold;
            margin-bottom:12px;
          ">
            Choose enemy target number.
          </div>

          <div style="
            display:grid;
            grid-template-columns:repeat(3, 1fr);
            gap:6px;
            margin-bottom:12px;
            font-size:11px;
            font-weight:bold;
            text-align:center;
          ">
            <div style="
              padding:5px;
              border-radius:8px;
              background:#374151;
              color:#cbd5e1;
              border:1px solid #6b7280;
            ">
              Gray = Miss
            </div>
            <div style="
              padding:5px;
              border-radius:8px;
              background:#111111;
              color:#ff4c4c;
              border:1px solid #ff4c4c;
            ">
              Red = Hit
            </div>
            <div style="
              padding:5px;
              border-radius:8px;
              background:#1f2937;
              color:#ff4c4c;
              border:1px solid #ff4c4c;
            ">
              ☠️ = Sunk
            </div>
          </div>
        `
    }

    <div id="numberGrid"></div>

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin-top:12px;
    ">
      <button id="bullBtn" type="button" style="
        ${context === "game" ? getTargetButtonStyle(25) : buttonStyle()}
        width:100%;
        padding:0;
        min-height:56px;
        font-size:20px;
        margin-top:0;
        touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;
        ${isTriple ? "background:#555;color:#bbb;border:1px solid #999;cursor:not-allowed;" : ""}
      ">
        ${context === "game" ? getTargetButtonHtml(25) : "Bull"}
      </button>

      <button id="closeModalBtn" type="button" style="
        ${buttonStyle()}
        width:100%;
        padding:0;
        min-height:56px;
        font-size:20px;
        margin-top:0;
        border:1px solid #ff4c4c;
        touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;
      ">Close</button>
    </div>
  `);

  const grid = document.getElementById("numberGrid");
  grid.style = `
    display:grid;
    grid-template-columns:repeat(4, minmax(0, 1fr));
    gap:10px;
  `;

  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = context === "game" ? getTargetButtonHtml(i) : i;
    btn.title = context === "game" ? getTargetIntel(i).title : "";

    btn.style =
      context === "game"
        ? getTargetButtonStyle(i)
        : `
          ${buttonStyle()}
          width:100%;
          min-width:0;
          height:58px;
          min-height:58px;
          padding:0;
          margin:0;
          font-size:22px;
          line-height:1;
          touch-action:manipulation;
          -webkit-tap-highlight-color:transparent;
          appearance:none;
          -webkit-appearance:none;
        `;

    attachNumberButtonClick(btn, () => {
      if (context === "setup") {
        addSetupShip(hitType, i);
      } else {
        submitThrow(hitType, i);
      }

      closeModal();
      renderUI(container);
    });

    grid.appendChild(btn);
  }

  const bullBtn = document.getElementById("bullBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (!isTriple) {
    bullBtn.title = context === "game" ? getTargetIntel(25).title : "";

    attachNumberButtonClick(bullBtn, () => {
      const bullHitType = hitType === "single" ? "greenBull" : "redBull";

      if (context === "setup") {
        addSetupShip(bullHitType, 25);
      } else {
        submitThrow(bullHitType, 25);
      }

      closeModal();
      renderUI(container);
    });
  }

  attachNumberButtonClick(closeBtn, closeModal);
}

/* -------------------------
   MODALS
--------------------------*/

function renderStatsModal(stats) {
  renderModalShell(`
    <h2 style="text-align:center;margin-top:0;">Battle Stats</h2>
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

  stats.teams.forEach(team => {
    const row = document.createElement("div");
    row.style = `
      margin-bottom:12px;
      padding:14px;
      border-radius:10px;
      background:#111111;
      border:1px solid ${team.color};
      color:#ffffff;
    `;

    row.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:4px;color:${team.color};">
        ${team.name}
      </div>
      <div style="font-size:13px;opacity:0.9;margin-bottom:8px;">
        ${team.players.join(" / ")}
      </div>
      <div style="font-size:14px;line-height:1.6;">
        • Remaining Ships: ${team.remainingShips}<br>
        • Sunk Ships: ${team.sunkShips}<br>
        • Throws: ${team.stats.throws}<br>
        • Hits: ${team.stats.hits}<br>
        • Misses: ${team.stats.misses}<br>
        • Ships Sunk: ${team.stats.shipsSunk}<br>
        • Damage Dealt: ${team.stats.damageDealt}<br>
        • Shanghais: ${team.stats.shanghais}
      </div>
    `;

    list.appendChild(row);
  });

  attachButtonClick(document.getElementById("closeModalBtn"), closeModal);
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

function renderEnd(container, state) {
  const winnerName = state.winner || "No Winner";
  const isShanghai = state.winnerReason === "shanghai";
  const stats = state.finalStats || getStats();

  const bannerOptions = isShanghai
    ? [
        "💥 SHANGHAI STRIKE 💥",
        "! TORPEDO TRICK SHOT !",
        "! THREE-DART BROADSIDE !",
        "! DIRECT HIT DISRESPECT !",
        "! NAVAL NONSENSE COMPLETE !"
      ]
    : [
        "! FLEET VICTORY !",
        "! ADMIRAL OF CHAOS !",
        "! SHIP HAPPENS !",
        "! UNSINKABLE-ISH !",
        "! TORPEDO PARTY !",
        "! HIGH SEAS HERO !",
        "! THE FLEET HAS FALLEN !",
        "! PERMISSION TO GLOAT !",
        "! BATTLESHIP BRAGGING RIGHTS !",
        "! FULL SEND FLOTILLA !"
      ];

  const headlineOptions = isShanghai
    ? [
        `${winnerName} Fired the Perfect Broadside!`,
        `${winnerName} Hit the Naval Jackpot!`,
        `${winnerName} Went Full Torpedo Wizard!`,
        `${winnerName} Ended It With a Boom!`,
        `${winnerName} Sank the Room in Three Shots!`
      ]
    : [
        `${winnerName} Sank the Fleet!`,
        `${winnerName} Rules the High Seas!`,
        `${winnerName} Fired the Final Shot!`,
        `${winnerName} Sent Them to Davy Jones!`,
        `${winnerName} Won the Naval Nonsense!`,
        `${winnerName} Torpedoed the Competition!`,
        `${winnerName} Made It Rain Cannonballs!`,
        `${winnerName} Left No Ships Floating!`
      ];

  const subheadOptions = isShanghai
    ? [
        "Single. Dub. Trip. That fleet never had a chance.",
        "A perfect spread of destruction. The ocean felt that.",
        "That was less strategy and more war crime adjacent.",
        "Three darts, one disaster movie, zero survivors.",
        "The ships were hidden. The disrespect was not."
      ]
    : [
        "Shots fired. Ships sunk. Feelings damaged.",
        "The ocean is calm because everyone else is underwater.",
        "A tactical masterpiece, if you ignore the trash talk.",
        "The fleet came in confident and left as artificial reef.",
        "Not exactly Top Gun, but definitely top dart.",
        "Misses were temporary. Sinking ships was forever.",
        "Some captains go down with the ship. Others just go down.",
        "That was less naval strategy and more beautiful chaos."
      ];

  const bodyOptions = isShanghai
    ? [
        `${winnerName} lined up the shot, dropped the hammer, and turned the enemy fleet into a very expensive snorkeling destination.`,
        `The board said BattleDarts. ${winnerName} heard “naval demolition derby” and acted accordingly.`,
        `${winnerName} did not just win — they delivered a three-dart torpedo seminar nobody asked to attend.`,
        `Some victories are earned. This one was launched, detonated, and probably reported to the Coast Guard.`,
        `${winnerName} hit the kind of Shanghai that makes captains quietly update their résumés.`
      ]
    : [
        `${winnerName} found the targets, sunk the ships, and left the rest of the fleet bobbing around like pool noodles in a hurricane.`,
        `When the smoke cleared, ${winnerName} was still standing on deck while everyone else was politely exploring the ocean floor.`,
        `${winnerName} did not just win — they launched a full maritime meltdown and turned the scoreboard into a shipwreck documentary.`,
        `The enemy fleet had plans. ${winnerName} had better darts. Somewhere, a tiny admiral is throwing his hat into the sea.`,
        `${winnerName} brought torpedoes to a dart fight and somehow that was completely legal. The fleet never stood a chance.`,
        `It started as a battle. It ended as a boating accident with witnesses. ${winnerName} takes the trophy and probably the insurance payout.`,
        `The ships were hidden, the pressure was high, and ${winnerName} still managed to turn the board into Battleship: The Revenge Tour.`,
        `${winnerName} sank ships with the calm confidence of someone who absolutely checked the rules and then ignored the spirit of them.`
      ];

  const pickRandom = options => options[Math.floor(Math.random() * options.length)];

  const selectedBanner = pickRandom(bannerOptions);
  const selectedHeadline = pickRandom(headlineOptions);
  const selectedSubhead =
    state.winnerReason === "ended_early"
      ? "Game ended early. Winner chosen by remaining fleet strength."
      : pickRandom(subheadOptions);
  const selectedBody =
    state.winnerReason === "ended_early"
      ? `${winnerName} may not have finished the battle, but they had enough fleet left to claim the harbor and start acting insufferable about it.`
      : pickRandom(bodyOptions);

  container.innerHTML = `
    <style>
      @keyframes battleGlow {
        0% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
        50% { box-shadow: 0 0 20px rgba(250,204,21,0.45), 0 0 36px rgba(34,197,94,0.25); }
        100% { box-shadow: 0 0 0 rgba(250,204,21,0.0), 0 0 0 rgba(34,197,94,0.0); }
      }

      @keyframes shipFloat {
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
      animation:battleGlow 2.8s infinite ease-in-out;
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
        animation:tapeFlash 1.5s infinite ease-in-out;
      ">
        ${selectedBanner}
      </div>

      <div style="
        text-align:center;
        font-size:54px;
        line-height:1;
        margin-bottom:8px;
        animation:trophyPulse 1.7s infinite ease-in-out;
      ">
        ${isShanghai ? "🏆💥🎯" : "🏆🚢🏆"}
      </div>

      <h2 style="
        text-align:center;
        margin:0 0 6px;
        font-size:28px;
        color:#ffffff;
      ">
        ${selectedHeadline}
      </h2>

      <div style="
        text-align:center;
        font-size:18px;
        color:#facc15;
        font-weight:bold;
        margin-bottom:10px;
      ">
        ${selectedSubhead}
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
        ${selectedBody}
      </div>

      <div id="finalFleetSummary"></div>

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

  const summary = document.getElementById("finalFleetSummary");
  summary.style = `
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-top:14px;
  `;

  stats.teams.forEach(team => {
    const row = document.createElement("div");
    row.style = `
      padding:10px;
      border-radius:12px;
      background:rgba(255,255,255,0.06);
      border:1px solid ${team.color};
      color:#ffffff;
      font-weight:bold;
      display:flex;
      justify-content:space-between;
      gap:10px;
      align-items:center;
    `;

    row.innerHTML = `
      <div>
        <div style="color:${team.color};">${team.name}</div>
        <div style="font-size:12px;opacity:0.85;">${team.players.join(" / ")}</div>
      </div>
      <div style="text-align:right;">
        <div>${team.remainingShips} ships</div>
      </div>
    `;

    summary.appendChild(row);
  });

  attachButtonClick(document.getElementById("playAgainBtn"), () => {
    const rotatedPlayers = rotatePlayers(state.originalPlayers || store.players || []);
    const mode = state.selectedMode;

    store.players = [...rotatedPlayers];
    revealedTeams.clear();
    initGame(rotatedPlayers);

    if (mode) {
      startMode(mode);
    }

    renderUI(container);
  });

  attachButtonClick(document.getElementById("statsBtn"), () => {
    renderStatsModal(stats);
  });

  attachButtonClick(document.getElementById("mainMenuBtn"), () => {
    store.screen = "HOME";
    store.players = [];
    revealedTeams.clear();
    renderApp();
  });
}
