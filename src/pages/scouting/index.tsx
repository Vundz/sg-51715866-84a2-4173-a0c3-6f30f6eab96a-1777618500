import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Eye, 
  Trash2, 
  Search, 
  Bug, 
  Leaf, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
  Archive
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { scoutingService, ScoutingReportWithDetails } from "@/services/scoutingService";
import { scoutingSettingsService } from "@/services/scoutingSettingsService";
import { formatNumber } from "@/lib/format";

export default function ScoutingReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = usePermissions("plantings");
  
  const [reports, setReports] = useState<ScoutingReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [greenhouseFilter, setGreenhouseFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
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
    if (user) {
      loadReports();
      loadArchivedStatus();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await scoutingService.getReports();
      setReports(data);
    } catch (error) {
      console.error("Error loading scouting reports:", error);
      toast({ title: "Error", description: "Failed to load scouting reports", variant: "destructive" });
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scouting report?")) return;
    
    try {
      await scoutingService.deleteReport(id);
      await loadReports();
      toast({ title: "Success", description: "Report deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete report", variant: "destructive" });
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.crop_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.variety && report.variety.toLowerCase().includes(searchQuery.toLowerCase())) ||
      report.scout_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.plantings?.batch_number && report.plantings.batch_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesGreenhouse = greenhouseFilter === "all" || report.greenhouse_location === greenhouseFilter;
    
    return matchesSearch && matchesGreenhouse;
  });

  const getHealthColor = (rating: number) => {
    if (rating >= 4) return "text-green-600 dark:text-green-400";
    if (rating >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthBadge = (rating: number) => {
    if (rating >= 4) return { label: "Healthy", variant: "default" as const };
    if (rating >= 3) return { label: "Fair", variant: "secondary" as const };
    return { label: "Poor", variant: "destructive" as const };
  };

  if (loading) {
    return <div className="p-8 text-center">Loading scouting reports...</div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Bug className="w-10 h-10 text-orange-600" />
            Crop Scouting & Inspection
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor pest infestations, diseases, and nutrient deficiencies
          </p>
        </div>
        {permissions.canCreate && (
          <Link href="/scouting/new">
            <Button className="bg-orange-600 hover:bg-orange-700 gap-2">
              <Plus className="w-4 h-4" />
              New Scout Report
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {reports.filter(r => scoutingService.hasCriticalIssues(r)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Healthy Crops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {reports.filter(r => r.overall_health_rating >= 4).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {reports.filter(r => {
                const reportDate = new Date(r.scouting_date);
                const now = new Date();
                return reportDate.getMonth() === now.getMonth() && 
                       reportDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by crop, variety, batch, or scout name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={greenhouseFilter} onValueChange={setGreenhouseFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Greenhouses</SelectItem>
                <SelectItem value="GH1">GH1</SelectItem>
                <SelectItem value="GH2">GH2</SelectItem>
                <SelectItem value="GH3">GH3</SelectItem>
                <SelectItem value="GH4">GH4</SelectItem>
                <SelectItem value="ShadeNet">ShadeNet</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-2"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Scouting Reports</CardTitle>
          <CardDescription>All crop inspection and monitoring reports</CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === "table" ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Greenhouse</TableHead>
                      <TableHead>Crop / Variety</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Age (days)</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Scout</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No scouting reports found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReports.map(report => {
                        const healthBadge = getHealthBadge(report.overall_health_rating);
                        const hasCritical = scoutingService.hasCriticalIssues(report);
                        const pestCount = report.scouting_pests?.filter(p => p.present).length || 0;
                        const diseaseCount = report.scouting_diseases?.filter(d => d.present).length || 0;
                        const nutrientCount = report.scouting_nutrients?.length || 0;

                        return (
                          <TableRow key={report.id}>
                            <TableCell>{new Date(report.scouting_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{report.greenhouse_location}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{report.crop_type}</span>
                                <span className="text-xs text-gray-500">{report.variety}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {report.plantings?.batch_number || "-"}
                            </TableCell>
                            <TableCell>{report.seedling_age_days}</TableCell>
                            <TableCell>
                              <Badge variant={healthBadge.variant}>
                                {healthBadge.label} ({report.overall_health_rating}/5)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {hasCritical && (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Critical
                                  </Badge>
                                )}
                                {pestCount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary">{pestCount} Pests</Badge>
                                    {report.scouting_pests?.some(p => p.present && archivedItems.pests.includes(p.pest_name)) && (
                                      <Badge variant="outline" className="gap-1 text-xs">
                                        <Archive className="w-3 h-3" />
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {diseaseCount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary">{diseaseCount} Diseases</Badge>
                                    {report.scouting_diseases?.some(d => d.present && archivedItems.diseases.includes(d.disease_name)) && (
                                      <Badge variant="outline" className="gap-1 text-xs">
                                        <Archive className="w-3 h-3" />
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {nutrientCount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary">{nutrientCount} Deficiencies</Badge>
                                    {report.scouting_nutrients?.some(n => archivedItems.nutrients.includes(n.symptom)) && (
                                      <Badge variant="outline" className="gap-1 text-xs">
                                        <Archive className="w-3 h-3" />
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{report.scout_name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Link href={`/scouting/${report.id}`}>
                                  <Button size="sm" variant="outline" className="gap-1">
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                </Link>
                                {permissions.canDelete && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-red-600"
                                    onClick={() => handleDelete(report.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No scouting reports found
                </div>
              ) : (
                filteredReports.map(report => {
                  const healthBadge = getHealthBadge(report.overall_health_rating);
                  const hasCritical = scoutingService.hasCriticalIssues(report);
                  const alerts = scoutingService.getReportAlerts(report);
                  const pestCount = report.scouting_pests?.filter(p => p.present).length || 0;
                  const diseaseCount = report.scouting_diseases?.filter(d => d.present).length || 0;
                  const nutrientCount = report.scouting_nutrients?.length || 0;

                  return (
                    <Card 
                      key={report.id} 
                      className={`hover:border-orange-300 dark:hover:border-orange-700 transition-colors ${
                        hasCritical ? "border-red-300 dark:border-red-700" : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{report.crop_type}</CardTitle>
                            <CardDescription>{report.variety}</CardDescription>
                          </div>
                          <Badge variant={healthBadge.variant}>
                            {healthBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Critical Alerts */}
                        {alerts.length > 0 && (
                          <div className="space-y-1">
                            {alerts.map((alert, idx) => (
                              <Alert key={idx} variant="destructive" className="py-2">
                                <AlertDescription className="text-xs">{alert}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        {/* Key Info */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Greenhouse:</span>
                            <div className="font-medium">{report.greenhouse_location}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Age:</span>
                            <div className="font-medium">{report.seedling_age_days} days</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Batch:</span>
                            <div className="font-mono text-xs">{report.plantings?.batch_number || "-"}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Date:</span>
                            <div className="text-xs">{new Date(report.scouting_date).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {/* Issues Summary */}
                        <div className="pt-2 border-t">
                          <div className="flex flex-wrap gap-2">
                            {pestCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="gap-1">
                                  <Bug className="w-3 h-3" />
                                  {pestCount} Pest{pestCount > 1 ? "s" : ""}
                                </Badge>
                                {report.scouting_pests?.some(p => p.present && archivedItems.pests.includes(p.pest_name)) && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Archive className="w-3 h-3" />
                                  </Badge>
                                )}
                              </div>
                            )}
                            {diseaseCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="gap-1">
                                  <Leaf className="w-3 h-3" />
                                  {diseaseCount} Disease{diseaseCount > 1 ? "s" : ""}
                                </Badge>
                                {report.scouting_diseases?.some(d => d.present && archivedItems.diseases.includes(d.disease_name)) && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Archive className="w-3 h-3" />
                                  </Badge>
                                )}
                              </div>
                            )}
                            {nutrientCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary">
                                  {nutrientCount} Deficienc{nutrientCount > 1 ? "ies" : "y"}
                                </Badge>
                                {report.scouting_nutrients?.some(n => archivedItems.nutrients.includes(n.symptom)) && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Archive className="w-3 h-3" />
                                  </Badge>
                                )}
                              </div>
                            )}
                            {pestCount === 0 && diseaseCount === 0 && nutrientCount === 0 && (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                No issues detected
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Scout Info */}
                        <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t">
                          Scout: {report.scout_name}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Link href={`/scouting/${report.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <Eye className="w-4 h-4" />
                              View Details
                            </Button>
                          </Link>
                          {permissions.canDelete && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-600"
                              onClick={() => handleDelete(report.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}