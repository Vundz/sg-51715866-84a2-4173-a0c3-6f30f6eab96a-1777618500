import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  console.log("=== SERVICE KEY TEST ===");
  console.log("Has service key:", !!serviceRoleKey);
  console.log("Key length:", serviceRoleKey?.length || 0);
  console.log("Key starts with:", serviceRoleKey?.substring(0, 10));
  console.log("Supabase URL:", supabaseUrl);

  if (!serviceRoleKey || !supabaseUrl) {
    return res.status(500).json({
      error: "Missing environment variables",
      hasKey: !!serviceRoleKey,
      hasUrl: !!supabaseUrl,
      keyLength: serviceRoleKey?.length || 0
    });
  }

  // Extract project ref
  const projectRef = supabaseUrl.split("//")[1]?.split(".")[0];
  
  console.log("Project ref:", projectRef);
  console.log("Testing endpoint:", `https://${projectRef}.supabase.co/auth/v1/admin/users`);

  try {
    // Test the key with a simple admin API call
    const testResponse = await fetch(`https://${projectRef}.supabase.co/auth/v1/admin/users?page=1&per_page=1`, {
      method: "GET",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      }
    });

    const responseText = await testResponse.text();
    console.log("Response status:", testResponse.status);
    console.log("Response body:", responseText);

    if (!testResponse.ok) {
      return res.status(testResponse.status).json({
        error: "Service key test failed",
        status: testResponse.status,
        response: responseText,
        keyLength: serviceRoleKey.length,
        projectRef
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service role key is valid!",
      keyLength: serviceRoleKey.length,
      projectRef,
      responseStatus: testResponse.status
    });

  } catch (error: any) {
    console.error("Test error:", error);
    return res.status(500).json({
      error: "Test failed",
      message: error.message,
      keyLength: serviceRoleKey?.length
    });
  }
}