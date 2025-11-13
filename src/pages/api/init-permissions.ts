
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Create admin client with service role key
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all permissions
    const { data: permissions, error: permError } = await supabase
      .from("permissions")
      .select("*");

    if (permError) {
      throw new Error(`Failed to fetch permissions: ${permError.message}`);
    }

    if (!permissions || permissions.length === 0) {
      throw new Error("No permissions found in database");
    }

    // Group permissions by module
    const permissionsByModule: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!permissionsByModule[perm.module]) {
        permissionsByModule[perm.module] = [];
      }
      permissionsByModule[perm.module].push(perm);
    });

    const roles: UserRole[] = ["admin", "manager", "staff", "viewer"];
    const insertData: any[] = [];

    // Build insert data for all roles
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

    // Delete existing role_permissions
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      throw new Error(`Failed to clear role_permissions: ${deleteError.message}`);
    }

    // Insert new role_permissions
    const { error: insertError } = await supabase
      .from("role_permissions")
      .insert(insertData);

    if (insertError) {
      throw new Error(`Failed to insert role_permissions: ${insertError.message}`);
    }

    return res.status(200).json({ 
      success: true, 
      message: "Permissions initialized successfully",
      count: insertData.length 
    });

  } catch (error: any) {
    console.error("Permission initialization error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to initialize permissions" 
    });
  }
}
