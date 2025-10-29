
import { User, UserPermissions } from "@/types";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/lib/storage";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

const fullPermissions: UserPermissions = {
  plantTypes: { create: true, read: true, update: true, delete: true },
  plantings: { create: true, read: true, update: true, delete: true },
  harvests: { create: true, read: true, update: true, delete: true },
  locations: { create: true, read: true, update: true, delete: true },
  treatments: { create: true, read: true, update: true, delete: true },
  reports: { create: true, read: true, update: true, delete: true },
  admin: { create: true, read: true, update: true, delete: true },
};

export async function initializeDefaultAdmin() {
  const users = getStorageData<User[]>(STORAGE_KEYS.USERS) || [];
  
  if (users.length === 0) {
    const defaultAdmin: User = {
      id: crypto.randomUUID(),
      email: "admin@khulisapp.com",
      name: "Administrator",
      authMethod: "password",
      passwordHash: await hashPassword("admin123"),
      role: "Super Admin",
      permissions: fullPermissions,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setStorageData(STORAGE_KEYS.USERS, [defaultAdmin]);
    return true;
  }
  
  return false;
}
