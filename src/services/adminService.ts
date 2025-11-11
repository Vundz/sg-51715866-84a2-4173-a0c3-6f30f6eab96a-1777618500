import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Permission = Database["public"]["Tables"]["permissions"]["Row"];

// Define a type for the object that includes the granted status and source
type EffectivePermission = Permission & {
  granted: boolean;
  source: "role" | "user" | "none";
};

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
    // Simplify the returned structure
    return data.map((rp: any) => rp.permissions).filter(Boolean);
  },

  /**
   * Get user-specific permissions
   */
  async getUserPermissions(userId: string) {
    const { data, error } = await supabase
      .from("user_permissions")
      .select(`
        permission_id
      `)
      .eq("user_id", userId);

    if (error) throw error;
    return data.map(p => p.permission_id);
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
    if (!profile) return [];

    // Get role permissions and user permissions
    const [rolePerms, userPermsIds] = await Promise.all([
        this.getRolePermissions(profile.role),
        this.getUserPermissions(userId),
    ]);

    const allPermissions = await this.getAllPermissions();
    const permissionMap = new Map<string, EffectivePermission>(allPermissions.map(p => [p.id, { ...p, granted: false, source: 'none' }]));

    // Apply role permissions
    rolePerms.forEach((p: Permission) => {
        if(permissionMap.has(p.id)) {
            const perm = permissionMap.get(p.id)!;
            perm.granted = true;
            perm.source = 'role';
        }
    });

    // Apply user-specific permissions (these are overrides)
    // For now, we assume user_permissions grant access. A more complex system could have explicit denies.
    userPermsIds.forEach((pid: string) => {
        if(permissionMap.has(pid)) {
            const perm = permissionMap.get(pid)!;
            perm.granted = true;
            perm.source = 'user';
        }
    });

    return Array.from(permissionMap.values()).filter(p => p.granted);
  },
  
  /**
   * Set all permissions for a user. This will replace all existing permissions.
   */
  async setUserPermissions(userId: string, permissionIds: string[]) {
    // 1. Delete all existing permissions for the user
    const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // 2. Insert the new set of permissions
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

  /**
   * Ensures the default admin account exists and is configured.
   * Renamed from createDefaultAdmin for clarity.
   */
  async ensureDefaultAdmin() {
    try {
      // Check if admin user exists in profiles
      const { data: existingAdmin, error: findError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", "admin@khulisapp.com")
        .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
        throw findError;
      }
      
      if (existingAdmin) {
        // If user exists but is not admin, update them
        if (existingAdmin.role !== 'admin') {
          await this.updateUser(existingAdmin.id, { role: 'admin' });
        }
        return existingAdmin;
      }

      // If user does not exist, create them
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
        // This case should be rare due to the check above, but handle it.
        if (authError.message.includes("already registered")) {
           console.warn("Auth user existed but profile was missing. Will attempt to recover.");
           // Refetch to get the user ID, then update role.
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await this.updateUser(user.id, { role: "admin", full_name: "System Administrator" });
            return user;
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error("Failed to create admin user");

      // Update profile with admin role, since signUp doesn't always trigger the profile hook fast enough
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .update({ role: "admin", full_name: "System Administrator" })
        .eq("id", authData.user.id)
        .select()
        .single();
      
      if (profileError) throw profileError;

      return profileData;
    } catch (error) {
      console.error("Error ensuring default admin exists:", error);
      // Don't re-throw, as it might block the UI from loading for non-admins.
    }
  },
};
