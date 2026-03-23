import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
export type Planting = Database["public"]["Tables"]["plantings"]["Row"];
export type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

export type HarvestWithDetails = Harvest & {
  plantings: (Planting & {
    plant_types: PlantType | null;
    locations: Location | null;
  }) | null;
};

export type HarvestValidationResult = {
  valid: boolean;
  available: number;
  reserved: number;
  harvestable: number;
  error?: string;
  reservationConflict?: boolean;
  conflictingReservations?: Array<{
    id: string;
    customer_name: string;
    quantity_reserved: number;
    reserved_date: string;
  }>;
};

export const harvestService = {
  async getHarvests(): Promise<HarvestWithDetails[]> {
    const { data, error } = await supabase
      .from("harvests")
      .select(`
        *,
        plantings (
          *,
          plant_types (*),
          locations (*)
        )
      `);
    if (error) {
      console.error("Error getting harvests with details:", error);
      throw error;
    }
    return data as HarvestWithDetails[];
  },

  async getHarvest(id: string) {
    const { data, error } = await supabase
      .from("harvests")
      .select(`
        *,
        plantings (
          *,
          plant_types (*),
          locations (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as HarvestWithDetails;
  },

  /**
   * Get total reserved quantity for a planting (pending reservations only)
   */
  async getReservedQuantity(plantingId: string): Promise<number> {
    const { data, error } = await supabase
      .from("reservations")
      .select("quantity_reserved")
      .eq("planting_id", plantingId)
      .eq("status", "pending");

    if (error) {
      console.error("Error getting reserved quantity:", error);
      return 0;
    }

    return data.reduce((sum, r) => sum + r.quantity_reserved, 0);
  },

  /**
   * Get pending reservations for a planting
   */
  async getPendingReservations(plantingId: string) {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("planting_id", plantingId)
      .eq("status", "pending")
      .order("reserved_date", { ascending: true });

    if (error) {
      console.error("Error getting pending reservations:", error);
      return [];
    }

    return data;
  },

  /**
   * Validate if a harvest quantity is allowed
   */
  async validateHarvest(plantingId: string, harvestQuantity: number): Promise<HarvestValidationResult> {
    // Get planting details
    const { data: planting, error: plantingError } = await supabase
      .from("plantings")
      .select("quantity, remaining_quantity")
      .eq("id", plantingId)
      .single();

    if (plantingError || !planting) {
      return {
        valid: false,
        available: 0,
        reserved: 0,
        harvestable: 0,
        error: "Planting not found"
      };
    }

    const currentRemaining = planting.remaining_quantity ?? planting.quantity;
    
    // Get total reserved quantity
    const reservedQty = await this.getReservedQuantity(plantingId);
    
    // Calculate harvestable (remaining minus reserved)
    const harvestable = currentRemaining - reservedQty;

    // Validate harvest quantity doesn't exceed remaining
    if (harvestQuantity > currentRemaining) {
      return {
        valid: false,
        available: currentRemaining,
        reserved: reservedQty,
        harvestable,
        error: `Harvest quantity (${harvestQuantity}) exceeds available quantity (${currentRemaining})`
      };
    }

    // Check if harvest would break reservation commitments
    if (harvestQuantity > harvestable) {
      const conflictingReservations = await this.getPendingReservations(plantingId);
      
      return {
        valid: false,
        available: currentRemaining,
        reserved: reservedQty,
        harvestable,
        reservationConflict: true,
        error: `Harvest quantity (${harvestQuantity}) would break reservation commitments. ${reservedQty} units reserved, only ${harvestable} available for harvest.`,
        conflictingReservations: conflictingReservations.map(r => ({
          id: r.id,
          customer_name: r.customer_name,
          quantity_reserved: r.quantity_reserved,
          reserved_date: r.reserved_date
        }))
      };
    }

    return {
      valid: true,
      available: currentRemaining,
      reserved: reservedQty,
      harvestable,
    };
  },

  async createHarvest(harvest: Omit<Harvest, "id" | "created_at" | "updated_at">, overrideReservations = false) {
    // Validate harvest first
    const validation = await this.validateHarvest(harvest.planting_id, harvest.quantity_harvested);
    
    if (!validation.valid && !overrideReservations) {
      throw new Error(validation.error || "Invalid harvest quantity");
    }

    // If overriding reservations and there's a conflict, we still need to ensure we don't exceed total remaining
    if (overrideReservations && validation.reservationConflict) {
      if (harvest.quantity_harvested > validation.available) {
        throw new Error(`Cannot harvest ${harvest.quantity_harvested} - only ${validation.available} available in total`);
      }
    }

    // 1. Create the harvest record
    const { data, error } = await supabase
      .from("harvests")
      .insert([harvest])
      .select()
      .single();
    if (error) throw error;
    
    // 2. Update the planting's remaining quantity
    const { data: plantingData, error: plantingError } = await supabase
      .from("plantings")
      .select("quantity")
      .eq("id", harvest.planting_id)
      .single();
    
    if (plantingError) throw plantingError;
    
    // Calculate new remaining quantity
    const totalHarvested = await this.getTotalHarvestedQuantity(harvest.planting_id);
    const newRemaining = plantingData.quantity - totalHarvested;
    
    // Update planting
    const { error: updateError } = await supabase
      .from("plantings")
      .update({ remaining_quantity: newRemaining })
      .eq("id", harvest.planting_id);
    
    if (updateError) throw updateError;
    
    return data;
  },

  async createBulkHarvests(harvests: Omit<Harvest, "id" | "created_at" | "updated_at">[], overrideReservations = false) {
    // Validate all harvests first
    for (const harvest of harvests) {
      const validation = await this.validateHarvest(harvest.planting_id, harvest.quantity_harvested);
      
      if (!validation.valid && !overrideReservations) {
        throw new Error(`Validation failed for planting ${harvest.planting_id}: ${validation.error}`);
      }

      if (overrideReservations && validation.reservationConflict && harvest.quantity_harvested > validation.available) {
        throw new Error(`Cannot harvest ${harvest.quantity_harvested} from planting ${harvest.planting_id} - only ${validation.available} available`);
      }
    }

    // 1. Create all harvest records
    const { data, error } = await supabase
      .from("harvests")
      .insert(harvests)
      .select();
      
    if (error) {
      console.error("Error creating bulk harvests:", error);
      throw error;
    }
    
    // 2. Update remaining quantities for all affected plantings
    const plantingIds = [...new Set(harvests.map(h => h.planting_id))];
    
    for (const plantingId of plantingIds) {
      const { data: plantingData, error: plantingError } = await supabase
        .from("plantings")
        .select("quantity")
        .eq("id", plantingId)
        .single();
      
      if (plantingError) {
        console.error(`Error fetching planting ${plantingId}:`, plantingError);
        continue;
      }
      
      // Calculate new remaining quantity
      const totalHarvested = await this.getTotalHarvestedQuantity(plantingId);
      const newRemaining = plantingData.quantity - totalHarvested;
      
      // Update planting
      const { error: updateError } = await supabase
        .from("plantings")
        .update({ remaining_quantity: newRemaining })
        .eq("id", plantingId);
      
      if (updateError) {
        console.error(`Error updating planting ${plantingId}:`, updateError);
      }
    }
    
    return data;
  },

  async updateHarvest(id: string, harvest: Partial<Harvest>) {
    const { data, error } = await supabase
      .from("harvests")
      .update(harvest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteHarvest(id: string) {
    // Get harvest details before deleting
    const { data: harvestData, error: fetchError } = await supabase
      .from("harvests")
      .select("planting_id, quantity_harvested")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Delete the harvest
    const { error } = await supabase
      .from("harvests")
      .delete()
      .eq("id", id);
    
    if (error) throw error;

    // Recalculate remaining quantity for the planting
    const { data: plantingData, error: plantingError } = await supabase
      .from("plantings")
      .select("quantity")
      .eq("id", harvestData.planting_id)
      .single();
    
    if (plantingError) throw plantingError;
    
    const totalHarvested = await this.getTotalHarvestedQuantity(harvestData.planting_id);
    const newRemaining = plantingData.quantity - totalHarvested;
    
    await supabase
      .from("plantings")
      .update({ remaining_quantity: newRemaining })
      .eq("id", harvestData.planting_id);

    return true;
  },

  async getTotalHarvestedQuantity(plantingId: string) {
    const { data, error } = await supabase
      .from("harvests")
      .select("quantity_harvested")
      .eq("planting_id", plantingId);

    if (error) {
      console.error("Error getting total harvested quantity:", error);
      return 0;
    }
    return data.reduce((sum, h) => sum + h.quantity_harvested, 0);
  }
};