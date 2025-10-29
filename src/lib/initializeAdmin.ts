import { getStorageData, setStorageData, STORAGE_KEYS } from "./storage";
import { User, ALL_PERMISSIONS } from "@/types";

export const initializeAdmin = () => {
  if (typeof window === 'undefined') return;

  const users = getStorageData<User[]>(STORAGE_KEYS.USERS);

  if (!users || users.length === 0) {
    const adminUser: User = {
      id: 'admin_user_01',
      name: 'Admin User',
      email: 'admin@khulisapp.com',
      role: 'Admin',
      isActive: true,
      authMethod: 'password',
      passwordHash: 'password123', // Default insecure password
      permissions: ALL_PERMISSIONS.Admin,
    };
    setStorageData<User[]>(STORAGE_KEYS.USERS, [adminUser]);
    console.log('Default admin user created.');
  } else {
    // Ensure existing admin has full permissions if they were updated
    const adminUser = users.find(u => u.role === 'Admin');
    if (adminUser && JSON.stringify(adminUser.permissions) !== JSON.stringify(ALL_PERMISSIONS.Admin)) {
      const updatedUsers = users.map(u => 
        u.id === adminUser.id ? { ...u, permissions: ALL_PERMISSIONS.Admin } : u
      );
      setStorageData(STORAGE_KEYS.USERS, updatedUsers);
      console.log('Admin user permissions updated.');
    }
  }
};
