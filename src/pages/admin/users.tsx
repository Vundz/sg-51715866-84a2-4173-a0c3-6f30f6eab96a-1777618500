
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/lib/storage";
import { User, UserPermissions, ModulePermission } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { initializeDefaultAdmin } from "@/lib/initializeAdmin";
import { AlertCircle, Shield, UserPlus, Home } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { isAuthenticated, hasPermission, user: currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      await initializeDefaultAdmin();
      loadUsers();
    };
    initialize();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !hasPermission("admin", "read")) {
      router.push("/");
    }
  }, [isAuthenticated, hasPermission, router]);

  const loadUsers = () => {
    const storedUsers = getStorageData<User[]>(STORAGE_KEYS.USERS) || [];
    setUsers(storedUsers);
  };

  const handleSave = async (userData: Omit<User, "id" | "createdAt" | "lastLogin">) => {
    let updatedUsers: User[];

    if (editingUser) {
      updatedUsers = users.map(u =>
        u.id === editingUser.id
          ? { ...userData, id: u.id, createdAt: u.createdAt, lastLogin: u.lastLogin }
          : u
      );
    } else {
      const newUser: User = {
        ...userData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      updatedUsers = [...users, newUser];
    }

    setUsers(updatedUsers);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (currentUser?.id === id) {
      alert("You cannot delete your own account.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this user?")) {
      const updatedUsers = users.filter(u => u.id !== id);
      setUsers(updatedUsers);
      setStorageData(STORAGE_KEYS.USERS, updatedUsers);
    }
  };

  const toggleUserStatus = (userId: string) => {
    if (currentUser?.id === userId) {
      alert("You cannot deactivate your own account.");
      return;
    }

    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    );
    setUsers(updatedUsers);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/")}>
            <Home className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage user access and permissions</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            </DialogHeader>
            <UserForm onSubmit={handleSave} initialData={editingUser} />
          </DialogContent>
        </Dialog>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Default admin credentials: <strong>admin@khulisapp.com</strong> / <strong>admin123</strong>
          {" "}(Change password after first login)
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Auth Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={user.authMethod === "gmail" ? "default" : "secondary"}>
                        {user.authMethod === "gmail" ? "Gmail" : "Password"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={() => toggleUserStatus(user.id)}
                          disabled={currentUser?.id === user.id}
                        />
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={currentUser?.id === user.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No users found. The default admin will be created automatically.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface UserFormProps {
  onSubmit: (data: Omit<User, "id" | "createdAt" | "lastLogin">) => void;
  initialData?: User | null;
}

function UserForm({ onSubmit, initialData }: UserFormProps) {
  const emptyPermissions: UserPermissions = {
    plantTypes: { create: false, read: false, update: false, delete: false },
    plantings: { create: false, read: false, update: false, delete: false },
    harvests: { create: false, read: false, update: false, delete: false },
    locations: { create: false, read: false, update: false, delete: false },
    treatments: { create: false, read: false, update: false, delete: false },
    reports: { create: false, read: false, update: false, delete: false },
    admin: { create: false, read: false, update: false, delete: false },
  };

  const [formData, setFormData] = useState({
    email: initialData?.email || "",
    name: initialData?.name || "",
    authMethod: (initialData?.authMethod || "password") as "password" | "gmail",
    password: "",
    role: initialData?.role || "",
    permissions: initialData?.permissions || emptyPermissions,
    isActive: initialData?.isActive ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (
    module: keyof UserPermissions,
    action: keyof ModulePermission,
    value: boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.name || !formData.role) {
      alert("Please fill in all required fields.");
      return;
    }

    if (formData.authMethod === "password" && !initialData && !formData.password) {
      alert("Please provide a password for password authentication.");
      return;
    }

    let passwordHash: string | undefined;
    if (formData.authMethod === "password" && formData.password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(formData.password);
      const hash = await crypto.subtle.digest("SHA-256", data);
      passwordHash = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    }

    onSubmit({
      email: formData.email,
      name: formData.name,
      authMethod: formData.authMethod,
      passwordHash: formData.authMethod === "password" ? passwordHash : undefined,
      role: formData.role,
      permissions: formData.permissions,
      isActive: formData.isActive,
    });
  };

  const moduleNames: { key: keyof UserPermissions; label: string }[] = [
    { key: "plantTypes", label: "Plant Types" },
    { key: "plantings", label: "Plantings" },
    { key: "harvests", label: "Harvests" },
    { key: "locations", label: "Locations" },
    { key: "treatments", label: "Treatments" },
    { key: "reports", label: "Reports" },
    { key: "admin", label: "Admin" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="e.g., Manager, Supervisor, Operator"
                required
              />
            </div>

            <div>
              <Label htmlFor="authMethod">Authentication Method</Label>
              <Select
                name="authMethod"
                value={formData.authMethod}
                onValueChange={value => handleSelectChange("authMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="gmail">Gmail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.authMethod === "password" && (
            <div>
              <Label htmlFor="password">
                Password {!initialData && "*"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={initialData ? "Leave blank to keep current" : "Enter password"}
                required={!initialData}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={value => setFormData(prev => ({ ...prev, isActive: value }))}
            />
            <Label htmlFor="isActive">Account Active</Label>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure module-level permissions for this user. Check the boxes to grant access.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {moduleNames.map(({ key, label }) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-base">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {(["create", "read", "update", "delete"] as const).map(action => (
                      <div key={action} className="flex items-center gap-2">
                        <Switch
                          id={`${key}-${action}`}
                          checked={formData.permissions[key][action]}
                          onCheckedChange={value => handlePermissionChange(key, action, value)}
                        />
                        <Label htmlFor={`${key}-${action}`} className="capitalize">
                          {action}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit">Save User</Button>
      </div>
    </form>
  );
}
