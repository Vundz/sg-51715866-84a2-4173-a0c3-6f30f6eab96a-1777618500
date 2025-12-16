import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
export type StockTransaction = Database["public"]["Tables"]["stock_transactions"]["Row"];

export interface InventoryItemWithLowStock extends InventoryItem {
  isLowStock: boolean;
}

export interface StockTransactionWithItem extends StockTransaction {
  inventory_items: InventoryItem | null;
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
    item: Omit<InventoryItem, "id" | "created_at" | "updated_at" | "current_stock">,
    openingStock: number = 0
  ): Promise<InventoryItem> {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Create the inventory item
    const { data: newItem, error: itemError } = await supabase
      .from("inventory_items")
      .insert([{ ...item, current_stock: openingStock }])
      .select()
      .single();

    if (itemError) throw itemError;

    // 2. If opening stock > 0, create a transaction record
    if (openingStock > 0 && newItem) {
      const transactionData = {
        item_id: newItem.id,
        transaction_type: "adjustment", // Using adjustment for opening stock
        quantity: openingStock,
        unit_price: item.unit_price,
        total_cost: openingStock * item.unit_price,
        notes: "Opening Stock",
        transaction_date: new Date().toISOString(),
        created_by: user?.id
      };

      const { error: txError } = await supabase
        .from("stock_transactions")
        .insert([transactionData]);

      if (txError) {
        console.error("Error creating opening stock transaction:", txError);
        // Note: We don't rollback the item creation here as it's not critical, 
        // but in a strict system we might want to.
      }
    }

    return newItem;
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
        inventory_items (*)
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
        inventory_items (*)
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