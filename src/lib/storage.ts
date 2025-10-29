
export const STORAGE_KEYS = {
  PLANT_TYPES: "plantTypes",
  PLANT_VARIETIES: "plantVarieties",
  PLANTINGS: "plantings",
  HARVESTS: "harvests",
  LOCATIONS: "locations",
  TREATMENTS: "treatments",
  USERS: "users",
  AUTH_SESSION: "authSession",
} as const;

function get<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : null;
}

function set<T>(key: string, value: T): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export const storage = {
  get,
  set
};

export function getStorageData<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export function setStorageData<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
