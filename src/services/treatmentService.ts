
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Treatment = Database["public"]["Tables"]["treatments"]["Row"];
type TreatmentInsert = Database["public"]["Tables"]["treatments"]["Insert"];
type TreatmentUpdate = Database["public"]["Tables"]["treatments"]["Update"];

export const treatmentService = {
  async getTreatments() {
    const { data, error } = await supabase
      .from("treatments")
      .select(`
        *,
        plantings!treatments_planting_id_fkey (
          id,
          batch_number,
          plant_types!plantings_plant_type_id_fkey (
            id,
            name,
            variety
          ),
          locations!plantings_location_id_fkey (
            id,
            name
          )
        )
      `)
      .order("application_date", { ascending: false });

    if (error) throw error;
    return data as (Treatment & {
      plantings: Database["public"]["Tables"]["plantings"]["Row"] & {
        plant_types: Database["public"]["Tables"]["plant_types"]["Row"];
        locations: Database["public"]["Tables"]["locations"]["Row"];
      };
    })[];
  },

  async getTreatmentById(id: string) {
    const { data, error } = await supabase
      .from("treatments")
      .select(`
        *,
        plantings!treatments_planting_id_fkey (
          *,
          plant_types!plantings_plant_type_id_fkey (*),
          locations!plantings_location_id_fkey (*)
        )
      `)
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
      .eq("planting_id", plantingId)
      .order("application_date", { ascending: false });

    if (error) throw error;
    return data as Treatment[];
  },

  async getTreatmentsByType(treatmentType: string) {
    const { data, error } = await supabase
      .from("treatments")
      .select(`
        *,
        plantings!treatments_planting_id_fkey (
          *,
          plant_types!plantings_plant_type_id_fkey (*),
          locations!plantings_location_id_fkey (*)
        )
      `)
      .eq("treatment_type", treatmentType)
      .order("application_date", { ascending: false });

    if (error) throw error;
    return data;
  }
};
