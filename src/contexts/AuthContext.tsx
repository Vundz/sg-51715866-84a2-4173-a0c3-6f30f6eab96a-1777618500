"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from "@/services/authService";
import { adminService } from "@/services/adminService";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      console.log("AuthContext: Checking auth status...");
      
      const currentUser = await authService.getCurrentUser();
      console.log("AuthContext: Current user:", currentUser);
      
      setUser(currentUser);
      
      if (currentUser) {
        const adminStatus = await adminService.isAdmin(currentUser.id);
        console.log("AuthContext: Admin status:", adminStatus);
        setIsAdmin(adminStatus);
      } else {
        console.log("AuthContext: No user found, setting isAdmin to false");
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("AuthContext: Error checking auth status:", error);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
      console.log("AuthContext: Auth check complete");
    }
  };
  
  useEffect(() => {
    console.log("AuthContext: Initial mount, checking auth status");
    checkAuthStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("AuthContext: Auth state changed:", event, session?.user?.email);
        checkAuthStatus();
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin,
    loading,
    checkAuthStatus
  };

  console.log("AuthContext: Current state:", { 
    userEmail: user?.email, 
    isAuthenticated: !!user, 
    isAdmin, 
    loading 
  });

  return (
    <AuthContext.Provider value={value}>
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
