
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type UserRole = "admin" | "manager" | "staff" | "viewer";

export interface UserWithRole extends Profile {
  role: UserRole;
}

export const userManagementService = {
  /**
   * Get all users with their profiles
   */
  async getAllUsers(): Promise<UserWithRole[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as UserWithRole[];
  },

  /**
   * Create a new user with email/password and assign a role
   */
  async createUser(email: string, password: string, fullName: string, role: UserRole = "viewer"): Promise<{ user: any; profile: Profile }> {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("User creation failed");

    // Create or update profile with role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
      })
      .select()
      .single();

    if (profileError) throw profileError;

    return { user: authData.user, profile };
  },

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<ProfileUpdate>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a user (admin only)
   * Note: This only deletes the profile. The auth user deletion requires admin API
   */
  async deleteUserProfile(userId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserWithRole | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as UserWithRole;
  },

  /**
   * Check if current user is admin
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await this.getUserById(user.id);
    return profile?.role === "admin";
  },

  /**
   * Get role display name
   */
  getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: "Administrator",
      manager: "Manager",
      staff: "Staff Member",
      viewer: "Viewer",
    };
    return roleNames[role] || role;
  },

  /**
   * Get role badge color
   */
  getRoleBadgeColor(role: UserRole): string {
    const colors: Record<UserRole, string> = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      staff: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      viewer: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
    return colors[role] || colors.viewer;
  },
};
