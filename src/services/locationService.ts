
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];
type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
type LocationUpdate = Database["public"]["Tables"]["locations"]["Update"];

export const locationService = {
  async getLocations() {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Location[];
  },

  async getLocationById(id: string) {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Location;
  },

  async createLocation(location: LocationInsert) {
    const { data, error } = await supabase
      .from("locations")
      .insert([location])
      .select()
      .single();

    if (error) throw error;
    return data as Location;
  },

  async updateLocation(id: string, updates: LocationUpdate) {
    const { data, error } = await supabase
      .from("locations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Location;
  },

  async deleteLocation(id: string) {
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async getLocationCapacity(locationId: string) {
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("capacity")
      .eq("id", locationId)
      .single();

    if (locationError) throw locationError;

    const { data: plantings, error: plantingsError } = await supabase
      .from("plantings")
      .select("quantity")
      .eq("location_id", locationId)
      .eq("status", "active");

    if (plantingsError) throw plantingsError;

    const usedCapacity = plantings.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const availableCapacity = (location.capacity || 0) - usedCapacity;

    return {
      total: location.capacity || 0,
      used: usedCapacity,
      available: availableCapacity
    };
  }
};
