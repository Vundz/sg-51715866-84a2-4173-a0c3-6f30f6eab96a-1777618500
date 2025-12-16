import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InventoryCategory = Database["public"]["Tables"]["inventory_categories"]["Row"];
export type InventoryUnit = Database["public"]["Tables"]["inventory_units"]["Row"];
export type InventorySupplier = Database["public"]["Tables"]["inventory_suppliers"]["Row"];

export const inventorySettingsService = {
  // ============================================
  // CATEGORIES
  // ============================================
  
  async getCategories(): Promise<InventoryCategory[]> {
    const { data, error } = await supabase
      .from("inventory_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createCategory(category: Omit<InventoryCategory, "id" | "created_at" | "updated_at">): Promise<InventoryCategory> {
    const { data, error } = await supabase
      .from("inventory_categories")
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<Omit<InventoryCategory, "id" | "created_at" | "updated_at">>): Promise<InventoryCategory> {
    const { data, error } = await supabase
      .from("inventory_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from("inventory_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // ============================================
  // UNITS
  // ============================================
  
  async getUnits(): Promise<InventoryUnit[]> {
    const { data, error } = await supabase
      .from("inventory_units")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createUnit(unit: Omit<InventoryUnit, "id" | "created_at" | "updated_at">): Promise<InventoryUnit> {
    const { data, error } = await supabase
      .from("inventory_units")
      .insert([unit])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateUnit(id: string, updates: Partial<Omit<InventoryUnit, "id" | "created_at" | "updated_at">>): Promise<InventoryUnit> {
    const { data, error } = await supabase
      .from("inventory_units")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from("inventory_units")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // ============================================
  // SUPPLIERS
  // ============================================
  
  async getSuppliers(): Promise<InventorySupplier[]> {
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createSupplier(supplier: Omit<InventorySupplier, "id" | "created_at" | "updated_at">): Promise<InventorySupplier> {
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .insert([supplier])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSupplier(id: string, updates: Partial<Omit<InventorySupplier, "id" | "created_at" | "updated_at">>): Promise<InventorySupplier> {
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from("inventory_suppliers")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // ============================================
  // INITIALIZATION (First-Time Setup)
  // ============================================
  
  async initializeDefaults(): Promise<void> {
    // Check if categories already exist
    const { data: existingCategories } = await supabase
      .from("inventory_categories")
      .select("id")
      .limit(1);

    // Only initialize if no categories exist
    if (!existingCategories || existingCategories.length === 0) {
      const defaultCategories = [
        { name: "Fungicide", color: "#9333ea", description: "Fungal disease treatment" },
        { name: "Insecticide", color: "#dc2626", description: "Insect pest control" },
        { name: "Fertilizer", color: "#16a34a", description: "Plant nutrition" },
        { name: "Other", color: "#6b7280", description: "Miscellaneous items" },
      ];

      await supabase.from("inventory_categories").insert(defaultCategories);
    }

    // Check if units already exist
    const { data: existingUnits } = await supabase
      .from("inventory_units")
      .select("id")
      .limit(1);

    // Only initialize if no units exist
    if (!existingUnits || existingUnits.length === 0) {
      const defaultUnits = [
        { name: "Liters", abbreviation: "L", type: "volume" },
        { name: "Milliliters", abbreviation: "ml", type: "volume" },
        { name: "Kilograms", abbreviation: "kg", type: "weight" },
        { name: "Grams", abbreviation: "g", type: "weight" },
        { name: "Bags", abbreviation: "bags", type: "count" },
        { name: "Bottles", abbreviation: "bottles", type: "count" },
        { name: "Sachets", abbreviation: "sachets", type: "count" },
        { name: "Packets", abbreviation: "packets", type: "count" },
      ];

      await supabase.from("inventory_units").insert(defaultUnits);
    }
  },
};