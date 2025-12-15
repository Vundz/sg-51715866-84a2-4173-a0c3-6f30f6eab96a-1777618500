import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * Secure API endpoint for admin user deletion operations
 * Uses SERVICE ROLE key server-side for elevated privileges
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow DELETE requests
  if (req.method !== "DELETE" && req.method !== "POST") {
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
      return res.status(500).json({ error: "Server configuration error: Missing Service Role Key" });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return res.status(500).json({ error: "Server configuration error: Missing Anon Key" });
    }

    // Get the user's session token to verify they're authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - No valid session" });
    }

    const token = authHeader.split(" ")[1];

    // Create ANON client to verify user session
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    // Verify the user's token and get their info
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth verification failed:", authError);
      return res.status(401).json({ error: "Unauthorized - Invalid session" });
    }

    // Check if the authenticated user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      console.log("Access denied - user role:", profile?.role);
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    // Get the target user ID from request body
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing required field: userId" });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Create admin client with SERVICE ROLE key for privileged operations
    console.log("Creating admin client with SERVICE_ROLE_KEY...");
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

    // Step 1: Delete from profiles table (will cascade delete related records due to FK constraints)
    console.log("Attempting to delete profile for user:", userId);
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Profile deletion error:", profileDeleteError);
      return res.status(500).json({ 
        error: `Failed to delete user profile: ${profileDeleteError.message}` 
      });
    }

    console.log("Profile deleted successfully, now deleting auth user...");

    // Step 2: Delete from auth.users table using admin API
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Auth user deletion error:", authDeleteError);
      // If auth deletion fails but profile was deleted, that's still a partial success
      return res.status(500).json({ 
        error: `User profile deleted but auth account deletion failed: ${authDeleteError.message}` 
      });
    }

    console.log("User deleted successfully:", userId);

    // Success
    return res.status(200).json({ 
      success: true, 
      message: "User deleted successfully" 
    });

  } catch (error: any) {
    console.error("Delete user API error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}