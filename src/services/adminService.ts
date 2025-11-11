
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const adminService = {
  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Profile[];
  },

  /**
   * Create a new user with email and password
   */
  async createUser(email: string, password: string, fullName: string, role: string = "user") {
    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    // Then update the profile with the role
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName,
        role: role 
      })
      .eq("id", authData.user.id)
      .select()
      .single();

    if (profileError) throw profileError;
    return profileData as Profile;
  },

  /**
   * Update user role and details
   */
  async updateUser(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: string) {
    // Note: This only deletes the profile. 
    // To fully delete the auth user, you'd need Supabase admin API
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;
    return true;
  },

  /**
   * Get current user's role
   */
  async getCurrentUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    return data.role;
  },

  /**
   * Check if current user is admin
   */
  async isAdmin() {
    const role = await this.getCurrentUserRole();
    return role === "admin";
  },

  /**
   * Create default admin account
   */
  async createDefaultAdmin() {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "admin@khulisapp.com",
        password: "Spawniad8!",
        options: {
          data: {
            full_name: "System Administrator",
          },
        },
      });

      if (authError) {
        // If user already exists, try to update their role
        if (authError.message.includes("already registered")) {
          // Get user by email
          const { data: users } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", "admin@khulisapp.com")
            .single();

          if (users) {
            await this.updateUser(users.id, { role: "admin" });
            return users;
          }
        }
        throw authError;
      }

      if (!authData.user) throw new Error("Failed to create admin user");

      // Update profile with admin role
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: "System Administrator",
          role: "admin" 
        })
        .eq("id", authData.user.id)
        .select()
        .single();

      if (profileError) throw profileError;
      return profileData;
    } catch (error) {
      console.error("Error creating default admin:", error);
      throw error;
    }
  },
};
