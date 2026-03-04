
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Treatment = Database["public"]["Tables"]["treatments"]["Row"];
export type Planting = Database["public"]["Tables"]["plantings"]["Row"];

export type TreatmentWithPlantings = {
  treatments: Treatment | null;
  plantings: {
      id: string;
      batch_number: string | null;
  } | null;
  planting_id: string;
}

export const treatmentService = {
  async getTreatments(): Promise<TreatmentWithPlantings[]> {
    const { data, error } = await supabase
      .from("planting_treatments")
      .select(`
        planting_id,
        treatments (*),
        plantings (id, batch_number)
      `);
    
    if (error) {
      console.error("Error fetching treatments with plantings:", error);
      throw error;
    }

    return data || [];
  },

  async getTreatment(id: string) {
     const { data, error } = await supabase
      .from("planting_treatments")
      .select(`
        planting_id,
        treatments (*),
        plantings (id, batch_number)
      `)
      .eq("treatment_id", id);
      
    if (error) throw error;
    return data;
  },
  
  async createTreatment(treatment: Omit<Treatment, "id" | "created_at" | "updated_at">, planting_ids: string[]) {
    // 1. Create the treatment
    const { data: treatmentData, error: treatmentError } = await supabase
      .from("treatments")
      .insert(treatment)
      .select()
      .single();

    if (treatmentError) throw treatmentError;
    if (!treatmentData) throw new Error("Failed to create treatment record.");

    // 2. Create the links in the join table
    const plantingTreatments = planting_ids.map(planting_id => ({
      treatment_id: treatmentData.id,
      planting_id: planting_id,
    }));

    const { error: ptError } = await supabase
      .from("planting_treatments")
      .insert(plantingTreatments);

    if (ptError) {
      // If linking fails, roll back by deleting the just-created treatment
      console.error("Failed to link treatment to plantings", ptError);
      await supabase.from("treatments").delete().eq("id", treatmentData.id);
      throw ptError;
    }

    return treatmentData;
  },

  async updateTreatment(id: string, treatment: Partial<Omit<Treatment, "id" | "created_at" | "updated_at">>, planting_ids: string[]) {
    // 1. Update the treatment details
    const { data, error } = await supabase
      .from("treatments")
      .update(treatment)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    // 2. Sync the join table records
    // First, delete existing relations for this treatment
    const { error: deleteError } = await supabase
      .from("planting_treatments")
      .delete()
      .eq("treatment_id", id);
      
    if (deleteError) throw deleteError;

    // Then, insert the new relations
    if (planting_ids && planting_ids.length > 0) {
        const newPlantingTreatments = planting_ids.map(planting_id => ({
            treatment_id: id,
            planting_id: planting_id,
        }));
        
        const { error: insertError } = await supabase
          .from("planting_treatments")
          .insert(newPlantingTreatments);

        if (insertError) throw insertError;
    }
    
    return data;
  },

  async deleteTreatment(id: string) {
    // RLS and cascade delete on the FK should handle the join table, but being explicit is safer.
    await supabase.from("planting_treatments").delete().eq("treatment_id", id);
    
    const { data, error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    return data;
  },

  async getRecentTreatmentsForPlanting(plantingId: string, daysBack: number = 7): Promise<Treatment[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("planting_treatments")
      .select(`
        treatments (*)
      `)
      .eq("planting_id", plantingId)
      .gte("treatments.treatment_date", cutoffDateString);

    if (error) {
      console.error("Error fetching recent treatments:", error);
      throw error;
    }

    // Extract treatments from the joined data
    const treatments = data
      ?.map(item => item.treatments)
      .filter((t): t is Treatment => t !== null) || [];

    // Sort client-side by treatment_date descending
    return treatments.sort((a, b) => {
      const dateA = new Date(a.treatment_date || 0).getTime();
      const dateB = new Date(b.treatment_date || 0).getTime();
      return dateB - dateA; // Descending order
    });
  },
};
