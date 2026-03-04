import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, newPassword } = req.body;

    // Validate input
    if (!userId || !newPassword) {
      return res.status(400).json({ error: "Missing userId or newPassword" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables:", { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!serviceRoleKey,
        keyLength: serviceRoleKey?.length 
      });
      return res.status(500).json({ 
        error: "Server configuration error",
        details: "Missing Supabase credentials"
      });
    }

    // Get admin token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);

    // Verify admin user
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Extract project ref from URL
    const projectRef = supabaseUrl.split("//")[1]?.split(".")[0];
    if (!projectRef) {
      return res.status(500).json({ error: "Invalid Supabase URL" });
    }

    // Update password using Management API directly
    console.log("Updating password for user:", userId);
    
    const response = await fetch(
      `https://${projectRef}.supabase.co/auth/v1/admin/users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey
        },
        body: JSON.stringify({ password: newPassword })
      }
    );

    const responseData = await response.json();
    console.log("Password update response:", { status: response.status, data: responseData });

    if (!response.ok) {
      console.error("Password update failed:", responseData);
      return res.status(response.status).json({ 
        error: responseData.msg || responseData.message || "Failed to update password",
        details: responseData
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Password updated successfully" 
    });

  } catch (error: any) {
    console.error("Reset password error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error",
      details: error.toString()
    });
  }
}