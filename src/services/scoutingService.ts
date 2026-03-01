import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ScoutingReport = Database["public"]["Tables"]["scouting_reports"]["Row"];
export type ScoutingPest = Database["public"]["Tables"]["scouting_pests"]["Row"];
export type ScoutingDisease = Database["public"]["Tables"]["scouting_diseases"]["Row"];
export type ScoutingNutrient = Database["public"]["Tables"]["scouting_nutrients"]["Row"];

export interface ScoutingReportWithDetails extends ScoutingReport {
  plantings?: {
    batch_number: string;
    plant_types: {
      name: string;
      variety: string;
    } | null;
    locations: {
      name: string;
    } | null;
  } | null;
  profiles?: {
    full_name: string | null;
  } | null;
  scouting_pests?: ScoutingPest[];
  scouting_diseases?: ScoutingDisease[];
  scouting_nutrients?: ScoutingNutrient[];
}

export interface CreateScoutingReportData {
  planting_id: string;
  scouting_date: string;
  greenhouse: string;
  crop_type: string;
  variety: string;
  seedling_age_days: number;
  scout_name: string;
  weather_conditions: string;
  recent_spray: boolean;
  spray_chemical_name?: string;
  spray_application_date?: string;
  overall_health_rating: number;
  general_notes?: string;
  pests: Array<{
    pest_type: string;
    present: boolean;
    severity?: number;
    trays_affected_percent?: number;
    location_pattern?: string;
    action_required?: string;
  }>;
  diseases: Array<{
    disease_type: string;
    present: boolean;
    severity?: number;
    trays_affected_percent?: number;
    notes?: string;
    recommended_action?: string;
  }>;
  nutrients: Array<{
    symptom: string;
    severity: number;
    suspected_deficiency: string;
    notes?: string;
  }>;
}

