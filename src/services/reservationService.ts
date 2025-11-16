
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

  async updateReservationStatus(
    id: string, 
    newStatus: "pending" | "completed" | "cancelled",
    finalQuantity?: number
  ) {
    const { data: currentReservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*, plantings(*)")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!currentReservation) throw new Error("Reservation not found");

    const oldStatus = currentReservation.status;
    const reservedQty = currentReservation.quantity_reserved;
    const plantingId = currentReservation.planting_id;

    const { data: planting, error: plantingFetchError } = await supabase
      .from("plantings")
      .select("remaining_quantity, quantity")
      .eq("id", plantingId)
      .single();

    if (plantingFetchError) throw plantingFetchError;
    if (!planting) throw new Error("Planting batch not found");

    const currentRemaining = planting.remaining_quantity ?? planting.quantity;
    let newRemaining = currentRemaining;

    if (oldStatus === "pending" && newStatus === "completed") {
      const qtyToDeduct = finalQuantity ?? reservedQty;
      newRemaining = currentRemaining - qtyToDeduct;
    } else if (oldStatus === "pending" && newStatus === "cancelled") {
      newRemaining = currentRemaining;
    } else if ((oldStatus === "completed" || oldStatus === "cancelled") && newStatus === "pending") {
      if (oldStatus === "completed") {
        const qtyToReturn = currentReservation.final_quantity ?? reservedQty;
        newRemaining = currentRemaining + qtyToReturn;
      }
    } else if (oldStatus === "completed" && newStatus === "cancelled") {
      const qtyToReturn = currentReservation.final_quantity ?? reservedQty;
      newRemaining = currentRemaining + qtyToReturn;
    } else if (oldStatus === "cancelled" && newStatus === "completed") {
      const qtyToDeduct = finalQuantity ?? reservedQty;
      newRemaining = currentRemaining - qtyToDeduct;
    }

    const { error: plantingUpdateError } = await supabase
      .from("plantings")
      .update({ remaining_quantity: newRemaining })
      .eq("id", plantingId);

    if (plantingUpdateError) throw plantingUpdateError;

    const updateData: Partial<Reservation> = {
      status: newStatus,
      ...(finalQuantity !== undefined && { final_quantity: finalQuantity })
    };

    const { data, error } = await supabase
      .from("reservations")
      .update(updateData)
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
      .eq("status", "pending");
      
    if (error) throw error;
    return data;
  },
};
