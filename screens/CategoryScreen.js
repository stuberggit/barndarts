import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

const gamesByCategory = {
  fun: [
    { id: "ahman-green", label: "Ahman Green", built: true },
    { id: "GolfDarts", label: "GolfDarts", built: true },
    { id: "hammer-cricket", label: "Hammer Cricket", built: true },
    { id: "killer", label: "Killer", built: true },
    { id: "survivor-301", label: "Survivor 301", built: true },
  ],
  x01: [
    { id: "gotcha", label: "Gotcha", built: false },
    { id: "301", label: "301", built: false },
    { id: "501", label: "501", built: false },
    { id: "701", label: "701", built: false }
  ],
  cricket: [
    { id: "cricket-no-score", label: "No Score", built: false },
    { id: "cricket-random", label: "Random", built: false },
    { id: "cricket-standard", label: "Standard", built: false }
  ]
};

function builtGameCardStyle() {
  return `
    border:1px solid #9ca3af;
  `;
}

function comingSoonCardStyle() {
  return `
    border:1px solid #9ca3af;
    opacity:0.55;
    cursor:not-allowed;
  `;
}

function backButtonStyle() {
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
    margin-top:12px;
  `;
}

export function renderCategory(container) {
  const games = gamesByCategory[store.selectedCategory] || [];

  container.innerHTML = `
    <h1>${store.selectedCategory.toUpperCase()}</h1>
    <div id="list"></div>
    <div id="back" style="${backButtonStyle()}">Back</div>
  `;

  const list = document.getElementById("list");

  games.forEach(game => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerText = game.built === false ? `${game.label} — Soon` : game.label;
    div.style = game.built === false ? comingSoonCardStyle() : builtGameCardStyle();

    if (game.built !== false) {
      div.onclick = () => {
        store.selectedGame = game.id;
        store.screen = "SETUP";
        renderApp();
      };
    }

    list.appendChild(div);
  });

  document.getElementById("back").onclick = () => {
    store.screen = "HOME";
    renderApp();
  };
}
