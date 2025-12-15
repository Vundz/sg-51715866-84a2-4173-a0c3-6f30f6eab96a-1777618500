import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Create admin client with service role key
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("🔍 Checking existing permissions...");

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
      console.log("📝 No permissions found. Creating base permissions...");
      
      const { error: insertPermError } = await supabase
        .from("permissions")
        .insert(BASE_PERMISSIONS);

      if (insertPermError) {
        console.error("❌ Error creating permissions:", insertPermError);
        throw new Error(`Failed to create base permissions: ${insertPermError.message}`);
      }

      console.log("✅ Base permissions created successfully");
    }

    // Step 3: Get all permissions (now they should exist)
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
    const permissionsByModule: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!permissionsByModule[perm.module]) {
        permissionsByModule[perm.module] = [];
      }
      permissionsByModule[perm.module].push(perm);
    });

    const roles: UserRole[] = ["admin", "manager", "staff", "viewer"];
    const insertData: any[] = [];

    // Step 5: Build insert data for all roles
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
    const { error: insertError } = await supabase
      .from("role_permissions")
      .insert(insertData);

    if (insertError) {
      console.error("❌ Error inserting role_permissions:", insertError);
      throw new Error(`Failed to insert role_permissions: ${insertError.message}`);
    }

    console.log("✅ Role permissions initialized successfully");

    return res.status(200).json({ 
      success: true, 
      message: "Permissions initialized successfully",
      count: insertData.length,
      permissionsCreated: permissions.length
    });

  } catch (error: any) {
    console.error("❌ Permission initialization error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to initialize permissions" 
    });
  }
}