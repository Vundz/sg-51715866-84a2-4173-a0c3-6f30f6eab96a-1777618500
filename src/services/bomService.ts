import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BOMSetting = Database["public"]["Tables"]["bom_settings"]["Row"];
export type BOMTemplate = Database["public"]["Tables"]["bom_templates"]["Row"];

export const bomService = {
  // ============================================
  // BOM SETTINGS (Configuration Parameters)
  // ============================================
  
  /**
   * Get all BOM settings
   */
  async getSettings(): Promise<BOMSetting[]> {
    const { data, error } = await supabase
      .from("bom_settings")
      .select("*")
      .order("category", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<BOMSetting[]> {
    const { data, error } = await supabase
      .from("bom_settings")
      .select("*")
      .eq("category", category)
      .order("setting_key", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single setting by key
   */
  async getSetting(key: string): Promise<BOMSetting | null> {
    const { data, error } = await supabase
      .from("bom_settings")
      .select("*")
      .eq("setting_key", key)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create or update a setting (upsert)
   */
  async upsertSetting(setting: Omit<BOMSetting, "id" | "created_at" | "updated_at">): Promise<BOMSetting> {
    // Check if setting exists
    const existing = await this.getSetting(setting.setting_key);

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("bom_settings")
        .update({
          setting_value: setting.setting_value,
          unit: setting.unit,
          description: setting.description,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from("bom_settings")
        .insert([setting])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Batch upsert multiple settings
   */
  async batchUpsertSettings(settings: Omit<BOMSetting, "id" | "created_at" | "updated_at">[]): Promise<void> {
    for (const setting of settings) {
      await this.upsertSetting(setting);
    }
  },

  /**
   * Delete a setting
   */
  async deleteSetting(id: string): Promise<void> {
    const { error } = await supabase
      .from("bom_settings")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Initialize default BOM settings
   */
  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings: Omit<BOMSetting, "id" | "created_at" | "updated_at">[] = [
      // Tray Configuration
      {
        category: "tray",
        setting_key: "tray_seedlings_capacity",
        setting_value: "220",
        unit: "seedlings",
        description: "Number of seedlings per tray",
      },
      {
        category: "tray",
        setting_key: "tray_purchase_cost",
        setting_value: "50",
        unit: "ZMW",
        description: "Cost to purchase one tray",
      },
      {
        category: "tray",
        setting_key: "tray_lifespan_uses",
        setting_value: "10",
        unit: "uses",
        description: "Number of planting cycles before tray replacement",
      },

      // Growing Medium (Coco Peat)
      {
        category: "medium",
        setting_key: "medium_volume_per_tray",
        setting_value: "5",
        unit: "liters",
        description: "Volume of growing medium (coco peat) per tray",
      },
      {
        category: "medium",
        setting_key: "medium_cost_per_liter",
        setting_value: "3",
        unit: "ZMW/L",
        description: "Cost of growing medium per liter",
      },
      {
        category: "medium",
        setting_key: "medium_wastage_factor",
        setting_value: "0.05",
        unit: "decimal",
        description: "Wastage factor (0.05 = 5% loss)",
      },

      // Seed Configuration
      {
        category: "seed",
        setting_key: "seed_buffer_percentage",
        setting_value: "0.10",
        unit: "decimal",
        description: "Extra seeds to account for germination failures (0.10 = 10%)",
      },

      // Labor Costs
      {
        category: "labor",
        setting_key: "labor_hourly_rate",
        setting_value: "25",
        unit: "ZMW/hour",
        description: "Hourly labor rate",
      },
      {
        category: "labor",
        setting_key: "labor_planting_minutes_per_tray",
        setting_value: "15",
        unit: "minutes",
        description: "Time required to plant one tray",
      },
      {
        category: "labor",
        setting_key: "labor_maintenance_minutes_per_tray_per_week",
        setting_value: "5",
        unit: "minutes",
        description: "Weekly maintenance time per tray",
      },
      {
        category: "labor",
        setting_key: "labor_harvesting_minutes_per_tray",
        setting_value: "10",
        unit: "minutes",
        description: "Time required to harvest one tray",
      },

      // Utilities
      {
        category: "utilities",
        setting_key: "water_liters_per_tray_per_day",
        setting_value: "2",
        unit: "liters",
        description: "Water consumption per tray per day",
      },
      {
        category: "utilities",
        setting_key: "water_cost_per_liter",
        setting_value: "0.05",
        unit: "ZMW/L",
        description: "Cost of water per liter",
      },

      // Overhead
      {
        category: "overhead",
        setting_key: "overhead_percentage",
        setting_value: "0.10",
        unit: "decimal",
        description: "Overhead as percentage of direct costs (0.10 = 10%)",
      },
    ];

    await this.batchUpsertSettings(defaultSettings);
  },

  // ============================================
  // BOM TEMPLATES (Per Plant Type/Variety)
  // ============================================
  
  /**
   * Get all BOM templates
   */
  async getTemplates(): Promise<BOMTemplate[]> {
    const { data, error } = await supabase
      .from("bom_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get BOM template by plant type ID
   */
  async getTemplateByPlantType(plantTypeId: string): Promise<BOMTemplate | null> {
    const { data, error } = await supabase
      .from("bom_templates")
      .select("*")
      .eq("plant_type_id", plantTypeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create BOM template
   */
  async createTemplate(template: Omit<BOMTemplate, "id" | "created_at" | "updated_at">): Promise<BOMTemplate> {
    const { data, error } = await supabase
      .from("bom_templates")
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update BOM template
   */
  async updateTemplate(id: string, updates: Partial<Omit<BOMTemplate, "id" | "created_at" | "updated_at">>): Promise<BOMTemplate> {
    const { data, error } = await supabase
      .from("bom_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete BOM template
   */
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from("bom_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Clone BOM template for a new plant type
   */
  async cloneTemplate(sourceTemplateId: string, newPlantTypeId: string): Promise<BOMTemplate> {
    // Get source template
    const { data: sourceTemplate, error: fetchError } = await supabase
      .from("bom_templates")
      .select("*")
      .eq("id", sourceTemplateId)
      .single();

    if (fetchError) throw fetchError;

    // Create new template with same values but different plant type
    const newTemplate: Omit<BOMTemplate, "id" | "created_at" | "updated_at"> = {
      plant_type_id: newPlantTypeId,
      seed_cost_per_unit: sourceTemplate.seed_cost_per_unit,
      germination_rate: sourceTemplate.germination_rate,
      fertilizer_applications_per_week: sourceTemplate.fertilizer_applications_per_week,
      fertilizer_ml_per_tray_per_application: sourceTemplate.fertilizer_ml_per_tray_per_application,
      fungicide_applications_total: sourceTemplate.fungicide_applications_total,
      fungicide_ml_per_tray_per_application: sourceTemplate.fungicide_ml_per_tray_per_application,
      insecticide_applications_total: sourceTemplate.insecticide_applications_total,
      insecticide_ml_per_tray_per_application: sourceTemplate.insecticide_ml_per_tray_per_application,
      notes: `Cloned from template ${sourceTemplateId}`,
    };

    return await this.createTemplate(newTemplate);
  },

  // ============================================
  // COST CALCULATION HELPERS
  // ============================================
  
  /**
   * Calculate total BOM cost for a planting batch
   */
  async calculatePlantingCost(
    plantTypeId: string,
    quantity: number,
    growthDurationDays: number
  ): Promise<{
    breakdown: {
      seeds: number;
      trays: number;
      medium: number;
      fertilizer: number;
      treatments: number;
      labor: number;
      utilities: number;
      overhead: number;
    };
    total: number;
    costPerSeedling: number;
    traysRequired: number;
  }> {
    // Get settings
    const settings = await this.getSettings();
    const settingsMap = new Map(settings.map(s => [s.setting_key, parseFloat(s.setting_value)]));

    // Get template
    const template = await this.getTemplateByPlantType(plantTypeId);

    // Helper to get setting value with fallback
    const getSetting = (key: string, fallback: number = 0): number => {
      return settingsMap.get(key) || fallback;
    };

    // Calculate trays required
    const seedlingsPerTray = getSetting("tray_seedlings_capacity", 220);
    const traysRequired = Math.ceil(quantity / seedlingsPerTray);

    // 1. SEED COST
    const seedCostPerUnit = template?.seed_cost_per_unit || 0;
    const germinationRate = template?.germination_rate || 0.95;
    const seedBuffer = getSetting("seed_buffer_percentage", 0.10);
    const seedsNeeded = quantity * (1 + seedBuffer) / germinationRate;
    const seedCost = seedsNeeded * seedCostPerUnit;

    // 2. TRAY COST (Amortized)
    const trayPurchaseCost = getSetting("tray_purchase_cost", 50);
    const trayLifespanUses = getSetting("tray_lifespan_uses", 10);
    const trayCost = traysRequired * (trayPurchaseCost / trayLifespanUses);

    // 3. GROWING MEDIUM COST
    const mediumVolumePerTray = getSetting("medium_volume_per_tray", 5);
    const mediumCostPerLiter = getSetting("medium_cost_per_liter", 3);
    const mediumWastageFactor = getSetting("medium_wastage_factor", 0.05);
    const mediumCost = traysRequired * mediumVolumePerTray * mediumCostPerLiter * (1 + mediumWastageFactor);

    // 4. FERTILIZER COST
    const fertAppPerWeek = template?.fertilizer_applications_per_week || 1;
    const fertMlPerTray = template?.fertilizer_ml_per_tray_per_application || 50;
    const weeksInCycle = Math.ceil(growthDurationDays / 7);
    const totalFertApplications = fertAppPerWeek * weeksInCycle;
    const fertilizerCost = traysRequired * fertMlPerTray * totalFertApplications * 0.5; // Assuming 0.5 ZMW per ml

    // 5. TREATMENT COST (Fungicide + Insecticide)
    const fungicideApps = template?.fungicide_applications_total || 2;
    const fungicideMlPerTray = template?.fungicide_ml_per_tray_per_application || 30;
    const insecticideApps = template?.insecticide_applications_total || 1;
    const insecticideMlPerTray = template?.insecticide_ml_per_tray_per_application || 25;
    const treatmentCost = 
      (traysRequired * fungicideApps * fungicideMlPerTray * 0.8) + // Assuming 0.8 ZMW per ml
      (traysRequired * insecticideApps * insecticideMlPerTray * 0.9); // Assuming 0.9 ZMW per ml

    // 6. LABOR COST
    const laborHourlyRate = getSetting("labor_hourly_rate", 25);
    const plantingMinutesPerTray = getSetting("labor_planting_minutes_per_tray", 15);
    const maintenanceMinutesPerTrayPerWeek = getSetting("labor_maintenance_minutes_per_tray_per_week", 5);
    const harvestingMinutesPerTray = getSetting("labor_harvesting_minutes_per_tray", 10);
    
    const totalLaborMinutes = 
      (traysRequired * plantingMinutesPerTray) + 
      (traysRequired * maintenanceMinutesPerTrayPerWeek * weeksInCycle) + 
      (traysRequired * harvestingMinutesPerTray);
    const laborCost = (totalLaborMinutes / 60) * laborHourlyRate;

    // 7. UTILITIES COST
    const waterLitersPerTrayPerDay = getSetting("water_liters_per_tray_per_day", 2);
    const waterCostPerLiter = getSetting("water_cost_per_liter", 0.05);
    const utilitiesCost = traysRequired * waterLitersPerTrayPerDay * growthDurationDays * waterCostPerLiter;

    // 8. OVERHEAD
    const directCosts = seedCost + trayCost + mediumCost + fertilizerCost + treatmentCost + laborCost + utilitiesCost;
    const overheadPercentage = getSetting("overhead_percentage", 0.10);
    const overheadCost = directCosts * overheadPercentage;

    // TOTAL
    const totalCost = directCosts + overheadCost;
    const costPerSeedling = totalCost / quantity;

    return {
      breakdown: {
        seeds: seedCost,
        trays: trayCost,
        medium: mediumCost,
        fertilizer: fertilizerCost,
        treatments: treatmentCost,
        labor: laborCost,
        utilities: utilitiesCost,
        overhead: overheadCost,
      },
      total: totalCost,
      costPerSeedling,
      traysRequired,
    };
  },
};