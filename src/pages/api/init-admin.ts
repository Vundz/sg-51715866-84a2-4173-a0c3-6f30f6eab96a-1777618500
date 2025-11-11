import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

type ResponseData = {
  message: string;
  user?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Create admin client with service role key
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

    const adminEmail = "admin@khulisapp.com";
    const adminPassword = "Admin123!";
    const adminFullName = "System Administrator";

    // Check if user already exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return res.status(500).json({ message: "Error checking users", error: listError.message });
    }

    const existingUser = existingUsers.users.find(u => u.email === adminEmail);

    if (existingUser) {
      // User exists - update password and ensure profile has admin role
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: adminPassword,
        email_confirm: true,
      });

      // Update profile role
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          role: "admin",
          full_name: adminFullName 
        })
        .eq("id", existingUser.id);

      if (profileError) {
        return res.status(500).json({ 
          message: "User updated but profile update failed", 
          error: profileError.message 
        });
      }

      return res.status(200).json({
        message: "Admin user already exists and has been updated",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          credentials: {
            email: adminEmail,
            password: adminPassword,
          },
        },
      });
    }

    // Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName,
      },
    });

    if (createError) {
      return res.status(500).json({ 
        message: "Failed to create admin user", 
        error: createError.message 
      });
    }

    // Ensure profile has admin role (trigger should create it, but let's be sure)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ 
        id: newUser.user.id,
        email: adminEmail,
        role: "admin",
        full_name: adminFullName 
      });

    if (profileError) {
      return res.status(500).json({ 
        message: "User created but profile update failed", 
        error: profileError.message 
      });
    }

    return res.status(200).json({
      message: "Admin user created successfully",
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        credentials: {
          email: adminEmail,
          password: adminPassword,
        },
      },
    });
  } catch (error: any) {
    console.error("Error in init-admin:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
