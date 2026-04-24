import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

const PLAYER_PROFILES_KEY = "barndarts_player_profiles";

function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PLAYER_PROFILES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(PLAYER_PROFILES_KEY, JSON.stringify(profiles));
}

function createPlayerProfile(name) {
  return {
    id: `player_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    avatar: null,
    color: "#206a1e",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    padding:10px;
    min-height:44px;
    margin-top:8px;
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
    padding:10px;
    min-height:44px;
    margin-top:8px;
  `;
}

function playerBlockStyle(isSelected) {
  return `
    background:#111111;
    color:#ffffff;
    border:${isSelected ? "3px solid #f0970a" : "1px solid #9ca3af"};
    border-radius:12px;
    padding:12px;
    margin-bottom:8px;
    font-weight:bold;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    cursor:pointer;
    box-sizing:border-box;
  `;
}

function avatarStyle(color) {
  return `
    width:38px;
    height:38px;
    border-radius:999px;
    background:${color || "#206a1e"};
    color:#ffffff;
    border:1px solid #ffffff;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    flex-shrink:0;
  `;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "?";
}

export function renderSetup(container) {
  let profiles = loadProfiles();
  let selectedIds = new Set();

  store.players = [];

  container.innerHTML = `
    <h1>${store.selectedGame}</h1>

    <div style="
      background:#111111;
      border:1px solid #9ca3af;
      border-radius:12px;
      padding:12px;
      margin-bottom:12px;
    ">
      <input
        id="playerName"
        placeholder="Add player name"
        style="
          width:100%;
          box-sizing:border-box;
          padding:10px;
          border-radius:10px;
          border:1px solid #9ca3af;
          margin-bottom:8px;
          font-size:16px;
        "
      />

      <div id="addPlayer" style="${buttonStyle()}">Add Player Block</div>
    </div>

    <div style="
      text-align:center;
      font-weight:bold;
      margin:10px 0;
      color:#ffffff;
    ">
      Select Players
    </div>

    <div id="players"></div>

    <div id="start" style="${buttonStyle()}">Start Game</div>
    <div id="back" style="${lightButtonStyle()}">Back</div>
  `;

  const playersDiv = document.getElementById("players");

  function renderPlayers() {
    if (!profiles.length) {
      playersDiv.innerHTML = `
        <div style="
          background:#111111;
          color:#ffffff;
          border:1px solid #9ca3af;
          border-radius:10px;
          padding:12px;
          text-align:center;
          font-weight:bold;
          opacity:0.85;
        ">
          No saved players yet.
        </div>
      `;
      return;
    }

    playersDiv.innerHTML = "";

    profiles.forEach(profile => {
      const isSelected = selectedIds.has(profile.id);

      const row = document.createElement("div");
      row.style = playerBlockStyle(isSelected);

      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <div style="${avatarStyle(profile.color)}">
            ${getInitials(profile.name)}
          </div>
          <div style="
            font-size:18px;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          ">
            ${profile.name}
          </div>
        </div>

        <div style="
          color:${isSelected ? "#f0970a" : "#9ca3af"};
          font-size:14px;
          flex-shrink:0;
        ">
          ${isSelected ? "SELECTED" : "Tap to Select"}
        </div>
      `;

      row.onclick = () => {
        if (selectedIds.has(profile.id)) {
          selectedIds.delete(profile.id);
        } else {
          selectedIds.add(profile.id);
        }

        renderPlayers();
      };

      playersDiv.appendChild(row);
    });
  }

  document.getElementById("addPlayer").onclick = () => {
    const input = document.getElementById("playerName");
    const name = input.value.trim();

    if (!name) return;

    const duplicate = profiles.some(
      profile => profile.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      alert("That player already exists.");
      return;
    }

    const newProfile = createPlayerProfile(name);
    profiles.push(newProfile);
    saveProfiles(profiles);

    selectedIds.add(newProfile.id);
    input.value = "";

    renderPlayers();
  };

  document.getElementById("start").onclick = () => {
    const selectedPlayers = profiles
      .filter(profile => selectedIds.has(profile.id))
      .map(profile => profile.name);

    if (selectedPlayers.length < 1) {
      alert("Select at least one player.");
      return;
    }

    store.players = selectedPlayers;
    store.screen = "GAME";
    renderApp();
  };

  document.getElementById("back").onclick = () => {
    store.screen = "CATEGORY";
    renderApp();
  };

  renderPlayers();
}
