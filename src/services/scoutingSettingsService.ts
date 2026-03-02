import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PestType = Database["public"]["Tables"]["scouting_pest_types"]["Row"];
type DiseaseType = Database["public"]["Tables"]["scouting_disease_types"]["Row"];
type NutrientType = Database["public"]["Tables"]["scouting_nutrient_types"]["Row"];
type ActionType = Database["public"]["Tables"]["scouting_actions"]["Row"];

type CreatePestType = Omit<PestType, "id" | "created_at" | "updated_at">;
type CreateDiseaseType = Omit<DiseaseType, "id" | "created_at" | "updated_at">;
type CreateNutrientType = Omit<NutrientType, "id" | "created_at" | "updated_at">;
type CreateActionType = Omit<ActionType, "id" | "created_at" | "updated_at">;

// ==================== PEST TYPES ====================

export const scoutingSettingsService = {
  // Get active pest types (for forms)
  async getActivePestTypes(): Promise<PestType[]> {
    const { data, error } = await supabase
      .from("scouting_pest_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching active pest types:", error);
      throw error;
    }

    return data || [];
  },

  // Get all pest types (for settings page - includes archived)
  async getAllPestTypes(): Promise<PestType[]> {
    const { data, error } = await supabase
      .from("scouting_pest_types")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching all pest types:", error);
      throw error;
    }

    return data || [];
  },

  // Create new pest type
  async createPestType(pestData: Partial<CreatePestType>): Promise<PestType> {
    // Get the highest display_order
    const { data: maxOrder } = await supabase
      .from("scouting_pest_types")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from("scouting_pest_types")
      .insert({
        name: pestData.name || "",
        description: pestData.description || null,
        is_active: pestData.is_active !== undefined ? pestData.is_active : true,
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating pest type:", error);
      throw error;
    }

    return data;
  },

  // Update pest type
  async updatePestType(id: string, pestData: Partial<CreatePestType>): Promise<PestType> {
    const { data, error } = await supabase
      .from("scouting_pest_types")
      .update({
        ...pestData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating pest type:", error);
      throw error;
    }

    return data;
  },

  // Archive pest type (soft delete)
  async archivePestType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_pest_types")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error archiving pest type:", error);
      throw error;
    }
  },

  // Restore archived pest type
  async restorePestType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_pest_types")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error restoring pest type:", error);
      throw error;
    }
  },

  // Permanently delete pest type
  async deletePestType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_pest_types")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting pest type:", error);
      throw error;
    }
  },

  // Reorder pest types
  async reorderPestTypes(orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("scouting_pest_types")
        .update({
          display_order: update.display_order,
          updated_at: update.updated_at,
        })
        .eq("id", update.id);

      if (error) {
        console.error("Error reordering pest types:", error);
        throw error;
      }
    }
  },

  // Export pest types as JSON
  async exportPestTypesJSON(): Promise<string> {
    const data = await this.getAllPestTypes();
    return JSON.stringify(data, null, 2);
  },

  // Export pest types as CSV
  async exportPestTypesCSV(): Promise<string> {
    const data = await this.getAllPestTypes();
    if (data.length === 0) return "";

    const headers = ["Name", "Description", "Active", "Display Order", "Created At"];
    const rows = data.map((item) => [
      item.name,
      item.description || "",
      item.is_active ? "Yes" : "No",
      item.display_order?.toString() || "",
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },

  // ==================== DISEASE TYPES ====================

  // Get active disease types (for forms)
  async getActiveDiseaseTypes(): Promise<DiseaseType[]> {
    const { data, error } = await supabase
      .from("scouting_disease_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching active disease types:", error);
      throw error;
    }

    return data || [];
  },

  // Get all disease types (for settings page)
  async getAllDiseaseTypes(): Promise<DiseaseType[]> {
    const { data, error } = await supabase
      .from("scouting_disease_types")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching all disease types:", error);
      throw error;
    }

    return data || [];
  },

  // Create new disease type
  async createDiseaseType(diseaseData: Partial<CreateDiseaseType>): Promise<DiseaseType> {
    const { data: maxOrder } = await supabase
      .from("scouting_disease_types")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from("scouting_disease_types")
      .insert({
        name: diseaseData.name || "",
        description: diseaseData.description || null,
        is_active: diseaseData.is_active !== undefined ? diseaseData.is_active : true,
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating disease type:", error);
      throw error;
    }

    return data;
  },

  // Update disease type
  async updateDiseaseType(id: string, diseaseData: Partial<CreateDiseaseType>): Promise<DiseaseType> {
    const { data, error } = await supabase
      .from("scouting_disease_types")
      .update({
        ...diseaseData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating disease type:", error);
      throw error;
    }

    return data;
  },

  // Archive disease type
  async archiveDiseaseType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_disease_types")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error archiving disease type:", error);
      throw error;
    }
  },

  // Restore archived disease type
  async restoreDiseaseType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_disease_types")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error restoring disease type:", error);
      throw error;
    }
  },

  // Permanently delete disease type
  async deleteDiseaseType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_disease_types")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting disease type:", error);
      throw error;
    }
  },

  // Reorder disease types
  async reorderDiseaseTypes(orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("scouting_disease_types")
        .update({
          display_order: update.display_order,
          updated_at: update.updated_at,
        })
        .eq("id", update.id);

      if (error) {
        console.error("Error reordering disease types:", error);
        throw error;
      }
    }
  },

  // Export disease types as JSON
  async exportDiseaseTypesJSON(): Promise<string> {
    const data = await this.getAllDiseaseTypes();
    return JSON.stringify(data, null, 2);
  },

  // Export disease types as CSV
  async exportDiseaseTypesCSV(): Promise<string> {
    const data = await this.getAllDiseaseTypes();
    if (data.length === 0) return "";

    const headers = ["Name", "Description", "Active", "Display Order", "Created At"];
    const rows = data.map((item) => [
      item.name,
      item.description || "",
      item.is_active ? "Yes" : "No",
      item.display_order?.toString() || "",
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },

  // ==================== NUTRIENT TYPES ====================

  // Get active nutrient types (for forms)
  async getActiveNutrientTypes(): Promise<NutrientType[]> {
    const { data, error } = await supabase
      .from("scouting_nutrient_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching active nutrient types:", error);
      throw error;
    }

    return data || [];
  },

  // Get all nutrient types (for settings page)
  async getAllNutrientTypes(): Promise<NutrientType[]> {
    const { data, error } = await supabase
      .from("scouting_nutrient_types")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching all nutrient types:", error);
      throw error;
    }

    return data || [];
  },

  // Create new nutrient type
  async createNutrientType(nutrientData: Partial<CreateNutrientType>): Promise<NutrientType> {
    const { data: maxOrder } = await supabase
      .from("scouting_nutrient_types")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from("scouting_nutrient_types")
      .insert({
        name: nutrientData.name || "",
        description: nutrientData.description || null,
        is_active: nutrientData.is_active !== undefined ? nutrientData.is_active : true,
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating nutrient type:", error);
      throw error;
    }

    return data;
  },

  // Update nutrient type
  async updateNutrientType(id: string, nutrientData: Partial<CreateNutrientType>): Promise<NutrientType> {
    const { data, error } = await supabase
      .from("scouting_nutrient_types")
      .update({
        ...nutrientData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating nutrient type:", error);
      throw error;
    }

    return data;
  },

  // Archive nutrient type
  async archiveNutrientType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_nutrient_types")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error archiving nutrient type:", error);
      throw error;
    }
  },

  // Restore archived nutrient type
  async restoreNutrientType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_nutrient_types")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error restoring nutrient type:", error);
      throw error;
    }
  },

  // Permanently delete nutrient type
  async deleteNutrientType(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_nutrient_types")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting nutrient type:", error);
      throw error;
    }
  },

  // Reorder nutrient types
  async reorderNutrientTypes(orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("scouting_nutrient_types")
        .update({
          display_order: update.display_order,
          updated_at: update.updated_at,
        })
        .eq("id", update.id);

      if (error) {
        console.error("Error reordering nutrient types:", error);
        throw error;
      }
    }
  },

  // Export nutrient types as JSON
  async exportNutrientTypesJSON(): Promise<string> {
    const data = await this.getAllNutrientTypes();
    return JSON.stringify(data, null, 2);
  },

  // Export nutrient types as CSV
  async exportNutrientTypesCSV(): Promise<string> {
    const data = await this.getAllNutrientTypes();
    if (data.length === 0) return "";

    const headers = ["Name", "Description", "Active", "Display Order", "Created At"];
    const rows = data.map((item) => [
      item.name,
      item.description || "",
      item.is_active ? "Yes" : "No",
      item.display_order?.toString() || "",
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },

  // ==================== ACTIONS ====================

  // Get active actions (for forms)
  async getActiveActions(category?: "pest" | "disease" | "nutrient" | "all"): Promise<ActionType[]> {
    let query = supabase
      .from("scouting_actions")
      .select("*")
      .eq("is_active", true);

    if (category) {
      query = query.or(`category.eq.${category},category.eq.all`);
    }

    const { data, error } = await query.order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching active actions:", error);
      throw error;
    }

    return data || [];
  },

  // Get all actions (for settings page)
  async getAllActions(): Promise<ActionType[]> {
    const { data, error } = await supabase
      .from("scouting_actions")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching all actions:", error);
      throw error;
    }

    return data || [];
  },

  // Create new action
  async createAction(actionData: Partial<CreateActionType>): Promise<ActionType> {
    const { data: maxOrder } = await supabase
      .from("scouting_actions")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from("scouting_actions")
      .insert({
        name: actionData.name || "",
        description: actionData.description || null,
        category: actionData.category || "all",
        is_active: actionData.is_active !== undefined ? actionData.is_active : true,
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating action:", error);
      throw error;
    }

    return data;
  },

  // Update action
  async updateAction(id: string, actionData: Partial<CreateActionType>): Promise<ActionType> {
    const { data, error } = await supabase
      .from("scouting_actions")
      .update({
        ...actionData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating action:", error);
      throw error;
    }

    return data;
  },

  // Archive action
  async archiveAction(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_actions")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error archiving action:", error);
      throw error;
    }
  },

  // Restore archived action
  async restoreAction(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_actions")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error restoring action:", error);
      throw error;
    }
  },

  // Permanently delete action
  async deleteAction(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_actions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting action:", error);
      throw error;
    }
  },

  // Reorder actions
  async reorderActions(orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("scouting_actions")
        .update({
          display_order: update.display_order,
          updated_at: update.updated_at,
        })
        .eq("id", update.id);

      if (error) {
        console.error("Error reordering actions:", error);
        throw error;
      }
    }
  },

  // Export actions as JSON
  async exportActionsJSON(): Promise<string> {
    const data = await this.getAllActions();
    return JSON.stringify(data, null, 2);
  },

  // Export actions as CSV
  async exportActionsCSV(): Promise<string> {
    const data = await this.getAllActions();
    if (data.length === 0) return "";

    const headers = ["Name", "Description", "Category", "Active", "Display Order", "Created At"];
    const rows = data.map((item) => [
      item.name,
      item.description || "",
      item.category || "all",
      item.is_active ? "Yes" : "No",
      item.display_order?.toString() || "",
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },
};