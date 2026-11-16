export const SAVE_KEY = 'jsc-mission-v1';
export function createSaveStore(storage, owner) {
  let revision = null;
  function read() {
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value.version === 1 && typeof value.revision === 'string' && value.data ? value : null;
    } catch { return null; }
  }
  return {
    read,
    claim(expectedRevision = null) { revision = expectedRevision; },
    write(data, replace = false) {
      try {
        const current = read();
        if (!replace && (current?.revision ?? null) !== revision) return { ok: false, reason: 'conflict' };
        const next = `${owner}:${Date.now()}:${Math.random()}`;
        storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, owner, revision: next, savedAt: new Date().toISOString(), data }));
        revision = next;
        return { ok: true };
      } catch { return { ok: false, reason: 'unavailable' }; }
    },
  };
}
