import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, newPassword } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    console.log("=== PASSWORD RESET REQUEST ===");
    console.log("User ID:", userId);
    console.log("Has token:", !!token);
    console.log("Has password:", !!newPassword);

    // Validation
    if (!userId || !newPassword) {
      console.log("ERROR: Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!token) {
      console.log("ERROR: No authorization token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("Environment check:");
    console.log("- Has Supabase URL:", !!supabaseUrl);
    console.log("- Has anon key:", !!anonKey);
    console.log("- Has service role key:", !!serviceRoleKey);

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.log("ERROR: Missing environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Verify user is admin using regular client
    console.log("Creating Supabase client for admin verification...");
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    console.log("Verifying user token...");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log("ERROR: Invalid token", userError);
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("User verified:", user.id);
    console.log("Checking admin role...");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("Profile data:", profile);
    console.log("Profile error:", profileError);

    if (profileError || profile?.role !== "admin") {
      console.log("ERROR: Not admin. Role:", profile?.role);
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    console.log("Admin verified. Proceeding with password reset...");

    // Create admin client with service role key
    console.log("Creating Supabase Admin client...");
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Use admin client to update user password
    console.log("Updating password via Supabase Admin SDK...");
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update failed:", updateError);
      return res.status(400).json({
        error: "Failed to update password",
        details: updateError
      });
    }

    console.log("✅ Password reset successful!");
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      user: updateData.user
    });

  } catch (error: any) {
    console.error("❌ Password reset error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      error: error.message || "Internal server error",
      stack: error.stack
    });
  }
}