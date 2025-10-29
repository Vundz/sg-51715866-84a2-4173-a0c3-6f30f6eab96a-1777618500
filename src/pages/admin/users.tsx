import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, UserPlus, AlertCircle } from "lucide-react";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";
import { User, UserRole, PermissionAction, UserPermissions, ALL_PERMISSIONS } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "@/components/ui/alert";


export default function AdminUsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canCreate = hasPermission("admin", "create");
  const canEdit = hasPermission("admin", "update");
  const canDelete = hasPermission("admin", "delete");
  const canView = hasPermission("admin", "read");

  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(ALL_PERMISSIONS.Viewer);

  useEffect(() => {
    if (canView) {
      const existingUsers = getStorageData<User[]>(STORAGE_KEYS.USERS) || [];
      setUsers(existingUsers);
    }
  }, [canView]);

  const handleOpenDialog = (user: User | null = null) => {
    if (user) {
      if (!canEdit) return;
      setEditingUser(user);
      setFormData(user);
      setUserPermissions(user.permissions);
    } else {
      if (!canCreate) return;
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        role: "Viewer",
        isActive: true,
        authMethod: "password",
      });
      setUserPermissions(ALL_PERMISSIONS.Viewer);
    }
    setIsDialogOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({ ...prev, role }));
    setUserPermissions(ALL_PERMISSIONS[role]);
  };

  const handlePermissionChange = (
    module: keyof UserPermissions,
    action: PermissionAction,
    value: boolean
  ) => {
    setUserPermissions(prev => {
      const newPerms = { ...prev };
      if (typeof newPerms[module] === 'object') {
        (newPerms[module] as Record<PermissionAction, boolean>)[action] = value;
      }
      return newPerms;
    });
  };

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingUser && !canEdit) return;
    if (!editingUser && !canCreate) return;

    let updatedUsers: User[] = [];
    if (editingUser) {
      updatedUsers = users.map(u =>
        u.id === editingUser.id
          ? { ...editingUser, ...formData, permissions: userPermissions }
          : u
      );
    } else {
      const newUser: User = {
        id: generateId("user"),
        name: formData.name || "",
        email: formData.email || "",
        role: formData.role || "Viewer",
        isActive: formData.isActive !== false,
        authMethod: "password",
        passwordHash: formData.passwordHash || "password123", // Demo password
        permissions: userPermissions,
      };
      updatedUsers = [...users, newUser];
    }
    setUsers(updatedUsers);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);
    setIsDialogOpen(false);
  };

  const handleDeleteUser = (userId: string) => {
    if (!canDelete || userId === currentUser?.id) return;
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);
  };

  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <p>You do not have permission to view this page.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users and their permissions for the application.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => handleOpenDialog()}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            A list of all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'outline'}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && user.id !== currentUser?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user details and permissions."
                : "Create a new user and set their role and permissions."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">User Details</h3>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              {!editingUser && (
                 <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                    id="password"
                    type="password"
                    placeholder="Enter a temporary password"
                    onChange={e =>
                        setFormData({ ...formData, passwordHash: e.target.value })
                    }
                    required
                    />
                </div>
              )}
              <div>
                <Label htmlFor="role">Role</Label>
                 <Select
                    value={formData.role}
                    onValueChange={(value: UserRole) => handleRoleChange(value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(ALL_PERMISSIONS).map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
               <div className="flex items-center space-x-2">
                <Switch 
                    id="isActive"
                    checked={formData.isActive !== false}
                    onCheckedChange={checked => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="isActive">User Active</Label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Permissions</h3>
              <Card className="max-h-[400px] overflow-y-auto">
                  <CardContent className="p-4 space-y-4">
                     {Object.entries(userPermissions).map(([module, perms]) => (
                        <div key={module}>
                            <h4 className="font-semibold capitalize mb-2">{module.replace(/([A-Z])/g, ' $1')}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {typeof perms === 'object' && Object.entries(perms).map(([action, allowed]) => (
                                    <div key={action} className="flex items-center space-x-2">
                                        <Switch
                                            id={`${module}-${action}`}
                                            checked={allowed}
                                            onCheckedChange={value => handlePermissionChange(module as keyof UserPermissions, action as PermissionAction, value)}
                                            disabled={formData.role !== 'Custom'}
                                        />
                                        <Label htmlFor={`${module}-${action}`} className="capitalize">{action}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                  </CardContent>
              </Card>
            </div>
             <DialogFooter className="col-span-1 md:col-span-2">
                <Button type="submit">Save User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
