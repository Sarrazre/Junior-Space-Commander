// Mean solar day, rounded to one second. NASA/JPL InSight press kit:
// https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance/
export const EARTH_DAY_MS = 86_400_000;
export const MARS_SOL_MS = 88_775_000;
const wrap = value => ((value % 1) + 1) % 1;
export const clockFraction = (now, epoch, day) => wrap((now - epoch) / day);
export function clockLabel(fraction, seconds = false) {
  const total = Math.floor(wrap(fraction) * 86_400 + .00001);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, ...(seconds ? [total % 60] : [])].map(n => String(n).padStart(2, '0')).join(':');
}
export function nightAmount(fraction) {
  const hour = wrap(fraction) * 24;
  if (hour < 6 || hour >= 20) return 1;
  if (hour < 8) return (8 - hour) / 2;
  if (hour >= 18) return (hour - 18) / 2;
  return 0;
}
export function createTeachingClock(storage, now = Date.now()) {
  let epoch;
  try { const value = Number(storage.getItem('jsc-mars-clock-epoch')); if (Number.isFinite(value) && value > 0) epoch = value; } catch {}
  if (!epoch) {
    const date = new Date(now);
    const localFraction = (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86400;
    // Start beside the user's local clock, then let the longer sol drift naturally.
    epoch = now - localFraction * MARS_SOL_MS;
    try { storage.setItem('jsc-mars-clock-epoch', String(epoch)); } catch {}
  }
  return { epoch, fraction: timestamp => clockFraction(timestamp, epoch, MARS_SOL_MS) };
}
