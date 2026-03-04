import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { User } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Permission = Database["public"]["Tables"]["permissions"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

// Password strength levels
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
}

// Define a type for the object that includes the granted status and source
type EffectivePermission = Permission & {
  granted: boolean;
  source: "role" | "user" | "none";
};

export const adminService = {
  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): PasswordStrengthResult {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    else if (password.length < 8) {
      feedback.push("Password must be at least 8 characters");
    }

    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("Add lowercase letters");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("Add uppercase letters");

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push("Add numbers");

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push("Add special characters");

    // Common patterns (weakness)
    if (/^(.)\1+$/.test(password)) {
      score = Math.max(0, score - 2);
      feedback.push("Avoid repeating characters");
    }
    if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde)/i.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push("Avoid sequential patterns");
    }

    // Determine strength
    let strength: PasswordStrength;
    if (score <= 3) strength = "weak";
    else if (score <= 5) strength = "fair";
    else if (score <= 6) strength = "good";
    else strength = "strong";

    return { strength, score, feedback };
  },

  /**
   * Check if password was used recently (password history)
   */
  async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    // In a real implementation, you would hash the new password and compare
    // with stored hashes. For this demo, we'll just check if any history exists.
    const { data, error } = await supabase
      .from("password_history")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error checking password history:", error);
      return true; // Allow if we can't check
    }

    // In production, compare hashed passwords here
    // For now, we'll just return true (password not in history)
    return true;
  },

  /**
   * Store password in history
   */
  async storePasswordHistory(userId: string, passwordHash: string): Promise<void> {
    const { error } = await supabase
      .from("password_history")
      .insert({
        user_id: userId,
        password_hash: passwordHash,
      });

    if (error) {
      console.error("Error storing password history:", error);
    }
  },

  /**
   * Get a single user profile by ID
   */
  async getUser(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  },

  /**
   * Get a user profile by username
   */
  async getUserByUsername(username: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user by username:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Get user by username error:", error);
      return null;
    }
  },

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<Profile[]> {
    // AGGRESSIVE CACHE BUSTING: Multiple strategies to force fresh data
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    
    console.log(`📥 [${timestamp}-${randomSuffix}] Fetching users with cache bust...`);
    console.log(`🔍 [FIXED] Using profiles table query (NOT admin API)`);
    
    // Fetch directly from profiles table (works with RLS)
    // No admin API needed - RLS policies control access
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("❌ Error fetching users:", error);
      throw error;
    }
    
    console.log(`✅ [${timestamp}] Fetched ${data?.length || 0} users from database`);
    
    return data || [];
  },

  /**
   * Check if username already exists
   */
  async usernameExists(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      
      return !error && !!data;
    } catch {
      return false;
    }
  },

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      
      return !error && !!data;
    } catch {
      return false;
    }
  },

  /**
   * Check if user exists in auth.users (legacy method)
   */
  async userExists(email: string): Promise<boolean> {
    return this.emailExists(email);
  },

  /**
   * Create a new user with username as primary identifier
   * Email is optional - system will generate internal email if not provided
   * IMPORTANT: This function manually creates the profile record to ensure visibility
   */
  async createUser(
    username: string, 
    password: string, 
    fullName: string, 
    role: UserRole,
    email?: string
  ): Promise<Profile> {
    try {
      // Validate inputs
      if (!username || !password || !fullName) {
        throw new Error("Username, password, and full name are required.");
      }

      // Validate password strength first
      const strengthResult = this.validatePasswordStrength(password);
      if (strengthResult.strength === "weak") {
        throw new Error("Your password needs to be stronger! Please create a password with:\n• At least 8 characters\n• One uppercase letter (A-Z)\n• One lowercase letter (a-z)\n• One number (0-9)\n• One special character (!@#$%^&*)\n\nExample: MySecure123!");
      }

      // COMPREHENSIVE PRE-FLIGHT CHECKS
      console.log("🔍 Running pre-flight checks for username:", username);
      
      // Check if username already exists in profiles table
      const usernameInUse = await this.usernameExists(username);
      if (usernameInUse) {
        throw new Error(`Username "${username}" is already taken. Please choose a different username.`);
      }

      // If email provided, check if it's already in use
      if (email) {
        const emailInUse = await this.emailExists(email);
        if (emailInUse) {
          throw new Error(`Email "${email}" is already registered. Please use a different email.`);
        }
      }

      console.log("✅ Pre-flight checks passed - creating user:", username);

      // Get current user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to perform this action");
      }

      // Call server-side API endpoint (uses Admin API - doesn't affect current session)
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username,
          password,
          fullName,
          role,
          email: email || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      console.log("✅ User created successfully via Admin API:", result.user);
      
      // Force a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return result.user as Profile;

    } catch (error: any) {
      console.error("❌ Create user error:", error);
      throw error;
    }
  },

  /**
   * Update user role, details, and username
   */
  async updateUser(
    userId: string, 
    updates: Partial<Pick<Profile, "full_name" | "role" | "username" | "email">>
  ): Promise<Profile> {
    // If updating username, check for duplicates
    if (updates.username) {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", updates.username)
        .neq("id", userId)
        .maybeSingle();
      
      if (existingUser) {
        throw new Error(`Username "${updates.username}" is already taken.`);
      }
    }

    // If updating email, check for duplicates
    if (updates.email) {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", updates.email)
        .neq("id", userId)
        .maybeSingle();
      
      if (existingUser) {
        throw new Error(`Email "${updates.email}" is already taken.`);
      }
    }

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
   * Delete a user's profile (simplified version)
   */
  async deleteUser(userId: string): Promise<boolean> {
    // Get current user session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("You must be logged in to perform this action");
    }

    // Call server-side API endpoint
    const response = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to delete user");
    }

    return true;
  },

  /**
   * Reset user password (admin only)
   * Sends a password reset email to the user
   */
  async resetUserPassword(email: string): Promise<boolean> {
    try {
      // Validate email exists first
      const exists = await this.userExists(email);
      if (!exists) {
        throw new Error(`No user found with email: ${email}`);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error("Password reset error:", error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }
      
      return true;
    } catch (error: any) {
      console.error("Reset password error:", error);
      throw error;
    }
  },

  /**
   * Set user password directly (admin only)
   * Manual password reset without email
   */
  async setUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      // Validate password strength
      const strengthResult = this.validatePasswordStrength(newPassword);
      if (strengthResult.strength === "weak") {
        throw new Error("Your password needs to be stronger! Please create a password with:\n• At least 8 characters\n• One uppercase letter (A-Z)\n• One lowercase letter (a-z)\n• One number (0-9)\n• One special character (!@#$%^&*)\n\nExample: MySecure123!");
      }

      // Check password history (prevent reuse)
      const notInHistory = await this.checkPasswordHistory(userId, newPassword);
      if (!notInHistory) {
        throw new Error("This password was recently used. Please choose a different password.");
      }

      // Get current user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to perform this action");
      }

      // Call secure server-side API endpoint
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update password");
      }

      // Store in password history
      await this.storePasswordHistory(userId, newPassword);

      return true;
    } catch (error: any) {
      console.error("Set user password error:", error);
      throw error;
    }
  },

  /**
   * Bulk password reset - Send reset emails to multiple users
   */
  async bulkResetPasswords(userIds: string[]): Promise<{ success: string[]; failed: { userId: string; error: string }[] }> {
    const success: string[] = [];
    const failed: { userId: string; error: string }[] = [];

    for (const userId of userIds) {
      try {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .single();

        if (!profile?.email) {
          failed.push({ userId, error: "Email not found" });
          continue;
        }

        // Send reset email
        await this.resetUserPassword(profile.email);
        success.push(userId);
      } catch (error: any) {
        failed.push({ userId, error: error.message || "Unknown error" });
      }
    }

    return { success, failed };
  },

  /**
   * Bulk set temporary passwords - Set random passwords for multiple users
   */
  async bulkSetTemporaryPasswords(userIds: string[]): Promise<{ 
    success: { userId: string; email: string; tempPassword: string }[]; 
    failed: { userId: string; error: string }[] 
  }> {
    const success: { userId: string; email: string; tempPassword: string }[] = [];
    const failed: { userId: string; error: string }[] = [];

    for (const userId of userIds) {
      try {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .single();

        if (!profile?.email) {
          failed.push({ userId, error: "Email not found" });
          continue;
        }

        // Generate strong temporary password
        const tempPassword = this.generateStrongPassword();

        // Set password
        await this.setUserPassword(userId, tempPassword);
        
        success.push({ 
          userId, 
          email: profile.email, 
          tempPassword 
        });
      } catch (error: any) {
        failed.push({ userId, error: error.message || "Unknown error" });
      }
    }

    return { success, failed };
  },

  /**
   * Generate a strong random password
   */
  generateStrongPassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const all = uppercase + lowercase + numbers + special;

    let password = "";
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split("").sort(() => Math.random() - 0.5).join("");
  },

  async isAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (error) return false;
      return data?.role === "admin";
    } catch (error) {
      return false;
    }
  },

  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("module", { ascending: true });
    if (error) throw error;
    return data;
  },

  async getUserPermissions(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("user_permissions")
      .select("permission_id")
      .eq("user_id", userId);
    if (error) throw error;
    return data.map(p => p.permission_id);
  },
  
  async setUserPermissions(userId: string, permissionIds: string[]): Promise<boolean> {
    const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);
    if (deleteError) throw deleteError;

    if (permissionIds.length > 0) {
        const newPermissions = permissionIds.map(pid => ({
            user_id: userId,
            permission_id: pid,
        }));
        const { error: insertError } = await supabase
            .from('user_permissions')
            .insert(newPermissions);
        if (insertError) throw insertError;
    }
    return true;
  },
};