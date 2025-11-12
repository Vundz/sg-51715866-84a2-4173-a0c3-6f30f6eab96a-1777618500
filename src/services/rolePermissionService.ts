
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type RolePermission = Database["public"]["Tables"]["role_permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

export interface PermissionsByModule {
  [module: string]: Permission[];
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[];
}

export const rolePermissionService = {
  /**
   * Get all available permissions grouped by module
   */
  async getAllPermissionsGrouped(): Promise<PermissionsByModule> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("module", { ascending: true })
      .order("action", { ascending: true });

    if (error) throw error;

    const grouped: PermissionsByModule = {};
    data.forEach((perm) => {
      const moduleName = perm.module || "general";
      if (!grouped[moduleName]) grouped[moduleName] = [];
      grouped[moduleName].push(perm);
    });

    return grouped;
  },

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(role: UserRole): Promise<string[]> {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role", role);

    if (error) throw error;
    return data.map((rp) => rp.permission_id);
  },

  /**
   * Set permissions for a role (replaces existing)
   */
  async setRolePermissions(role: UserRole, permissionIds: string[]): Promise<void> {
    // Delete existing permissions for this role
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role", role);

    if (deleteError) throw deleteError;

    // Insert new permissions
    if (permissionIds.length > 0) {
      const newPermissions = permissionIds.map((pid) => ({
        role,
        permission_id: pid,
      }));

      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(newPermissions);

      if (insertError) throw insertError;
    }
  },

  /**
   * Get all roles with their permissions
   */
  async getAllRolesWithPermissions(): Promise<RolePermissions[]> {
    const roles: UserRole[] = ["admin", "manager", "staff", "viewer"];
    const result: RolePermissions[] = [];

    for (const role of roles) {
      const permissions = await this.getRolePermissions(role);
      result.push({ role, permissions });
    }

    return result;
  },

  /**
   * Check if a role has a specific permission
   */
  async roleHasPermission(role: UserRole, permissionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("id")
      .eq("role", role)
      .eq("permission_id", permissionId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  },

  /**
   * Get effective permissions for a user (combines role permissions and user-specific permissions)
   */
  async getUserEffectivePermissions(userId: string): Promise<string[]> {
    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // Get role permissions
    const rolePermissions = await this.getRolePermissions(profile.role);

    // Get user-specific permissions
    const { data: userPerms, error: userPermsError } = await supabase
      .from("user_permissions")
      .select("permission_id")
      .eq("user_id", userId);

    if (userPermsError) throw userPermsError;

    const userPermissions = userPerms.map((up) => up.permission_id);

    // Combine and deduplicate
    const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];
    return allPermissions;
  },

  /**
   * Initialize default role permissions
   */
  async initializeDefaultRolePermissions(): Promise<void> {
    try {
      // Get all permissions
      const { data: allPermissions, error } = await supabase
        .from("permissions")
        .select("id, name, module");

      if (error) throw error;

      // Admin gets all permissions
      const adminPermissions = allPermissions.map((p) => p.id);
      await this.setRolePermissions("admin", adminPermissions);

      // Manager gets all except admin management
      const managerPermissions = allPermissions
        .filter((p) => p.module !== "admin")
        .map((p) => p.id);
      await this.setRolePermissions("manager", managerPermissions);

      // Staff gets view and edit for most modules
      const staffPermissions = allPermissions
        .filter((p) => p.module !== "admin" && p.name?.includes("view") || p.name?.includes("edit"))
        .map((p) => p.id);
      await this.setRolePermissions("staff", staffPermissions);

      // Viewer gets only view permissions
      const viewerPermissions = allPermissions
        .filter((p) => p.name?.includes("view"))
        .map((p) => p.id);
      await this.setRolePermissions("viewer", viewerPermissions);

    } catch (error) {
      console.error("Error initializing default role permissions:", error);
    }
  },
};
