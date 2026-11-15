// An explicitly advanced clock: paused or hidden time never consumes puzzle time.
export function createGameClock() {
  let nextId = 0;
  const jobs = new Map();
  return {
    schedule(fn, ms, repeat = false) {
      const id = ++nextId;
      jobs.set(id, { fn, remaining: ms, period: Math.max(1, ms), repeat });
      return id;
    },
    cancel(id) { jobs.delete(id); },
    clear() { jobs.clear(); },
    tick(ms, paused = false) {
      if (paused) return;
      for (const [id, job] of [...jobs]) {
        if (!jobs.has(id)) continue;
        job.remaining -= ms;
        if (job.remaining > 0) continue;
        if (job.repeat) job.remaining += Math.max(job.period, -job.remaining + job.period);
        else jobs.delete(id);
        job.fn();
      }
    },
  };
}
