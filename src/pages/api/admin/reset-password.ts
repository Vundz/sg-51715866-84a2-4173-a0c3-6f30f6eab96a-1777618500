import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * Secure API endpoint for admin password reset operations
 * Uses SERVICE ROLE key server-side for elevated privileges
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
      return res.status(500).json({ error: "Server configuration error: Missing Supabase URL" });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return res.status(500).json({ error: "Server configuration error: Missing Service Role Key. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file and restart the server." });
    }

    // Get the user's session token to verify they're authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - No valid session" });
    }

    const token = authHeader.split(" ")[1];

    // Create admin client with SERVICE ROLE key for all operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user's token and get their user ID
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth verification failed:", authError);
      return res.status(401).json({ error: "Unauthorized - Invalid session" });
    }

    // Check if the authenticated user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({ error: "Failed to verify admin status" });
    }

    if (!profile || profile.role !== "admin") {
      console.log("Access denied - user role:", profile?.role);
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    // Get the target user ID and new password from request body
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: "Missing required fields: userId and newPassword" });
    }

    // Validate password strength (basic check)
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    console.log("Updating password for user:", userId);

    // Update the user's password using admin privileges
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return res.status(500).json({ 
        error: `Failed to update password: ${updateError.message}` 
      });
    }

    console.log("Password updated successfully for user:", userId);

    // Success
    return res.status(200).json({ 
      success: true, 
      message: "Password updated successfully" 
    });

  } catch (error: any) {
    console.error("Reset password API error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}