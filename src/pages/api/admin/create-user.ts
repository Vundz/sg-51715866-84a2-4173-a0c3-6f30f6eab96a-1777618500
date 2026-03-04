import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    const token = authHeader.substring(7);

    // Create Supabase client with user's token to verify they're authenticated
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    // Get request body
    const { username, password, fullName, role, email } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: "Username, password, and full name are required" });
    }

    // Generate auth email
    const authEmail = email || `${username}@khulisapp.internal`;

    // Create admin client using service role key
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceRoleKey) {
      return res.status(500).json({ error: "Server configuration error - missing service role key" });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if username already exists
    const { data: existingUsername } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      return res.status(400).json({ error: `Username "${username}" is already taken` });
    }

    // Check if email already exists
    if (email) {
      const { data: existingEmail } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingEmail) {
        return res.status(400).json({ error: `Email "${email}" is already registered` });
      }
    }

    // Create user with Admin API (doesn't affect current session)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        username: username,
        role: role,
      },
    });

    if (createError) {
      console.error("Admin API create user error:", createError);
      return res.status(400).json({ error: createError.message });
    }

    if (!newUser.user) {
      return res.status(500).json({ error: "Failed to create user - no user data returned" });
    }

    // Create profile record
    const { data: profile, error: profileInsertError } = await adminClient
      .from("profiles")
      .insert({
        id: newUser.user.id,
        username: username,
        full_name: fullName,
        email: email || null,
        role: role,
      })
      .select()
      .single();

    if (profileInsertError) {
      console.error("Profile insert error:", profileInsertError);
      
      // If profile already exists, fetch it
      if (profileInsertError.code === "23505") {
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("*")
          .eq("id", newUser.user.id)
          .single();
        
        if (existingProfile) {
          return res.status(200).json({ 
            success: true, 
            user: existingProfile,
            message: "User created successfully"
          });
        }
      }
      
      return res.status(400).json({ error: `Profile creation failed: ${profileInsertError.message}` });
    }

    return res.status(200).json({ 
      success: true, 
      user: profile,
      message: "User created successfully"
    });

  } catch (error: any) {
    console.error("Create user API error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}