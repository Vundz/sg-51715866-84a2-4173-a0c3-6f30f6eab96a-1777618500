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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { adminService, PasswordStrength } from "@/services/adminService";
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Loader2, Users, Key, KeyRound, Mail, Lock, RefreshCw } from "lucide-react";
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
  const [bulkPasswordDialogOpen, setBulkPasswordDialogOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<Profile | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [resettingPassword, setResettingPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<{ strength: PasswordStrength; score: number; feedback: string[] } | null>(null);
  const [resetMethod, setResetMethod] = useState<"manual" | "email">("email");
  const [bulkResults, setBulkResults] = useState<{ success: any[]; failed: any[] } | null>(null);
  
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

  useEffect(() => {
    if (newPassword) {
      const result = adminService.validatePasswordStrength(newPassword);
      setPasswordStrength(result);
    } else {
      setPasswordStrength(null);
    }
  }, [newPassword]);

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
    setNewPassword("");
    setConfirmPassword("");
    setPasswordStrength(null);
    setResetMethod("email");
    setError(null);
    setSuccess(null);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUserForReset) return;

    setResettingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      if (resetMethod === "email") {
        if (!selectedUserForReset.email) {
          setError("User email not found.");
          return;
        }
        await adminService.resetUserPassword(selectedUserForReset.email);
        setSuccess(`Password reset email sent to ${selectedUserForReset.email}`);
      } else {
        // Manual password set
        if (!newPassword || !confirmPassword) {
          setError("Please enter and confirm the new password.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        if (passwordStrength && passwordStrength.strength === "weak") {
          setError("Password is too weak. Please use a stronger password.");
          return;
        }
        await adminService.setUserPassword(selectedUserForReset.id, newPassword);
        setSuccess("Password updated successfully!");
      }
      
      setTimeout(() => {
        setResetPasswordDialogOpen(false);
        setSuccess(null);
        setSelectedUserForReset(null);
        setNewPassword("");
        setConfirmPassword("");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleOpenBulkPasswordDialog = () => {
    if (selectedUsers.size === 0) {
      setError("Please select at least one user.");
      return;
    }
    setBulkResults(null);
    setError(null);
    setSuccess(null);
    setBulkPasswordDialogOpen(true);
  };

  const handleBulkResetPasswords = async (method: "email" | "temporary") => {
    setResettingPassword(true);
    setError(null);
    setSuccess(null);
    setBulkResults(null);

    try {
      const userIds = Array.from(selectedUsers);
      
      if (method === "email") {
        const results = await adminService.bulkResetPasswords(userIds);
        setBulkResults(results);
        setSuccess(`Reset emails sent to ${results.success.length} users`);
      } else {
        const results = await adminService.bulkSetTemporaryPasswords(userIds);
        setBulkResults(results);
        setSuccess(`Temporary passwords set for ${results.success.length} users`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to perform bulk operation.");
    } finally {
      setResettingPassword(false);
    }
  };

  const getPasswordStrengthColor = (strength: PasswordStrength) => {
    switch (strength) {
      case "weak": return "bg-red-500";
      case "fair": return "bg-orange-500";
      case "good": return "bg-yellow-500";
      case "strong": return "bg-green-500";
    }
  };

  const getPasswordStrengthValue = (strength: PasswordStrength) => {
    switch (strength) {
      case "weak": return 25;
      case "fair": return 50;
      case "good": return 75;
      case "strong": return 100;
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

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBulkPasswordDialog}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Bulk Password Reset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onCheckedChange={handleSelectAllUsers}
                  />
                </TableHead>
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
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(u.id)}
                        onCheckedChange={() => handleToggleUserSelection(u.id)}
                      />
                    </TableCell>
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
                    colSpan={6}
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Choose how to reset the password for this user
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserForReset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">User Email</Label>
                  <p className="text-sm font-medium">{selectedUserForReset.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="text-sm">{selectedUserForReset.full_name || "N/A"}</p>
                </div>
              </div>

              <Tabs value={resetMethod} onValueChange={(v) => setResetMethod(v as "manual" | "email")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email Link
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="gap-2">
                    <Lock className="h-4 w-4" />
                    Set Password
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4 mt-4">
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      A password reset link will be sent to <strong>{selectedUserForReset.email}</strong>. 
                      The user will receive an email with instructions to set a new password.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      Set a new password directly for this user. The password will be updated immediately without sending an email.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>

                  {passwordStrength && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Password Strength</Label>
                        <span className="text-xs font-medium capitalize">
                          {passwordStrength.strength}
                        </span>
                      </div>
                      <Progress 
                        value={getPasswordStrengthValue(passwordStrength.strength)} 
                        className="h-2"
                      />
                      <div className={`h-1 rounded-full ${getPasswordStrengthColor(passwordStrength.strength)}`} 
                           style={{ width: `${getPasswordStrengthValue(passwordStrength.strength)}%` }} 
                      />
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          {passwordStrength.feedback.map((fb, idx) => (
                            <li key={idx}>{fb}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Passwords do not match</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              </Tabs>
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
                setNewPassword("");
                setConfirmPassword("");
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
              {resetMethod === "email" ? "Send Reset Email" : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Password Reset Dialog */}
      <Dialog open={bulkPasswordDialogOpen} onOpenChange={setBulkPasswordDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Bulk Password Reset
            </DialogTitle>
            <DialogDescription>
              Reset passwords for {selectedUsers.size} selected user{selectedUsers.size !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Choose a method to reset passwords for all selected users
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              <Card className="cursor-pointer hover:border-blue-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 mt-0.5 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">Send Reset Email Links</h4>
                      <p className="text-sm text-muted-foreground">
                        Each user will receive a password reset email. They can set their own password.
                      </p>
                      <Button 
                        className="mt-3 w-full"
                        onClick={() => handleBulkResetPasswords("email")}
                        disabled={resettingPassword}
                      >
                        {resettingPassword ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
                        ) : (
                          <><Mail className="h-4 w-4 mr-2" /> Send Reset Emails</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-orange-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 mt-0.5 text-orange-600" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">Generate Temporary Passwords</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate strong random passwords for each user. You'll need to distribute them manually.
                      </p>
                      <Button 
                        className="mt-3 w-full"
                        variant="secondary"
                        onClick={() => handleBulkResetPasswords("temporary")}
                        disabled={resettingPassword}
                      >
                        {resettingPassword ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                        ) : (
                          <><Lock className="h-4 w-4 mr-2" /> Generate Passwords</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {bulkResults && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Operation Complete
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-green-700 dark:text-green-300">
                      ✓ Successfully processed: {bulkResults.success.length} user{bulkResults.success.length !== 1 ? "s" : ""}
                    </p>
                    {bulkResults.failed.length > 0 && (
                      <p className="text-red-700 dark:text-red-300">
                        ✗ Failed: {bulkResults.failed.length} user{bulkResults.failed.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    
                    {Array.isArray(bulkResults.success) && bulkResults.success.length > 0 && 
                     "tempPassword" in bulkResults.success[0] && (
                      <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="font-medium mb-2">Temporary Passwords:</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {bulkResults.success.map((item: any, idx: number) => (
                            <div key={idx} className="text-xs font-mono p-2 bg-gray-100 dark:bg-gray-800 rounded">
                              <span className="font-medium">{item.email}:</span> {item.tempPassword}
                            </div>
                          ))}
                        </div>
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Please save these passwords securely and distribute them to users privately. 
                            They will not be shown again.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkPasswordDialogOpen(false);
                setBulkResults(null);
                setSelectedUsers(new Set());
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
