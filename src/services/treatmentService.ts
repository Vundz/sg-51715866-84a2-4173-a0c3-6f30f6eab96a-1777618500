
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Treatment = Database["public"]["Tables"]["treatments"]["Row"];
type TreatmentInsert = Database["public"]["Tables"]["treatments"]["Insert"];
type TreatmentUpdate = Database["public"]["Tables"]["treatments"]["Update"];

export const treatmentService = {
  async getTreatments() {
    const { data, error } = await supabase
      .from("treatments")
      .select(`*`)
      .order("date_applied", { ascending: false });

    if (error) throw error;

    // Manually fetch plantings for each treatment
    const treatmentsWithPlantings = await Promise.all(
      data.map(async (treatment) => {
        if (!treatment.planting_ids || treatment.planting_ids.length === 0) {
          return { ...treatment, plantings: [] };
        }
        const { data: plantings, error: plantingsError } = await supabase
          .from("plantings")
          .select(`
            id,
            batch_number,
            plant_types ( name, variety ),
            locations ( name )
          `)
          .in("id", treatment.planting_ids);

        if (plantingsError) {
          console.error("Error fetching plantings for treatment:", treatment.id, plantingsError);
          return { ...treatment, plantings: [] };
        }

        return { ...treatment, plantings: plantings || [] };
      })
    );

    return treatmentsWithPlantings as any;
  },

  async getTreatmentById(id: string) {
    const { data, error } = await supabase
      .from("treatments")
      .select(`*`)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createTreatment(treatment: TreatmentInsert) {
    const { data, error } = await supabase
      .from("treatments")
      .insert([treatment])
      .select()
      .single();

    if (error) throw error;
    return data as Treatment;
  },

  async createBulkTreatments(treatments: TreatmentInsert[]) {
    const { data, error } = await supabase
      .from("treatments")
      .insert(treatments)
      .select();

    if (error) throw error;
    return data as Treatment[];
  },

  async updateTreatment(id: string, updates: TreatmentUpdate) {
    const { data, error } = await supabase
      .from("treatments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Treatment;
  },

  async deleteTreatment(id: string) {
    const { error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async getTreatmentsByPlanting(plantingId: string) {
    const { data, error } = await supabase
      .from("treatments")
      .select("*")
      .contains("planting_ids", [plantingId])
      .order("date_applied", { ascending: false });

    if (error) throw error;
    return data as Treatment[];
  },

  async getTreatmentsByType(treatmentType: string) {
    const { data, error } = await supabase
      .from("treatments")
      .select(`*`)
      .eq("treatment_type", treatmentType)
      .order("date_applied", { ascending: false });

    if (error) throw error;
    return data;
  }
};
