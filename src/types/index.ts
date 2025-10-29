
export interface PlantType {
  id: string;
  name: string;
  scientificName?: string;
  category: string;
  description?: string;
  growthDuration: number;
  createdAt: string;
}

export interface PlantVariety {
  id: string;
  plantTypeId: string;
  name: string;
  characteristics?: string;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  notes?: string;
  createdAt: string;
}

export interface Planting {
  id: string;
  plantTypeId: string;
  varietyId: string;
  locationId: string;
  quantity: number;
  remainingQuantity?: number;
  plantingDate: string;
  expectedHarvestDate: string;
  status: "active" | "harvested" | "closed" | "failed";
  notes?: string;
  createdAt: string;
}

export interface Harvest {
  id: string;
  plantingId: string;
  harvestDate: string;
  quantity: number;
  quality: "excellent" | "good" | "fair" | "poor";
  notes?: string;
  createdAt: string;
}

export interface Treatment {
  id: string;
  plantingId: string;
  treatmentType: "fungicide" | "pesticide" | "fertilizer" | "other";
  chemicalName: string;
  applicationMethod: string;
  applicationDate: string;
  dosage: string;
  notes?: string;
  createdAt: string;
}

export interface TreatmentApplication {
  id: string;
  treatmentId: string;
  plantingIds: string[];
  applicationDate: string;
  dosage: string;
  method: string;
  applicator?: string;
  notes?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  authMethod: "password" | "gmail";
  passwordHash?: string;
  role: string;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface UserPermissions {
  plantTypes: ModulePermission;
  plantings: ModulePermission;
  harvests: ModulePermission;
  locations: ModulePermission;
  treatments: ModulePermission;
  reports: ModulePermission;
  admin: ModulePermission;
}

export interface ModulePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  permissions: UserPermissions;
  expiresAt: string;
}
