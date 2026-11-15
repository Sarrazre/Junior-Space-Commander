// Real space-weather data from NASA DONKI: try live first, fall back to a saved example.
// Honesty rule: the result always says whether it is LIVE or SAVED.

// Note: this key is visible to anyone who opens the site (static hosting has no secrets).
const API_KEY = 'NB6nkpMPKQF6P7r8HJQcwb7nthz7CfkWwFCG9gbr';

// Saved historical example (widely reported; TODO: re-check against DONKI when the API is reachable).
const SAVED = { live: false, classType: 'X8.7', date: '14 May 2024', region: 'Active Region 13664', link: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' };

const RANK = { A: 1, B: 2, C: 3, M: 4, X: 5 };
const strength = (c = '') => (RANK[c[0]] || 0) * 100 + (parseFloat(c.slice(1)) || 0);

let cached = null;
export async function getFlare() {
  if (cached) return cached;
  try {
    const end = new Date(), start = new Date(Date.now() - 30 * 864e5);
    const iso = (d) => d.toISOString().slice(0, 10);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${iso(start)}&endDate=${iso(end)}&api_key=${API_KEY}`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(res.status);
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) throw new Error('empty');
    const top = list.reduce((a, b) => (strength(b.classType) > strength(a.classType) ? b : a));
    const d = new Date(top.peakTime || top.beginTime);
    cached = {
      live: true, classType: top.classType,
      date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
      region: top.activeRegionNum ? `Active Region ${top.activeRegionNum}` : '', link: top.link || SAVED.link,
    };
  } catch {
    cached = SAVED;
  }
  return cached;
}
