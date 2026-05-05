import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
export type StockTransaction = Database["public"]["Tables"]["stock_transactions"]["Row"];

export interface InventoryItemWithLowStock extends InventoryItem {
  isLowStock: boolean;
}

export interface StockTransactionWithItem extends StockTransaction {
  inventory_items: InventoryItem | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export const inventoryService = {
  /**
   * Get all inventory items
   */
  async getInventoryItems(): Promise<InventoryItemWithLowStock[]> {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      isLowStock: item.current_stock <= (item.minimum_stock || 0)
    }));
  },

  /**
   * Get a single inventory item
   */
  async getInventoryItem(id: string): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new inventory item
   */
  async createInventoryItem(
    item: Omit<InventoryItem, "id" | "created_at" | "updated_at" | "current_stock">
  ): Promise<InventoryItem> {
    // 1. Create the inventory item
    const { data, error } = await supabase
      .from("inventory_items")
      .insert([{ ...item, current_stock: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an inventory item
   */
  async updateInventoryItem(id: string, updates: Partial<Omit<InventoryItem, "id" | "created_at" | "updated_at" | "current_stock">>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from("inventory_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete an inventory item
   */
  async deleteInventoryItem(id: string): Promise<void> {
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Get all stock transactions
   */
  async getStockTransactions(): Promise<StockTransactionWithItem[]> {
    const { data, error } = await supabase
      .from("stock_transactions")
      .select(`
        *,
        inventory_items (*),
        profiles!stock_transactions_created_by_fkey (
          full_name,
          email
        )
      `)
      .order("transaction_date", { ascending: false });

    if (error) throw error;
    return data as StockTransactionWithItem[];
  },

  /**
   * Get stock transactions for a specific item
   */
  async getItemTransactions(itemId: string): Promise<StockTransactionWithItem[]> {
    const { data, error } = await supabase
      .from("stock_transactions")
      .select(`
        *,
        inventory_items (*),
        profiles!stock_transactions_created_by_fkey (
          full_name,
          email
        )
      `)
      .eq("item_id", itemId)
      .order("transaction_date", { ascending: false });

    if (error) throw error;
    return data as StockTransactionWithItem[];
  },

  /**
   * Create a stock transaction (purchase, usage, adjustment, waste)
   */
  async createStockTransaction(transaction: {
    item_id: string;
    transaction_type: "purchase" | "usage" | "adjustment" | "waste";
    quantity: number;
    unit_price?: number;
    total_cost?: number;
    reference_id?: string;
    reference_type?: string;
    notes?: string;
    transaction_date?: string;
  }): Promise<StockTransaction> {
    const { data: { user } } = await supabase.auth.getUser();

    const transactionData = {
      ...transaction,
      created_by: user?.id,
      transaction_date: transaction.transaction_date || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("stock_transactions")
      .insert([transactionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a stock transaction
   */
  async updateStockTransaction(id: string, updates: Partial<Omit<StockTransaction, "id" | "created_at" | "created_by">>): Promise<StockTransaction> {
    const { data, error } = await supabase
      .from("stock_transactions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a stock transaction
   */
  async deleteStockTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from("stock_transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Get items that are low in stock
   */
  async getLowStockItems(): Promise<InventoryItemWithLowStock[]> {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return (data || [])
      .map(item => ({
        ...item,
        isLowStock: item.current_stock <= (item.minimum_stock || 0)
      }))
      .filter(item => item.isLowStock);
  },

  /**
   * Get available inventory items (stock > 0)
   */
  async getAvailableInventoryItems(): Promise<InventoryItemWithLowStock[]> {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .gt("current_stock", 0)
      .order("name", { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      isLowStock: item.current_stock <= (item.minimum_stock || 0)
    }));
  },

  /**
   * Calculate total inventory value
   */
  async getTotalInventoryValue(): Promise<number> {
    const items = await this.getInventoryItems();
    return items.reduce((total, item) => {
      const itemValue = Number(item.current_stock) * Number(item.unit_price);
      return total + itemValue;
    }, 0);
  },

  /**
   * Get inventory items by category
   */
  async getInventoryItemsByCategory(category: string): Promise<InventoryItemWithLowStock[]> {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("category", category)
      .order("name", { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      isLowStock: item.current_stock <= (item.minimum_stock || 0)
    }));
  },
};