export const STORAGE_KEYS = {
  PLANT_TYPES: 'nursery_plant_types',
  LOCATIONS: 'nursery_locations',
  PLANTINGS: 'nursery_plantings',
  HARVESTS: 'nursery_harvests',
  TREATMENTS: 'nursery_treatments',
  RESERVATIONS: 'nursery_reservations'
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
