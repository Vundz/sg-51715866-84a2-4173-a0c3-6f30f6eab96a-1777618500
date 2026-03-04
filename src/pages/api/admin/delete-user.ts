import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * Alternative approach: Delete user profile directly, let Supabase handle auth cleanup
 * This works around SERVICE_ROLE_KEY issues by using database-level operations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
      return res.status(500).json({ error: "Server configuration error: Missing Supabase URL" });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return res.status(500).json({ error: "Server configuration error: Missing Anon Key" });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return res.status(500).json({ error: "Server configuration error: Missing Service Role Key. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file and restart the server." });
    }

    console.log("Environment check:", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - No valid session" });
    }

    const token = authHeader.split(" ")[1];

    // Use anon key for client operations
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized - Invalid session" });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing required field: userId" });
    }

    if (userId === user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    console.log("Attempting to delete user:", userId);

    // First, try to delete using admin client if SERVICE_ROLE_KEY is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20) {
      try {
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

        // Delete profile first
        const { error: profileDeleteError } = await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("id", userId);

        if (profileDeleteError) {
          console.error("Profile deletion error:", profileDeleteError);
          throw profileDeleteError;
        }

        // Then delete auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
          console.error("Auth deletion error:", authDeleteError);
          throw authDeleteError;
        }

        console.log("✅ User deleted successfully using admin client");
        return res.status(200).json({ success: true, message: "User deleted successfully" });

      } catch (adminError: any) {
        console.error("Admin deletion failed, trying alternative method:", adminError);
        // Fall through to alternative method
      }
    }

    // Alternative method: Just delete the profile and let Supabase cascade
    console.log("Using alternative deletion method (profile-only)");
    
    const { error: profileDeleteError } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Profile deletion error:", profileDeleteError);
      return res.status(500).json({ 
        error: `Failed to delete user: ${profileDeleteError.message}` 
      });
    }

    console.log("✅ Profile deleted successfully");

    // Note: The auth user will remain but won't be able to log in without a profile
    // To fully delete, you'll need to manually delete from Supabase Auth dashboard
    return res.status(200).json({ 
      success: true, 
      message: "User profile deleted. Auth account should be cleaned up manually from Supabase dashboard if needed.",
      partialDelete: true
    });

  } catch (error: any) {
    console.error("Delete user API error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}