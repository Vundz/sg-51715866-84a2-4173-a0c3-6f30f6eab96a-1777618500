
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rolePermissionService, type PermissionsByModule, type RolePermissions } from "@/services/rolePermissionService";
import { Shield, AlertCircle, CheckCircle2, Loader2, Users, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];
type RolePermissionData = RolePermissions["permissions"][0];

const ROLES: UserRole[] = ["admin", "manager", "staff", "viewer"];

const MODULE_ORDER = [
  "locations",
  "plant_types",
  "plantings",
  "harvests",
  "treatments",
  "reservations",
  "reports",
  "admin",
];

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  locations: "Locations",
  plant_types: "Plant Types",
  plantings: "Plantings",
  harvests: "Harvests",
  treatments: "Treatments",
  reservations: "Reservations",
  reports: "Reports",
  admin: "System Administration",
};

export default function RolesPermissionsPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({});
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, RolePermissionData[]>>({
    admin: [],
    manager: [],
    staff: [],
    viewer: [],
  });
  
  const [originalRolePermissions, setOriginalRolePermissions] = useState<Record<UserRole, RolePermissionData[]>>({});
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
      
      const permsMap: Record<UserRole, RolePermissionData[]> = {
        admin: [],
        manager: [],
        staff: [],
        viewer: [],
      };
      
      rolesData.forEach((rp) => {
        permsMap[rp.role] = rp.permissions;
      });
      
      setRolePermissions(permsMap);
      setOriginalRolePermissions(JSON.parse(JSON.stringify(permsMap))); // Deep copy for change tracking
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (role: UserRole, permissionId: string, action: keyof Omit<RolePermissionData, "permission_id">) => {
    setRolePermissions((prev) => {
      const rolePerms = prev[role] || [];
      const permIndex = rolePerms.findIndex((p) => p.permission_id === permissionId);

      const newRolePerms = [...rolePerms];

      if (permIndex > -1) {
        const updatedPerm = { ...newRolePerms[permIndex], [action]: !newRolePerms[permIndex][action] };
        newRolePerms[permIndex] = updatedPerm;
      }

      setHasChanges(true);
      return { ...prev, [role]: newRolePerms };
    });
  };
  
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
  
      const changes: Promise<void>[] = [];
  
      for (const role of ROLES) {
        const originalPerms = originalRolePermissions[role] || [];
        const currentPerms = rolePermissions[role] || [];
  
        currentPerms.forEach((currentPerm) => {
          const originalPerm = originalPerms.find((p) => p.permission_id === currentPerm.permission_id);
          if (JSON.stringify(currentPerm) !== JSON.stringify(originalPerm)) {
            changes.push(
              rolePermissionService.updateRolePermission(role, currentPerm.permission_id, {
                can_create: currentPerm.can_create,
                can_read: currentPerm.can_read,
                can_update: currentPerm.can_update,
                can_delete: currentPerm.can_delete,
              })
            );
          }
        });
      }
  
      await Promise.all(changes);
  
      setSuccess("All role permissions updated successfully!");
      setOriginalRolePermissions(JSON.parse(JSON.stringify(rolePermissions))); // Update original state
      setHasChanges(false);
  
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("This will reset all role permissions to their default values. Are you sure?")) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await Promise.all(ROLES.map(role => rolePermissionService.resetRoleToDefaults(role)));
      await loadData();
      setSuccess("Default role permissions have been restored!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset permissions.");
    } finally {
      setLoading(false);
    }
  };
  
  const getPermissionCheckboxState = (role: UserRole, permissionId: string | undefined, action: keyof Omit<RolePermissionData, "permission_id">) => {
    if (!permissionId) return false;
    const perm = rolePermissions[role]?.find(p => p.permission_id === permissionId);
    return perm ? perm[action] : false;
  };

  const getPermissionForAction = (moduleName: string, action: string): Permission | undefined => {
    const modulePerms = permissionsByModule[moduleName] || [];
    return modulePerms.find((p) => p.action === action);
  };
  
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "staff": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="container mx-auto mt-10 flex justify-center">
        <Card className="max-w-md">
          <CardHeader><CardTitle className="text-red-600 flex items-center gap-2"><AlertCircle />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You must be an administrator to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="h-8 w-8" />Roles & Permissions Matrix</h1>
          <p className="text-muted-foreground mt-1">Configure role-based access control across all system modules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/user-management")} className="gap-2"><Users className="h-4 w-4" />User Management</Button>
          <Button variant="outline" onClick={handleResetToDefaults} className="gap-2">Reset to Defaults</Button>
          {hasChanges && <Button onClick={handleSaveAll} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Changes</Button>}
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-500"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-600">{success}</AlertDescription></Alert>}

      <div className="space-y-8">
        {MODULE_ORDER.map((moduleName) => {
          const modulePerms = permissionsByModule[moduleName];
          if (!modulePerms || modulePerms.length === 0) return null;

          const viewPerm = getPermissionForAction(moduleName, "view");
          const createPerm = getPermissionForAction(moduleName, "create");
          const editPerm = getPermissionForAction(moduleName, "edit");
          const deletePerm = getPermissionForAction(moduleName, "delete");

          return (
            <Card key={moduleName}>
              <CardHeader>
                <CardTitle className="text-xl">{MODULE_DISPLAY_NAMES[moduleName] || moduleName}</CardTitle>
                <CardDescription>Configure permissions for {MODULE_DISPLAY_NAMES[moduleName]?.toLowerCase() || moduleName}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Role</TableHead>
                      <TableHead className="text-center w-[120px]">View</TableHead>
                      <TableHead className="text-center w-[120px]">Create</TableHead>
                      <TableHead className="text-center w-[120px]">Edit</TableHead>
                      <TableHead className="text-center w-[120px]">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLES.map((role) => (
                      <TableRow key={role}>
                        <TableCell><Badge className={getRoleBadgeColor(role)}>{role}</Badge></TableCell>
                        <TableCell className="text-center">{viewPerm && <Checkbox checked={getPermissionCheckboxState(role, viewPerm.id, "can_read")} onCheckedChange={() => handlePermissionToggle(role, viewPerm.id, "can_read")} />}</TableCell>
                        <TableCell className="text-center">{createPerm && <Checkbox checked={getPermissionCheckboxState(role, createPerm.id, "can_create")} onCheckedChange={() => handlePermissionToggle(role, createPerm.id, "can_create")} />}</TableCell>
                        <TableCell className="text-center">{editPerm && <Checkbox checked={getPermissionCheckboxState(role, editPerm.id, "can_update")} onCheckedChange={() => handlePermissionToggle(role, editPerm.id, "can_update")} />}</TableCell>
                        <TableCell className="text-center">{deletePerm && <Checkbox checked={getPermissionCheckboxState(role, deletePerm.id, "can_delete")} onCheckedChange={() => handlePermissionToggle(role, deletePerm.id, "can_delete")} />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={handleSaveAll} disabled={saving} size="lg" className="gap-2 shadow-lg">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}Save All Changes</Button>
        </div>
      )}
    </div>
  );
}
