/** Persistenz des Spielerprofils im localStorage. */

import { createProfile } from './economy.js';

const STORAGE_KEY = 'loco-chicken:profile:v1';

/** Fällt auf ein In-Memory-Objekt zurück, wenn localStorage blockiert ist (Privatmodus). */
function safeStorage() {
  try {
    const probe = '__loco_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
  }
}

const store = safeStorage();

export function loadProfile() {
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return createProfile();

  try {
    const parsed = JSON.parse(raw);
    return { ...createProfile(), ...parsed };
  } catch {
    return createProfile();
  }
}

export function saveProfile(profile) {
  store.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function resetProfile() {
  store.removeItem(STORAGE_KEY);
  return createProfile();
}
