
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
  permissions: {
    permission_id: string;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
  }[];
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
    (data || []).forEach((perm) => {
      const moduleName = perm.module || "general";
      if (!grouped[moduleName]) grouped[moduleName] = [];
      grouped[moduleName].push(perm);
    });

    return grouped;
  },

  /**
   * Get permissions for a specific role with CRUD flags
   */
  async getRolePermissions(role: UserRole): Promise<RolePermissions["permissions"]> {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission_id, can_create, can_read, can_update, can_delete")
      .eq("role", role);

    if (error) {
      console.error("Error fetching role permissions:", error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Update a single permission for a role
   */
  async updateRolePermission(
    role: UserRole,
    permissionId: string,
    updates: {
      can_create?: boolean;
      can_read?: boolean;
      can_update?: boolean;
      can_delete?: boolean;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("role_permissions")
      .update(updates)
      .eq("role", role)
      .eq("permission_id", permissionId);

    if (error) throw error;
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
   * Check if a role has a specific permission with action
   */
  async roleHasPermission(
    role: UserRole,
    permissionId: string,
    action: "create" | "read" | "update" | "delete"
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("role_permissions")
      .select(`can_create, can_read, can_update, can_delete`)
      .eq("role", role)
      .eq("permission_id", permissionId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking role permission:", error);
      return false;
    }
    
    if (!data) return false;

    switch (action) {
      case "create":
        return data.can_create;
      case "read":
        return data.can_read;
      case "update":
        return data.can_update;
      case "delete":
        return data.can_delete;
      default:
        return false;
    }
  },

  /**
   * Get effective permissions for a user (combines role permissions and user-specific permissions)
   */
  async getUserEffectivePermissions(userId: string): Promise<{
    [permissionId: string]: {
      can_create: boolean;
      can_read: boolean;
      can_update: boolean;
      can_delete: boolean;
    };
  }> {
    try {
      // Get user's role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        return {};
      }

      // Get role permissions
      const rolePermissions = await this.getRolePermissions(profile.role);

      // Convert to object format
      const permissions: {
        [permissionId: string]: {
          can_create: boolean;
          can_read: boolean;
          can_update: boolean;
          can_delete: boolean;
        };
      } = {};

      rolePermissions.forEach((perm) => {
        permissions[perm.permission_id] = {
          can_create: perm.can_create,
          can_read: perm.can_read,
          can_update: perm.can_update,
          can_delete: perm.can_delete,
        };
      });

      return permissions;
    } catch (error) {
      console.error("Error getting user effective permissions:", error);
      return {};
    }
  },

  /**
   * Reset role permissions to defaults
   */
  async resetRoleToDefaults(role: UserRole): Promise<void> {
    try {
      // Get all permissions
      const { data: allPermissions, error } = await supabase
        .from("permissions")
        .select("id, module, action");

      if (error) throw error;

      // Delete existing permissions for this role
      await supabase.from("role_permissions").delete().eq("role", role);

      // Set defaults based on role
      const newPermissions: Array<{
        role: UserRole;
        permission_id: string;
        can_create: boolean;
        can_read: boolean;
        can_update: boolean;
        can_delete: boolean;
      }> = [];

      allPermissions.forEach((perm) => {
        let canCreate = false;
        let canRead = false;
        let canUpdate = false;
        let canDelete = false;

        switch (role) {
          case "admin":
            canCreate = canRead = canUpdate = canDelete = true;
            break;
          case "manager":
            if (perm.module !== "admin") {
              canCreate = canRead = canUpdate = canDelete = true;
            }
            break;
          case "staff":
            if (perm.module !== "admin") {
              canRead = true;
              canCreate = perm.action === "create";
              canUpdate = perm.action === "edit";
            }
            break;
          case "viewer":
            canRead = perm.action === "view";
            break;
        }

        if (canRead || canCreate || canUpdate || canDelete) {
          newPermissions.push({
            role,
            permission_id: perm.id,
            can_create: canCreate,
            can_read: canRead,
            can_update: canUpdate,
            can_delete: canDelete,
          });
        }
      });

      if (newPermissions.length > 0) {
        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(newPermissions);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error("Error resetting role to defaults:", error);
      throw error;
    }
  },
};
