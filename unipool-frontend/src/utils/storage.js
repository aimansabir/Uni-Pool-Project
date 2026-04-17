const STORAGE_PREFIX = 'unipool_';

export const storage = {
  get(key) {
    try {
      const val = localStorage.getItem(STORAGE_PREFIX + key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
