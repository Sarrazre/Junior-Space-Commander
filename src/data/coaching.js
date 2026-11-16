export const COACHING = {
  rocks: {
    goal: 'Use the camera, magnet and microscope. Match all three clues to a rock in the guide.',
    explain: 'Rocks preserve clues about the past. A camera shows shape and color. A magnet tests magnetic attraction, and a microscope reveals small structures. Compare all three observations before identifying a sample. Iron minerals are not all strongly magnetic. On Mars, some mineral deposits suggest that water once moved through the ground. These samples are simplified examples based on rover discoveries.',
    stages: {
      inspect: ['Look for tools you have not used on this sample.', 'Each tool gives a different clue. One clue alone can fit several rocks.', 'Use Camera, Magnet and Microscope, then select Identify the rock.'],
      identify: ['Compare your clues with the three lines on each guide card.', 'Rule out any card that disagrees with even one observation.', 'Choose the card that matches the camera shape, magnetic pull and microscope structure.'],
    },
  },
  samples: {
    goal: 'Visit each marked site and use its instrument to collect soil evidence. Then return to the garage.',
    explain: 'A rover carries tools that extend what scientists can observe. Different instruments reveal different properties of soil and rock. Measurements need context: where was the sample found, and what did the instrument test? Collect evidence from each site before drawing a conclusion. Our instruments and scores are simplified for play. Real Mars rovers send measurements and images back to teams on Earth for careful comparison.',
    stages: {
      drive: ['Look for the next unfinished marker on your map.', 'A site becomes available when you stop nearby.', 'Drive to a numbered marker, brake, and press E. When all sites are complete, park on the green garage pad.'],
      instrument: ['Look at the instrument instructions and the clue you are measuring.', 'Adjust one control at a time and watch how the reading changes.', 'Follow the instrument target shown on this screen, then use its collect or confirm button.'],
      drill: ['Watch the drill move across the surface and find the green mark.', 'The green mark identifies rock soft enough to drill.', 'Wait until the drill is above the green soft-rock zone, then press Drill.'],
      layers: ['Compare the top, middle and bottom layers.', 'In this undisturbed stack, newer layers were deposited above older ones.', 'Choose the bottom layer, labeled C, as the oldest.'],
      laser: ['Compare the laser reading with each mineral pattern.', 'Every colored bar must match in the same position.', 'Compare from left to right and select the card with the identical five-bar pattern.'],
    },
  },
  greenhouse: {
    goal: 'Compare the struggling plant with the reference plant. Inspect, repair, and verify the result.',
    explain: 'A reference plant helps us spot differences. Both plants receive the same light, but only one is struggling. Compare their leaves and water supply before choosing a repair. Change the part supported by your evidence, then check whether the plant recovers. Scientists test explanations this way. The readings and fast recovery here are a teaching model, inspired by plant growing experiments rather than real NASA measurements.',
    stages: {
      dock: ['Look for the observation dock beside the test plant.', 'The plant needs to be on the bench before you can inspect it.', 'Select the test plant, then select the observation dock. You can also drag the plant onto the dock.'],
      inspect: ['Compare the leaves, water and light in both pods.', 'The same working light reaches both plants. What differs in the water supply?', 'Inspect all three evidence cards. Notice the dry test tray and loose connector.'],
      hypothesis: ['Compare the clues before selecting an explanation.', 'Both plants have light. Only the test tray has no water and a loose connection.', 'Choose the water-supply explanation, then test it with a flow connector.'],
      repair: ['Which tool addresses the difference you observed?', 'The tank has water, but it is not reaching the test tray.', 'Select the Flow connector and place it at the loose water connection.'],
      verify: ['Compare the repaired plant with the unchanged reference.', 'A repair is evidence only if the expected change actually happens.', 'Check the water flow and recovering leaves, then choose the explanation supported by the comparison.'],
    },
  },
  biosensor: {
    goal: 'Match yeast growth to radiation exposure, compare sensitivity, then protect the crew.',
    explain: 'Living sensors show how radiation affects cells. In this model, growing yeast changes blue dye to pink. More radiation damages the yeast, so there is less growth and the dye stays blue. Compare samples that received the same dose to test sensitivity fairly. Yeast that cannot repair its DNA is more sensitive. The colors and shelter decision are simplified game examples inspired by BioSentinel research.',
    stages: {
      match: ['Look at how pink or blue each well is.', 'Pink means more growth. Blue means less growth after radiation damage.', 'Match pink to no radiation, purple to medium dose, and blue to high dose.'],
      sensitive: ['Both samples received the same radiation dose.', 'The more sensitive yeast stops growing sooner.', 'Choose the yeast that cannot repair its DNA.'],
      shelter: ['The blue sensor indicates very little growth.', 'Radiation damage is a reason to seek protection.', 'Move everyone to the shielded shelter.'],
    },
  },
  expedition: {
    goal: 'Follow your chosen route: build a weather station, photograph the landscape, and search for a meteorite if your route includes it.',
    explain: 'An expedition combines different kinds of evidence. A weather station measures conditions, photographs record the landscape, and a meteorite search examines possible visitors from space. Each instrument answers a different question. Mission planners balance those discoveries against limited power and time. A short route can still be useful science. Our route costs and instrument puzzles are invented for play, inspired by real rover exploration.',
    stages: {
      drive: ['Check which stops are included in your route.', 'Complete each marked stop before returning to base.', 'Stop beside an unfinished marker and press E. After the last stop, return to the green garage pad.'],
      weather: ['Look at the blueprint from the ground upward.', 'Each part needs support before it can be installed.', 'Start with the base, then add the mast and supported parts. Connect power after the required parts are in place.'],
      panorama: ['Look for the landscape targets listed above the camera.', 'Move the view until a target lines up with the camera.', 'Use the arrows or drag to center each target, then take its photograph.'],
      meteorite: ['Scan a square and look at its signal bars.', 'More bars mean the meteorite is closer. Compare neighboring squares.', 'Scan untested squares near the strongest signal. The meteorite is collected when you scan its square.'],
    },
  },
};
export const INTRO_LINES = [
  "Hi, I'm Rocky, the robot of Astro Base! Welcome to Mars! This is Astro Base, our home.",
  'You are the Commander! Meet your crew: Max, Elsa, Charles and Lea.',
  'Every sol: solve a problem, finish the crew jobs and keep power, shielding, food and health up.',
  'Five sols. Fifty science points. Ready for launch, Commander?',
];
export const CELEBRATION = 'Mission complete, Commander! Your careful observations helped the crew.';
export const GENERIC_HINT = 'Check the highlighted task and its station. Your mission list shows who can help next.';
