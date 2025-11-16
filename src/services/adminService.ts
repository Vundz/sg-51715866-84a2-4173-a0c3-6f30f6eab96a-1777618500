
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Create a new user with email and password
   */
  async createUser(email: string, password: string, fullName: string, role: UserRole): Promise<Profile> {
    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        throw new Error("A user with this email already exists.");
      }
      throw authError;
    }
    if (!authData.user) throw new Error("Failed to create user");

    // The handle_new_user trigger creates a profile with role 'viewer'.
    // We must update it to the desired role.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName,
        role: role 
      })
      .eq("id", authData.user.id)
      .select()
      .single();

    if (profileError) {
      console.error("Error updating profile after sign-up:", profileError);
      throw new Error(`User was created, but failed to set role. Please edit the user manually. Error: ${profileError.message}`);
    }
    return profileData;
  },

  /**
   * Update user role and details
   */
  async updateUser(userId: string, updates: Partial<Pick<Profile, "full_name" | "role">>): Promise<Profile> {
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
   * Delete a user's profile.
   * NOTE: This does NOT delete the auth.users record.
   * For full user deletion, you need to call an edge function with the service_role key.
   */
  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;
    // Here you would typically also call an edge function to delete the auth user
    // e.g., await supabase.functions.invoke('delete-user', { body: { userId } })
    return true;
  },

  /**
   * Reset user password (admin only)
   * Sends a password reset email to the user
   */
  async resetUserPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return true;
  },

  /**
   * Set user password directly (admin only)
   * Manual password reset without email
   */
  async setUserPassword(userId: string, newPassword: string): Promise<boolean> {
    // Validate password strength
    const strengthResult = this.validatePasswordStrength(newPassword);
    if (strengthResult.strength === "weak") {
      throw new Error("Password is too weak. Please use a stronger password.");
    }

    // Check password history (prevent reuse)
    const notInHistory = await this.checkPasswordHistory(userId, newPassword);
    if (!notInHistory) {
      throw new Error("This password was recently used. Please choose a different password.");
    }

    // Update password using Supabase Admin API
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;

    // Store in password history
    await this.storePasswordHistory(userId, newPassword); // In production, hash this

    return true;
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

  async ensureDefaultAdmin(): Promise<void> {
    try {
      const { data: existingAdmin, error: findError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", "admin@khulisapp.com")
        .single();

      if (findError && findError.code !== 'PGRST116') throw findError;
      
      if (existingAdmin) {
        if (existingAdmin.role !== 'admin') {
          await this.updateUser(existingAdmin.id, { role: 'admin' });
        }
        return;
      }
      
      await this.createUser("admin@khulisapp.com", "Spawniad8!", "System Administrator", "admin");

    } catch (error) {
      console.error("Error ensuring default admin exists:", error);
    }
  },
};
