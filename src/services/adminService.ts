
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

// Define a type for the object that includes the granted status and source
type EffectivePermission = Permission & {
  granted: boolean;
  source: "role" | "user" | "none";
};

export const adminService = {
  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Create a new user with email and password
   */
  async createUser(email: string, password: string, fullName: string, role: UserRole): Promise<Profile> {
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

    if (authError) {
      if (authError.message.includes("already registered")) {
        throw new Error("A user with this email already exists.");
      }
      throw authError;
    }
    if (!authData.user) throw new Error("Failed to create user");

    // The handle_new_user trigger creates a profile with role 'viewer'.
    // We must update it to the desired role.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName,
        role: role 
      })
      .eq("id", authData.user.id)
      .select()
      .single();

    if (profileError) {
      console.error("Error updating profile after sign-up:", profileError);
      throw new Error(`User was created, but failed to set role. Please edit the user manually. Error: ${profileError.message}`);
    }
    return profileData;
  },

  /**
   * Update user role and details
   */
  async updateUser(userId: string, updates: Partial<Pick<Profile, "full_name" | "role">>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a user's profile.
   * NOTE: This does NOT delete the auth.users record.
   * For full user deletion, you need to call an edge function with the service_role key.
   */
  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;
    // Here you would typically also call an edge function to delete the auth user
    // e.g., await supabase.functions.invoke('delete-user', { body: { userId } })
    return true;
  },

  /**
   * Reset user password (admin only)
   * Sends a password reset email to the user
   */
  async resetUserPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return true;
  },

  async isAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (error) return false;
      return data?.role === "admin";
    } catch (error) {
      return false;
    }
  },

  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("module", { ascending: true });
    if (error) throw error;
    return data;
  },

  async getUserPermissions(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("user_permissions")
      .select("permission_id")
      .eq("user_id", userId);
    if (error) throw error;
    return data.map(p => p.permission_id);
  },
  
  async setUserPermissions(userId: string, permissionIds: string[]): Promise<boolean> {
    const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);
    if (deleteError) throw deleteError;

    if (permissionIds.length > 0) {
        const newPermissions = permissionIds.map(pid => ({
            user_id: userId,
            permission_id: pid,
        }));
        const { error: insertError } = await supabase
            .from('user_permissions')
            .insert(newPermissions);
        if (insertError) throw insertError;
    }
    return true;
  },

  async ensureDefaultAdmin(): Promise<void> {
    try {
      const { data: existingAdmin, error: findError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", "admin@khulisapp.com")
        .single();

      if (findError && findError.code !== 'PGRST116') throw findError;
      
      if (existingAdmin) {
        if (existingAdmin.role !== 'admin') {
          await this.updateUser(existingAdmin.id, { role: 'admin' });
        }
        return;
      }
      
      await this.createUser("admin@khulisapp.com", "Spawniad8!", "System Administrator", "admin");

    } catch (error) {
      console.error("Error ensuring default admin exists:", error);
    }
  },
};
