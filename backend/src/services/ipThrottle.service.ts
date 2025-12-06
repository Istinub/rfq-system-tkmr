const MAX_FAILURES = 5;
const BAN_DURATION_MS = 10 * 60 * 1000;

type ThrottleEntry = {
  failures: number;
  bannedUntil?: number;
};

const store = new Map<string, ThrottleEntry>();

const getEntry = (ip: string): ThrottleEntry => {
  const entry = store.get(ip);
  if (entry) {
    if (entry.bannedUntil && entry.bannedUntil <= Date.now()) {
      entry.bannedUntil = undefined;
      entry.failures = 0;
    }
    return entry;
  }

  const newEntry: ThrottleEntry = { failures: 0 };
  store.set(ip, newEntry);
  return newEntry;
};

export const isBanned = (ip: string): boolean => {
  const entry = getEntry(ip);
  return entry.bannedUntil !== undefined && entry.bannedUntil > Date.now();
};

export const registerFailure = (ip: string) => {
  const entry = getEntry(ip);

  if (entry.bannedUntil && entry.bannedUntil > Date.now()) {
    return;
  }

  entry.failures += 1;

  if (entry.failures >= MAX_FAILURES) {
    entry.bannedUntil = Date.now() + BAN_DURATION_MS;
    entry.failures = 0;
  }
};

export const resetFailures = (ip: string) => {
  if (store.has(ip)) {
    store.delete(ip);
  }
};

export const getBanRemainingSeconds = (ip: string): number => {
  const entry = store.get(ip);
  if (!entry || !entry.bannedUntil) {
    return 0;
  }

  const remainingMs = entry.bannedUntil - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};
