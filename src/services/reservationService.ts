import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

export const reservationService = {
  async getReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .order("reserved_date", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getReservationsWithDetails() {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        plantings (
          *,
          plant_types (*),
          locations (*)
        )
      `)
      .order("reserved_date", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getReservation(id: string) {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createReservation(reservation: Omit<Reservation, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from("reservations")
      .insert([reservation])
      .select();
    if (error) throw error;
    return data[0];
  },

  async updateReservation(id: string, reservation: Partial<Reservation>) {
    const { data, error } = await supabase
      .from("reservations")
      .update(reservation)
      .eq("id", id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteReservation(id: string) {
    const { data, error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return data;
  },

  async getActiveReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        plantings (
          id,
          batch_number,
          plant_types (
            name,
            variety
          )
        )
      `)
      .eq('status', 'active');
      
    if (error) throw error;
    return data;
  },
};