import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, newPassword } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    // Validation
    if (!userId || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Verify user is admin
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    // Extract project ref from URL
    const projectRef = supabaseUrl.split("//")[1].split(".")[0];

    // Use Management API directly to update password
    const response = await fetch(
      `https://${projectRef}.supabase.co/auth/v1/admin/users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey
        },
        body: JSON.stringify({
          password: newPassword,
          email_confirm: true
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Password reset failed:", errorData);
      return res.status(response.status).json({
        error: "Failed to update password",
        details: errorData
      });
    }

    const userData = await response.json();
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      user: userData
    });

  } catch (error: any) {
    console.error("Password reset error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}