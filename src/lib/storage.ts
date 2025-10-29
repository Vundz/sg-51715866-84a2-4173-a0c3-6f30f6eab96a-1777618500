export const STORAGE_KEYS = {
  PLANT_TYPES: "plantTypes",
  PLANTINGS: "plantings",
  HARVESTS: "harvests",
  LOCATIONS: "locations",
  TREATMENTS: "treatments",
  USERS: "users",
  SESSION: "authSession", // Corrected from AUTH_SESSION
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const getStorageData = <T>(key: StorageKey): T | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return null;
  }
};

export const setStorageData = <T>(key: StorageKey, value: T): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const item = JSON.stringify(value);
    window.localStorage.setItem(key, item);
  } catch (error) {
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
};

export const generateId = (prefix: string): string => {
  return `${prefix}_${new Date().getTime()}_${Math.random().toString(36).substring(2, 8)}`;
};
