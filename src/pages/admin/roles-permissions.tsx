
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rolePermissionService, type PermissionsByModule } from "@/services/rolePermissionService";
import { Key, Shield, AlertCircle, CheckCircle2, Loader2, Users, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

const ROLES: UserRole[] = ["admin", "manager", "staff", "viewer"];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full system access - Can manage all modules, users, and permissions",
  manager: "Manage operations - Can view, edit, and delete in all operational modules",
  staff: "Day-to-day operations - Can view and edit most modules",
  viewer: "Read-only access - Can only view data across modules",
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
  
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
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

  const handlePermissionToggle = (permissionId: string) => {
    setRolePermissions((prev) => {
      const current = prev[selectedRole] || [];
      const newPerms = current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];
      
      setHasChanges(true);
      return { ...prev, [selectedRole]: newPerms };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await rolePermissionService.setRolePermissions(
        selectedRole,
        rolePermissions[selectedRole]
      );
      
      setSuccess(`Permissions for ${selectedRole} role updated successfully!`);
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

  const getActionBadge = (action: string | null) => {
    switch (action) {
      case "view":
        return <Badge variant="outline" className="text-xs">View</Badge>;
      case "edit":
        return <Badge variant="outline" className="text-xs bg-blue-50">Edit</Badge>;
      case "delete":
        return <Badge variant="outline" className="text-xs bg-red-50">Delete</Badge>;
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Roles & Permissions (RBAC)
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure role-based access control for all system modules
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

        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Role to Configure</CardTitle>
            <CardDescription>
              Choose a role below to configure its permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {ROLES.map((role) => (
                <Card
                  key={role}
                  className={`cursor-pointer transition-all ${
                    selectedRole === role
                      ? "ring-2 ring-primary"
                      : "hover:border-primary"
                  }`}
                  onClick={() => {
                    if (hasChanges) {
                      if (confirm("You have unsaved changes. Discard them?")) {
                        setSelectedRole(role);
                        setHasChanges(false);
                      }
                    } else {
                      setSelectedRole(role);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <Badge className={getRoleBadgeColor(role)}>{role}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {rolePermissions[role]?.length || 0} perms
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Configuration */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configure Permissions for{" "}
                  <Badge className={getRoleBadgeColor(selectedRole)}>
                    {selectedRole}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {ROLE_DESCRIPTIONS[selectedRole]}
                </CardDescription>
              </div>
              {hasChanges && (
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(permissionsByModule)[0]}>
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                {Object.keys(permissionsByModule).map((module) => (
                  <TabsTrigger key={module} value={module} className="capitalize">
                    {module.replace(/_/g, " ")}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                <TabsContent key={moduleName} value={moduleName} className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {perms.map((perm) => (
                      <Card key={perm.id} className="hover:border-primary transition-colors">
                        <CardContent className="pt-6">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={perm.id}
                              checked={rolePermissions[selectedRole]?.includes(perm.id)}
                              onCheckedChange={() => handlePermissionToggle(perm.id)}
                            />
                            <div className="flex-1 space-y-1">
                              <label
                                htmlFor={perm.id}
                                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                              >
                                {perm.name}
                                {getActionBadge(perm.action)}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Save Button at Bottom */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Save Permissions for {selectedRole}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
