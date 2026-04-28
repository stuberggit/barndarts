import { store } from "../core/store.js";
import { renderApp } from "../core/router.js";

const PLAYER_PROFILES_KEY = "barndarts_player_profiles";
const LAST_SELECTED_PLAYERS_KEY = "barndarts_last_selected_players";

const AVATAR_OPTIONS = [
  "🎯", "🍺", "🔥", "☣️", "🏌️",
  "🧟", "⚡", "🏆", "🎸", "🐐",
  "🦆", "🦖", "👽", "🤘", "🕺"
];

const gameDisplayNames = {
  "ahman-green": "Ahman Green",
  "GolfDarts": "GolfDarts",
  "hammer-cricket": "Hammered",
  "killer": "Killer",
  "survivor-301": "Survivor 301",
  "gotcha": "Gotcha 301",
  "301": "301",
  "x01": "X01",
  "cricket-standard": "Cricket (Points)",
  "cricket-no-score": "Cricket (No Points)"
};

const gameRules = {
  "ahman-green": {
    title: "Ahman Green",
    quick: [
      "Be the first player to complete the color sequence: Black → White → Green → Red.",
      "On your turn, hit the color you currently need to advance.",
      "Party jumps you forward to the last round, needing Red.",
      "AC/DC sends you Back in Black."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Be the first player to complete Black, White, Green, and Red in order."
        ]
      },
      {
        heading: "How to Play",
        items: [
          "Players take turns throwing up to 3 darts.",
          "Each player has a current color they need.",
          "If you hit the color you need, you advance to the next color.",
          "Out-of-order colors do not advance you."
        ]
      },
      {
        heading: "Party",
        items: [
          "A Party happens when the dart hits the board but lands outside the outer ring.",
          "Party jumps the player forward to the last round, needing Red."
        ]
      },
      {
        heading: "AC/DC",
        items: [
          "AC/DC happens when the dart misses the board entirely.",
          "AC/DC sends the player Back in Black."
        ]
      },
      {
        heading: "Winning",
        items: [
          "The first player to complete Red wins."
        ]
      }
    ]
  },

  "GolfDarts": {
    title: "GolfDarts",
    quick: [
      "Play 18 holes of darts golf.",
      "Lowest total score wins.",
      "Each hole has a target number.",
      "Throw 3 darts at the current hole number."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Play 18 holes and finish with the lowest total score."
        ]
      },
      {
        heading: "How to Play",
        items: [
          "Each hole has a target number.",
          "Players throw 3 darts at the current hole number.",
          "Your score is based on how many total hits you get on that target."
        ]
      },
      {
        heading: "Basic Scoring",
        items: [
          "0 hits scores 5.",
          "1 hit scores 3.",
          "2 hits scores 2.",
          "3 hits scores 1.",
          "More hits can score even better, down to a maximum result of -5."
        ]
      },
      {
        heading: "Hazards",
        items: [
          "Some holes may be hazard holes.",
          "Hazards add penalty strokes to the hole score."
        ]
      },
      {
        heading: "Hammer Holes",
        items: [
          "Hammer holes score based on dart order.",
          "The 1st dart is worth ×1, the 2nd dart is worth ×2, and the 3rd dart is worth ×3."
        ]
      },
      {
        heading: "Shanghai",
        items: [
          "If a player hits Single, Dub, and Trip of the current hole number in one turn, they immediately win."
        ]
      },
      {
        heading: "Winning",
        items: [
          "After 18 holes, the lowest total score wins.",
          "If players are tied after 18 holes, tied players continue in sudden death until one player wins a hole outright."
        ]
      }
    ]
  },

  "hammer-cricket": {
    title: "Hammered",
    quick: [
      "Score as many points as possible through a fixed target sequence.",
      "Targets use 15 through 20, Bull, and bonus rounds.",
      "Dart order matters.",
      "Highest score wins."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Score as many points as possible through all rounds.",
          "Highest total score wins."
        ]
      },
      {
        heading: "Round Order",
        items: [
          "The round order is 15, 16, 17, Bonus, 18, 19, 20, Bull, Bonus.",
          "Bonus rounds randomly choose a target from 15, 16, 17, 18, 19, 20, or Bull."
        ]
      },
      {
        heading: "Number Rounds",
        items: [
          "Miss = 0.",
          "Single = 1.",
          "Dub = 2.",
          "Trip = 3.",
          "The 1st dart is worth ×1, the 2nd dart is worth ×2, and the 3rd dart is worth ×3."
        ]
      },
      {
        heading: "Bonus Rounds",
        items: [
          "Bonus rounds use bigger dart-order multipliers.",
          "The 1st dart is worth ×1, the 2nd dart is worth ×3, and the 3rd dart is worth ×5."
        ]
      },
      {
        heading: "Bull",
        items: [
          "Bull is treated as 25.",
          "Sing Bull counts as the lower Bull hit.",
          "Dub Bull counts as the higher Bull hit.",
          "There is no Trip Bull."
        ]
      },
      {
        heading: "Penalty",
        items: [
          "A complete 3-dart miss triggers a penalty.",
          "On number rounds, the penalty is target × 3.",
          "On bonus rounds, the penalty is target × 5."
        ]
      },
      {
        heading: "Shanghai",
        items: [
          "On number targets, Single + Dub + Trip in one turn is Shanghai and immediately wins.",
          "On Bull, 2 Sing Bulls + 1 Dub Bull in one turn is Shanghai and immediately wins."
        ]
      },
      {
        heading: "Winning",
        items: [
          "After all rounds are complete, the player with the highest score wins."
        ]
      }
    ]
  },

  "killer": {
    title: "Killer",
    quick: [
      "Claim a target using your Non-Dominant Hand.",
      "Become a Killer, take lives, survive Redemskis, and be the last player alive.",
      "Dormant Dead players can be Zombied back into the game.",
      "A Killer can win instantly with Shanghai on an opponent’s target."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Be the last active player alive."
        ]
      },
      {
        heading: "Setup: NDH (Non-Dominant Hand)",
        items: [
          "Players first throw with their Non-Dominant Hand to claim a target.",
          "Targets can be numbers 1–20 or Bull.",
          "If a player claims a target with a Dub, Trip, Sing Bull, or Dub Bull, they immediately start as a Killer.",
          "If a player claims a target with a Single, they own the target but still need to unlock Killer status."
        ]
      },
      {
        heading: "Taking Targets During Setup",
        items: [
          "If a player hits a number, another player can take that number with a higher mark.",
          "A Trip cannot be taken.",
          "A Dub can be taken by a Trip.",
          "A Single can be taken by either a Dub or Trip.",
          "Sing Bull can be taken by Dub Bull."
        ]
      },
      {
        heading: "Killer Status",
        items: [
          "A player must be a Killer before they can damage other players.",
          "When a non-Killer hits their own target, they unlock Killer status."
        ]
      },
      {
        heading: "Lives",
        items: [
          "Each player starts with 6 lives.",
          "Single removes 1 life.",
          "Dub removes 2 lives.",
          "Trip removes 3 lives.",
          "Sing Bull removes 2 lives.",
          "Dub Bull removes 3 lives."
        ]
      },
      {
        heading: "Self Hits",
        items: [
          "Players can hit their own target and damage themselves.",
          "A player can eliminate themselves if they hit their own target while following normal gameplay rules."
        ]
      },
      {
        heading: "Max Damage Per Turn",
        items: [
          "A maximum of 3 lives or turn events can be taken in a single turn."
        ]
      },
      {
        heading: "Redemski",
        items: [
          "When a player would be eliminated, they get a Redemski chance.",
          "To survive on a number target, they must hit a Dub or Trip of their own target.",
          "To survive on Bull, any Bull hit revives them.",
          "If they succeed, they return with 1 life.",
          "If they fail, they become Dormant Dead."
        ]
      },
      {
        heading: "Dormant Dead and Zombies",
        items: [
          "Dormant Dead players do not take turns.",
          "A Dormant Dead player can be Zombied back into the game if an active player hits a Dub or Trip of that Dormant Dead player’s number.",
          "If the Dormant Dead player’s target is Bull, any Bull hit Zombies them back in.",
          "When Zombied, the player returns with 1 life and Killer status."
        ]
      },
      {
        heading: "Shanghai",
        items: [
          "A Killer can win immediately by hitting a valid Shanghai on an opponent’s target.",
          "On number targets, Shanghai is Single + Dub + Trip.",
          "On Bull, Shanghai is 2 Sing Bulls + 1 Dub Bull."
        ]
      },
      {
        heading: "Winning",
        items: [
          "The last active player wins."
        ]
      }
    ]
  },

  "survivor-301": {
    title: "Survivor 301",
    quick: [
      "Everyone starts at 301.",
      "Most hits subtract points from your own score.",
      "Bonus targets and Bulls can add points.",
      "Last player above zero wins."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Be the last player standing."
        ]
      },
      {
        heading: "Starting Score",
        items: [
          "Each player starts with 301 points."
        ]
      },
      {
        heading: "How to Play",
        items: [
          "Players take turns throwing up to 3 darts.",
          "Number hits usually subtract points from your own score.",
          "Single subtracts the number hit.",
          "Dub subtracts double the number hit.",
          "Trip subtracts triple the number hit."
        ]
      },
      {
        heading: "Wildcard / Bonus Number",
        items: [
          "Each round can include a wildcard or bonus number.",
          "Hitting the bonus number earns points instead of subtracting points."
        ]
      },
      {
        heading: "Bulls",
        items: [
          "Bull hits can earn points instead of subtracting points.",
          "Stronger Bull hits are worth more than weaker Bull hits."
        ]
      },
      {
        heading: "Elimination",
        items: [
          "If your score reaches 0 or goes below 0, you are eliminated."
        ]
      },
      {
        heading: "Winning",
        items: [
          "The last player above zero wins."
        ]
      }
    ]
  },

  "gotcha": {
    title: "Gotcha 301",
    quick: [
      "Start at 0 and race to exactly 301.",
      "If you match another player’s score, you Gotcha them back to zero.",
      "Going over 301 busts your whole turn.",
      "First player to exactly 301 wins."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Be the first player to land exactly on 301."
        ]
      },
      {
        heading: "Starting Score",
        items: [
          "Each player starts at 0."
        ]
      },
      {
        heading: "How to Play",
        items: [
          "Players add points by hitting numbers, Dubs, Trips, and Bulls.",
          "You must land exactly on 301 to win."
        ]
      },
      {
        heading: "Busts",
        items: [
          "If your score goes over 301, your turn busts.",
          "A bust resets your whole turn and returns you to the score you had at the beginning of that turn."
        ]
      },
      {
        heading: "Gotcha",
        items: [
          "If your score matches another player’s score, you Gotcha them.",
          "A Gotcha sends that player back to zero."
        ]
      },
      {
        heading: "Gentlemanly Rules",
        items: [
          "Winning on a Single is allowed, but ungentlemanly.",
          "Winning on a Dub or Trip is very gentlemanly."
        ]
      },
      {
        heading: "Winning",
        items: [
          "The first player to reach exactly 301 wins."
        ]
      }
    ]
  },

  "301": {
    title: "301",
    quick: [
      "Start at 301 and race down to exactly 0.",
      "Straight-in and straight-out.",
      "Busts reset your whole turn.",
      "First player to exactly 0 wins."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Be the first player to count down from 301 to exactly 0."
        ]
      },
      {
        heading: "How to Play",
        items: [
          "Each player starts at 301.",
          "Players subtract points by hitting numbers, Dubs, Trips, and Bulls.",
          "This is straight-in and straight-out."
        ]
      },
      {
        heading: "Busts",
        items: [
          "If you go below 0, your turn busts.",
          "A bust resets your whole turn and returns you to the score you had at the beginning of that turn."
        ]
      },
      {
        heading: "Gentlemanly Rules",
        items: [
          "Winning on a Single is allowed, but ungentlemanly.",
          "Winning on a Dub or Trip is very gentlemanly."
        ]
      },
      {
        heading: "Winning",
        items: [
          "The first player to reach exactly 0 wins."
        ]
      }
    ]
  },

  "x01": {
    title: "X01",
    quick: [
      "Choose an X01 starting score and race down to exactly 0.",
      "Straight-in and straight-out.",
      "Busts reset your whole turn.",
      "First player to exactly 0 wins."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Be the first player to count down from the starting score to exactly 0."
        ]
      },
      {
        heading: "How to Play",
        items: [
          "Players subtract points by hitting numbers, Dubs, Trips, and Bulls.",
          "This is straight-in and straight-out."
        ]
      },
      {
        heading: "Busts",
        items: [
          "If you go below 0, your turn busts.",
          "A bust resets your whole turn and returns you to the score you had at the beginning of that turn."
        ]
      },
      {
        heading: "Gentlemanly Rules",
        items: [
          "Winning on a Single is allowed, but ungentlemanly.",
          "Winning on a Dub or Trip is very gentlemanly."
        ]
      },
      {
        heading: "Winning",
        items: [
          "The first player to reach exactly 0 wins."
        ]
      }
    ]
  },

  "cricket-standard": {
    title: "Cricket (Points)",
    quick: [
      "Close 20 through 15 and Bull.",
      "Score points on numbers you have closed while opponents still have them open.",
      "Close everything and finish with the highest score.",
      "Shanghai is allowed, including on Bull."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Close all cricket targets and finish with more points than your opponents."
        ]
      },
      {
        heading: "Targets",
        items: [
          "Targets are 20, 19, 18, 17, 16, 15, and Bull."
        ]
      },
      {
        heading: "Marks",
        items: [
          "Each target needs 3 marks to close.",
          "Single = 1 mark.",
          "Dub = 2 marks.",
          "Trip = 3 marks.",
          "Outer Bull = 1 mark.",
          "Inner Bull = 2 marks."
        ]
      },
      {
        heading: "Scoring Points",
        items: [
          "Once you close a target, extra hits on that target score points if at least one opponent still has it open.",
          "When all players close a target, no more points can be scored on it."
        ]
      },
      {
        heading: "Shanghai",
        items: [
          "On number targets, Single + Dub + Trip in one turn is Shanghai and immediately wins.",
          "On Bull, 2 Sing Bulls + 1 Dub Bull in one turn is Shanghai and immediately wins."
        ]
      },
      {
        heading: "Winning",
        items: [
          "To win, close all targets and have the highest score."
        ]
      }
    ]
  },

  "cricket-no-score": {
    title: "Cricket (No Points)",
    quick: [
      "Close 20 through 15 and Bull.",
      "No points are scored.",
      "First player to close everything wins.",
      "Shanghai is allowed, including on Bull."
    ],
    details: [
      {
        heading: "Goal",
        items: [
          "Be the first player to close all cricket targets."
        ]
      },
      {
        heading: "Targets",
        items: [
          "Targets are 20, 19, 18, 17, 16, 15, and Bull."
        ]
      },
      {
        heading: "Marks",
        items: [
          "Each target needs 3 marks to close.",
          "Single = 1 mark.",
          "Dub = 2 marks.",
          "Trip = 3 marks.",
          "Outer Bull = 1 mark.",
          "Inner Bull = 2 marks."
        ]
      },
      {
        heading: "Shanghai",
        items: [
          "On number targets, Single + Dub + Trip in one turn is Shanghai and immediately wins.",
          "On Bull, 2 Sing Bulls + 1 Dub Bull in one turn is Shanghai and immediately wins."
        ]
      },
      {
        heading: "Winning",
        items: [
          "The first player to close all targets wins."
        ]
      }
    ]
  }
};

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

