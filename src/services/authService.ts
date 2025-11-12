
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    
    return profile;
  },
  
  /**
   * Sign in with email and password
   */
  async login(email: string, password: string): Promise<Profile> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("No user data returned");

    // Fetch profile data
    const profile = await this.getProfile(data.user.id);
    if (!profile) throw new Error("User profile not found.");

    return profile;
  },

  /**
   * Sign up a new user
   */
  async signup(email: string, password: string, fullName?: string): Promise<Profile> {
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

    // The profile is created by a trigger. We wait a moment and fetch it.
    // This is a workaround for the race condition where the profile might not be available immediately.
    await new Promise(res => setTimeout(res, 1000));
    const profile = await this.getProfile(data.user.id);
    if (!profile) throw new Error("User profile could not be created or found.");

    return profile;
  },

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current authenticated user's profile
   */
  async getCurrentUserProfile(): Promise<Profile | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;

    return this.getProfile(user.id);
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
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) throw error;
  },

  /**
   * Admin function to reset a user's password (requires service role)
   * This should only be called from API routes with proper authentication
   */
  async adminResetPassword(userId: string, newPassword: string): Promise<void> {
    // This requires the service role key, so it should only be called from API routes
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) throw error;
  },
};
