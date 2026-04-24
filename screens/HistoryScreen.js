import { renderApp } from "../core/router.js";
import { store } from "../core/store.js";
import { getGameHistory, clearGameHistory } from "../core/historyService.js";

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
    padding:10px;
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
    padding:10px;
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
    padding:10px;
    margin-top:8px;
  `;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function renderHistory(container) {
  const history = getGameHistory();

  container.innerHTML = `
    <h1>History</h1>

    <div id="historyList"></div>

    <div id="clear" style="${dangerButtonStyle()}">Clear History</div>
    <div id="back" style="${lightButtonStyle()}">Back</div>
  `;

  const list = document.getElementById("historyList");

  if (!history.length) {
    list.innerHTML = `
      <div style="
        background:#111111;
        border:1px solid #9ca3af;
        border-radius:10px;
        padding:12px;
        text-align:center;
        color:#ffffff;
        font-weight:bold;
      ">
        No games played yet.
      </div>
    `;
  } else {
    list.innerHTML = "";

    history.forEach(game => {
      const card = document.createElement("div");

      card.style = `
        background:#111111;
        border:1px solid #9ca3af;
        border-radius:12px;
        padding:12px;
        margin-bottom:10px;
        color:#ffffff;
      `;

      const winner = game.winner
        ? `${game.winner.name}`
        : "No winner";

      card.innerHTML = `
        <div style="font-weight:bold;font-size:16px;margin-bottom:4px;">
          ${game.gameName}
        </div>

        <div style="font-size:13px;margin-bottom:8px;opacity:0.8;">
          ${formatDate(game.playedAt)}
        </div>

        <div style="margin-bottom:8px;color:#facc15;font-weight:bold;">
          Winner: ${winner}
        </div>

        <div>
          ${game.players.map(p => `
            <div style="
              display:flex;
              justify-content:space-between;
              font-size:14px;
              padding:4px 0;
              border-top:1px solid rgba(255,255,255,0.1);
            ">
              <span>${p.avatar || ""} ${p.name}</span>
              <span>${p.score ?? ""}</span>
            </div>
          `).join("")}
        </div>
      `;

      list.appendChild(card);
    });
  }

  document.getElementById("clear").onclick = () => {
    const confirmClear = confirm("Clear all history?");
    if (!confirmClear) return;

    clearGameHistory();
    renderHistory(container);
  };

  document.getElementById("back").onclick = () => {
    store.screen = "HOME";
    renderApp();
  };
}
