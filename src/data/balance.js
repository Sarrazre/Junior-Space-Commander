// All game numbers live here so they are easy to tune after playtesting.
// Playtest candidate, 2026-11-15. These are GAME values, not NASA measurements.
export const BAL = {
  start: { power: 78, shield: 70, food: 72, health: 85 },
  commanderStart: { power: 60, shield: 60, food: 55, health: 75 },
  daily: {
    solar: 15,          // Power from solar panels each sol
    solarDusty: 5,      // ...when the panels are covered in dust
    baseSystems: -10,   // Power used by the base
    crewEats: -10,      // Food eaten
    harvest: 5,         // Food grown
    harvestTended: 10,  // ...if Lea did her greenhouse task that sol
    lowShieldBelow: 40, lowShieldHealth: -10,
    lowFoodBelow: 20, lowFoodHealth: -10,
  },
  lowPower: 20,          // warning threshold
  lowPowerScienceCap: 7, // science mission cap while power is low
  dimLabScienceCap: 8,
  shortRouteScienceCap: 7,
  solarStorm: { shield: -40 },
  roverTrip: { power: -10, health: -5 },
  roverShortTrip: { power: -5 },
  cleanPanels: { power: 20, health: -5 },
  sickness: { health: -10 },
  doctorVisit: { health: 15 },
  doctorCost: { lea: { food: -5 }, charles: { science: -2 }, max: { power: -5 } },
  // Small bonuses for the everyday tasks (proposed, tune freely)
  smallRepair: { power: 5 },
  smallCheckup: { health: 5 },
  smallShieldCheck: { shield: 5 },
  // Science mission score from number of mistakes
  scienceScore(mistakes) { return mistakes === 0 ? 10 : mistakes <= 2 ? 7 : 4; },
  // Final mission success, 0-100
  success({ science, tasksDone, tasksTotal, res }) {
    const avg = (res.power + res.shield + res.food + res.health) / 4;
    return Math.round(50 * (science / 50) + 30 * (tasksTotal ? tasksDone / tasksTotal : 1) + 20 * (avg / 100));
  },
};
