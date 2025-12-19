import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChemicalProduct = Database["public"]["Tables"]["chemical_products"]["Row"];
export type SavedMix = Database["public"]["Tables"]["saved_mixes"]["Row"];

export interface ChemicalProductWithInventory extends ChemicalProduct {
  inventory_items?: {
    name: string;
    current_stock: number;
    unit_of_measure: string;
  } | null;
}

export interface SavedMixWithDetails extends SavedMix {
  chemical_products?: ChemicalProduct | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

export interface CalculationInput {
  mode: "water_to_chemical" | "chemical_to_water" | "ec_based";
  product: ChemicalProduct;
  waterVolume?: number;
  chemicalAmount?: number;
  concentration?: number;
  targetEC?: number;
}

export interface CalculationResult {
  waterRequired: number | null;
  chemicalRequired: number | null;
  concentration: number;
  calculatedEC: number | null;
  npk: {
    n: number;
    p: number;
    k: number;
  } | null;
  warnings: string[];
}

export const chemicalCalculatorService = {
  /**
   * Perform calculation based on mode
   */
  calculate(input: CalculationInput): CalculationResult {
    const { mode, product, waterVolume, chemicalAmount, concentration, targetEC } = input;
    const warnings: string[] = [];
    
    const result: Partial<CalculationResult> = {
      waterRequired: null,
      chemicalRequired: null,
      concentration: 0,
      calculatedEC: null,
      npk: null,
    };
    
    switch (mode) {
      case "water_to_chemical":
        // Given: water volume + concentration → Calculate: chemical amount
        if (!waterVolume || !concentration) {
          warnings.push("Water volume and concentration are required");
          break;
        }
        
        result.chemicalRequired = waterVolume * concentration;
        result.concentration = concentration;
        
        if (product.ec_factor) {
          result.calculatedEC = concentration * Number(product.ec_factor);
        }
        break;
        
      case "chemical_to_water":
        // Given: chemical amount + concentration → Calculate: water volume
        if (!chemicalAmount || !concentration) {
          warnings.push("Chemical amount and concentration are required");
          break;
        }
        
        result.waterRequired = chemicalAmount / concentration;
        result.concentration = concentration;
        result.chemicalRequired = chemicalAmount;
        
        if (product.ec_factor) {
          result.calculatedEC = concentration * Number(product.ec_factor);
        }
        break;
        
      case "ec_based":
        // Given: water volume + target EC → Calculate: chemical amount
        if (!waterVolume || !targetEC) {
          warnings.push("Water volume and target EC are required");
          break;
        }
        
        if (!product.ec_factor) {
          warnings.push("EC factor not available for this product. Cannot calculate based on EC.");
          break;
        }
        
        result.chemicalRequired = (targetEC / Number(product.ec_factor)) * waterVolume;
        result.concentration = result.chemicalRequired / waterVolume;
        result.calculatedEC = targetEC;
        break;
    }
    
    // Calculate NPK if fertilizer
    if (product.type === "fertilizer" && product.npk_n !== null) {
      const totalChemical = result.chemicalRequired || chemicalAmount || 0;
      result.npk = {
        n: totalChemical * (Number(product.npk_n) / 100),
        p: totalChemical * (Number(product.npk_p || 0) / 100),
        k: totalChemical * (Number(product.npk_k || 0) / 100),
      };
    }
    
    // Concentration warnings
    if (result.concentration > Number(product.max_concentration)) {
      warnings.push(
        `⚠️ Concentration exceeds maximum safe level (${product.max_concentration} ${product.form === "solid" ? "g" : "ml"}/L)`
      );
    }
    if (result.concentration < Number(product.min_concentration)) {
      warnings.push(
        `⚠️ Concentration below minimum effective level (${product.min_concentration} ${product.form === "solid" ? "g" : "ml"}/L)`
      );
    }
    
    // Add safety notes as warnings if present
    if (product.safety_notes) {
      warnings.push(`ℹ️ ${product.safety_notes}`);
    }
    
    return {
      waterRequired: result.waterRequired,
      chemicalRequired: result.chemicalRequired,
      concentration: result.concentration,
      calculatedEC: result.calculatedEC,
      npk: result.npk,
      warnings,
    };
  },

  /**
   * Get all chemical products
   */
  async getProducts(): Promise<ChemicalProductWithInventory[]> {
    const { data, error } = await supabase
      .from("chemical_products")
      .select(`
        *,
        inventory_items (name, current_stock, unit_of_measure)
      `)
      .order("name", { ascending: true });

    if (error) throw error;
    return data as ChemicalProductWithInventory[];
  },

  /**
   * Get a single product
   */
  async getProduct(id: string): Promise<ChemicalProduct> {
    const { data, error } = await supabase
      .from("chemical_products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new product
   */
  async createProduct(
    product: Omit<ChemicalProduct, "id" | "created_at" | "updated_at">
  ): Promise<ChemicalProduct> {
    const { data, error } = await supabase
      .from("chemical_products")
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a product
   */
  async updateProduct(
    id: string,
    updates: Partial<ChemicalProduct>
  ): Promise<ChemicalProduct> {
    const { data, error } = await supabase
      .from("chemical_products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from("chemical_products")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Get all saved mixes
   */
  async getSavedMixes(): Promise<SavedMixWithDetails[]> {
    const { data, error } = await supabase
      .from("saved_mixes")
      .select(`
        *,
        chemical_products (*),
        profiles (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as SavedMixWithDetails[];
  },

  /**
   * Save a calculation as a mix
   */
  async saveMix(mix: {
    product_id: string;
    water_volume: number;
    chemical_amount: number;
    concentration: number;
    target_ec?: number | null;
    calculated_ec?: number | null;
    notes?: string;
    applied_to_planting_ids?: string[];
  }): Promise<SavedMix> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("saved_mixes")
      .insert([{
        ...mix,
        created_by: user?.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a saved mix
   */
  async deleteMix(id: string): Promise<void> {
    const { error } = await supabase
      .from("saved_mixes")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};