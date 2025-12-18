import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BOMCategory = Database["public"]["Tables"]["bom_categories"]["Row"];
export type FormulaTemplate = Database["public"]["Tables"]["formula_templates"]["Row"];
export type BOMTemplate = Database["public"]["Tables"]["bom_templates"]["Row"];
export type BOMItem = Database["public"]["Tables"]["bom_items"]["Row"];

export interface BOMTemplateWithDetails extends BOMTemplate {
  plant_types?: { name: string; variety: string } | null;
  profiles?: { full_name: string | null } | null;
  bom_items?: BOMItemWithDetails[];
}

export interface BOMItemWithDetails extends BOMItem {
  inventory_items?: {
    id: string;
    name: string;
    unit_price: number;
    unit_of_measure: string;
    current_stock: number;
  } | null;
  bom_categories?: BOMCategory | null;
}

export interface ProfitAnalysis {
  // Cost metrics
  totalCost: number;
  costPerSeedling: number;
  costPerTray: number;
  
  // Revenue metrics
  sellingPrice: number;
  saleableSeedlings: number;
  expectedRevenue: number;
  
  // Profit metrics
  profitPerSeedling: number;
  grossProfit: number;
  profitMargin: number;
  
  // Break-even metrics
  breakEvenPrice: number;
  breakEvenQuantity: number;
  safetyMargin: number;
  
  // Success rate
  successRate: number;
}