function rulesButtonStyle() {
  return `
    background:#1e3a5f;
    color:#ffffff;
    border:1px solid #93c5fd;
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
    position:relative;
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

function orderBadgeStyle() {
  return `
    background:#facc15;
    color:#111111;
    border:1px solid #ffffff;
    border-radius:999px;
    padding:4px 9px;
    font-size:13px;
    font-weight:bold;
    flex-shrink:0;
  `;
}

function modalButtonStyle() {
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
  `;
}

function getGameDisplayName(gameId) {
  return gameDisplayNames[gameId] || gameId;
}

function getAvatar(profile) {
  return profile.avatar || "🎯";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getOrderedProfiles(profiles, selectedOrderIds) {
  return selectedOrderIds
    .map(id => profiles.find(profile => profile.id === id))
    .filter(Boolean);
}

function renderModalShell(innerHtml) {
  let modal = document.getElementById("modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal";
    document.body.appendChild(modal);
  }

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
    if (e.target === overlay) {
      modal.innerHTML = "";
    }
  };

  card.onclick = e => {
    e.stopPropagation();
  };
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.innerHTML = "";
}

function renderRulesModal(gameId) {
  const rules = gameRules[gameId];

  if (!rules) {
    renderModalShell(`
      <h2 style="text-align:center;margin-top:0;">Rules</h2>
      <div style="text-align:center;margin-bottom:14px;">
        Rules have not been added for this game yet.
      </div>
      <div id="closeRules" style="${modalButtonStyle()}">Close</div>
    `);

    document.getElementById("closeRules").onclick = closeModal;
    return;
  }

  renderModalShell(`
    <h2 style="
      text-align:center;
      margin-top:0;
      color:#facc15;
    ">
      ${escapeHtml(rules.title)} Rules
    </h2>

    <div style="
      background:#1e293b;
      border:1px solid rgba(255,255,255,0.25);
      border-radius:12px;
      padding:12px;
      margin-bottom:14px;
    ">
      <div style="
        color:#facc15;
        font-weight:bold;
        margin-bottom:8px;
        text-align:center;
      ">
        Quick Version
      </div>

      <ul style="
        margin:0;
        padding-left:20px;
        line-height:1.5;
      ">
        ${rules.quick.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>

    <div>
      ${rules.details.map(section => `
        <div style="
          background:#111111;
          border:1px solid rgba(255,255,255,0.18);
          border-radius:12px;
          padding:12px;
          margin-bottom:10px;
        ">
          <div style="
            color:#facc15;
            font-weight:bold;
            font-size:17px;
            margin-bottom:6px;
          ">
            ${escapeHtml(section.heading)}
          </div>

          <ul style="
            margin:0;
            padding-left:20px;
            line-height:1.5;
          ">
            ${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `).join("")}
    </div>

    <div id="closeRules" style="
      ${modalButtonStyle()}
      margin-top:12px;
      border:1px solid #ff4c4c;
    ">
      Close
    </div>
  `);

  document.getElementById("closeRules").onclick = closeModal;
}

export function renderSetup(container) {
  let profiles = loadProfiles();

  let selectedOrderIds = [];

  try {
    const savedSelectedIds =
      JSON.parse(localStorage.getItem(LAST_SELECTED_PLAYERS_KEY)) || [];

    selectedOrderIds = savedSelectedIds.filter(id =>
      profiles.some(profile => profile.id === id)
    );
  } catch {
    selectedOrderIds = [];
  }

  store.players = [];
  store.selectedPlayerProfiles = [];

  container.innerHTML = `
    <h1>${getGameDisplayName(store.selectedGame)}</h1>

    <div id="rulesBtn" style="${rulesButtonStyle()}">Rules</div>

    <div style="
      background:#111111;
      border:1px solid #9ca3af;
      border-radius:12px;
      padding:12px;
      margin-bottom:12px;
      margin-top:12px;
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

    <div id="orderPreview"></div>

    <div id="start" style="${buttonStyle()}">Start Game</div>
    <div id="back" style="${lightButtonStyle()}">Back</div>

    <div id="modal"></div>
  `;

  const playersDiv = document.getElementById("players");
  const selectedCount = document.getElementById("selectedCount");
  const orderPreview = document.getElementById("orderPreview");

  function isSelected(id) {
    return selectedOrderIds.includes(id);
  }

  function getSelectedOrderNumber(id) {
    const index = selectedOrderIds.indexOf(id);
    return index >= 0 ? index + 1 : null;
  }

  function toggleSelectedPlayer(id) {
    if (isSelected(id)) {
      selectedOrderIds = selectedOrderIds.filter(selectedId => selectedId !== id);
    } else {
      selectedOrderIds.push(id);
    }

    saveLastSelectedPlayers();
  }

  function updateSelectedCount() {
    selectedCount.innerText = `Select Players (${selectedOrderIds.length} selected)`;
  }

  function saveLastSelectedPlayers() {
    localStorage.setItem(
      LAST_SELECTED_PLAYERS_KEY,
      JSON.stringify(selectedOrderIds)
    );
  }

  function renderOrderPreview() {
    const orderedProfiles = getOrderedProfiles(profiles, selectedOrderIds);

    if (!orderedProfiles.length) {
      orderPreview.innerHTML = `
        <div style="
          background:#111111;
          color:#ffffff;
          border:1px solid #9ca3af;
          border-radius:10px;
          padding:12px;
          text-align:center;
          font-weight:bold;
          opacity:0.85;
          margin-top:10px;
        ">
          Tap player blocks in throwing order.
        </div>
      `;
      return;
    }

    orderPreview.innerHTML = `
      <div style="
        background:#111111;
        color:#ffffff;
        border:1px solid #9ca3af;
        border-radius:12px;
        padding:12px;
        margin-top:10px;
      ">
        <div style="
          color:#facc15;
          font-weight:bold;
          text-align:center;
          margin-bottom:8px;
        ">
          Throwing Order
        </div>

        ${orderedProfiles.map((profile, index) => `
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            padding:6px 0;
            border-top:${index === 0 ? "none" : "1px solid rgba(255,255,255,0.12)"};
            font-weight:bold;
          ">
            <span>${index + 1}. ${escapeHtml(getAvatar(profile))} ${escapeHtml(profile.name)}</span>
            <span style="color:#9ca3af;font-size:13px;">Tap block to remove</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderPlayers() {
    updateSelectedCount();
    renderOrderPreview();

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
      const selected = isSelected(profile.id);
      const orderNumber = getSelectedOrderNumber(profile.id);

      const row = document.createElement("div");
      row.style = playerBlockStyle(selected);

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
              ${escapeHtml(getAvatar(profile))}
            </div>

            <div style="
              font-size:18px;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
            ">
              ${escapeHtml(profile.name)}
            </div>
          </div>

          <div style="
            display:flex;
            align-items:center;
            justify-content:flex-end;
            gap:8px;
            flex-shrink:0;
          ">
            ${
              selected
                ? `<div style="${orderBadgeStyle()}">#${orderNumber}</div>`
                : ""
            }

            <div style="
              color:${selected ? "#f0970a" : "#9ca3af"};
              font-size:14px;
              flex-shrink:0;
            ">
              ${selected ? "SELECTED" : "Tap to Select"}
            </div>
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
        toggleSelectedPlayer(id);
        renderPlayers();
      };

      el.ontouchstart = event => {
        event.preventDefault();
        const id = el.getAttribute("data-select-player");
        toggleSelectedPlayer(id);
        renderPlayers();
      };
    });

    playersDiv.querySelectorAll("[data-edit-player]").forEach(el => {
      el.onclick = event => {
        event.stopPropagation();
        const id = el.getAttribute("data-edit-player");
        renderEditPlayer(id);
      };
    });

    playersDiv.querySelectorAll("[data-delete-player]").forEach(el => {
      el.onclick = event => {
        event.stopPropagation();

        const id = el.getAttribute("data-delete-player");
        const profile = profiles.find(p => p.id === id);
        if (!profile) return;

        const confirmed = confirm(`Delete ${profile.name}?`);
        if (!confirmed) return;

        profiles = profiles.filter(p => p.id !== id);
        selectedOrderIds = selectedOrderIds.filter(selectedId => selectedId !== id);

        saveProfiles(profiles);
        saveLastSelectedPlayers();
        renderPlayers();
      };
    });
  }

  function renderEditPlayer(profileId, avatarOverride = null) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    const selectedAvatar = avatarOverride || profile.avatar || "🎯";

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
          value="${escapeHtml(profile.name)}"
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
        box-sizing:border-box;
      `;

      btn.onclick = () => {
        const input = document.getElementById("editPlayerName");
        const currentName = input ? input.value.trim() : profile.name;

        profile.name = currentName || profile.name;
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

  document.getElementById("rulesBtn").onclick = () => {
    renderRulesModal(store.selectedGame);
  };

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

    selectedOrderIds.push(newProfile.id);
    saveLastSelectedPlayers();

    input.value = "";

    renderPlayers();
  };

  document.getElementById("start").onclick = () => {
    const selectedProfiles = getOrderedProfiles(profiles, selectedOrderIds);

    if (selectedProfiles.length < 2) {
      alert("Select at least two players.");
      return;
    }

    store.selectedPlayerProfiles = selectedProfiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      color: profile.color
    }));

    store.players = selectedProfiles.map(profile => profile.name);

    saveLastSelectedPlayers();

    store.screen = "GAME";
    renderApp();
  };

  document.getElementById("back").onclick = () => {
    store.screen = "CATEGORY";
    renderApp();
  };

  renderPlayers();
}
