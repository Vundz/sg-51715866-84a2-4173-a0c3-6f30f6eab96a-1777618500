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
  batchNumber?: string;
  status: "active" | "harvested" | "closed";
  remainingQuantity?: number;
}

export interface Harvest {
  id: string;
  plantingId: string;
  quantityHarvested: number;
  harvestDate: string;
  quality: "excellent" | "good" | "fair" | "poor";
  notes?: string;
  isClosed: boolean;
}

export interface Treatment {
  id: string;
  name: string;
  type: "fungicide" | "pesticide" | "fertilizer";
  applicationDate: string;
  plantingIds: string[];
  dosage?: string;
  applicationMethod?: "drench" | "spray" | "granular" | "other";
  notes?: string;
}

export interface Reservation {
  id: string;
  plantingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  quantityReserved: number;
  reservationDate: string;
  paymentStatus: "pending" | "partial" | "paid";
  amountPaid?: number;
  totalAmount?: number;
  notes?: string;
  status: "active" | "cancelled" | "completed";
}