export const scoutingService = {
  /**
   * Get all scouting reports
   */
  async getReports(): Promise<ScoutingReportWithDetails[]> {
    const { data, error } = await supabase
      .from("scouting_reports")
      .select(`
        *,
        plantings (
          batch_number,
          plant_types (name, variety),
          locations (name)
        ),
        profiles (full_name),
        scouting_pests (*),
        scouting_diseases (*),
        scouting_nutrients (*)
      `)
      .order("scouting_date", { ascending: false });

    if (error) throw error;
    return data as ScoutingReportWithDetails[];
  },

  /**
   * Get a single scouting report
   */
  async getReport(id: string): Promise<ScoutingReportWithDetails> {
    const { data, error } = await supabase
      .from("scouting_reports")
      .select(`
        *,
        plantings (
          batch_number,
          plant_types (name, variety),
          locations (name)
        ),
        profiles (full_name),
        scouting_pests (*),
        scouting_diseases (*),
        scouting_nutrients (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as ScoutingReportWithDetails;
  },

  /**
   * Get reports for a specific planting
   */
  async getReportsByPlanting(plantingId: string): Promise<ScoutingReportWithDetails[]> {
    const { data, error } = await supabase
      .from("scouting_reports")
      .select(`
        *,
        plantings (
          batch_number,
          plant_types (name, variety),
          locations (name)
        ),
        profiles (full_name),
        scouting_pests (*),
        scouting_diseases (*),
        scouting_nutrients (*)
      `)
      .eq("planting_id", plantingId)
      .order("scouting_date", { ascending: false });

    if (error) throw error;
    return data as ScoutingReportWithDetails[];
  },

  /**
   * Create a new scouting report
   */
  async createReport(reportData: CreateScoutingReportData): Promise<ScoutingReport> {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Create main report
    const { data: report, error: reportError } = await supabase
      .from("scouting_reports")
      .insert([{
        planting_id: reportData.planting_id,
        scouting_date: reportData.scouting_date,
        greenhouse: reportData.greenhouse,
        crop_type: reportData.crop_type,
        variety: reportData.variety,
        seedling_age_days: reportData.seedling_age_days,
        scout_name: reportData.scout_name,
        weather_conditions: reportData.weather_conditions,
        recent_spray: reportData.recent_spray,
        spray_chemical_name: reportData.spray_chemical_name || null,
        spray_application_date: reportData.spray_application_date || null,
        overall_health_rating: reportData.overall_health_rating,
        general_notes: reportData.general_notes || null,
        created_by: user?.id,
      }])
      .select()
      .single();

    if (reportError) throw reportError;

    // 2. Create pest observations (only for present pests)
    const presentPests = reportData.pests.filter(p => p.present);
    if (presentPests.length > 0) {
      const { error: pestsError } = await supabase
        .from("scouting_pests")
        .insert(
          presentPests.map(pest => ({
            report_id: report.id,
            pest_type: pest.pest_type,
            present: pest.present,
            severity: pest.severity || null,
            trays_affected_percent: pest.trays_affected_percent || null,
            location_pattern: pest.location_pattern || null,
            action_required: pest.action_required || null,
          }))
        );

      if (pestsError) throw pestsError;
    }

    // 3. Create disease observations (only for present diseases)
    const presentDiseases = reportData.diseases.filter(d => d.present);
    if (presentDiseases.length > 0) {
      const { error: diseasesError } = await supabase
        .from("scouting_diseases")
        .insert(
          presentDiseases.map(disease => ({
            report_id: report.id,
            disease_type: disease.disease_type,
            present: disease.present,
            severity: disease.severity || null,
            trays_affected_percent: disease.trays_affected_percent || null,
            notes: disease.notes || null,
            recommended_action: disease.recommended_action || null,
          }))
        );

      if (diseasesError) throw diseasesError;
    }

    // 4. Create nutrient deficiency observations
    if (reportData.nutrients.length > 0) {
      const { error: nutrientsError } = await supabase
        .from("scouting_nutrients")
        .insert(
          reportData.nutrients.map(nutrient => ({
            report_id: report.id,
            symptom: nutrient.symptom,
            severity: nutrient.severity,
            suspected_deficiency: nutrient.suspected_deficiency,
            notes: nutrient.notes || null,
          }))
        );

      if (nutrientsError) throw nutrientsError;
    }

    return report;
  },

  /**
   * Update a scouting report
   */
  async updateReport(id: string, updates: Partial<CreateScoutingReportData>): Promise<ScoutingReport> {
    // Update main report
    const { data: report, error: reportError } = await supabase
      .from("scouting_reports")
      .update({
        scouting_date: updates.scouting_date,
        greenhouse: updates.greenhouse,
        crop_type: updates.crop_type,
        variety: updates.variety,
        seedling_age_days: updates.seedling_age_days,
        scout_name: updates.scout_name,
        weather_conditions: updates.weather_conditions,
        recent_spray: updates.recent_spray,
        spray_chemical_name: updates.spray_chemical_name || null,
        spray_application_date: updates.spray_application_date || null,
        overall_health_rating: updates.overall_health_rating,
        general_notes: updates.general_notes || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (reportError) throw reportError;

    // Delete existing observations
    await Promise.all([
      supabase.from("scouting_pests").delete().eq("report_id", id),
      supabase.from("scouting_diseases").delete().eq("report_id", id),
      supabase.from("scouting_nutrients").delete().eq("report_id", id),
    ]);

    // Re-create observations (same logic as create)
    if (updates.pests) {
      const presentPests = updates.pests.filter(p => p.present);
      if (presentPests.length > 0) {
        await supabase.from("scouting_pests").insert(
          presentPests.map(pest => ({
            report_id: id,
            pest_type: pest.pest_type,
            present: pest.present,
            severity: pest.severity || null,
            trays_affected_percent: pest.trays_affected_percent || null,
            location_pattern: pest.location_pattern || null,
            action_required: pest.action_required || null,
          }))
        );
      }
    }

    if (updates.diseases) {
      const presentDiseases = updates.diseases.filter(d => d.present);
      if (presentDiseases.length > 0) {
        await supabase.from("scouting_diseases").insert(
          presentDiseases.map(disease => ({
            report_id: id,
            disease_type: disease.disease_type,
            present: disease.present,
            severity: disease.severity || null,
            trays_affected_percent: disease.trays_affected_percent || null,
            notes: disease.notes || null,
            recommended_action: disease.recommended_action || null,
          }))
        );
      }
    }

    if (updates.nutrients && updates.nutrients.length > 0) {
      await supabase.from("scouting_nutrients").insert(
        updates.nutrients.map(nutrient => ({
          report_id: id,
          symptom: nutrient.symptom,
          severity: nutrient.severity,
          suspected_deficiency: nutrient.suspected_deficiency,
          notes: nutrient.notes || null,
        }))
      );
    }

    return report;
  },

  /**
   * Delete a scouting report
   */
  async deleteReport(id: string): Promise<void> {
    const { error } = await supabase
      .from("scouting_reports")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Get nutrient deficiency suggestions based on symptom
   */
  getNutrientSuggestion(symptom: string): string {
    const suggestions: Record<string, string> = {
      "Yellow older leaves": "Nitrogen (N)",
      "Interveinal yellowing": "Magnesium (Mg)",
      "Purple leaves": "Phosphorus (P)",
      "Burnt leaf edges": "Potassium (K)",
      "Deformed new leaves": "Calcium (Ca)",
      "Stunted growth": "Multiple (NPK)",
      "Uneven growth": "Multiple nutrients",
    };

    return suggestions[symptom] || "Unknown";
  },

  /**
   * Check if report has critical issues
   */
  hasCriticalIssues(report: ScoutingReportWithDetails): boolean {
    // Check for damping off > 5%
    const dampingOff = report.scouting_diseases?.find(d => d.disease_type === "Damping Off");
    if (dampingOff && dampingOff.present && (dampingOff.trays_affected_percent || 0) > 5) {
      return true;
    }

    // Check for any pest > 10%
    const criticalPest = report.scouting_pests?.some(
      p => p.present && (p.trays_affected_percent || 0) > 10
    );
    if (criticalPest) return true;

    // Check for severe diseases
    const severeDiseases = report.scouting_diseases?.some(
      d => d.present && d.severity === 3
    );
    if (severeDiseases) return true;

    return false;
  },

  /**
   * Get alerts for a report
   */
  getReportAlerts(report: ScoutingReportWithDetails): string[] {
    const alerts: string[] = [];

    // Damping off alert
    const dampingOff = report.scouting_diseases?.find(d => d.disease_type === "Damping Off");
    if (dampingOff && dampingOff.present && (dampingOff.trays_affected_percent || 0) > 5) {
      alerts.push("🚨 CRITICAL: Damping Off detected in >5% of trays - Immediate intervention required!");
    }

    // Root rot drainage check
    const rootRot = report.scouting_diseases?.find(d => d.disease_type === "Root Rot");
    if (rootRot && rootRot.present) {
      alerts.push("⚠️ Root Rot detected - Check drainage system immediately");
    }

    // High pest pressure
    report.scouting_pests?.forEach(pest => {
      if (pest.present && (pest.trays_affected_percent || 0) > 10) {
        alerts.push(`⚠️ ${pest.pest_type} affecting >10% of trays - Action required`);
      }
    });

    // Severe diseases
    report.scouting_diseases?.forEach(disease => {
      if (disease.present && disease.severity === 3) {
        alerts.push(`⚠️ HIGH severity ${disease.disease_type} detected`);
      }
    });

    return alerts;
  },
};