import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BOMSetting = Database["public"]["Tables"]["bom_settings"]["Row"];
export type BOMTemplate = Database["public"]["Tables"]["bom_templates"]["Row"];

// Define explicit types for inserts to avoid deep type instantiation issues
type BOMSettingInsert = Database["public"]["Tables"]["bom_settings"]["Insert"];
type BOMTemplateInsert = Database["public"]["Tables"]["bom_templates"]["Insert"];
type BOMTemplateUpdate = Database["public"]["Tables"]["bom_templates"]["Update"];

/**
 * Safely convert any value to a number
 */
const toNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

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
  async upsertSetting(setting: BOMSettingInsert): Promise<BOMSetting> {
    // Check if setting exists
    const existing = await this.getSetting(setting.setting_key || '');

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
  async batchUpsertSettings(settings: BOMSettingInsert[]): Promise<void> {
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
    const defaultSettings: BOMSettingInsert[] = [
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
  async createTemplate(template: BOMTemplateInsert): Promise<BOMTemplate> {
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
  async updateTemplate(id: string, updates: BOMTemplateUpdate): Promise<BOMTemplate> {
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
    const newTemplate: BOMTemplateInsert = {
      plant_type_id: newPlantTypeId,
      name: `Copy of ${sourceTemplate.name}`,
      description: sourceTemplate.description,
      // medium_volume_per_tray and labor/utility overrides are optional/nullable in schema
      // so we only copy if they exist, or we can copy everything that matches the schema
      medium_volume_per_tray: sourceTemplate.medium_volume_per_tray,
      planting_hours_per_tray: sourceTemplate.planting_hours_per_tray,
      maintenance_hours_per_tray_per_week: sourceTemplate.maintenance_hours_per_tray_per_week,
      harvest_hours_per_tray: sourceTemplate.harvest_hours_per_tray,
      water_liters_per_tray_per_day: sourceTemplate.water_liters_per_tray_per_day,
      electricity_kwh_per_tray_per_day: sourceTemplate.electricity_kwh_per_tray_per_day,
      expected_survival_rate: sourceTemplate.expected_survival_rate,
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
    // Let's fetch seed cost from the new table
    const { data: seedCostData } = await supabase
      .from("bom_seed_costs")
      .select("cost_per_seed, germination_rate, buffer_percent")
      .eq("plant_type_id", plantTypeId)
      .maybeSingle();

    // Use the safe number conversion helper
    const seedCostPerUnit = toNumber(seedCostData?.cost_per_seed, 0);
    const germinationRate = toNumber(seedCostData?.germination_rate, 90) / 100;
    const seedBuffer = toNumber(seedCostData?.buffer_percent, 10) / 100;
    
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
    // Let's create a helper to fetch template items
    const { data: templateItems } = await supabase
      .from("bom_template_items")
      .select("*")
      .eq("bom_template_id", template?.id || '');
      
    // Filter items by category
    const fertilizerItems = templateItems?.filter(i => i.item_category === 'fertilizer') || [];
    const fungicideItems = templateItems?.filter(i => i.item_category === 'fungicide') || [];
    const insecticideItems = templateItems?.filter(i => i.item_category === 'insecticide') || [];

    // Calculate Fertilizer Cost
    // Sum of (qty_per_tray * applications * unit_cost) for all fertilizer items
    let fertilizerCost = 0;
    const weeksInCycle = Math.ceil(growthDurationDays / 7);
    
    for (const item of fertilizerItems) {
        // For simplicity in Sprint 1, assuming applications_per_cycle is correct total
        // If frequency is 'weekly', we might need to calc: weeksInCycle
        let totalApps = item.applications_per_cycle || 1;
        if (item.application_frequency === 'weekly') totalApps = weeksInCycle;
        
        fertilizerCost += traysRequired * (item.quantity_per_tray || 0) * totalApps * (item.estimated_unit_cost || 0);
    }

    // 5. TREATMENT COST (Fungicide + Insecticide)
    let treatmentCost = 0;
    const treatmentItems = [...fungicideItems, ...insecticideItems];
    
    for (const item of treatmentItems) {
        let totalApps = item.applications_per_cycle || 1;
        if (item.application_frequency === 'weekly') totalApps = weeksInCycle;
        
        treatmentCost += traysRequired * (item.quantity_per_tray || 0) * totalApps * (item.estimated_unit_cost || 0);
    }

    // 6. LABOR COST
    const laborHourlyRate = getSetting("labor_hourly_rate", 25);
    // Use template overrides if available, else defaults
    const plantingMinutesPerTray = (template?.planting_hours_per_tray || getSetting("planting_hours_per_tray", 0.5)) * 60;
    const maintenanceMinutesPerTrayPerWeek = (template?.maintenance_hours_per_tray_per_week || getSetting("maintenance_hours_per_tray_per_week", 0.1)) * 60;
    const harvestingMinutesPerTray = (template?.harvest_hours_per_tray || getSetting("harvest_hours_per_tray", 0.5)) * 60;
    
    const totalLaborMinutes = 
      (traysRequired * plantingMinutesPerTray) + 
      (traysRequired * maintenanceMinutesPerTrayPerWeek * weeksInCycle) + 
      (traysRequired * harvestingMinutesPerTray);
    const laborCost = (totalLaborMinutes / 60) * laborHourlyRate;

    // 7. UTILITIES COST
    const waterLitersPerTrayPerDay = template?.water_liters_per_tray_per_day || getSetting("water_liters_per_tray_per_day", 2);
    const waterCostPerLiter = getSetting("water_cost_per_liter", 0.05);
    const utilitiesCost = traysRequired * waterLitersPerTrayPerDay * growthDurationDays * waterCostPerLiter;

    // 8. OVERHEAD
    const directCosts = seedCost + trayCost + mediumCost + fertilizerCost + treatmentCost + laborCost + utilitiesCost;
    const overheadPercentage = getSetting("overhead_percentage", 10) / 100; // stored as 10 for 10%
    const overheadCost = directCosts * overheadPercentage;

    // TOTAL
    const totalCost = directCosts + overheadCost;
    const costPerSeedling = quantity > 0 ? totalCost / quantity : 0;

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