
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rolePermissionService, type PermissionsByModule } from "@/services/rolePermissionService";
import { Shield, AlertCircle, CheckCircle2, Loader2, Users, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

const ROLES: UserRole[] = ["admin", "manager", "staff", "viewer"];

const MODULE_ORDER = [
  "locations",
  "plant_types",
  "plantings",
  "harvests",
  "treatments",
  "reservations",
  "reports",
  "user_management",
];

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  locations: "Locations",
  plant_types: "Plant Types",
  plantings: "Plantings",
  harvests: "Harvests",
  treatments: "Treatments",
  reservations: "Reservations",
  reports: "Reports",
  user_management: "User Management",
};

export default function RolesPermissionsPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({});
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({
    admin: [],
    manager: [],
    staff: [],
    viewer: [],
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [permissions, rolesData] = await Promise.all([
        rolePermissionService.getAllPermissionsGrouped(),
        rolePermissionService.getAllRolesWithPermissions(),
      ]);
      
      setPermissionsByModule(permissions);
      
      const permsMap: Record<UserRole, string[]> = {
        admin: [],
        manager: [],
        staff: [],
        viewer: [],
      };
      
      rolesData.forEach((rp) => {
        permsMap[rp.role] = rp.permissions;
      });
      
      setRolePermissions(permsMap);
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (role: UserRole, permissionId: string) => {
    setRolePermissions((prev) => {
      const current = prev[role] || [];
      const newPerms = current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];
      
      setHasChanges(true);
      return { ...prev, [role]: newPerms };
    });
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await Promise.all(
        ROLES.map((role) =>
          rolePermissionService.setRolePermissions(role, rolePermissions[role])
        )
      );
      
      setSuccess("All role permissions updated successfully!");
      setHasChanges(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm("This will reset all role permissions to default values. Continue?")) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await rolePermissionService.initializeDefaultRolePermissions();
      await loadData();
      setSuccess("Default role permissions initialized successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to initialize defaults.");
    } finally {
      setLoading(false);
    }
  };

  const getPermissionForAction = (moduleName: string, action: string | null): Permission | undefined => {
    const modulePerms = permissionsByModule[moduleName] || [];
    return modulePerms.find((p) => p.action === action);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "staff":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto mt-10 flex justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be an administrator to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Roles & Permissions Matrix
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure role-based access control across all system modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/user-management")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            User Management
          </Button>
          <Button
            variant="outline"
            onClick={handleInitializeDefaults}
            className="gap-2"
          >
            Reset to Defaults
          </Button>
          {hasChanges && (
            <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save All Changes
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Permissions Matrix by Module */}
      <div className="space-y-8">
        {MODULE_ORDER.map((moduleName) => {
          const modulePerms = permissionsByModule[moduleName];
          if (!modulePerms || modulePerms.length === 0) return null;

          const fullAccessPerm = getPermissionForAction(moduleName, null);
          const viewPerm = getPermissionForAction(moduleName, "view");
          const createPerm = getPermissionForAction(moduleName, "create");
          const editPerm = getPermissionForAction(moduleName, "edit");
          const deletePerm = getPermissionForAction(moduleName, "delete");

          return (
            <Card key={moduleName}>
              <CardHeader>
                <CardTitle className="text-xl">
                  {MODULE_DISPLAY_NAMES[moduleName] || moduleName}
                </CardTitle>
                <CardDescription>
                  Configure permissions for {MODULE_DISPLAY_NAMES[moduleName]?.toLowerCase() || moduleName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Role</TableHead>
                      <TableHead className="text-center w-[120px]">Full Access</TableHead>
                      <TableHead className="text-center w-[120px]">View</TableHead>
                      <TableHead className="text-center w-[120px]">Create</TableHead>
                      <TableHead className="text-center w-[120px]">Edit</TableHead>
                      <TableHead className="text-center w-[120px]">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLES.map((role) => (
                      <TableRow key={role}>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(role)}>
                            {role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {fullAccessPerm && (
                            <Checkbox
                              checked={rolePermissions[role]?.includes(fullAccessPerm.id)}
                              onCheckedChange={() => handlePermissionToggle(role, fullAccessPerm.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {viewPerm && (
                            <Checkbox
                              checked={rolePermissions[role]?.includes(viewPerm.id)}
                              onCheckedChange={() => handlePermissionToggle(role, viewPerm.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {createPerm && (
                            <Checkbox
                              checked={rolePermissions[role]?.includes(createPerm.id)}
                              onCheckedChange={() => handlePermissionToggle(role, createPerm.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editPerm && (
                            <Checkbox
                              checked={rolePermissions[role]?.includes(editPerm.id)}
                              onCheckedChange={() => handlePermissionToggle(role, editPerm.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {deletePerm && (
                            <Checkbox
                              checked={rolePermissions[role]?.includes(deletePerm.id)}
                              onCheckedChange={() => handlePermissionToggle(role, deletePerm.id)}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button at Bottom */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={handleSaveAll} disabled={saving} size="lg" className="gap-2 shadow-lg">
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Save All Changes
          </Button>
        </div>
      )}
    </div>
  );
}
