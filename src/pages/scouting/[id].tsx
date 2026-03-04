import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Bug, 
  Leaf, 
  AlertTriangle, 
  Thermometer,
  Calendar,
  User,
  MapPin,
  Sprout,
  Clock,
  CheckCircle2,
  XCircle,
  Archive
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { scoutingService, ScoutingReportWithDetails } from "@/services/scoutingService";
import { scoutingSettingsService } from "@/services/scoutingSettingsService";

export default function ScoutingReportDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [report, setReport] = useState<ScoutingReportWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [archivedItems, setArchivedItems] = useState<{
    pests: string[];
    diseases: string[];
    nutrients: string[];
    actions: string[];
  }>({
    pests: [],
    diseases: [],
    nutrients: [],
    actions: []
  });

  useEffect(() => {
    if (id && user) {
      loadReport();
      loadArchivedStatus();
    }
  }, [id, user]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await scoutingService.getReportById(id as string);
      setReport(data);
    } catch (error) {
      console.error("Error loading report:", error);
      toast({ title: "Error", description: "Failed to load scouting report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedStatus = async () => {
    try {
      // Load all items including inactive ones to check archived status
      const [allPests, allDiseases, allNutrients, allActions] = await Promise.all([
        scoutingSettingsService.getAllPestTypes(),
        scoutingSettingsService.getAllDiseaseTypes(),
        scoutingSettingsService.getAllNutrientTypes(),
        scoutingSettingsService.getAllActions()
      ]);

      setArchivedItems({
        pests: allPests.filter(p => !p.is_active).map(p => p.name),
        diseases: allDiseases.filter(d => !d.is_active).map(d => d.name),
        nutrients: allNutrients.filter(n => !n.is_active).map(n => n.name),
        actions: allActions.filter(a => !a.is_active).map(a => a.name)
      });
    } catch (error) {
      console.error("Error loading archived status:", error);
    }
  };

  const getHealthColor = (rating: number) => {
    if (rating >= 4) return "text-green-600 dark:text-green-400";
    if (rating >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthBadge = (rating: number) => {
    if (rating >= 4) return { label: "Healthy", variant: "default" as const, color: "bg-green-600" };
    if (rating >= 3) return { label: "Fair", variant: "secondary" as const, color: "bg-yellow-600" };
    return { label: "Poor", variant: "destructive" as const, color: "bg-red-600" };
  };

  const getSeverityBadge = (severity: number) => {
    if (severity === 1) return { label: "Low", variant: "secondary" as const };
    if (severity === 2) return { label: "Medium", variant: "default" as const };
    return { label: "High", variant: "destructive" as const };
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <Alert variant="destructive">
          <AlertDescription>Report not found</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const healthBadge = getHealthBadge(report.overall_health_rating);
  const hasCritical = scoutingService.hasCriticalIssues(report);
  const alerts = scoutingService.getReportAlerts(report);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Scouting Report Details</h1>
          <p className="text-gray-500">
            {report.crop_type} {report.variety && `- ${report.variety}`}
          </p>
        </div>
        <Badge variant={healthBadge.variant} className="text-base px-4 py-2">
          {healthBadge.label} ({report.overall_health_rating}/5)
        </Badge>
      </div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <Alert key={idx} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Alert</AlertTitle>
              <AlertDescription>{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-blue-500" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Scouting Date</span>
              </div>
              <div className="font-medium">{new Date(report.scouting_date).toLocaleDateString()}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>Greenhouse</span>
              </div>
              <div className="font-medium">{report.greenhouse_location}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Sprout className="w-4 h-4" />
                <span>Batch Number</span>
              </div>
              <div className="font-mono text-sm font-medium">
                {report.plantings?.batch_number || "N/A"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Seedling Age</span>
              </div>
              <div className="font-medium">{report.seedling_age_days} days</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>Scout Name</span>
              </div>
              <div className="font-medium">{report.scout_name}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Thermometer className="w-4 h-4" />
                <span>Weather</span>
              </div>
              <div className="font-medium">{report.weather_conditions || "Not recorded"}</div>
            </div>
          </div>

          {/* Recent Spray Information */}
          {report.recent_spray && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                Recent Treatment Applied
              </h3>
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Chemical Name:</span>
                    <div className="font-medium">{report.spray_chemical_name || "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Application Date:</span>
                    <div className="font-medium">
                      {report.spray_application_date 
                        ? new Date(report.spray_application_date).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-orange-800 dark:text-orange-200 mt-3">
                  ⚠️ Treatment was applied within 7 days of this observation. Consider potential spray residue effects.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pest Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" />
            Pest Observations
          </CardTitle>
          <CardDescription>
            {report.scouting_pests?.filter(p => p.present).length || 0} pest type(s) detected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.scouting_pests && report.scouting_pests.length > 0 ? (
            <div className="space-y-4">
              {report.scouting_pests
                .filter(pest => pest.present)
                .map((pest, idx) => {
                  const isArchived = archivedItems.pests.includes(pest.pest_type);
                  const severityBadge = getSeverityBadge(pest.severity);
                  const isActionArchived = pest.action_required && archivedItems.actions.includes(pest.action_required);

                  return (
                    <div key={idx} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{pest.pest_type}</h3>
                          {isArchived && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Archive className="w-3 h-3" />
                              Archived
                            </Badge>
                          )}
                        </div>
                        <Badge variant={severityBadge.variant}>
                          {severityBadge.label} Severity
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Trays Affected:</span>
                          <div className="font-medium">{pest.trays_affected_percent}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Pattern:</span>
                          <div className="font-medium">{pest.location_pattern}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 dark:text-gray-400">Action Required:</span>
                          <div className="font-medium flex items-center gap-2">
                            {pest.action_required || "None"}
                            {isActionArchived && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Archive className="w-3 h-3" />
                                Archived
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {pest.trays_affected_percent > 10 && (
                        <Alert className="mt-3 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
                          <AlertDescription className="text-red-800 dark:text-red-200">
                            ⚠️ Exceeds 10% threshold - Immediate action required
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}

              {report.scouting_pests.filter(p => p.present).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No pests detected</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No pest observations recorded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disease Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-orange-500" />
            Disease Observations
          </CardTitle>
          <CardDescription>
            {report.scouting_diseases?.filter(d => d.present).length || 0} disease type(s) detected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.scouting_diseases && report.scouting_diseases.length > 0 ? (
            <div className="space-y-4">
              {report.scouting_diseases
                .filter(disease => disease.present)
                .map((disease, idx) => {
                  const isArchived = archivedItems.diseases.includes(disease.disease_type);
                  const severityBadge = getSeverityBadge(disease.severity);
                  const isActionArchived = disease.recommended_action && archivedItems.actions.includes(disease.recommended_action);

                  return (
                    <div key={idx} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{disease.disease_type}</h3>
                          {isArchived && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Archive className="w-3 h-3" />
                              Archived
                            </Badge>
                          )}
                        </div>
                        <Badge variant={severityBadge.variant}>
                          {severityBadge.label} Severity
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Trays Affected:</span>
                          <div className="font-medium">{disease.trays_affected_percent}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Recommended Action:</span>
                          <div className="font-medium flex items-center gap-2">
                            {disease.recommended_action || "None"}
                            {isActionArchived && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Archive className="w-3 h-3" />
                                Archived
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {disease.notes && (
                        <div className="pt-3 border-t">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Notes:</span>
                          <p className="text-sm mt-1">{disease.notes}</p>
                        </div>
                      )}

                      {disease.disease_type === "Damping Off" && disease.trays_affected_percent > 5 && (
                        <Alert variant="destructive" className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Critical Alert</AlertTitle>
                          <AlertDescription>
                            Damping Off exceeds 5% threshold - Immediate intervention required!
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}

              {report.scouting_diseases.filter(d => d.present).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No diseases detected</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No disease observations recorded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nutrient Deficiencies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Nutrient Deficiencies
          </CardTitle>
          <CardDescription>
            {report.scouting_nutrients?.length || 0} deficiency symptom(s) observed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.scouting_nutrients && report.scouting_nutrients.length > 0 ? (
            <div className="space-y-4">
              {report.scouting_nutrients.map((nutrient, idx) => {
                const isArchived = archivedItems.nutrients.includes(nutrient.symptom);
                const severityBadge = getSeverityBadge(nutrient.severity);

                return (
                  <div key={idx} className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-yellow-900 dark:text-yellow-100">
                          {nutrient.symptom}
                        </h3>
                        {isArchived && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Archive className="w-3 h-3" />
                            Archived
                          </Badge>
                        )}
                      </div>
                      <Badge variant={severityBadge.variant}>
                        {severityBadge.label}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Suspected Deficiency:</span>
                        <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                          {nutrient.suspected_deficiency}
                        </p>
                      </div>

                      {nutrient.notes && (
                        <div>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Notes:</span>
                          <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                            {nutrient.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No nutrient deficiencies observed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall Health Rating</span>
              <span className={`text-2xl font-bold ${getHealthColor(report.overall_health_rating)}`}>
                {report.overall_health_rating}/5
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className={`${healthBadge.color} h-3 rounded-full transition-all`}
                style={{ width: `${(report.overall_health_rating / 5) * 100}%` }}
              />
            </div>
          </div>

          {report.general_notes && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">General Notes</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {report.general_notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reports
        </Button>
      </div>
    </div>
  );
}