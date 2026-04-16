import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

const gamesByCategory = {
  fun: ["GolfDarts", "Ahman Green", "FootDarts"],
  x01: ["301", "501", "701"],
  cricket: ["Standard", "No Score", "Random"]
};

export function renderCategory(container) {
  const games = gamesByCategory[store.selectedCategory];

  container.innerHTML = `
    <h1>${store.selectedCategory.toUpperCase()}</h1>
    <div id="list"></div>
    <div class="button" id="back">Back</div>
  `;

  const list = document.getElementById("list");

  games.forEach(game => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerText = game;

    div.onclick = () => {
      store.selectedGame = game;
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
