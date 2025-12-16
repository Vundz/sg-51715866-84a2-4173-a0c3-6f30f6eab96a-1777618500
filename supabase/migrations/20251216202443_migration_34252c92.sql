-- Drop the existing wide-column table
DROP TABLE IF EXISTS bom_settings CASCADE;

-- Re-create with Key-Value structure
CREATE TABLE bom_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- 'tray', 'medium', 'seed', 'labor', 'utilities', 'overhead'
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  unit TEXT,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bom_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view BOM settings" ON bom_settings 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert BOM settings" ON bom_settings 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); -- In real app, check for admin role

CREATE POLICY "Admins can update BOM settings" ON bom_settings 
  FOR UPDATE USING (auth.uid() IS NOT NULL); -- In real app, check for admin role

CREATE POLICY "Admins can delete BOM settings" ON bom_settings 
  FOR DELETE USING (auth.uid() IS NOT NULL); -- In real app, check for admin role

-- Create index for faster lookups
CREATE INDEX idx_bom_settings_category ON bom_settings(category);
CREATE INDEX idx_bom_settings_key ON bom_settings(setting_key);