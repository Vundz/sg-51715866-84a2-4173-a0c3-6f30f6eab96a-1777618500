
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminService } from "@/services/adminService";
import { Plus, Pencil, Trash2, Shield, AlertCircle, CheckCircle2, UserCog } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type User = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

// Corrected Permission type to match DB schema
interface Permission {
  id: string;
  action: string;
  description: string;
  module: string;
}

interface FormData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

const ROLES: UserRole[] = ["admin", "manager", "staff", "viewer"];

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState&lt;User[]&gt;([]);
  const [permissions, setPermissions] = useState&lt;Permission[]&gt;([]);
  const [userPermissions, setUserPermissions] = useState&lt;Record&lt;string, string[]&gt;&gt;({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState&lt;User | null&gt;(null);
  const [selectedUserId, setSelectedUserId] = useState&lt;string | null&gt;(null);
  const [selectedPermissions, setSelectedPermissions] = useState&lt;string[]&gt;([]);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [success, setSuccess] = useState&lt;string | null&gt;(null);
  const [formData, setFormData] = useState&lt;FormData&gt;({
    email: "",
    password: "",
    full_name: "",
    role: "viewer"
  });

  // Route protection: redirect if not admin
  useEffect(() => {
    if (!authLoading &amp;&amp; !isAdmin) {
      console.log("Access denied: User is not admin", { user, isAdmin });
      router.push("/");
    }
  }, [authLoading, isAdmin, router, user]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      initializeDefaultAdmin();
    }
  }, [isAdmin]);

  const initializeDefaultAdmin = async () => {
    try {
      await adminService.ensureDefaultAdmin();
      console.log("Default admin check complete");
    } catch (error) {
      console.error("Error initializing default admin:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersData, permsData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllPermissions()
      ]);

      setUsers(usersData);
      setPermissions(permsData as unknown as Permission[]); // Cast to corrected type

      // Load permissions for each user
      const permsMap: Record&lt;string, string[]&gt; = {};
      for (const user of usersData) {
        const userPermsIds = await adminService.getUserPermissions(user.id);
        permsMap[user.id] = userPermsIds;
      }
      setUserPermissions(permsMap);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load users and permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user &amp;&amp; user.role) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: "",
        full_name: user.full_name || "",
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: "",
        password: "",
        full_name: "",
        role: "viewer"
      });
    }
    setDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleOpenPermissionsDialog = async (user: User) => {
    setSelectedUserId(user.id);
    setEditingUser(user);
    
    // Load user's current permissions
    const userPermsIds = await adminService.getUserPermissions(user.id);
    setSelectedPermissions(userPermsIds);
    
    setPermissionsDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingUser) {
        // Update existing user
        await adminService.updateUser(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role
        });
        setSuccess("User updated successfully!");
      } else {
        // Create new user
        if (!formData.password) {
          setError("Password is required for new users");
          return;
        }
        await adminService.createUser(
          formData.email,
          formData.password,
          formData.full_name,
          formData.role
        );
        setSuccess("User created successfully!");
      }
      
      await loadData();
      setTimeout(() => {
        setDialogOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || "Failed to save user");
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    
    setError(null);
    setSuccess(null);

    try {
      await adminService.setUserPermissions(selectedUserId, selectedPermissions);
      setSuccess("Permissions updated successfully!");
      await loadData();
      
      setTimeout(() => {
        setPermissionsDialogOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error("Error saving permissions:", err);
      setError(err.message || "Failed to save permissions");
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) return;

    try {
      setError(null);
      await adminService.deleteUser(userId);
      setSuccess("User deleted successfully!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setError(err.message || "Failed to delete user");
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const getRoleBadgeColor = (role: UserRole | null) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "staff":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "viewer":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const groupPermissionsByModule = () => {
    const grouped: Record&lt;string, Permission[]&gt; = {};
    permissions.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    return grouped;
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      &lt;Layout&gt;
        &lt;div className="flex items-center justify-center min-h-screen"&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"&gt;&lt;/div&gt;
            &lt;p className="mt-4 text-gray-600 dark:text-gray-400"&gt;Checking permissions...&lt;/p&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/Layout&gt;
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      &lt;Layout&gt;
        &lt;div className="flex items-center justify-center min-h-screen"&gt;
          &lt;Card className="max-w-md"&gt;
            &lt;CardHeader&gt;
              &lt;CardTitle className="flex items-center gap-2 text-red-600"&gt;
                &lt;AlertCircle className="h-6 w-6" /&gt;
                Access Denied
              &lt;/CardTitle&gt;
              &lt;CardDescription&gt;
                You don't have permission to access this page. Admin privileges required.
              &lt;/CardDescription&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent&gt;
              &lt;div className="space-y-3"&gt;
                &lt;p className="text-sm"&gt;Current user: {user?.email || "Not signed in"}&lt;/p&gt;
                &lt;p className="text-sm"&gt;Role: {user?.role || "No role"}&lt;/p&gt;
                &lt;Button onClick={() => router.push("/")} className="w-full"&gt;
                  Back to Dashboard
                &lt;/Button&gt;
              &lt;/div&gt;
            &lt;/CardContent&gt;
          &lt;/Card&gt;
        &lt;/div&gt;
      &lt;/Layout&gt;
    );
  }

  if (loading) {
    return (
      &lt;Layout&gt;
        &lt;div className="flex items-center justify-center min-h-screen"&gt;
          &lt;div className="text-center"&gt;
            &lt;div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"&gt;&lt;/div&gt;
            &lt;p className="mt-4 text-gray-600 dark:text-gray-400"&gt;Loading users...&lt;/p&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/Layout&gt;
    );
  }

  return (
    &lt;Layout&gt;
      &lt;div className="container mx-auto p-6 space-y-6"&gt;
        &lt;div className="flex justify-between items-center"&gt;
          &lt;div&gt;
            &lt;h1 className="text-3xl font-bold flex items-center gap-2"&gt;
              &lt;Shield className="h-8 w-8" /&gt;
              User Management
            &lt;/h1&gt;
            &lt;p className="text-muted-foreground mt-1"&gt;Manage users, roles, and permissions&lt;/p&gt;
          &lt;/div&gt;
          &lt;Button onClick={() => handleOpenDialog()} className="gap-2"&gt;
            &lt;Plus className="h-4 w-4" /&gt;
            Add User
          &lt;/Button&gt;
        &lt;/div&gt;

        {error &amp;&amp; (
          &lt;Alert variant="destructive"&gt;
            &lt;AlertCircle className="h-4 w-4" /&gt;
            &lt;AlertDescription&gt;{error}&lt;/AlertDescription&gt;
          &lt;/Alert&gt;
        )}

        {success &amp;&amp; (
          &lt;Alert className="border-green-500 bg-green-50 dark:bg-green-950"&gt;
            &lt;CheckCircle2 className="h-4 w-4 text-green-600" /&gt;
            &lt;AlertDescription className="text-green-600 dark:text-green-400"&gt;{success}&lt;/AlertDescription&gt;
          &lt;/Alert&gt;
        )}

        &lt;Card&gt;
          &lt;CardHeader&gt;
            &lt;CardTitle&gt;All Users&lt;/CardTitle&gt;
            &lt;CardDescription&gt;
              Total users: {users.length} | Default admin: admin@khulisapp.com (password: Spawniad8!)
            &lt;/CardDescription&gt;
          &lt;/CardHeader&gt;
          &lt;CardContent&gt;
            &lt;div className="rounded-md border"&gt;
              &lt;Table&gt;
                &lt;TableHeader&gt;
                  &lt;TableRow&gt;
                    &lt;TableHead&gt;Email&lt;/TableHead&gt;
                    &lt;TableHead&gt;Full Name&lt;/TableHead&gt;
                    &lt;TableHead&gt;Role&lt;/TableHead&gt;
                    &lt;TableHead&gt;Permissions&lt;/TableHead&gt;
                    &lt;TableHead&gt;Created&lt;/TableHead&gt;
                    &lt;TableHead className="text-right"&gt;Actions&lt;/TableHead&gt;
                  &lt;/TableRow&gt;
                &lt;/TableHeader&gt;
                &lt;TableBody&gt;
                  {users.length === 0 ? (
                    &lt;TableRow&gt;
                      &lt;TableCell colSpan={6} className="text-center text-muted-foreground py-8"&gt;
                        No users found. Click "Add User" to create one.
                      &lt;/TableCell&gt;
                    &lt;/TableRow&gt;
                  ) : (
                    users.map((user) => (
                      &lt;TableRow key={user.id}&gt;
                        &lt;TableCell className="font-medium"&gt;{user.email}&lt;/TableCell&gt;
                        &lt;TableCell&gt;{user.full_name || "-"}&lt;/TableCell&gt;
                        &lt;TableCell&gt;
                          &lt;Badge className={getRoleBadgeColor(user.role)}&gt;
                            {user.role}
                          &lt;/Badge&gt;
                        &lt;/TableCell&gt;
                        &lt;TableCell&gt;
                          &lt;span className="text-sm text-muted-foreground"&gt;
                            {userPermissions[user.id]?.length || 0} permissions
                          &lt;/span&gt;
                        &lt;/TableCell&gt;
                        &lt;TableCell className="text-sm text-muted-foreground"&gt;
                          {new Date(user.created_at).toLocaleDateString()}
                        &lt;/TableCell&gt;
                        &lt;TableCell className="text-right"&gt;
                          &lt;div className="flex justify-end gap-2"&gt;
                            &lt;Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPermissionsDialog(user)}
                              className="gap-1"
                            &gt;
                              &lt;UserCog className="h-4 w-4" /&gt;
                              Permissions
                            &lt;/Button&gt;
                            &lt;Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(user)}
                            &gt;
                              &lt;Pencil className="h-4 w-4" /&gt;
                            &lt;/Button&gt;
                            &lt;Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id, user.email)}
                              className="text-red-600 hover:text-red-700"
                            &gt;
                              &lt;Trash2 className="h-4 w-4" /&gt;
                            &lt;/Button&gt;
                          &lt;/div&gt;
                        &lt;/TableCell&gt;
                      &lt;/TableRow&gt;
                    ))
                  )}
                &lt;/TableBody&gt;
              &lt;/Table&gt;
            &lt;/div&gt;
          &lt;/CardContent&gt;
        &lt;/Card&gt;

        {/* Create/Edit User Dialog */}
        &lt;Dialog open={dialogOpen} onOpenChange={setDialogOpen}&gt;
          &lt;DialogContent className="sm:max-w-[500px]"&gt;
            &lt;DialogHeader&gt;
              &lt;DialogTitle&gt;{editingUser ? "Edit User" : "Create New User"}&lt;/DialogTitle&gt;
              &lt;DialogDescription&gt;
                {editingUser
                  ? "Update user information and role"
                  : "Create a new user account with email and password"}
              &lt;/DialogDescription&gt;
            &lt;/DialogHeader&gt;
            &lt;form onSubmit={handleSubmit}&gt;
              &lt;div className="space-y-4 py-4"&gt;
                &lt;div className="space-y-2"&gt;
                  &lt;Label htmlFor="email"&gt;Email *&lt;/Label&gt;
                  &lt;Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                    placeholder="user@example.com"
                  /&gt;
                &lt;/div&gt;

                {!editingUser &amp;&amp; (
                  &lt;div className="space-y-2"&gt;
                    &lt;Label htmlFor="password"&gt;Password *&lt;/Label&gt;
                    &lt;Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      placeholder="Minimum 6 characters"
                    /&gt;
                  &lt;/div&gt;
                )}

                &lt;div className="space-y-2"&gt;
                  &lt;Label htmlFor="full_name"&gt;Full Name&lt;/Label&gt;
                  &lt;Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                  /&gt;
                &lt;/div&gt;

                &lt;div className="space-y-2"&gt;
                  &lt;Label htmlFor="role"&gt;Role *&lt;/Label&gt;
                  &lt;Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}&gt;
                    &lt;SelectTrigger&gt;
                      &lt;SelectValue /&gt;
                    &lt;/SelectTrigger&gt;
                    &lt;SelectContent&gt;
                      {ROLES.map(role => (
                        &lt;SelectItem key={role} value={role} className="capitalize"&gt;
                          {role}
                        &lt;/SelectItem&gt;
                      ))}
                    &lt;/SelectContent&gt;
                  &lt;/Select&gt;
                &lt;/div&gt;
              &lt;/div&gt;
              &lt;DialogFooter&gt;
                &lt;Button type="button" variant="outline" onClick={() => setDialogOpen(false)}&gt;
                  Cancel
                &lt;/Button&gt;
                &lt;Button type="submit"&gt;
                  {editingUser ? "Update User" : "Create User"}
                &lt;/Button&gt;
              &lt;/DialogFooter&gt;
            &lt;/form&gt;
          &lt;/DialogContent&gt;
        &lt;/Dialog&gt;

        {/* Permissions Dialog */}
        &lt;Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}&gt;
          &lt;DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"&gt;
            &lt;DialogHeader&gt;
              &lt;DialogTitle&gt;Manage Permissions&lt;/DialogTitle&gt;
              &lt;DialogDescription&gt;
                {editingUser &amp;&amp; `Configure permissions for ${editingUser.email} (${editingUser.role})`}
              &lt;/DialogDescription&gt;
            &lt;/DialogHeader&gt;

            &lt;Tabs defaultValue={Object.keys(groupPermissionsByModule())[0]} className="w-full"&gt;
              &lt;TabsList className="grid w-full grid-cols-3"&gt;
                {Object.keys(groupPermissionsByModule()).map(module => (
                  &lt;TabsTrigger key={module} value={module} className="capitalize"&gt;
                    {module}
                  &lt;/TabsTrigger&gt;
                ))}
              &lt;/TabsList&gt;

              {Object.entries(groupPermissionsByModule()).map(([module, perms]) => (
                &lt;TabsContent key={module} value={module} className="space-y-4"&gt;
                  &lt;div className="space-y-3"&gt;
                    {perms.map((perm) => (
                      &lt;div key={perm.id} className="flex items-start space-x-3 p-3 rounded-lg border"&gt;
                        &lt;Checkbox
                          id={perm.id}
                          checked={selectedPermissions.includes(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                        /&gt;
                        &lt;div className="flex-1"&gt;
                          &lt;Label htmlFor={perm.id} className="font-medium cursor-pointer"&gt;
                            {perm.action}
                          &lt;/Label&gt;
                          &lt;p className="text-sm text-muted-foreground mt-1"&gt;
                            {perm.description}
                          &lt;/p&gt;
                        &lt;/div&gt;
                      &lt;/div&gt;
                    ))}
                  &lt;/div&gt;
                &lt;/TabsContent&gt;
              ))}
            &lt;/Tabs&gt;

            &lt;DialogFooter&gt;
              &lt;Button type="button" variant="outline" onClick={() => setPermissionsDialogOpen(false)}&gt;
                Cancel
              &lt;/Button&gt;
              &lt;Button onClick={handleSavePermissions}&gt;
                Save Permissions
              &lt;/Button&gt;
            &lt;/DialogFooter&gt;
          &lt;/DialogContent&gt;
        &lt;/Dialog&gt;
      &lt;/div&gt;
    &lt;/Layout&gt;
  );
}
