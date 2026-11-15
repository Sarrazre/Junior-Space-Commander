export const FIRST_FLIGHT_KEY = 'jsc-first-flight-v1';

// Preference only: never changes or replaces the mission checkpoint.
export function createFirstFlight(storage) {
  let state = {};
  try { state = JSON.parse(storage.getItem(FIRST_FLIGHT_KEY)) || {}; } catch {}
  if (typeof state !== 'object' || Array.isArray(state)) state = {};
  const mark = key => {
    state[key] = true;
    try { storage.setItem(FIRST_FLIGHT_KEY, JSON.stringify(state)); } catch {}
  };
  return {
    // The welcome video is a homepage entrance, not a one-time tutorial.
    needsIntro: () => true,
    needsTour: () => !state.tour,
    finishIntro: () => mark('intro'),
    finishTour: () => mark('tour'),
  };
}
