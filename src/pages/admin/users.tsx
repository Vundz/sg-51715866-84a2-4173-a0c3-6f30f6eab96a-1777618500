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

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
}

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
  role: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    full_name: "",
    role: "user"
  });

  // Route protection: redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
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
      const permsMap: Record<string, string[]> = {};
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
    if (user) {
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
        role: "user"
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const groupPermissionsByModule = () => {
    const grouped: Record<string, Permission[]> = {};
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
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Checking permissions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-6 w-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You don't have permission to access this page. Admin privileges required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm">Current user: {user?.email || "Not signed in"}</p>
                <p className="text-sm">Role: {user?.role || "No role"}</p>
                <Button onClick={() => router.push("/")} className="w-full">
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage users, roles, and permissions</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Total users: {users.length} | Default admin: admin@khulisapp.com (password: Spawniad8!)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found. Click "Add User" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {userPermissions[user.id]?.length || 0} permissions
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPermissionsDialog(user)}
                              className="gap-1"
                            >
                              <UserCog className="h-4 w-4" />
                              Permissions
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id, user.email)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Update user information and role"
                  : "Create a new user account with email and password"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                    placeholder="user@example.com"
                  />
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? "Update User" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Permissions</DialogTitle>
              <DialogDescription>
                {editingUser && `Configure permissions for ${editingUser.email} (${editingUser.role})`}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue={Object.keys(groupPermissionsByModule())[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {Object.keys(groupPermissionsByModule()).map(module => (
                  <TabsTrigger key={module} value={module} className="capitalize">
                    {module}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(groupPermissionsByModule()).map(([module, perms]) => (
                <TabsContent key={module} value={module} className="space-y-4">
                  <div className="space-y-3">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                        <Checkbox
                          id={perm.id}
                          checked={selectedPermissions.includes(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={perm.id} className="font-medium cursor-pointer">
                            {perm.action}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePermissions}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
