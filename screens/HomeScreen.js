console.log("HOME SCREEN RENDERING");

import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

export function renderHome(container) {
  container.innerHTML = `
    <h1>Barndarts</h1>

    <div class="card" id="fun" style="border:1px solid #9ca3af;">FUN!</div>
    <div class="card" id="x01" style="border:1px solid #9ca3af;">X01</div>
    <div class="card" id="cricket" style="border:1px solid #9ca3af;">Cricket</div>
    <div class="card" id="history" style="border:1px solid #9ca3af;">History</div>
  `;

  document.getElementById("fun").onclick = () => {
    store.selectedCategory = "fun";
    store.screen = "CATEGORY";
    renderApp();
  };

  document.getElementById("x01").onclick = () => {
    store.selectedCategory = "x01";
    store.screen = "CATEGORY";
    renderApp();
  };

  document.getElementById("cricket").onclick = () => {
    store.selectedCategory = "cricket";
    store.screen = "CATEGORY";
    renderApp();
  };

  document.getElementById("history").onclick = () => {
    store.screen = "HISTORY";
    renderApp();
  };
}
