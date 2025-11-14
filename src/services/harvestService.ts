import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
export type Planting = Database["public"]["Tables"]["plantings"]["Row"];
export type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];

export type HarvestWithDetails = Harvest & {
  plantings: (Planting & {
    plant_types: PlantType | null;
    locations: Location | null;
  }) | null;
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

  async createHarvest(harvest: Omit<Harvest, "id" | "created_at" | "updated_at">) {
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

  async createBulkHarvests(harvests: Omit<Harvest, "id" | "created_at" | "updated_at">[]) {
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
    const { data, error } = await supabase
      .from("harvests")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return data;
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