export const bomService = {
  // ============ BOM CATEGORIES ============
  async getCategories(): Promise<BOMCategory[]> {
    const { data, error } = await supabase
      .from("bom_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createCategory(category: Omit<BOMCategory, "id" | "created_at" | "updated_at">): Promise<BOMCategory> {
    const { data, error } = await supabase
      .from("bom_categories")
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<BOMCategory>): Promise<BOMCategory> {
    const { data, error } = await supabase
      .from("bom_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from("bom_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // ============ FORMULA TEMPLATES ============
  async getFormulaTemplates(): Promise<FormulaTemplate[]> {
    const { data, error } = await supabase
      .from("formula_templates")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createFormulaTemplate(template: Omit<FormulaTemplate, "id" | "created_at" | "updated_at">): Promise<FormulaTemplate> {
    const { data, error } = await supabase
      .from("formula_templates")
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFormulaTemplate(id: string, updates: Partial<FormulaTemplate>): Promise<FormulaTemplate> {
    const { data, error } = await supabase
      .from("formula_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFormulaTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from("formula_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // ============ BOM TEMPLATES ============
  async getTemplates(): Promise<BOMTemplateWithDetails[]> {
    const { data, error } = await supabase
      .from("bom_templates")
      .select(`
        *,
        plant_types (name, variety),
        profiles (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as unknown as BOMTemplateWithDetails[];
  },

  async getTemplate(id: string): Promise<BOMTemplateWithDetails> {
    const { data, error } = await supabase
      .from("bom_templates")
      .select(`
        *,
        plant_types (name, variety),
        profiles (full_name),
        bom_items (
          *,
          inventory_items (id, name, unit_price, unit_of_measure, current_stock),
          bom_categories (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as unknown as BOMTemplateWithDetails;
  },

  async createTemplate(template: Omit<BOMTemplate, "id" | "created_at" | "updated_at">): Promise<BOMTemplate> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("bom_templates")
      .insert([{ ...template, created_by: user?.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTemplate(id: string, updates: Partial<BOMTemplate>): Promise<BOMTemplate> {
    const { data, error } = await supabase
      .from("bom_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from("bom_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async duplicateTemplate(id: string, newName: string): Promise<BOMTemplate> {
    // Get the original template with items
    const original = await this.getTemplate(id);

    // Create new template
    const { data: newTemplate, error: templateError } = await supabase
      .from("bom_templates")
      .insert([{
        name: newName,
        description: original.description,
        base_batch_size: original.base_batch_size,
        plant_type_id: original.plant_type_id,
        variety: original.variety,
        target_selling_price: original.target_selling_price,
        estimated_success_rate: original.estimated_success_rate,
        status: "draft",
        created_by: original.created_by,
      }])
      .select()
      .single();

    if (templateError) throw templateError;

    // Copy items if they exist
    if (original.bom_items && original.bom_items.length > 0) {
      const itemsToInsert = original.bom_items.map(item => ({
        template_id: newTemplate.id,
        item_type: item.item_type,
        inventory_item_id: item.inventory_item_id,
        custom_name: item.custom_name,
        custom_unit_price: item.custom_unit_price,
        custom_unit: item.custom_unit,
        quantity_type: item.quantity_type,
        quantity_value: item.quantity_value,
        quantity_formula: item.quantity_formula,
        category_id: item.category_id,
        notes: item.notes,
        sort_order: item.sort_order,
      }));

      const { error: itemsError } = await supabase
        .from("bom_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return newTemplate;
  },

  // ============ BOM ITEMS ============
  async getItems(templateId: string): Promise<BOMItemWithDetails[]> {
    const { data, error } = await supabase
      .from("bom_items")
      .select(`
        *,
        inventory_items (id, name, unit_price, unit_of_measure, current_stock),
        bom_categories (*)
      `)
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data as unknown as BOMItemWithDetails[];
  },

  async createItem(item: Omit<BOMItem, "id" | "created_at" | "updated_at">): Promise<BOMItem> {
    const { data, error } = await supabase
      .from("bom_items")
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateItem(id: string, updates: Partial<BOMItem>): Promise<BOMItem> {
    const { data, error } = await supabase
      .from("bom_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from("bom_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // ============ CALCULATIONS ============
  evaluateFormula(formula: string, variables: Record<string, number>): number {
    try {
      // Replace variable names with their values
      let expression = formula;
      for (const [key, value] of Object.entries(variables)) {
        expression = expression.replace(new RegExp(key, 'g'), value.toString());
      }

      // Safely evaluate the expression (only allow numbers and basic operators)
      if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        console.error("Invalid formula: contains invalid characters:", formula);
        return 0;
      }

       
      return eval(expression);
    } catch (error) {
      console.error("Formula evaluation error:", error, "Formula:", formula);
      return 0;
    }
  },

  calculateItemCost(
    item: BOMItemWithDetails,
    batchSize: number
  ): { quantity: number; unitPrice: number; subtotal: number } {
    const trayCount = Math.ceil(batchSize / 220);
    
    let quantity = 0;
    if (item.quantity_type === "fixed" && item.quantity_value) {
      quantity = Number(item.quantity_value);
    } else if (item.quantity_type === "formula" && item.quantity_formula) {
      quantity = this.evaluateFormula(item.quantity_formula, {
        batch_size: batchSize,
        tray_count: trayCount,
      });
    }

    let unitPrice = 0;
    if (item.item_type === "inventory" && item.inventory_items) {
      unitPrice = Number(item.inventory_items.unit_price);
    } else if (item.item_type === "adhoc" && item.custom_unit_price) {
      unitPrice = Number(item.custom_unit_price);
    }

    const subtotal = quantity * unitPrice;

    return { quantity, unitPrice, subtotal };
  },

  calculateTemplateCost(template: BOMTemplateWithDetails, batchSize?: number): {
    items: Array<BOMItemWithDetails & { calculatedQuantity: number; subtotal: number }>;
    totalCost: number;
    costPerSeedling: number;
    costPerTray: number;
    categoryTotals: Record<string, number>;
  } {
    const actualBatchSize = batchSize || template.base_batch_size;
    const trayCount = Math.ceil(actualBatchSize / 220);

    let totalCost = 0;
    const categoryTotals: Record<string, number> = {};

    const items = (template.bom_items || []).map(item => {
      const { quantity, unitPrice, subtotal } = this.calculateItemCost(item, actualBatchSize);
      totalCost += subtotal;

      // Accumulate category totals
      const categoryName = item.bom_categories?.name || "Uncategorized";
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + subtotal;

      return {
        ...item,
        calculatedQuantity: quantity,
        subtotal,
      };
    });

    return {
      items,
      totalCost,
      costPerSeedling: totalCost / actualBatchSize,
      costPerTray: totalCost / trayCount,
      categoryTotals,
    };
  },

  // ============ PROFIT ANALYSIS ============
  calculateProfitAnalysis(
    template: BOMTemplateWithDetails, 
    batchSize?: number,
    sellingPrice?: number
  ): ProfitAnalysis {
    const actualBatchSize = batchSize || template.base_batch_size;
    const actualSellingPrice = sellingPrice || template.target_selling_price || 0;
    const successRate = template.estimated_success_rate || 95;

    // Calculate costs
    const costs = this.calculateTemplateCost(template, actualBatchSize);
    
    // Calculate saleable units (accounting for losses)
    const saleableSeedlings = Math.floor(actualBatchSize * (successRate / 100));
    
    // Revenue calculations
    const expectedRevenue = saleableSeedlings * actualSellingPrice;
    
    // Profit calculations
    const grossProfit = expectedRevenue - costs.totalCost;
    const profitPerSeedling = actualSellingPrice - costs.costPerSeedling;
    const profitMargin = actualSellingPrice > 0 
      ? ((actualSellingPrice - costs.costPerSeedling) / actualSellingPrice) * 100 
      : 0;
    
    // Break-even calculations
    const breakEvenPrice = successRate > 0 
      ? costs.costPerSeedling / (successRate / 100)
      : costs.costPerSeedling;
    
    const breakEvenQuantity = profitPerSeedling > 0
      ? Math.ceil(costs.totalCost / profitPerSeedling)
      : 0;
    
    const safetyMargin = actualSellingPrice > 0
      ? ((actualSellingPrice - breakEvenPrice) / actualSellingPrice) * 100
      : 0;

    return {
      // Cost metrics
      totalCost: costs.totalCost,
      costPerSeedling: costs.costPerSeedling,
      costPerTray: costs.costPerTray,
      
      // Revenue metrics
      sellingPrice: actualSellingPrice,
      saleableSeedlings,
      expectedRevenue,
      
      // Profit metrics
      profitPerSeedling,
      grossProfit,
      profitMargin,
      
      // Break-even metrics
      breakEvenPrice,
      breakEvenQuantity,
      safetyMargin,
      
      // Success rate
      successRate,
    };
  },

  // Calculate scenario comparison for different selling prices
  calculateScenarios(
    template: BOMTemplateWithDetails,
    batchSize?: number,
    priceRange?: { min: number; max: number; step: number }
  ): Array<ProfitAnalysis & { sellingPrice: number }> {
    const actualBatchSize = batchSize || template.base_batch_size;
    const costs = this.calculateTemplateCost(template, actualBatchSize);
    
    // Default price range if not provided
    const range = priceRange || {
      min: costs.costPerSeedling * 1.2, // 20% markup minimum
      max: costs.costPerSeedling * 3,    // 200% markup maximum
      step: costs.costPerSeedling * 0.2  // 20% increments
    };

    const scenarios: Array<ProfitAnalysis & { sellingPrice: number }> = [];
    
    for (let price = range.min; price <= range.max; price += range.step) {
      const analysis = this.calculateProfitAnalysis(template, actualBatchSize, price);
      scenarios.push(analysis);
    }

    return scenarios;
  },
};