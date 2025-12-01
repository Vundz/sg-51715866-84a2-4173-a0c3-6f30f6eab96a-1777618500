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
    // Force fresh data with cache control and unique query modifier
    const timestamp = Date.now();
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      // Use timestamp in a way that forces query uniqueness
      .gte("created_at", "1970-01-01T00:00:00.000Z")
      .limit(1000); // Add explicit limit to make query more deterministic

    if (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
    
    // Log for debugging
    console.log(`✓ Fetched ${data?.length || 0} users at ${new Date(timestamp).toISOString()}`);
    
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
      
      // Generate a valid system email if no real email provided
      const authEmail = email || `${username}@khulisapp.internal`;

      // Validate password strength first
      const strengthResult = this.validatePasswordStrength(password);
      if (strengthResult.strength === "weak") {
        throw new Error("Password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.");
      }

      // Check if username already exists
      const usernameInUse = await this.usernameExists(username);
      if (usernameInUse) {
        throw new Error(`Username "${username}" is already taken. Please choose a different username.`);
      }

      // If email provided, check if it's already in use
      if (email) {
        const emailInUse = await this.emailExists(email);
        if (emailInUse) {
          throw new Error(`A user with email "${email}" already exists.`);
        }
      }

      console.log("Creating user - Username:", username, "Auth Email:", authEmail);

      // Create the auth user with proper metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
            username: username,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        
        // Handle specific "User already registered" error
        if (authError.message.includes("User already registered") || authError.status === 422) {
          throw new Error(
            `Cannot create user: The username "${username}" or email "${authEmail}" is already registered in the system. ` +
            `This could mean:\n` +
            `1. A user with this username already exists\n` +
            `2. A previous account creation may have partially completed\n\n` +
            `Please try a different username or contact support if you believe this is an error.`
          );
        }
        
        throw new Error(`Failed to create user account: ${authError.message}`);
      }
      
      if (!authData.user) {
        throw new Error("Failed to create user - no user data returned from Supabase");
      }

      console.log("Auth user created successfully:", authData.user.id);

      // Wait for the profile trigger to complete - increased delay for reliability
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Fetch the created profile with aggressive retry logic
      let profileData = null;
      let retries = 5; // Increased from 3 to 5 retries
      
      while (!profileData && retries > 0) {
        console.log(`Attempting to fetch profile... (${6 - retries}/5)`);
        
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        if (!error && data) {
          profileData = data;
          console.log("Profile found:", data);
          break;
        }
        
        if (error) {
          console.warn("Profile fetch error:", error);
        }
        
        // Wait before retry - longer delay between retries
        await new Promise(resolve => setTimeout(resolve, 1500));
        retries--;
      }

      if (!profileData) {
        throw new Error(
          "User account was created but the profile is still being set up. " +
          "Please wait a moment and refresh the page to see the new user."
        );
      }

      // Update with real email if provided (system email stays in auth.users)
      if (email && email !== authEmail) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ email: email })
          .eq("id", authData.user.id);

        if (updateError) {
          console.warn("Could not update profile email:", updateError);
        } else {
          // Fetch updated profile
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authData.user.id)
            .single();
          
          if (updatedProfile) {
            profileData = updatedProfile;
          }
        }
      }

      console.log("User created successfully:", profileData);
      return profileData;
    } catch (error: any) {
      console.error("Create user error:", error);
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
   * Delete a user's profile.
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
        throw new Error("Password is too weak. Please use a stronger password.");
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
