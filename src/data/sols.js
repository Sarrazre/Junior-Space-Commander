import { BAL } from './balance.js';

export const CREW = {
  max: { name: 'Max', role: 'Engineer', color: 0xff8a3c, css: '#ff8a3c', emoji: '🔧' },
  elsa: { name: 'Elsa', role: 'Doctor', color: 0xff5a7a, css: '#ff5a7a', emoji: '➕' },
  charles: { name: 'Charles', role: 'Scientist', color: 0x4aa8ff, css: '#4aa8ff', emoji: '🔬' },
  lea: { name: 'Lea', role: 'Botanist', color: 0x58d66b, css: '#58d66b', emoji: '🌱' },
};
export const CREW_IDS = ['max', 'elsa', 'charles', 'lea'];

// Each sol: a briefing, one crisis (a trade-off decided at the Command Center),
// one science mission (science: true, worth up to 10 points) and everyday tasks.
export const SOLS = [
  {
    n: 1, title: 'Welcome to Astro Base',
    brief: [
      'Beep boop! Welcome to Astro Base, Commander! I am Rocky, your very silly robot helper.',
      'Tap the yellow Next button to send Max to Mission Control. When he arrives, press Interact or E.',
      'Decide how to handle the power overload, then tap a crew task to head to its station. You can also walk with WASD, arrow keys, or a click on the floor.',
      'Charles: head to the Airlock for your first rover drive. Collect soil samples at the marked sites, then park back at the garage.',
    ],
    crisis: {
      title: 'Power overload!', art: 'power', text: 'The base systems are drawing too much power. What should we do, Commander?',
      options: [
        { id: 'dimGreen', label: 'Dim the greenhouse lights', good: '+15 Power', bad: '−10 Food', fx: { power: 15, food: -10 } },
        { id: 'dimLab', label: 'Dim the science lab', good: '+15 Power', bad: "Today's science mission is worth 8 points at most", fx: { power: 15 }, flags: { scienceCap: BAL.dimLabScienceCap } },
        { id: 'keep', label: 'Keep everything switched on', good: 'Nothing is lost today', bad: '−20 Power', fx: { power: -20 } },
      ],
    },
    tasks: [
      { id: 'gen', who: 'max', station: 'generator', title: 'Inspect the generator wiring', game: 'wires', params: { label: 'Generator' }, fx: BAL.smallRepair },
      { id: 'bones', who: 'elsa', station: 'medbay', title: 'Bone health scan', game: 'bones', fx: BAL.smallCheckup },
      { id: 'rover', who: 'charles', station: 'airlock', title: 'Rover: collect soil samples', game: 'rover', params: { sites: 3, dust: false }, science: true, fx: BAL.roverTrip },
      { id: 'plants', who: 'lea', station: 'greenhouse', title: 'Check plants and temperature', game: 'plants', tend: true },
    ],
    fact: { title: 'Giant Volcano!', art: 'volcano', text: 'Mars has the largest known volcano in our solar system: Olympus Mons. It is about 22 km high, more than twice as tall as Mount Everest!', source: 'NASA Science – Mars facts', url: 'https://science.nasa.gov/mars/facts/' },
  },
  {
    n: 2, title: 'The Great Dust Storm',
    brief: [
      'Bzzt! A big dust storm rolled in. The solar panels are covered in dust and make much less power.',
      'Max can go outside to clean them, but outdoor work is risky. Decide at the Command Center.',
      'Charles: stay inside the Science Lab during the storm. Use the rock scanner to compare clues from our Mars samples.',
    ],
    onStart: { flags: { panelsDirty: true } },
    crisis: {
      title: 'Dusty solar panels', art: 'storm', text: 'Dust blocks the sunlight. Solar power is only +5 per sol until the panels are cleaned.',
      options: [
        { id: 'clean', label: 'Send Max outside to clean the panels', good: '+20 Power and solar back to normal', bad: '−5 Crew Health (outdoor risk)', flags: { cleanPanels: true } },
        { id: 'wait', label: 'Stay inside for now', good: 'Nobody takes a risk today', bad: 'Solar power stays low', flags: {} },
      ],
    },
    tasks: [
      { id: 'panels', who: 'max', station: 'airlock', title: 'Clean the solar panels', game: 'panels', fx: BAL.cleanPanels, flagsAfter: { panelsDirty: false }, when: (f) => f.cleanPanels },
      { id: 'exposure', who: 'elsa', station: 'medbay', title: 'Routine crew checkup', game: 'vitals', fx: BAL.smallCheckup },
      { id: 'rocks', who: 'charles', station: 'lab', title: 'Rock scanner', game: 'rocks', science: true },
      { id: 'harvest', who: 'lea', station: 'greenhouse', title: 'Test the lettuce harvest', game: 'harvest', tend: true },
    ],
    fact: { title: 'Planet-wide storms', art: 'storm', text: 'Dust storms on Mars can grow until they cover the whole planet. In 2018 a global storm blocked so much sunlight that the solar-powered Opportunity rover could not recharge.', source: 'NASA – Opportunity rover mission', url: 'https://science.nasa.gov/mission/mer-opportunity/' },
  },
  {
    n: 3, title: 'Greenhouse Emergency',
    brief: [
      'Brrr! It got very cold last night. The plants are not growing well.',
      'Heating helps, but it costs power. Max decides at the Command Center. The water pipes froze too: Max can fix them in the Air & Water room.',
      'Lea: one lettuce plant still looks unhappy. Compare it with a healthy plant after Max repairs the water supply. That is today\'s science mission!',
    ],
    crisis: {
      title: 'Cold night on Mars', art: 'cold', text: 'Frost is forming. Where should we send extra heat?',
      options: [
        { id: 'heatG', label: 'Heat the greenhouse', good: '+15 Food', bad: '−15 Power', fx: { food: 15, power: -15 } },
        { id: 'heatL', label: 'Heat the living area', good: '+10 Crew Health', bad: '−10 Power', fx: { health: 10, power: -10 } },
        { id: 'heatB', label: 'Heat both', good: '+15 Food, +10 Crew Health', bad: '−25 Power', fx: { food: 15, health: 10, power: -25 } },
        { id: 'heatN', label: 'No extra heating', good: 'Power is saved', bad: 'Nothing gets better', fx: {} },
      ],
    },
    tasks: [
      { id: 'heater', who: 'max', station: 'air', title: 'Restore greenhouse water supply', game: 'pipes', params: { label: 'Greenhouse supply pipes' }, fx: BAL.smallRepair, flagsAfter: { pipesRepaired: true } },
      { id: 'nutrition', who: 'elsa', station: 'medbay', title: 'Analyse a blood sample', game: 'cells', fx: BAL.smallCheckup },
      { id: 'gravity', who: 'charles', station: 'lab', title: 'Gravity Garden experiment', game: 'gravity' },
      { id: 'greenhouse', who: 'lea', station: 'greenhouse', title: 'Save the Mars greenhouse', game: 'greenhouse', science: true, tend: true, requires: ['heater'], flagsAfter: { greenhouseRestored: true } },
    ],
    fact: { title: 'Space salad', art: 'salad', text: 'Astronauts have grown and eaten lettuce on the International Space Station. Fresh food is good for the body and for the mood!', source: 'NASA – Veggie plant growth system; CSA Food Production toolkit', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/' },
  },
  {
    n: 4, title: 'Solar Radiation Alert',
    brief: [
      'ALERT! ALERT! The Sun burped out a big solar storm. My antenna is tingling!',
      'The storm already hit our shielding. Extra shielding keeps the crew safe, but it uses lots of power.',
      'Charles: read the yeast biosensor in the Science Lab to find out how strong the radiation is.',
    ],
    onStart: { fx: BAL.solarStorm, toast: '☀️ Solar storm! Shielding −40' },
    crisis: {
      title: 'Radiation storm', art: 'radiation', text: 'Shielding took a big hit. Below 40, the crew loses health tonight.',
      options: [
        { id: 'shieldOn', label: 'Turn on extra shielding', good: '+30 Shielding', bad: '−20 Power', fx: { shield: 30, power: -20 } },
        { id: 'shieldOff', label: 'Save the power', good: 'Power is saved', bad: 'Shielding stays low', fx: {} },
      ],
    },
    tasks: [
      { id: 'shieldgen', who: 'max', station: 'generator', title: 'Start up the shield generator', game: 'sequence', params: { label: 'Shield generator' }, fx: BAL.smallShieldCheck },
      { id: 'radcheck', who: 'elsa', station: 'medbay', title: 'Read the radiation badges', game: 'dose', fx: BAL.smallCheckup },
      { id: 'biosensor', who: 'charles', station: 'lab', title: 'Radiation biosensor terminal', game: 'biosensor', science: true },
      { id: 'dna', who: 'lea', station: 'greenhouse', title: 'Plant DNA Repair Lab', game: 'dna', tend: true },
    ],
    fact: { title: 'Radiation in space', art: 'radiation', text: 'Earth\'s air and magnetic field protect us from most space radiation. On the International Space Station, instruments measure radiation every day, and astronauts there get much more than people on the ground. Mars has almost no such protection.', source: 'NASA RadLab (ISS measurements, not Mars surface)', url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/' },
  },
  {
    n: 5, title: 'Final Mars Expedition',
    brief: [
      'Last sol, Commander! Time for the big rover expedition. I packed snacks. Wait, I do not eat snacks.',
      'The rover battery is limited. Max chooses the route at the Command Center before Charles leaves.',
      'Today\'s goals are new: build a weather station, take photos and hunt for a meteorite! Then Max sends our report to Earth.',
    ],
    crisis: {
      title: 'Choose the rover route', art: 'route', text: 'The long route visits more places but uses more energy and time outside.',
      options: [
        { id: 'long', label: 'Full expedition: 3 stops (weather station, photos, meteorite)', good: 'Up to 10 Science points', bad: '−10 Power, −5 Crew Health', flags: { roverSites: 3 } },
        { id: 'short', label: 'Short trip: 2 stops (weather station, photos)', good: 'Only −5 Power, no health risk', bad: 'Science mission is worth 7 points at most', flags: { roverSites: 2, scienceCap: BAL.shortRouteScienceCap } },
      ],
    },
    tasks: [
      { id: 'roverprep', who: 'max', station: 'generator', title: 'Charge the rover fuel cells', game: 'charge', params: { label: 'Rover charger' }, fx: BAL.smallRepair },
      { id: 'clearance', who: 'elsa', station: 'medbay', title: 'Mars gravity fitness test', game: 'fitness', fx: BAL.smallCheckup },
      { id: 'expedition', who: 'charles', station: 'airlock', title: 'Rover expedition', game: 'rover', params: { mode: 'expedition' }, science: true, needsCrisis: true },
      { id: 'foodcheck', who: 'lea', station: 'greenhouse', title: 'Keep the food systems stable', game: 'plants', tend: true },
      { id: 'report', who: 'max', station: 'command', title: 'Send our discoveries to Earth', game: 'report', requires: ['expedition'] },
    ],
    fact: { title: 'Blue sunsets', art: 'sunset', text: 'On Mars the daytime sky is butterscotch-coloured, but sunsets look blue near the Sun! Fine dust scatters the light differently than Earth\'s air does.', source: 'NASA – Curiosity rover sunset images', url: 'https://science.nasa.gov/resource/curiosity-rover-views-a-martian-sunset/' },
  },
];


// Saved campaigns that already earned science before the opening missions moved
// keep their original order. New missions always start with Charles's rover drive.
export const LEGACY_OPENING_SOLS = [
  {
    ...SOLS[0],
    brief: SOLS[0].brief.slice(0, 3),
    tasks: SOLS[0].tasks.map(task => task.science ? { ...SOLS[1].tasks.find(task => task.science) } : task),
  },
  {
    ...SOLS[1],
    brief: [
      ...SOLS[1].brief.slice(0, 2),
      'Charles: take the rover out through the Airlock and collect soil samples. Drive carefully in the dust!',
    ],
    tasks: SOLS[1].tasks.map(task => task.science ? { ...SOLS[0].tasks.find(task => task.science), params: { sites: 3, dust: true } } : task),
  },
];

export const STATION_FACTS = {
  kitchen: 'Food on Mars must be grown or brought from Earth. A trip to Mars takes about 7 months, so there is no quick delivery!',
  air: 'This room recycles air and water. On the Space Station, most of the water is recycled, even sweat and pee. Yum? Beep!',
  crew: 'A day on Mars is called a sol. It lasts about 24 hours and 40 minutes, so astronauts get 40 extra minutes of sleep!',
  rocky: null,
};

export const DATA_SOURCES = [
  ['NASA DONKI – Space Weather Database', 'https://ccmc.gsfc.nasa.gov/tools/DONKI/', 'Solar flare shown on Sol 4. Live when reachable, otherwise a saved historical example (always labelled).'],
  ['NASA – Martian blueberries', 'https://science.nasa.gov/resource/martian-blueberries-2/', 'Opportunity’s hematite-rich concretions provide evidence of an ancient watery environment.'],
  ['University of Minnesota – Hematite', 'https://commonminerals.esci.umn.edu/minerals-g-m/hematite', 'Mineral guide: iron content alone does not mean a rock attracts a hand magnet.'],
  ['NASA OSDR – Open Science Data Repository', 'https://osdr.nasa.gov/bio/repo/', 'Mini-games are inspired by studies OSD-980, OSD-412, OSD-581, OSD-346, OSD-964 and OSD-658. Scores, treatments and puzzles are invented for the game.'],
  ['NASA RadLab', 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/', 'Radiation education. These are International Space Station measurements, not Mars surface measurements.'],
  ['NASA Mars Trek / Mars facts', 'https://trek.nasa.gov/mars/', 'Mars facts: Olympus Mons, dust storms, gravity (38% of Earth), blue sunsets, sol length.'],
  ['CSA Food Production toolkit', 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/', 'Greenhouse and space-food facts.'],
];
