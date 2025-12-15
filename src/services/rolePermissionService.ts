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
   * Initialize permissions system directly from client-side
   * Creates base permissions and default role permissions
   */
  async initializePermissionsSystem(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      // Base permissions that should exist in the permissions table
      const BASE_PERMISSIONS = [
        // Locations
        { module: "locations", action: "view", name: "View Locations", resource: "locations", description: "View all locations" },
        { module: "locations", action: "create", name: "Create Locations", resource: "locations", description: "Create new locations" },
        { module: "locations", action: "edit", name: "Edit Locations", resource: "locations", description: "Edit existing locations" },
        { module: "locations", action: "delete", name: "Delete Locations", resource: "locations", description: "Delete locations" },
        
        // Plant Types
        { module: "plant_types", action: "view", name: "View Plant Types", resource: "plant_types", description: "View all plant types" },
        { module: "plant_types", action: "create", name: "Create Plant Types", resource: "plant_types", description: "Create new plant types" },
        { module: "plant_types", action: "edit", name: "Edit Plant Types", resource: "plant_types", description: "Edit existing plant types" },
        { module: "plant_types", action: "delete", name: "Delete Plant Types", resource: "plant_types", description: "Delete plant types" },
        
        // Plantings
        { module: "plantings", action: "view", name: "View Plantings", resource: "plantings", description: "View all plantings" },
        { module: "plantings", action: "create", name: "Create Plantings", resource: "plantings", description: "Create new plantings" },
        { module: "plantings", action: "edit", name: "Edit Plantings", resource: "plantings", description: "Edit existing plantings" },
        { module: "plantings", action: "delete", name: "Delete Plantings", resource: "plantings", description: "Delete plantings" },
        
        // Harvests
        { module: "harvests", action: "view", name: "View Harvests", resource: "harvests", description: "View all harvests" },
        { module: "harvests", action: "create", name: "Create Harvests", resource: "harvests", description: "Create new harvests" },
        { module: "harvests", action: "edit", name: "Edit Harvests", resource: "harvests", description: "Edit existing harvests" },
        { module: "harvests", action: "delete", name: "Delete Harvests", resource: "harvests", description: "Delete harvests" },
        
        // Treatments
        { module: "treatments", action: "view", name: "View Treatments", resource: "treatments", description: "View all treatments" },
        { module: "treatments", action: "create", name: "Create Treatments", resource: "treatments", description: "Create new treatments" },
        { module: "treatments", action: "edit", name: "Edit Treatments", resource: "treatments", description: "Edit existing treatments" },
        { module: "treatments", action: "delete", name: "Delete Treatments", resource: "treatments", description: "Delete treatments" },
        
        // Reservations
        { module: "reservations", action: "view", name: "View Reservations", resource: "reservations", description: "View all reservations" },
        { module: "reservations", action: "create", name: "Create Reservations", resource: "reservations", description: "Create new reservations" },
        { module: "reservations", action: "edit", name: "Edit Reservations", resource: "reservations", description: "Edit existing reservations" },
        { module: "reservations", action: "delete", name: "Delete Reservations", resource: "reservations", description: "Delete reservations" },
        
        // Reports
        { module: "reports", action: "view", name: "View Reports", resource: "reports", description: "View all reports" },
        { module: "reports", action: "create", name: "Create Reports", resource: "reports", description: "Create new reports" },
        { module: "reports", action: "edit", name: "Edit Reports", resource: "reports", description: "Edit existing reports" },
        { module: "reports", action: "delete", name: "Delete Reports", resource: "reports", description: "Delete reports" },
        
        // Admin
        { module: "admin", action: "view", name: "View Admin", resource: "admin", description: "View admin panel" },
        { module: "admin", action: "create", name: "Create Admin", resource: "admin", description: "Create admin users" },
        { module: "admin", action: "edit", name: "Edit Admin", resource: "admin", description: "Edit admin settings" },
        { module: "admin", action: "delete", name: "Delete Admin", resource: "admin", description: "Delete admin records" },
      ];

      // Default permissions configuration
      const DEFAULT_PERMISSIONS = {
        admin: {
          locations: { can_create: true, can_read: true, can_update: true, can_delete: true },
          plant_types: { can_create: true, can_read: true, can_update: true, can_delete: true },
          plantings: { can_create: true, can_read: true, can_update: true, can_delete: true },
          harvests: { can_create: true, can_read: true, can_update: true, can_delete: true },
          treatments: { can_create: true, can_read: true, can_update: true, can_delete: true },
          reservations: { can_create: true, can_read: true, can_update: true, can_delete: true },
          reports: { can_create: false, can_read: true, can_update: false, can_delete: false },
          admin: { can_create: true, can_read: true, can_update: true, can_delete: true },
        },
        manager: {
          locations: { can_create: true, can_read: true, can_update: true, can_delete: false },
          plant_types: { can_create: true, can_read: true, can_update: true, can_delete: false },
          plantings: { can_create: true, can_read: true, can_update: true, can_delete: false },
          harvests: { can_create: true, can_read: true, can_update: true, can_delete: false },
          treatments: { can_create: true, can_read: true, can_update: true, can_delete: false },
          reservations: { can_create: true, can_read: true, can_update: true, can_delete: false },
          reports: { can_create: false, can_read: true, can_update: false, can_delete: false },
          admin: { can_create: false, can_read: false, can_update: false, can_delete: false },
        },
        staff: {
          locations: { can_create: false, can_read: true, can_update: false, can_delete: false },
          plant_types: { can_create: false, can_read: true, can_update: false, can_delete: false },
          plantings: { can_create: true, can_read: true, can_update: true, can_delete: false },
          harvests: { can_create: true, can_read: true, can_update: true, can_delete: false },
          treatments: { can_create: true, can_read: true, can_update: true, can_delete: false },
          reservations: { can_create: true, can_read: true, can_update: true, can_delete: false },
          reports: { can_create: false, can_read: true, can_update: false, can_delete: false },
          admin: { can_create: false, can_read: false, can_update: false, can_delete: false },
        },
        viewer: {
          locations: { can_create: false, can_read: true, can_update: false, can_delete: false },
          plant_types: { can_create: false, can_read: true, can_update: false, can_delete: false },
          plantings: { can_create: false, can_read: true, can_update: false, can_delete: false },
          harvests: { can_create: false, can_read: true, can_update: false, can_delete: false },
          treatments: { can_create: false, can_read: true, can_update: false, can_delete: false },
          reservations: { can_create: false, can_read: true, can_update: false, can_delete: false },
          reports: { can_create: false, can_read: true, can_update: false, can_delete: false },
          admin: { can_create: false, can_read: false, can_update: false, can_delete: false },
        },
      };

      console.log("🔍 Step 1: Checking existing permissions...");

      // Step 1: Check if permissions table has any records
      const { data: existingPermissions, error: permError } = await supabase
        .from("permissions")
        .select("*")
        .limit(1);

      if (permError) {
        console.error("❌ Error checking permissions:", permError);
        throw new Error(`Failed to check permissions: ${permError.message}`);
      }

      // Step 2: If no permissions exist, create base permissions
      if (!existingPermissions || existingPermissions.length === 0) {
        console.log("📝 Step 2: No permissions found. Creating base permissions...");
        
        const { error: insertPermError } = await supabase
          .from("permissions")
          .insert(BASE_PERMISSIONS);

        if (insertPermError) {
          console.error("❌ Error creating permissions:", insertPermError);
          throw new Error(`Failed to create base permissions: ${insertPermError.message}`);
        }

        console.log("✅ Base permissions created successfully");
      } else {
        console.log("✅ Permissions already exist, skipping creation");
      }

      // Step 3: Get all permissions (now they should exist)
      console.log("🔍 Step 3: Fetching all permissions...");
      const { data: permissions, error: fetchError } = await supabase
        .from("permissions")
        .select("*");

      if (fetchError) {
        console.error("❌ Error fetching permissions:", fetchError);
        throw new Error(`Failed to fetch permissions: ${fetchError.message}`);
      }

      if (!permissions || permissions.length === 0) {
        throw new Error("Permissions table is empty after initialization attempt");
      }

      console.log(`✅ Found ${permissions.length} permissions`);

      // Step 4: Group permissions by module
      const permissionsByModule: Record<string, typeof permissions> = {};
      permissions.forEach((perm) => {
        if (!permissionsByModule[perm.module]) {
          permissionsByModule[perm.module] = [];
        }
        permissionsByModule[perm.module].push(perm);
      });

      const roles: UserRole[] = ["admin", "manager", "staff", "viewer"];
      const insertData: any[] = [];

      // Step 5: Build insert data for all roles
      console.log("📝 Step 4: Building role permissions...");
      for (const role of roles) {
        const roleDefaults = DEFAULT_PERMISSIONS[role];
        
        for (const moduleName in roleDefaults) {
          const modulePerms = permissionsByModule[moduleName];
          if (!modulePerms) continue;

          const moduleDefaults = roleDefaults[moduleName as keyof typeof roleDefaults];

          for (const perm of modulePerms) {
            insertData.push({
              role,
              permission_id: perm.id,
              can_create: moduleDefaults.can_create && perm.action === "create",
              can_read: moduleDefaults.can_read && perm.action === "view",
              can_update: moduleDefaults.can_update && perm.action === "edit",
              can_delete: moduleDefaults.can_delete && perm.action === "delete",
            });
          }
        }
      }

      console.log(`📝 Preparing to insert ${insertData.length} role permission records`);

      // Step 6: Delete existing role_permissions
      console.log("🗑️ Step 5: Clearing existing role permissions...");
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (deleteError) {
        console.error("❌ Error clearing role_permissions:", deleteError);
        throw new Error(`Failed to clear role_permissions: ${deleteError.message}`);
      }

      console.log("✅ Cleared existing role permissions");

      // Step 7: Insert new role_permissions
      console.log("📝 Step 6: Inserting new role permissions...");
      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(insertData);

      if (insertError) {
        console.error("❌ Error inserting role_permissions:", insertError);
        throw new Error(`Failed to insert role_permissions: ${insertError.message}`);
      }

      console.log("✅ Role permissions initialized successfully");

      return {
        success: true,
        message: "Permissions initialized successfully",
        count: insertData.length
      };

    } catch (error: any) {
      console.error("❌ Permission initialization error:", error);
      throw error;
    }
  },

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
