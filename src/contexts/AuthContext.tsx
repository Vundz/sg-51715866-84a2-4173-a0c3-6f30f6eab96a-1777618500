import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/router";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/lib/storage";
import { User, AuthSession, UserPermissions } from "@/types";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: keyof UserPermissions, right: keyof UserPermissions[keyof UserPermissions]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const activeSession = getStorageData<AuthSession>(STORAGE_KEYS.SESSION);
    if (activeSession && new Date(activeSession.expiresAt) > new Date()) {
      setSession(activeSession);
      const allUsers = getStorageData<User[]>(STORAGE_KEYS.USERS) || [];
      const loggedInUser = allUsers.find(u => u.id === activeSession.userId);
      if (loggedInUser) {
        setUser(loggedInUser);
      } else {
        // Session is invalid if user not found
        logout();
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const allUsers = getStorageData<User[]>(STORAGE_KEYS.USERS) || [];
    const foundUser = allUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.isActive
    );

    if (foundUser) {
      // In a real app, you'd use a library like bcrypt to compare hashes
      // For this demo, we'll use a simple comparison.
      if (foundUser.authMethod === 'password' && foundUser.passwordHash === password) {
        const expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 24-hour session
        const newSession: AuthSession = {
          sessionId: `sess_${new Date().getTime()}`,
          userId: foundUser.id,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString()
        };

        setUser(foundUser);
        setSession(newSession);
        setStorageData(STORAGE_KEYS.SESSION, newSession);
        
        router.push("/");
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    router.push("/auth/login");
  };

  const hasPermission = (
    module: keyof UserPermissions,
    right: keyof UserPermissions[keyof UserPermissions]
  ): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    const modulePermissions = user.permissions[module];
    if (!modulePermissions) {
      return false; // Module not defined for user role
    }
    if (typeof modulePermissions === 'boolean') {
      return modulePermissions; // Handle "all" or "none" for the module
    }
    return modulePermissions[right] === true;
  };

  const isAuthenticated = !!session && !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, session, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
