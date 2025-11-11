
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if admin already exists
    const { data: existingProfiles, error: checkError } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", "admin@khulisapp.com")
      .single();

    if (existingProfiles) {
      return res.status(200).json({ 
        message: "Admin user already exists",
        email: "admin@khulisapp.com" 
      });
    }

    // Create admin user using Supabase Admin API
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY which should be set in environment
    const adminEmail = "admin@khulisapp.com";
    const adminPassword = "Spawniad8!";

    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: "System Administrator",
        },
      },
    });

    if (error) {
      console.error("Error creating admin user:", error);
      return res.status(500).json({ error: error.message });
    }

    // Update the profile to set admin role
    if (data.user) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", data.user.id);

      if (updateError) {
        console.error("Error updating admin role:", updateError);
        return res.status(500).json({ error: updateError.message });
      }
    }

    return res.status(200).json({
      message: "Admin user created successfully",
      email: adminEmail,
      note: "Please check your email to verify the account",
    });
  } catch (error) {
    console.error("Error in init-admin:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
