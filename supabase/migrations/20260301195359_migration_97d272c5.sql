-- Create scouting_reports table
CREATE TABLE IF NOT EXISTS scouting_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scouting_date DATE NOT NULL,
  planting_id UUID REFERENCES plantings(id) ON DELETE CASCADE,
  greenhouse_location TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  variety TEXT,
  batch_number TEXT,
  seedling_age_days INTEGER,
  scout_name TEXT NOT NULL,
  weather_conditions TEXT,
  recent_spray_applied BOOLEAN DEFAULT false,
  spray_chemical_name TEXT,
  spray_application_date DATE,
  overall_health_rating INTEGER CHECK (overall_health_rating >= 1 AND overall_health_rating <= 5),
  general_notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scouting_pests table
CREATE TABLE IF NOT EXISTS scouting_pests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES scouting_reports(id) ON DELETE CASCADE,
  pest_name TEXT NOT NULL,
  present BOOLEAN DEFAULT false,
  severity INTEGER CHECK (severity >= 1 AND severity <= 3),
  percent_trays_affected DECIMAL(5,2),
  distribution_pattern TEXT,
  action_required TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scouting_diseases table
CREATE TABLE IF NOT EXISTS scouting_diseases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES scouting_reports(id) ON DELETE CASCADE,
  disease_name TEXT NOT NULL,
  present BOOLEAN DEFAULT false,
  severity INTEGER CHECK (severity >= 1 AND severity <= 3),
  percent_trays_affected DECIMAL(5,2),
  notes TEXT,
  recommended_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scouting_nutrients table
CREATE TABLE IF NOT EXISTS scouting_nutrients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES scouting_reports(id) ON DELETE CASCADE,
  symptom TEXT NOT NULL,
  severity INTEGER CHECK (severity >= 1 AND severity <= 3),
  suspected_deficiency TEXT,
  percent_affected DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scouting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_pests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_nutrients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scouting_reports
CREATE POLICY "Users can view scouting reports" ON scouting_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create scouting reports" ON scouting_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update scouting reports" ON scouting_reports FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete scouting reports" ON scouting_reports FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for scouting_pests
CREATE POLICY "Users can view pest records" ON scouting_pests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create pest records" ON scouting_pests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update pest records" ON scouting_pests FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete pest records" ON scouting_pests FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for scouting_diseases
CREATE POLICY "Users can view disease records" ON scouting_diseases FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create disease records" ON scouting_diseases FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update disease records" ON scouting_diseases FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete disease records" ON scouting_diseases FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for scouting_nutrients
CREATE POLICY "Users can view nutrient records" ON scouting_nutrients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create nutrient records" ON scouting_nutrients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update nutrient records" ON scouting_nutrients FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete nutrient records" ON scouting_nutrients FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_scouting_reports_planting ON scouting_reports(planting_id);
CREATE INDEX idx_scouting_reports_date ON scouting_reports(scouting_date DESC);
CREATE INDEX idx_scouting_pests_report ON scouting_pests(report_id);
CREATE INDEX idx_scouting_diseases_report ON scouting_diseases(report_id);
CREATE INDEX idx_scouting_nutrients_report ON scouting_nutrients(report_id);