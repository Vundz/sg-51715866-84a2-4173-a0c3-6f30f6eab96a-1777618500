
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Planting = Database["public"]["Tables"]["plantings"]["Row"];
type PlantingInsert = Database["public"]["Tables"]["plantings"]["Insert"];
type PlantingUpdate = Database["public"]["Tables"]["plantings"]["Update"];

export const plantingService = {
  async getPlantings() {
    const { data, error } = await supabase
      .from("plantings")
      .select(`
        *,
        plant_types!plantings_plant_type_id_fkey (
          id,
          name,
          variety,
          description,
          growth_duration
        ),
        locations!plantings_location_id_fkey (
          id,
          name,
          type,
          capacity
        )
      `)
      .order("date_planted", { ascending: false });

    if (error) throw error;
    return data as (Planting & {
      plant_types: Database["public"]["Tables"]["plant_types"]["Row"];
      locations: Database["public"]["Tables"]["locations"]["Row"];
    })[];
  },

  async getPlantingById(id: string) {
    const { data, error } = await supabase
      .from("plantings")
      .select(`
        *,
        plant_types!plantings_plant_type_id_fkey (*),
        locations!plantings_location_id_fkey (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createPlanting(planting: PlantingInsert) {
    const { data, error } = await supabase
      .from("plantings")
      .insert([planting])
      .select()
      .single();

    if (error) throw error;
    return data as Planting;
  },

  async updatePlanting(id: string, updates: PlantingUpdate) {
    const { data, error } = await supabase
      .from("plantings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Planting;
  },

  async deletePlanting(id: string) {
    const { error } = await supabase
      .from("plantings")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async getActivePlantings() {
    const { data, error } = await supabase
      .from("plantings")
      .select(`
        *,
        plant_types!plantings_plant_type_id_fkey (*),
        locations!plantings_location_id_fkey (*)
      `)
      .eq("status", "active")
      .order("date_planted", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getPlantingsByLocation(locationId: string) {
    const { data, error } = await supabase
      .from("plantings")
      .select(`
        *,
        plant_types!plantings_plant_type_id_fkey (*)
      `)
      .eq("location_id", locationId)
      .order("date_planted", { ascending: false });

    if (error) throw error;
    return data;
  }
};
