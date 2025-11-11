import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
  avatar_url?: string;
}

// Helper function to get the correct redirect URL based on environment
const getRedirectURL = () => {
  if (typeof window === "undefined") return "";
  
  const url = new URL(window.location.href);
  
  // For Vercel preview deployments
  if (url.hostname.includes("vercel.app")) {
    return `${url.origin}/`;
  }
  
  // For local development
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return `http://localhost:3000/`;
  }
  
  // For production domain
  return `${url.origin}/`;
};

export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("No user data returned");

    // Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      id: data.user.id,
      email: data.user.email || "",
      role: profile?.role || "user",
      full_name: profile?.full_name || "",
      avatar_url: profile?.avatar_url || "",
    };
  },

  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, fullName?: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectURL(),
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("No user data returned");

    // Profile will be created automatically via database trigger
    return {
      id: data.user.id,
      email: data.user.email || "",
      role: "user",
      full_name: fullName || "",
    };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;

    // Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) return null;

    return {
      id: user.id,
      email: user.email || "",
      role: profile?.role || "user",
      full_name: profile?.full_name || "",
      avatar_url: profile?.avatar_url || "",
    };
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Reset password request
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getRedirectURL()}reset-password`,
    });
    if (error) throw error;
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: updates.full_name,
        avatar_url: updates.avatar_url,
      })
      .eq("id", userId);

    if (error) throw error;
  },
};
