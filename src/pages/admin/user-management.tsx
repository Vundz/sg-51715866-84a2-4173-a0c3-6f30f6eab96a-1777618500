
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminService } from "@/services/adminService";
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Loader2, Users, Key, KeyRound } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

interface FormData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

const ROLES: UserRole[] = ["admin", "manager", "staff", "viewer"];

export default function UserManagementPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<Profile | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    full_name: "",
    role: "viewer"
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await adminService.getAllUsers();
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
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
        await adminService.createUser(
          formData.email,
          formData.password,
          formData.full_name,
          formData.role
        );
        setSuccess("User created successfully!");
      }
      await loadUsers();
      setTimeout(() => {
        setDialogOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save user.");
    }
  };

  const handleDelete = async (userId: string, userEmail: string | null) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail || userId}?`)) return;
    setError(null);
    try {
      await adminService.deleteUser(userId);
      setSuccess("User deleted successfully!");
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete user.");
    }
  };

  const handleOpenResetPasswordDialog = (user: Profile) => {
    setSelectedUserForReset(user);
    setError(null);
    setSuccess(null);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUserForReset?.email) {
      setError("User email not found.");
      return;
    }

    setResettingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      await adminService.resetUserPassword(selectedUserForReset.email);
      setSuccess(`Password reset email sent to ${selectedUserForReset.email}`);
      setTimeout(() => {
        setResetPasswordDialogOpen(false);
        setSuccess(null);
        setSelectedUserForReset(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setResettingPassword(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole | null) => {
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
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, suspend, and manage user accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/roles-permissions")}
            className="gap-2"
          >
            <Key className="h-4 w-4" />
            Roles & Permissions
          </Button>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Total users: {users.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.full_name || "-"}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(u.role)}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(u)}
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenResetPasswordDialog(u)}
                          title="Reset password"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(u.id, u.email)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Create New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user details and role assignment"
                : "Create a new user account with email and password"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
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
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  placeholder="Minimum 8 characters"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Send a password reset email to this user
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserForReset && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User Email</Label>
                <p className="text-sm font-medium">{selectedUserForReset.email}</p>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <p className="text-sm">{selectedUserForReset.full_name || "N/A"}</p>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A password reset link will be sent to the user's email address. 
                  They will be able to set a new password using this link.
                </AlertDescription>
              </Alert>
            </div>
          )}

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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setSelectedUserForReset(null);
              }}
              disabled={resettingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="gap-2"
            >
              {resettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Reset Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
