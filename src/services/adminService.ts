import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type RolePermission = Database["public"]["Tables"]["role_permissions"]["Row"];
type UserPermission = Database["public"]["Tables"]["user_permissions"]["Row"];

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
   * Get all available permissions
   */
  async getAllPermissions() {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("module", { ascending: true });

    if (error) throw error;
    return data as Permission[];
  },

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(role: string) {
    const { data, error } = await supabase
      .from("role_permissions")
      .select(`
        permission_id,
        permissions (
          id,
          module,
          action,
          description
        )
      `)
      .eq("role", role);

    if (error) throw error;
    return data;
  },

  /**
   * Get user-specific permissions
   */
  async getUserPermissions(userId: string) {
    const { data, error } = await supabase
      .from("user_permissions")
      .select(`
        permission_id,
        granted,
        permissions (
          id,
          module,
          action,
          description
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;
    return data;
  },

  /**
   * Get effective permissions for a user (role + user-specific)
   */
  async getEffectivePermissions(userId: string) {
    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // Get role permissions
    const rolePerms = await this.getRolePermissions(profile.role);
    const userPerms = await this.getUserPermissions(userId);

    // Combine permissions (user-specific overrides role)
    const permissionMap = new Map();
    
    // Add role permissions
    rolePerms.forEach((rp: any) => {
      if (rp.permissions) {
        permissionMap.set(rp.permissions.id, {
          ...rp.permissions,
          granted: true,
          source: "role"
        });
      }
    });

    // Override with user-specific permissions
    userPerms.forEach((up: any) => {
      if (up.permissions) {
        permissionMap.set(up.permissions.id, {
          ...up.permissions,
          granted: up.granted,
          source: "user"
        });
      }
    });

    return Array.from(permissionMap.values());
  },

  /**
   * Set user-specific permission
   */
  async setUserPermission(userId: string, permissionId: string, granted: boolean) {
    const { data, error } = await supabase
      .from("user_permissions")
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted: granted
      })
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Remove user-specific permission (revert to role default)
   */
  async removeUserPermission(userId: string, permissionId: string) {
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("permission_id", permissionId);

    if (error) throw error;
    return true;
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
