import { store } from "./store.js";
import { renderHome } from "../screens/HomeScreen.js";
import { renderCategory } from "../screens/CategoryScreen.js";
import { renderSetup } from "../screens/SetupScreen.js";
import { renderGame } from "../screens/GameScreen.js";
import { renderHistory } from "../screens/HistoryScreen.js";

export function renderApp() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  switch (store.screen) {
    case "HOME":
      renderHome(app);
      break;
    case "CATEGORY":
      renderCategory(app);
      break;
    case "SETUP":
      renderSetup(app);
      break;
    case "GAME":
      renderGame(app);
      break;
    case "HISTORY":
      renderHistory(app);
      break;
    default:
      renderHome(app);
      break;
  }
}
