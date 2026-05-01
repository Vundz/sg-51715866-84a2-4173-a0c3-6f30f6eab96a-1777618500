import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Planting = Database["public"]["Tables"]["plantings"]["Row"];
export type PlantingWithDetails = Planting & {
  plant_types: Database["public"]["Tables"]["plant_types"]["Row"] | null;
  locations: Database["public"]["Tables"]["locations"]["Row"] | null;
};

export const plantingService = {
  async getAllPlantings() {
    const { data, error } = await supabase
      .from("plantings")
      .select(`
        *,
        plant_types(*),
        locations(*)
      `)
      .order("date_planted", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getPlantingsWithDetails() {
    const { data, error } = await supabase
      .from("plantings")
      .select(`
        *,
        plant_types(*),
        locations(*)
      `)
      .order("date_planted", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getPlanting(id: string) {
    const { data, error } = await supabase
      .from("plantings")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createPlanting(planting: Omit<Planting, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from("plantings")
      .insert([planting])
      .select();
    if (error) throw error;
    return data[0];
  },
  
  // Alias for createPlanting
  async addPlanting(planting: Omit<Planting, "id" | "created_at" | "updated_at">) {
    return this.createPlanting(planting);
  },

  async updatePlanting(id: string, planting: Partial<Planting>) {
    const { data, error } = await supabase
      .from("plantings")
      .update(planting)
      .eq("id", id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deletePlanting(id: string) {
    const { data, error } = await supabase
      .from("plantings")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return data;
  },
  
  async getPlantingsByLocation(locationId: string) {
    const { data, error } = await supabase
      .from("plantings")
      .select(`
        *,
        plant_types (
          name,
          variety
        )
      `)
      .eq('location_id', locationId)
      .eq('status', 'active');
      
    if (error) throw error;
    return data;
  },

  async getTotalPlantedQuantity(plantTypeId: string) {
    const { data, error, count } = await supabase
      .from("plantings")
      .select("quantity", { count: 'exact', head: true })
      .eq("plant_type_id", plantTypeId);
    
    if (error) {
      console.error("Error fetching total planted quantity", error);
      return 0;
    }
    
    // This is tricky. Let's fetch and sum.
    const { data: quantities, error: qError } = await supabase
        .from('plantings')
        .select('quantity')
        .eq('plant_type_id', plantTypeId);

    if(qError) return 0;
    
    return quantities.reduce((sum, p) => sum + p.quantity, 0);
  },
};