// High-score persistence. Every access is guarded: storage can be missing,
// full, disabled (private mode / blocked cookies), or hold garbage.
export const BEST_KEY = 'kindlewing.best';
const MAX_BEST = 1e9;

// Returns a sane non-negative integer; anything unexpected reads as 0.
export function loadBest(storage) {
  try {
    const raw = storage?.getItem(BEST_KEY);
    if (typeof raw !== 'string' || !/^\d{1,10}$/.test(raw.trim())) return 0;
    return Math.min(Number(raw.trim()), MAX_BEST);
  } catch {
    return 0;
  }
}

// Returns true only if the value was actually handed to storage.
export function saveBest(storage, best) {
  if (!storage) return false;
  try {
    const n = Number.isFinite(best) ? Math.min(Math.max(0, Math.floor(best)), MAX_BEST) : 0;
    storage.setItem(BEST_KEY, String(n));
    return true;
  } catch {
    return false;
  }
}
