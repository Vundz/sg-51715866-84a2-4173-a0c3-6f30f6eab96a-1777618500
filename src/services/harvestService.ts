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
    const { data, error } = await supabase
      .from("harvests")
      .insert([harvest])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createBulkHarvests(harvests: Omit<Harvest, "id" | "created_at" | "updated_at">[]) {
    const { data, error } = await supabase
      .from("harvests")
      .insert(harvests)
      .select();
      
    if (error) {
      console.error("Error creating bulk harvests:", error);
      throw error;
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