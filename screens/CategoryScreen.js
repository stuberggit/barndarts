import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

const gamesByCategory = {
  fun: [
    { id: "ahman-green", label: "Ahman Green" },
    { id: "GolfDarts", label: "GolfDarts" },
    { id: "hammer-cricket", label: "Hammer Cricket" },
    { id: "killer", label: "Killer" },
    { id: "survivor-301", label: "Survivor 301" },
    { id: "soon-footdarts", label: "Soon - FootDarts" }
  ],
  x01: [
    { id: "gotcha", label: "Gotcha" },
    { id: "301", label: "301" },
    { id: "501", label: "501" },
    { id: "701", label: "701" }
  ],
  cricket: [
    { id: "cricket-no-score", label: "No Score" },
    { id: "cricket-random", label: "Random" },
    { id: "cricket-standard", label: "Standard" }
  ]
};

export function renderCategory(container) {
  const games = gamesByCategory[store.selectedCategory] || [];

  container.innerHTML = `
    <h1>${store.selectedCategory.toUpperCase()}</h1>
    <div id="list"></div>
    <div class="button" id="back">Back</div>
  `;

  const list = document.getElementById("list");

  games.forEach(game => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerText = game.label;

    div.onclick = () => {
      store.selectedGame = game.id;
      store.screen = "SETUP";
      renderApp();
    };

    list.appendChild(div);
  });

  document.getElementById("back").onclick = () => {
    store.screen = "HOME";
    renderApp();
  };
}
