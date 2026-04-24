import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

const PLAYER_PROFILES_KEY = "barndarts_player_profiles";

const AVATAR_OPTIONS = [
  "🎯", "🍺", "🔥", "☣️", "🏌️",
  "🧟", "⚡", "🏆", "🎸", "🐐",
  "🦆", "🦖", "👽", "🤘", "🕺"
];

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
    avatar: "🎯",
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
    padding:8px;
    min-height:38px;
  `;
}

function miniButtonStyle() {
  return `
    background:#206a1e;
    color:#ffffff;
    border:1px solid #ffffff;
    border-radius:8px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    box-sizing:border-box;
    text-align:center;
    user-select:none;
    padding:8px;
    min-height:38px;
    font-size:13px;
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
    box-sizing:border-box;
  `;
}

function avatarStyle(color) {
  return `
    width:42px;
    height:42px;
    border-radius:999px;
    background:${color || "#206a1e"};
    color:#ffffff;
    border:1px solid #ffffff;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:bold;
    flex-shrink:0;
    font-size:22px;
  `;
}

function getAvatar(profile) {
  return profile.avatar || "🎯";
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

    <div id="selectedCount" style="
      text-align:center;
      font-weight:bold;
      margin:10px 0;
      color:#ffffff;
    "></div>

    <div id="players"></div>

    <div id="start" style="${buttonStyle()}">Start Game</div>
    <div id="back" style="${lightButtonStyle()}">Back</div>
  `;

  const playersDiv = document.getElementById("players");
  const selectedCount = document.getElementById("selectedCount");

  function updateSelectedCount() {
    selectedCount.innerText = `Select Players (${selectedIds.size} selected)`;
  }

  function renderPlayers() {
    updateSelectedCount();

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
        <div data-select-player="${profile.id}" style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          cursor:pointer;
        ">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="${avatarStyle(profile.color)}">
              ${getAvatar(profile)}
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
        </div>

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          margin-top:10px;
        ">
          <div data-edit-player="${profile.id}" style="${miniButtonStyle()}">Edit</div>
          <div data-delete-player="${profile.id}" style="${dangerButtonStyle()}">Delete</div>
        </div>
      `;

      playersDiv.appendChild(row);
    });

    playersDiv.querySelectorAll("[data-select-player]").forEach(el => {
      el.onclick = () => {
        const id = el.getAttribute("data-select-player");

        if (selectedIds.has(id)) {
          selectedIds.delete(id);
        } else {
          selectedIds.add(id);
        }

        renderPlayers();
      };
    });

    playersDiv.querySelectorAll("[data-edit-player]").forEach(el => {
      el.onclick = () => {
        const id = el.getAttribute("data-edit-player");
        renderEditPlayer(id);
      };
    });

    playersDiv.querySelectorAll("[data-delete-player]").forEach(el => {
      el.onclick = () => {
        const id = el.getAttribute("data-delete-player");
        const profile = profiles.find(p => p.id === id);
        if (!profile) return;

        const confirmed = confirm(`Delete ${profile.name}?`);
        if (!confirmed) return;

        profiles = profiles.filter(p => p.id !== id);
        selectedIds.delete(id);
        saveProfiles(profiles);
        renderPlayers();
      };
    });
  }

  function renderEditPlayer(profileId, avatarOverride = null) {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return;

  let selectedAvatar = avatarOverride || profile.avatar || "🎯";

  playersDiv.innerHTML = `
    <div style="
      background:#111111;
      color:#ffffff;
      border:1px solid #9ca3af;
      border-radius:12px;
      padding:12px;
      margin-bottom:8px;
    ">
      <div style="
        text-align:center;
        font-weight:bold;
        font-size:18px;
        margin-bottom:10px;
      ">
        Edit Player
      </div>

      <input
        id="editPlayerName"
        value="${profile.name}"
        style="
          width:100%;
          box-sizing:border-box;
          padding:10px;
          border-radius:10px;
          border:1px solid #9ca3af;
          margin-bottom:10px;
          font-size:16px;
        "
      />

      <div style="
        text-align:center;
        font-weight:bold;
        margin-bottom:8px;
      ">
        Avatar
      </div>

      <div id="avatarGrid" style="
        display:grid;
        grid-template-columns:repeat(5, 1fr);
        gap:8px;
        margin-bottom:10px;
      "></div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
      ">
        <div id="cancelEdit" style="${lightButtonStyle()}">Cancel</div>
        <div id="saveEdit" style="${buttonStyle()}">Save</div>
      </div>
    </div>
  `;

  const avatarGrid = document.getElementById("avatarGrid");

  AVATAR_OPTIONS.forEach(avatar => {
    const btn = document.createElement("div");
    btn.innerText = avatar;
    btn.style = `
      ${avatarStyle(profile.color)}
      width:auto;
      height:44px;
      border:${selectedAvatar === avatar ? "3px solid #f0970a" : "1px solid #ffffff"};
      cursor:pointer;
    `;

    btn.onclick = () => {
      renderEditPlayer(profileId, avatar);
    };

    avatarGrid.appendChild(btn);
  });

  document.getElementById("cancelEdit").onclick = () => {
    renderPlayers();
  };

  document.getElementById("saveEdit").onclick = () => {
    const newName = document.getElementById("editPlayerName").value.trim();
    if (!newName) return;

    const duplicate = profiles.some(
      p => p.id !== profileId && p.name.toLowerCase() === newName.toLowerCase()
    );

    if (duplicate) {
      alert("That player already exists.");
      return;
    }

    profile.name = newName;
    profile.avatar = selectedAvatar;
    profile.updatedAt = new Date().toISOString();

    saveProfiles(profiles);
    renderPlayers();
  };
}
