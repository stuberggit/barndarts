import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

export function renderHome(container) {
  container.innerHTML = `
    <h1>Barndarts</h1>

    <div class="card" id="fun">FUN!</div>
    <div class="card" id="x01">X01</div>
    <div class="card" id="cricket">Cricket</div>
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
}
