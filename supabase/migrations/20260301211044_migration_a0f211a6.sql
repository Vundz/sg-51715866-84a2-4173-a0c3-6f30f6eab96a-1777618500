-- Enable RLS on all 4 tables
ALTER TABLE scouting_pest_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_disease_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_nutrient_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_actions ENABLE ROW LEVEL SECURITY;