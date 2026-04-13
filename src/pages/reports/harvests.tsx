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

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [plantTypeFilter, setPlantTypeFilter] = useState<string>("all");
  const [varietyFilter, setVarietyFilter] = useState<string>("all");

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
    // Get distinct batches (plantings) that have been harvested
    const batchesWithHarvests = plantings.filter(planting => {
      // Check if this planting has any harvests
      const plantingHarvests = harvests.filter(h => h.planting_id === planting.id);
      if (plantingHarvests.length === 0) return false;

      // Apply date filter on harvests
      const hasMatchingHarvest = plantingHarvests.some(harvest => {
        const harvestDate = new Date(harvest.harvest_date);
        return (!startDate || harvestDate >= new Date(startDate)) &&
               (!endDate || harvestDate <= new Date(endDate));
      });
      if (!hasMatchingHarvest) return false;

      // Apply plant type filter (by name)
      const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);
      const matchesPlantType = plantTypeFilter === "all" || plantType?.name === plantTypeFilter;
      if (!matchesPlantType) return false;

      // Apply variety filter
      const variety = planting.variety || plantType?.variety || "";
      const matchesVariety = varietyFilter === "all" || variety === varietyFilter;
      
      return matchesVariety;
    });

    // For each batch, calculate harvest metrics
    return batchesWithHarvests.map(planting => {
      const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);
      const plantingHarvests = harvests.filter(h => {
        const harvestDate = new Date(h.harvest_date);
        const matchesDate = (!startDate || harvestDate >= new Date(startDate)) &&
                           (!endDate || harvestDate <= new Date(endDate));
        return h.planting_id === planting.id && matchesDate;
      });

      const totalHarvested = plantingHarvests.reduce((sum, h) => sum + h.quantity_harvested, 0);
      const totalPlanted = planting.quantity;
      const variance = totalHarvested - totalPlanted;
      const variancePercent = totalPlanted > 0 ? ((variance / totalPlanted) * 100).toFixed(1) : "0";
      
      // Get latest harvest
      const sortedHarvests = plantingHarvests.sort((a, b) => 
        new Date(b.harvest_date).getTime() - new Date(a.harvest_date).getTime()
      );
      const latestHarvest = sortedHarvests[0];

      // Collect unique qualities and notes
      const qualities = [...new Set(plantingHarvests.map(h => h.quality).filter(Boolean))];
      const notes = plantingHarvests.map(h => h.notes).filter(Boolean);

      return {
        batchId: planting.id,
        batchNumber: planting.batch_number,
        plantType: plantType?.name || "N/A",
        variety: planting.variety || plantType?.variety || "N/A",
        totalPlanted,
        totalHarvested,
        harvestCount: plantingHarvests.length,
        latestHarvestDate: latestHarvest?.harvest_date || "",
        qualities,
        notes,
        variance,
        variancePercent,
        datePlanted: planting.date_planted
      };
    }).sort((a, b) => a.plantType.localeCompare(b.plantType) || a.variety.localeCompare(b.variety));
  }, [harvests, plantings, plantTypes, startDate, endDate, plantTypeFilter, varietyFilter]);

  // Get distinct plant types for the filter dropdown (by name, not ID)
  const distinctPlantTypes = useMemo(() => {
    const uniqueTypes = new Map<string, string>();
    
    plantTypes.forEach(pt => {
      if (!uniqueTypes.has(pt.name)) {
        uniqueTypes.set(pt.name, pt.name);
      }
    });
    
    return Array.from(uniqueTypes.values()).sort((a, b) => a.localeCompare(b));
  }, [plantTypes]);

  // Get varieties based on selected plant type
  const availableVarieties = useMemo(() => {
    if (plantTypeFilter === "all") {
      // Show all varieties from all plant types
      const allVarieties = new Set<string>();
      plantings.forEach(p => {
        const plantType = plantTypes.find(pt => pt.id === p.plant_type_id);
        const variety = p.variety || plantType?.variety;
        if (variety) allVarieties.add(variety);
      });
      return Array.from(allVarieties).sort();
    } else {
      // Show varieties only for selected plant type (by name)
      const varieties = new Set<string>();
      plantings
        .filter(p => {
          const plantType = plantTypes.find(pt => pt.id === p.plant_type_id);
          return plantType?.name === plantTypeFilter;
        })
        .forEach(p => {
          const plantType = plantTypes.find(pt => pt.id === p.plant_type_id);
          const variety = p.variety || plantType?.variety;
          if (variety) varieties.add(variety);
        });
      return Array.from(varieties).sort();
    }
  }, [plantings, plantTypes, plantTypeFilter]);

  // Reset variety filter when plant type changes
  useEffect(() => {
    setVarietyFilter("all");
  }, [plantTypeFilter]);

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
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Plant Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plant Types</SelectItem>
                  {distinctPlantTypes.map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Variety</Label>
              <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Varieties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Varieties</SelectItem>
                  {availableVarieties.map(variety => (
                    <SelectItem key={variety} value={variety}>
                      {variety}
                    </SelectItem>
                  ))}
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
        {harvestsReport.map(item => {
          const isPositive = item.variance >= 0;
          const avgQuality = item.qualities.length > 0 ? item.qualities[0] : "fair";
          
          return (
            <Card key={item.batchId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{item.plantType}</CardTitle>
                    <CardDescription className="text-sm mt-1">{item.variety}</CardDescription>
                    <div className="text-xs text-gray-500 mt-1 font-mono">Batch: {item.batchNumber}</div>
                  </div>
                  <Badge className={
                    avgQuality === "excellent" ? "bg-green-100 text-green-800" :
                    avgQuality === "good" ? "bg-blue-100 text-blue-800" :
                    avgQuality === "fair" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                  }>{avgQuality}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date Planted:</span>
                  <span className="font-medium">{new Date(item.datePlanted).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Harvests:</span>
                  <span className="font-medium">{item.harvestCount} time{item.harvestCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Latest Harvest:</span>
                  <span className="font-medium">{new Date(item.latestHarvestDate).toLocaleDateString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Planted:</span>
                  <span className="font-medium">{formatNumber(item.totalPlanted)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Harvested:</span>
                  <span className="font-medium">{formatNumber(item.totalHarvested)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                  <span className={`font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? "+" : ""}{formatNumber(item.variance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Variance %:</span>
                  <span className={`font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? "+" : ""}{item.variancePercent}%
                  </span>
                </div>
                {item.qualities.length > 1 && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Qualities: </span>
                      {item.qualities.join(", ")}
                    </div>
                  </>
                )}
                {item.notes.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                      <span className="font-medium">Notes: </span>
                      {item.notes.slice(0, 2).join(" • ")}
                      {item.notes.length > 2 && " ..."}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
        {harvestsReport.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No harvests found matching filters
          </div>
        )}
      </div>
    </div>
  );
}

export default HarvestsReportPage;