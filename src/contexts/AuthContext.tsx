
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, AuthSession, UserPermissions } from "@/types";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  permissions: UserPermissions | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (module: keyof UserPermissions, action: keyof UserPermissions[keyof UserPermissions]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedSession = getStorageData<AuthSession>(STORAGE_KEYS.AUTH_SESSION);
    if (storedSession && new Date(storedSession.expiresAt) > new Date()) {
      setSession(storedSession);
      const users = getStorageData<User[]>(STORAGE_KEYS.USERS) || [];
      const currentUser = users.find(u => u.id === storedSession.userId);
      if (currentUser) {
        setUser(currentUser);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = getStorageData<User[]>(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.email === email && u.isActive);

    if (!user) {
      return false;
    }

    if (user.authMethod === "password") {
      const hashedPassword = await hashPassword(password);
      if (user.passwordHash !== hashedPassword) {
        return false;
      }
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newSession: AuthSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      permissions: user.permissions,
      expiresAt: expiresAt.toISOString(),
    };

    setSession(newSession);
    setUser(user);
    setStorageData(STORAGE_KEYS.AUTH_SESSION, newSession);

    const updatedUsers = users.map(u =>
      u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
    );
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);

    return true;
  };

  const logout = () => {
    setSession(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  };

  const hasPermission = (
    module: keyof UserPermissions,
    action: keyof UserPermissions[keyof UserPermissions]
  ): boolean => {
    if (!session || !session.permissions) return false;
    return session.permissions[module][action] === true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        permissions: session?.permissions || null,
        login,
        logout,
        isAuthenticated: !!session,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
