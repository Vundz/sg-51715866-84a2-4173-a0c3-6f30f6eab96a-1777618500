import { supabase } from "@/integrations/supabase/client";
import { harvestService } from "./harvestService";

export type DispatchSlipStatus = "pending" | "fulfilled" | "cancelled";

export type DispatchSlip = {
  id: string;
  planting_id: string;
  quantity_requested: number;
  dispatch_date: string;
  customer_name: string | null;
  destination: string | null;
  notes: string | null;
  status: DispatchSlipStatus;
  harvest_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DispatchSlipWithDetails = DispatchSlip & {
  plantings: {
    id: string;
    batch_number: string | null;
    remaining_quantity: number | null;
    quantity: number;
    plant_types: { name: string; variety: string | null } | null;
    locations: { name: string } | null;
  } | null;
  harvests: { id: string; quantity_harvested: number } | null;
};

export type CreateDispatchSlipInput = {
  planting_id: string;
  quantity_requested: number;
  dispatch_date: string;
  customer_name?: string | null;
  destination?: string | null;
  notes?: string | null;
};

const SLIP_SELECT = `
  *,
  plantings (
    id,
    batch_number,
    remaining_quantity,
    quantity,
    plant_types (name, variety),
    locations (name)
  ),
  harvests (id, quantity_harvested)
`;

export const dispatchSlipService = {
  async getDispatchSlips(): Promise<DispatchSlipWithDetails[]> {
    const { data, error } = await supabase
      .from("dispatch_slips")
      .select(SLIP_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as DispatchSlipWithDetails[];
  },

  async createDispatchSlip(
    input: CreateDispatchSlipInput
  ): Promise<{ slip: DispatchSlipWithDetails; autoFulfilled: boolean }> {
    const validation = await harvestService.validateHarvest(
      input.planting_id,
      input.quantity_requested
    );

    if (validation.valid) {
      const harvest = await harvestService.createHarvest({
        planting_id: input.planting_id,
        quantity_harvested: input.quantity_requested,
        harvest_date: input.dispatch_date,
        status: "harvested",
        notes: input.notes || null,
        quality: "good",
        is_closed: false,
      });

      const { data, error } = await supabase
        .from("dispatch_slips")
        .insert([{ ...input, status: "fulfilled", harvest_id: harvest.id }])
        .select(SLIP_SELECT)
        .single();
      if (error) throw error;
      return { slip: data as DispatchSlipWithDetails, autoFulfilled: true };
    } else {
      const { data, error } = await supabase
        .from("dispatch_slips")
        .insert([{ ...input, status: "pending", harvest_id: null }])
        .select(SLIP_SELECT)
        .single();
      if (error) throw error;
      return { slip: data as DispatchSlipWithDetails, autoFulfilled: false };
    }
  },

  async updateDispatchSlip(
    id: string,
    updates: Partial<CreateDispatchSlipInput>
  ): Promise<DispatchSlipWithDetails> {
    const { data, error } = await supabase
      .from("dispatch_slips")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(SLIP_SELECT)
      .single();
    if (error) throw error;
    return data as DispatchSlipWithDetails;
  },

  async fulfillDispatchSlip(id: string): Promise<DispatchSlipWithDetails> {
    const { data: slip, error: slipError } = await supabase
      .from("dispatch_slips")
      .select("*")
      .eq("id", id)
      .single();
    if (slipError || !slip) throw new Error("Dispatch slip not found");

    const validation = await harvestService.validateHarvest(
      slip.planting_id,
      slip.quantity_requested
    );
    if (!validation.valid)
      throw new Error(validation.error || "Insufficient stock to fulfill this dispatch slip");

    const harvest = await harvestService.createHarvest({
      planting_id: slip.planting_id,
      quantity_harvested: slip.quantity_requested,
      harvest_date: slip.dispatch_date,
      status: "harvested",
      notes: slip.notes || null,
      quality: "good",
      is_closed: false,
    });

    const { data, error } = await supabase
      .from("dispatch_slips")
      .update({
        status: "fulfilled",
        harvest_id: harvest.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SLIP_SELECT)
      .single();
    if (error) throw error;
    return data as DispatchSlipWithDetails;
  },

  async cancelDispatchSlip(id: string): Promise<void> {
    const { error } = await supabase
      .from("dispatch_slips")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
