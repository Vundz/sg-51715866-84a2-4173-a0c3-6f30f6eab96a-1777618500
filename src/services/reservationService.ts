
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];
type ReservationUpdate = Database["public"]["Tables"]["reservations"]["Update"];

export const reservationService = {
  async getReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        plant_types!reservations_plant_type_id_fkey (
          id,
          name,
          variety,
          days_to_maturity
        ),
        locations!reservations_location_id_fkey (
          id,
          name,
          type
        )
      `)
      .order("planned_planting_date", { ascending: true });

    if (error) throw error;
    return data as (Reservation & {
      plant_types: Database["public"]["Tables"]["plant_types"]["Row"];
      locations: Database["public"]["Tables"]["locations"]["Row"];
    })[];
  },

  async getReservationById(id: string) {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        plant_types!reservations_plant_type_id_fkey (*),
        locations!reservations_location_id_fkey (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createReservation(reservation: ReservationInsert) {
    const { data, error } = await supabase
      .from("reservations")
      .insert([reservation])
      .select()
      .single();

    if (error) throw error;
    return data as Reservation;
  },

  async updateReservation(id: string, updates: ReservationUpdate) {
    const { data, error } = await supabase
      .from("reservations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Reservation;
  },

  async deleteReservation(id: string) {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async getActiveReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        plant_types!reservations_plant_type_id_fkey (*),
        locations!reservations_location_id_fkey (*)
      `)
      .eq("status", "pending")
      .order("planned_planting_date", { ascending: true });

    if (error) throw error;
    return data;
  }
};
