
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];
type PlantTypeInsert = Database["public"]["Tables"]["plant_types"]["Insert"];
type PlantTypeUpdate = Database["public"]["Tables"]["plant_types"]["Update"];

export const plantTypeService = {
  async getPlantTypes() {
    const { data, error } = await supabase
      .from("plant_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data as PlantType[];
  },

  async getPlantTypeById(id: string) {
    const { data, error } = await supabase
      .from("plant_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as PlantType;
  },

  async createPlantType(plantType: PlantTypeInsert) {
    const { data, error } = await supabase
      .from("plant_types")
      .insert([plantType])
      .select()
      .single();

    if (error) throw error;
    return data as PlantType;
  },

  async updatePlantType(id: string, updates: PlantTypeUpdate) {
    const { data, error } = await supabase
      .from("plant_types")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as PlantType;
  },

  async deletePlantType(id: string) {
    const { error } = await supabase
      .from("plant_types")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};
