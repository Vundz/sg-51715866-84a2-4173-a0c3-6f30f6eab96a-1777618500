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
        throw new Error("Invalid formula: contains invalid characters");
      }

       
      return eval(expression);
    } catch (error) {
      console.error("Formula evaluation error:", error);
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
};