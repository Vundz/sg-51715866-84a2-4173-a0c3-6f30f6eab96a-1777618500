import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Sprout } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { locationService } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";

type PlantingData = Awaited<ReturnType<typeof plantingService.getPlantings>>[0];
type PlantTypeData = Database["public"]["Tables"]["plant_types"]["Row"];
type LocationData = Database["public"]["Tables"]["locations"]["Row"];

const PlantingsReportPage: React.FC = () => {
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantTypeData[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plantTypeFilter, setPlantTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [plantingsData, plantTypesData, locationsData] = await Promise.all([
          plantingService.getPlantings(),
          plantTypeService.getPlantTypes(),
          locationService.getLocations(),
        ]);
        setPlantings(plantingsData as PlantingData[]);
        setPlantTypes(plantTypesData);
        setLocations(locationsData);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const getPlantTypeDetails = (plantTypeId: string) => plantTypes.find(pt => pt.id === plantTypeId);
  const getLocationName = (locationId: string) => locations.find(l => l.id === locationId)?.name || "N/A";

  const filteredPlantings = useMemo(() => {
    return plantings.filter(p => {
      const pDate = new Date(p.date_planted);
      const matchesDate = (!startDate || pDate >= new Date(startDate)) && (!endDate || pDate <= new Date(endDate));
      const matchesPlantType = plantTypeFilter === "all" || p.plant_type_id === plantTypeFilter;
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesDate && matchesPlantType && matchesStatus;
    });
  }, [plantings, startDate, endDate, plantTypeFilter, statusFilter]);

  const getExpectedHarvestDate = (planting: PlantingData) => {
    const plantType = getPlantTypeDetails(planting.plant_type_id);
    if (!plantType?.growth_duration) return "N/A";
    const date = new Date(planting.date_planted);
    date.setDate(date.getDate() + plantType.growth_duration);
    return date.toLocaleDateString();
  };

  const exportToCSV = () => console.log("Exporting to CSV...");
  const exportToExcel = () => console.log("Exporting to Excel...");
  const exportToPDF = () => window.print();

  if (loading) return <div>Loading report...</div>

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="w-4 h-4" />Back to Reports</Button></Link>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3"><Sprout className="w-8 h-8 text-green-600" />Plantings Report</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2"><FileText className="w-4 h-4" />CSV</Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2"><FileSpreadsheet className="w-4 h-4" />Excel</Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle><CardDescription>Customize your report view</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}/></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}/></div>
            <div className="space-y-2">
              <Label>Plant Type</Label>
              <Select value={plantTypeFilter} onValueChange={setPlantTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plant Types</SelectItem>
                  {plantTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name} ({pt.variety})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="harvested">Harvested</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Showing {filteredPlantings.length} planting(s)</p>
            <Button variant="outline" size="sm" onClick={() => {setStartDate(""); setEndDate(""); setPlantTypeFilter("all"); setStatusFilter("all");}}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlantings.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{getPlantTypeDetails(p.plant_type_id)?.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">{p.variety}</CardDescription>
                </div>
                <Badge className={
                  p.status === "active" ? "bg-green-100 text-green-800" :
                  p.status === "closed" ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"
                }>{p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Location:</span><span className="font-medium">{getLocationName(p.location_id)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Planted:</span><span className="font-medium">{formatNumber(p.quantity)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Remaining:</span><span className={`font-medium ${p.remaining_quantity === 0 ? "text-gray-400" : ""}`}>{formatNumber(p.remaining_quantity ?? p.quantity)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><span className="text-gray-600">Planted Date:</span><span className="font-medium">{new Date(p.date_planted).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Expected Harvest:</span><span className="font-medium">{getExpectedHarvestDate(p)}</span></div>
            </CardContent>
          </Card>
        ))}
        {filteredPlantings.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No plantings found matching filters</div>}
      </div>
    </div>
  );
}

export default PlantingsReportPage;