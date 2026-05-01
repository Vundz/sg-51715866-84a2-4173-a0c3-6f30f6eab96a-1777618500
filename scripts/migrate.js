#!/usr/bin/env node

const PROJECT_REF = "dixtwbcdprbhiwhtgdfb";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeHR3YmNkcHJiaGl3aHRnZGZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjgzOTA4MSwiZXhwIjoyMDc4NDE1MDgxfQ.HjqhgPFb5Ar6v-B0TKcWo81GkGGgm7t5oMCTfEmtKiA";

const SQL = `
CREATE TABLE IF NOT EXISTS dispatch_slips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  planting_id UUID NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  dispatch_date DATE NOT NULL,
  customer_name TEXT,
  destination TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  harvest_id UUID REFERENCES harvests(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  console.log("Running dispatch_slips migration...\n");

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    }
  );

  const data = await res.json();

  if (res.ok) {
    console.log("✓ Migration successful! dispatch_slips table is ready.");
  } else {
    console.error("✗ Migration failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

migrate().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
