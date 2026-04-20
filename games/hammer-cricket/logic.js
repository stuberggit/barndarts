let gameState = {};
let history = [];

/* -------------------------
   SETUP HELPERS
--------------------------*/

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getRandomBonusTarget() {
  const options = [15, 16, 17, 18, 19, 20, 25];
  return shuffle(options)[0];
}

function buildRoundOrder() {
  const bonus1 = getRandomBonusTarget();
  const bonus2 = getRandomBonusTarget();

  return [
    { type: "number", label: "15", target: 15, multipliers: [1, 2, 3] },
    { type: "number", label: "16", target: 16, multipliers: [1, 2, 3] },
    { type: "number", label: "17", target: 17, multipliers: [1, 2, 3] },
    { type: "bonus", label: `Bonus (${formatTargetLabel(bonus1)})`, target: bonus1, multipliers: [1, 3, 5] },
    { type: "number", label: "18", target: 18, multipliers: [1, 2, 3] },
    { type: "number", label: "19", target: 19, multipliers: [1, 2, 3] },
    { type: "number", label: "20", target: 20, multipliers: [1, 2, 3] },
    { type: "bonus", label: `Bonus (${formatTargetLabel(bonus2)})`, target: bonus2, multipliers: [1, 3, 5] }
  ];
}

function formatTargetLabel(target) {
  return target === 25 ? "Bull" : String(target);
}
