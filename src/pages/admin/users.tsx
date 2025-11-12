
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminService } from "@/services/adminService";
import { Plus, Pencil, Trash2, Shield, AlertCircle, CheckCircle2, UserCog, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

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
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    email: "", password: "", full_name: "", role: "viewer"
  });

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
      const [usersData, permsData, initAdminPromise] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllPermissions(),
        adminService.ensureDefaultAdmin()
      ]);
      setUsers(usersData);
      setPermissions(permsData);
      const permsMap: Record<string, string[]> = {};
      for (const u of usersData) {
        permsMap[u.id] = await adminService.getUserPermissions(u.id);
      }
      setUserPermissions(permsMap);
    } catch (err: any) {
      setError(err.message || "Failed to load page data.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: Profile) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email || "",
        password: "",
        full_name: user.full_name || "",
        role: user.role || "viewer",
      });
    } else {
      setEditingUser(null);
      setFormData({ email: "", password: "", full_name: "", role: "viewer" });
    }
    setError(null);
    setSuccess(null);
    setDialogOpen(true);
  };

  const handleOpenPermissionsDialog = async (user: Profile) => {
    setSelectedUserId(user.id);
    setEditingUser(user);
    setSelectedPermissions(userPermissions[user.id] || []);
    setPermissionsDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role,
        });
        setSuccess("User updated successfully!");
      } else {
        if (!formData.password) {
          setError("Password is required for new users.");
          return;
        }
        await adminService.createUser(formData.email, formData.password, formData.full_name, formData.role);
        setSuccess("User created successfully!");
      }
      await loadData();
      setTimeout(() => { setDialogOpen(false); setSuccess(null); }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save user.");
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
      setTimeout(() => { setPermissionsDialogOpen(false); setSuccess(null); }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save permissions.");
    }
  };

  const handleDelete = async (userId: string, userEmail: string | null) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail || 'with ID ' + userId}? This action is irreversible.`)) return;
    setError(null);
    try {
      await adminService.deleteUser(userId);
      setSuccess("User deleted successfully!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete user.");
    }
  };
  
  const getRoleBadgeColor = (role: UserRole | null) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "staff": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const groupPermissionsByModule = () => {
    return permissions.reduce((acc, perm) => {
      const permModule = perm.module || "general";
      if (!acc[permModule]) acc[permModule] = [];
      acc[permModule].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  };
  
  const groupedPermissions = groupPermissionsByModule();

  if (authLoading || loading) {
    return <Layout><div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div></Layout>;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto mt-10 flex justify-center">
          <Card className="max-w-md">
            <CardHeader><CardTitle className="text-red-600 flex items-center gap-2"><AlertCircle/>Access Denied</CardTitle></CardHeader>
            <CardContent><p>You must be an administrator to view this page.</p></CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="h-8 w-8" />Admin Console</h1>
            <p className="text-muted-foreground mt-1">Manage users, roles, and permissions.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2"><Plus className="h-4 w-4" />Add User</Button>
        </div>

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        {success && <Alert className="border-green-500"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-600">{success}</AlertDescription></Alert>}

        <Card>
          <CardHeader><CardTitle>All Users</CardTitle><CardDescription>Total users: {users.length}</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Full Name</TableHead><TableHead>Role</TableHead><TableHead>Permissions</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.length > 0 ? users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.full_name || "-"}</TableCell>
                    <TableCell><Badge className={getRoleBadgeColor(u.role)}>{u.role}</Badge></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{userPermissions[u.id]?.length || 0} permissions</span></TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenPermissionsDialog(u)}><UserCog className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(u)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id, u.email)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={!!editingUser} />
              </div>
              {!editingUser && <div className="space-y-2"><Label htmlFor="password">Password *</Label><Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div>}
              <div className="space-y-2"><Label htmlFor="full_name">Full Name</Label><Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingUser ? "Update User" : "Create User"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Manage Permissions for {editingUser?.email}</DialogTitle></DialogHeader>
            <Tabs defaultValue={Object.keys(groupedPermissions)[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {Object.keys(groupedPermissions).map(m => <TabsTrigger key={m} value={m} className="capitalize">{m}</TabsTrigger>)}
              </TabsList>
              {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                <TabsContent key={moduleName} value={moduleName} className="space-y-2 mt-4">
                  {perms.map((p) => (
                    <div key={p.id} className="flex items-center space-x-3 rounded-lg border p-3">
                      <Checkbox id={p.id} checked={selectedPermissions.includes(p.id)} onCheckedChange={() => setSelectedPermissions(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} />
                      <div><Label htmlFor={p.id} className="font-medium cursor-pointer">{p.action}</Label><p className="text-sm text-muted-foreground">{p.description}</p></div>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPermissionsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePermissions}>Save Permissions</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
