
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
type HarvestInsert = Database["public"]["Tables"]["harvests"]["Insert"];
type HarvestUpdate = Database["public"]["Tables"]["harvests"]["Update"];

export const harvestService = {
  async getHarvests() {
    const { data, error } = await supabase
      .from("harvests")
      .select(`
        *,
        plantings!harvests_planting_id_fkey (
          id,
          batch_number,
          date_planted,
          quantity,
          plant_types!plantings_plant_type_id_fkey (
            id,
            name,
            variety
          ),
          locations!plantings_location_id_fkey (
            id,
            name
          )
        )
      `)
      .order("harvest_date", { ascending: false });

    if (error) throw error;
    return data as (Harvest & {
      plantings: Database["public"]["Tables"]["plantings"]["Row"] & {
        plant_types: Database["public"]["Tables"]["plant_types"]["Row"];
        locations: Database["public"]["Tables"]["locations"]["Row"];
      };
    })[];
  },

  async getHarvestById(id: string) {
    const { data, error } = await supabase
      .from("harvests")
      .select(`
        *,
        plantings!harvests_planting_id_fkey (
          *,
          plant_types!plantings_plant_type_id_fkey (*),
          locations!plantings_location_id_fkey (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createHarvest(harvest: HarvestInsert) {
    const { data, error } = await supabase
      .from("harvests")
      .insert([harvest])
      .select()
      .single();

    if (error) throw error;
    return data as Harvest;
  },

  async updateHarvest(id: string, updates: HarvestUpdate) {
    const { data, error } = await supabase
      .from("harvests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Harvest;
  },

  async deleteHarvest(id: string) {
    const { error } = await supabase
      .from("harvests")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async getHarvestsByPlanting(plantingId: string) {
    const { data, error } = await supabase
      .from("harvests")
      .select("*")
      .eq("planting_id", plantingId)
      .order("harvest_date", { ascending: false });

    if (error) throw error;
    return data as Harvest[];
  },

  async getTotalHarvestedQuantity(plantingId: string) {
    const { data, error } = await supabase
      .from("harvests")
      .select("quantity")
      .eq("planting_id", plantingId);

    if (error) throw error;
    
    const total = data.reduce((sum, h) => sum + (h.quantity || 0), 0);
    return total;
  }
};
