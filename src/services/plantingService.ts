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

  async getPlantings() {
    return this.getAllPlantings();
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
    const { error } = await supabase
      .from("plantings")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async deductInventory(plantingId: string, inventoryItemId: string, quantity: number) {
    // 1. Get current inventory quantity
    const { data: inventoryItem, error: fetchError } = await supabase
      .from("inventory_items")
      .select("current_stock")
      .eq("id", inventoryItemId)
      .single();

    if (fetchError) throw fetchError;
    if (!inventoryItem) throw new Error("Inventory item not found");
    if (inventoryItem.current_stock < quantity) {
      throw new Error(`Insufficient inventory. Available: ${inventoryItem.current_stock}, Requested: ${quantity}`);
    }

    // 2. Deduct from inventory
    const { error: updateInventoryError } = await supabase
      .from("inventory_items")
      .update({ current_stock: inventoryItem.current_stock - quantity })
      .eq("id", inventoryItemId);

    if (updateInventoryError) throw updateInventoryError;

    // 3. Update planting record
    const { error: updatePlantingError } = await supabase
      .from("plantings")
      .update({ 
        inventory_deducted: true,
        inventory_item_id: inventoryItemId
      } as any)
      .eq("id", plantingId);

    if (updatePlantingError) throw updatePlantingError;

    return { success: true };
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