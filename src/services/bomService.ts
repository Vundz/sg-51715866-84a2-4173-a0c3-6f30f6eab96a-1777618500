import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BOMHeader = Database["public"]["Tables"]["bom_headers"]["Row"];
type BOMHeaderInsert = Database["public"]["Tables"]["bom_headers"]["Insert"];
type BOMHeaderUpdate = Database["public"]["Tables"]["bom_headers"]["Update"];
type BOMItem = Database["public"]["Tables"]["bom_items"]["Row"];
type BOMItemInsert = Database["public"]["Tables"]["bom_items"]["Insert"];
type BOMItemUpdate = Database["public"]["Tables"]["bom_items"]["Update"];

export interface BOMWithItems extends BOMHeader {
  bom_items: (BOMItem & {
    inventory_items?: {
      name: string;
      unit_of_measure: string;
      unit_price: number;
    } | null;
  })[];
}

export const bomService = {
  async getBOMHeaders() {
    const { data, error } = await supabase
      .from("bom_headers")
      .select(`
        *,
        bom_items (
          id,
          item_name,
          quantity,
          unit,
          unit_cost,
          total_cost,
          inventory_items (
            name,
            unit_of_measure,
            unit_price
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // We need to cast carefully or map the data if structure is complex
    return data as unknown as BOMWithItems[];
  },

  async getBOMById(id: string) {
    const { data, error } = await supabase
      .from("bom_headers")
      .select(`
        *,
        bom_items (
          *,
          inventory_items (
            name,
            unit_of_measure,
            unit_price
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as unknown as BOMWithItems;
  },

  async createBOMHeader(bom: BOMHeaderInsert) {
    const { data, error } = await supabase
      .from("bom_headers")
      .insert([bom])
      .select()
      .single();

    if (error) throw error;
    return data as BOMHeader;
  },

  async updateBOMHeader(id: string, updates: BOMHeaderUpdate) {
    const { data, error } = await supabase
      .from("bom_headers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as BOMHeader;
  },

  async deleteBOMHeader(id: string) {
    const { error } = await supabase
      .from("bom_headers")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async createBOMItem(item: BOMItemInsert) {
    const { data, error } = await supabase
      .from("bom_items")
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data as BOMItem;
  },

  async updateBOMItem(id: string, updates: BOMItemUpdate) {
    const { data, error } = await supabase
      .from("bom_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as BOMItem;
  },

  async deleteBOMItem(id: string) {
    const { error } = await supabase
      .from("bom_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async getBOMItems(bomHeaderId: string) {
    const { data, error } = await supabase
      .from("bom_items")
      .select(`
        *,
        inventory_items (
          name,
          unit_of_measure,
          unit_price
        )
      `)
      .eq("bom_header_id", bomHeaderId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  calculateTotalCost(items: BOMItem[]) {
    return items.reduce((sum, item) => {
      const itemTotal = Number(item.unit_cost || 0) * Number(item.quantity || 0);
      return sum + itemTotal;
    }, 0);
  }
};