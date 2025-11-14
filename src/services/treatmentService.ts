import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Treatment = Database["public"]["Tables"]["treatments"]["Row"];
export type PlantingTreatment = Database["public"]["Tables"]["planting_treatments"]["Row"];
export type Planting = Database["public"]["Tables"]["plantings"]["Row"] & {
    plant_types: { name: string } | null;
};
export type TreatmentWithDetails = Treatment & {
  plantings: { id: string, batch_number: string }[];
};

export const treatmentService = {
  async getTreatments(): Promise<TreatmentWithDetails[]> {
    const { data, error } = await supabase
      .from("treatments")
      .select(`
        *,
        plantings ( id, batch_number )
      `);

    if (error) throw error;
    
    return data.map(t => ({
        ...t,
        plantings: Array.isArray(t.plantings) ? t.plantings : []
    }));
  },

  async getTreatment(id: string) {
    const { data, error } = await supabase
      .from("treatments")
      .select(`
        *,
        plantings ( id, batch_number )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    
    return {
        ...data,
        plantings: Array.isArray(data.plantings) ? data.plantings : []
    };
  },

  async addTreatment(treatment: Omit<Treatment, "id" | "created_at" | "updated_at"> & { planting_ids: string[] }) {
    const { planting_ids, ...treatmentData } = treatment;
    const { data: insertData, error: insertError } = await supabase
      .from("treatments")
      .insert([treatmentData])
      .select();

    if (insertError) throw insertError;
    const newTreatment = insertData[0];

    if (planting_ids && planting_ids.length > 0) {
      const plantingTreatments = planting_ids.map(planting_id => ({
        planting_id: planting_id,
        treatment_id: newTreatment.id,
      }));

      const { error: ptError } = await supabase.from("planting_treatments").insert(plantingTreatments);
      if (ptError) {
        // roll back treatment creation?
        console.error("Error linking treatment to plantings:", ptError);
        throw ptError;
      }
    }

    return newTreatment;
  },

  async updateTreatment(id: string, treatment: Partial<Omit<Treatment, "id" | "created_at" | "updated_at">> & { planting_ids?: string[] }) {
     const { planting_ids, ...treatmentData } = treatment;
    
    const { data, error } = await supabase
      .from("treatments")
      .update(treatmentData)
      .eq("id", id)
      .select();

    if (error) throw error;

    if (planting_ids) {
       const { error: deleteError } = await supabase
        .from("planting_treatments")
        .delete()
        .eq("treatment_id", id);
      if (deleteError) throw deleteError;

      if (planting_ids.length > 0) {
        const plantingTreatments = planting_ids.map(planting_id => ({
          planting_id: planting_id,
          treatment_id: id,
        }));
        const { error: ptError } = await supabase.from("planting_treatments").insert(plantingTreatments);
        if (ptError) throw ptError;
      }
    }

    return data[0];
  },

  async deleteTreatment(id: string) {
    // First delete from the join table
    const { error: ptError } = await supabase
        .from("planting_treatments")
        .delete()
        .eq("treatment_id", id);
    if (ptError) {
        console.error("Error deleting from planting_treatments:", ptError);
        throw ptError;
    }

    // Then delete the treatment itself
    const { data, error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return data;
  },
};
