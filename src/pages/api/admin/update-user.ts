
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * Secure API endpoint for admin user update operations
 * Uses SERVICE ROLE key server-side for elevated privileges
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PUT requests
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the user's session to verify they're authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - No valid session" });
    }

    const token = authHeader.split(" ")[1];

    // Create a Supabase client with SERVICE ROLE key for admin operations
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

    // Verify the user's token and get their role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized - Invalid session" });
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    // Get the target user ID and updates from request body
    const { userId, updates } = req.body;

    if (!userId || !updates) {
      return res.status(400).json({ error: "Missing required fields: userId and updates" });
    }

    // Update user metadata in auth.users if needed
    if (updates.email) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: updates.email }
      );

      if (updateError) {
        console.error("Email update error:", updateError);
        return res.status(500).json({ 
          error: `Failed to update email: ${updateError.message}` 
        });
      }
    }

    // Success
    return res.status(200).json({ 
      success: true, 
      message: "User updated successfully" 
    });

  } catch (error: any) {
    console.error("Update user API error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}
