// Derive room artwork from committed campaign state. No visual state is saved separately.
export function deriveRoomVisualState(state) {
  const tasks = state.tasks || [], journal = state.journal || [], flags = state.flags || {};
  const done = id => tasks.some(task => task.id === id && task.done);
  const findings = journal.filter(entry => entry.science).length;
  const waterFault = state.sol >= 3 && !flags.pipesRepaired;
  const cropFault = state.sol >= 3 && !flags.greenhouseRestored;
  const tended = tasks.some(task => task.tend && task.done);
  const scanned = tasks.some(task => task.station === 'medbay' && task.done);
  const samples = Math.min(5, Math.max(findings, tasks.filter(task => task.science && task.done).length));
  return {
    greenhouse: cropFault ? 'wilting' : flags.greenhouseRestored ? 'recovered' : tended ? 'growing' : 'healthy',
    water: waterFault ? 'frozen' : flags.pipesRepaired ? 'restored' : 'flowing',
    engineering: state.res.power <= 20 ? 'low-power' : tasks.some(task => task.station === 'generator' && task.done) ? 'serviced' : 'running',
    command: state.crisisDone ? 'resolved' : 'decision',
    shield: state.res.shield < 40 ? 'low' : 'safe',
    lab: samples,
    medical: scanned ? 'checked' : state.res.health < 50 ? 'attention' : 'ready',
    crew: state.phase === 'summary' || state.phase === 'final' ? 'resting' : state.res.health < 50 ? 'tired' : 'ready',
    kitchen: state.res.food < 30 ? 'low' : tended || flags.greenhouseRestored ? 'fresh' : 'stocked',
    cargo: done('expedition') || journal.some(entry => entry.science && entry.sol === 5) ? 3 : done('rover') || journal.some(entry => entry.science && entry.sol === 2) ? 2 : 0,
    solar: flags.panelsDirty ? 'dusty' : 'clean',
    milestones: Math.min(5, (state.log || []).length),
  };
}

export function describeRoomVisuals(visual) {
  const descriptions = [
    `Command Center: ${visual.command === 'decision' ? 'today’s decision awaits' : 'decision recorded'}; shielding ${visual.shield}.`,
    `Science Lab: ${visual.lab} science ${visual.lab === 1 ? 'finding' : 'findings'} stored in the specimen rack.`,
    `Medical Bay: ${visual.medical === 'checked' ? 'crew scan completed' : visual.medical === 'attention' ? 'crew health needs attention' : 'scanner ready'}.`,
    `Engineering: ${visual.engineering === 'low-power' ? 'low power; amber indicators' : visual.engineering === 'serviced' ? 'generator serviced; output steady' : 'generator running'}.`,
    `Greenhouse: ${visual.greenhouse === 'wilting' ? 'plants drooping; water repair and the rescue experiment are needed' : visual.greenhouse === 'recovered' ? 'crop recovered; leaves upright and fruit ripening' : visual.greenhouse === 'growing' ? 'plants tended and growing' : 'crop healthy'}.`,
    `Air & Water: ${visual.water === 'frozen' ? 'greenhouse supply frozen; flow interrupted' : visual.water === 'restored' ? 'water supply repaired; circulation restored' : 'water circulating'}.`,
    `Crew Quarters: ${visual.crew === 'resting' ? 'crew resting; night lights on' : visual.crew === 'tired' ? 'crew tired; rest recommended' : 'bunks ready'}.`,
    `Kitchen: ${visual.kitchen === 'low' ? 'food stores low' : visual.kitchen === 'fresh' ? 'fresh produce available' : 'meals stocked'}.`,
    `Storage & Airlock: ${visual.cargo ? `${visual.cargo} sealed sample containers returned` : 'field equipment ready'}.`,
    `Solar panels: ${visual.solar === 'dusty' ? 'dust-covered; reduced output' : 'clean; normal output'}.`,
    `Hub: ${visual.milestones} of 5 sols recorded.`,
  ];
  const rooms = [['command','Command Center'],['lab','Science Lab'],['medbay','Medical Bay'],['engineering','Engineering'],['greenhouse','Greenhouse'],['air','Air & Water'],['crew','Crew Quarters'],['kitchen','Kitchen'],['storage','Storage & Airlock'],['solar','Solar Panels'],['hub','Hub']];
  return rooms.map(([id,label],i)=>({ id, label, text: descriptions[i].slice(descriptions[i].indexOf(':')+2) }));
}
