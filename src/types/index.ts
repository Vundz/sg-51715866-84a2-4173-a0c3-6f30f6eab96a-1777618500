export type PermissionAction = "create" | "read" | "update" | "delete";

export type ModulePermissions = {
  [key in PermissionAction]?: boolean;
};

export interface UserPermissions {
  plantTypes: ModulePermissions;
  plantings: ModulePermissions;
  harvests: ModulePermissions;
  locations: ModulePermissions;
  treatments: ModulePermissions;
  reports: ModulePermissions;
  admin: ModulePermissions;
}

export type UserRole = "Admin" | "Manager" | "Viewer" | "Custom";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  authMethod: "password" | "google";
  passwordHash?: string;
  permissions: UserPermissions;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface PlantType {
  id: string;
  name: string;
  variety: string;
  growthDuration: number;
}

export interface Location {
  id: string;
  name:string;
  capacity: number;
}

export interface Planting {
  id: string;
  plantTypeId: string;
  variety: string;
  locationId: string;
  quantity: number;
  datePlanted: string;
  status: "active" | "harvested" | "closed";
}

export interface Harvest {
  id: string;
  plantingId: string;
  quantityHarvested: number;
  harvestDate: string;
  isClosed: boolean;
}

export interface Treatment {
  id: string;
  name: string;
  type: "fungicide" | "pesticide" | "fertilizer";
  applicationDate: string;
  // plantingIds can be a single ID or an array for bulk applications
  plantingIds: string[]; 
}

// Pre-defined permission sets for roles
const fullAccess: ModulePermissions = { create: true, read: true, update: true, delete: true };
const readOnly: ModulePermissions = { create: false, read: true, update: false, delete: false };
const noAccess: ModulePermissions = { create: false, read: false, update: false, delete: false };

export const ALL_PERMISSIONS: Record<UserRole, UserPermissions> = {
  Admin: {
    plantTypes: { ...fullAccess },
    plantings: { ...fullAccess },
    harvests: { ...fullAccess },
    locations: { ...fullAccess },
    treatments: { ...fullAccess },
    reports: { ...readOnly, create: true }, // Can generate/view reports
    admin: { ...fullAccess },
  },
  Manager: {
    plantTypes: { ...fullAccess },
    plantings: { ...fullAccess },
    harvests: { ...fullAccess },
    locations: { create: true, read: true, update: true, delete: false },
    treatments: { ...fullAccess },
    reports: { ...readOnly, create: true },
    admin: { ...readOnly },
  },
  Viewer: {
    plantTypes: { ...readOnly },
    plantings: { ...readOnly },
    harvests: { ...readOnly },
    locations: { ...readOnly },
    treatments: { ...readOnly },
    reports: { ...readOnly, create: true },
    admin: { ...noAccess },
  },
  Custom: { // Custom roles start with Viewer permissions
    plantTypes: { ...readOnly },
    plantings: { ...readOnly },
    harvests: { ...readOnly },
    locations: { ...readOnly },
    treatments: { ...readOnly },
    reports: { ...readOnly, create: true },
    admin: { ...noAccess },
  }
};
