import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];

export const plantTypeService = {
  async getPlantTypes() {
    const { data, error } = await supabase
      .from("plant_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
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

  async createPlantType(plantType: Omit<PlantType, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from("plant_types")
      .insert([plantType])
      .select();
    if (error) throw error;
    return data[0];
  },

  async updatePlantType(id: string, plantType: Partial<PlantType>) {
    const { data, error } = await supabase
      .from("plant_types")
      .update(plantType)
      .eq("id", id)
      .select();
    if (error) throw error;
    return data[0];
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
