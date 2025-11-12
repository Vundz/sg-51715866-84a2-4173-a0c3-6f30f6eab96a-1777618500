"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (password: string, email: string) => Promise<any>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("AuthContext: Auth state changed:", event, session?.user?.email);
        setAuthData(session?.user);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const setAuthData = async (sessionUser: User | null) => {
    setUser(sessionUser);
    if (sessionUser) {
      const userProfile = await authService.getProfile(sessionUser.id);
      setProfile(userProfile);
      setIsAdmin(userProfile?.role === "admin");
    } else {
      setProfile(null);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  const value = {
    user,
    profile,
    loading,
    login: authService.login,
    logout: authService.logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
