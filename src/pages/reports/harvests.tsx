import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Package } from "lucide-react";
import { harvestService } from "@/services/harvestService";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { useToast } from "@/hooks/use-toast";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";

type HarvestData = Awaited<ReturnType<typeof harvestService.getHarvests>>[0];
type PlantingData = Database["public"]["Tables"]["plantings"]["Row"];
type PlantTypeData = Database["public"]["Tables"]["plant_types"]["Row"];

const HarvestsReportPage: React.FC = () => {
  const [harvests, setHarvests] = useState<HarvestData[]>([]);
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plantTypeFilter, setPlantTypeFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [harvestsData, plantingsData, plantTypesData] = await Promise.all([
          harvestService.getHarvests(),
          plantingService.getPlantings(),
          plantTypeService.getPlantTypes(),
        ]);
        setHarvests(harvestsData as HarvestData[]);
        setPlantings(plantingsData as PlantingData[]);
        setPlantTypes(plantTypesData);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const harvestsReport = useMemo(() => {
    return harvests
      .filter(harvest => {
        const harvestDate = new Date(harvest.harvest_date);
        const matchesDate = (!startDate || harvestDate >= new Date(startDate)) &&
                           (!endDate || harvestDate <= new Date(endDate));
        
        const planting = plantings.find(p => p.id === harvest.planting_id);
        const matchesPlantType = plantTypeFilter === "all" || planting?.plant_type_id === plantTypeFilter;
        
        return matchesDate && matchesPlantType;
      })
      .map(harvest => {
        const planting = plantings.find(p => p.id === harvest.planting_id);
        const plantType = plantTypes.find(pt => pt.id === planting?.plant_type_id);
        const plantedQty = planting?.quantity || 0;
        const variance = harvest.quantity_harvested - plantedQty;
        const variancePercent = plantedQty > 0 ? ((variance / plantedQty) * 100).toFixed(1) : "0";
        
        return {
          ...harvest,
          plantType: plantType?.name || "N/A",
          variety: planting?.variety || "N/A",
          plantedQty,
          variance,
          variancePercent
        };
      });
  }, [harvests, plantings, plantTypes, startDate, endDate, plantTypeFilter]);

  const exportToCSV = () => console.log("Exporting to CSV...");
  const exportToExcel = () => console.log("Exporting to Excel...");
  const exportToPDF = () => window.print();
  
  if (loading) return <div>Loading report...</div>

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Reports
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Harvest Analysis
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2"><FileText className="w-4 h-4" />CSV</Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2"><FileSpreadsheet className="w-4 h-4" />Excel</Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your report view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Showing {harvestsReport.length} harvest(s)</p>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setPlantTypeFilter("all"); }}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {harvestsReport.map(harvest => {
          const isPositive = harvest.variance >= 0;
          return (
            <Card key={harvest.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1"><CardTitle className="text-base">{harvest.plantType}</CardTitle><CardDescription className="text-sm mt-1">{harvest.variety}</CardDescription></div>
                  <Badge className={
                    harvest.quality === "excellent" ? "bg-green-100 text-green-800" :
                    harvest.quality === "good" ? "bg-blue-100 text-blue-800" :
                    harvest.quality === "fair" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                  }>{harvest.quality}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Harvest Date:</span><span className="font-medium">{new Date(harvest.harvest_date).toLocaleDateString()}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Planted:</span><span className="font-medium">{formatNumber(harvest.plantedQty)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Harvested:</span><span className="font-medium">{formatNumber(harvest.quantity_harvested)}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Variance:</span><span className={`font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>{isPositive ? "+" : ""}{formatNumber(harvest.variance)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Variance %:</span><span className={`font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>{isPositive ? "+" : ""}{harvest.variancePercent}%</span></div>
                {harvest.notes && <><Separator className="my-2" /><div className="text-xs text-gray-600"><span className="font-medium">Notes: </span>{harvest.notes}</div></>}
              </CardContent>
            </Card>
          );
        })}
        {harvestsReport.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No harvests found matching filters</div>}
      </div>
    </div>
  );
}

export default HarvestsReportPage;