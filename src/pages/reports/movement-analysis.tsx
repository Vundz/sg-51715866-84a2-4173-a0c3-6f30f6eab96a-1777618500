import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertCircle, Download } from "lucide-react";
import { harvestService } from "@/services/harvestService";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { useToast } from "@/hooks/use-toast";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";
import * as XLSX from "xlsx";

type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
type Planting = Database["public"]["Tables"]["plantings"]["Row"];
type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];

export default function MovementAnalysisReport() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [plantTypeFilter, setPlantTypeFilter] = useState<string>("all");
  const [varietyFilter, setVarietyFilter] = useState<string>("all");
  const [movementCategoryFilter, setMovementCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [harvestsData, plantingsData, plantTypesData] = await Promise.all([
        harvestService.getHarvests(),
        plantingService.getPlantings(),
        plantTypeService.getPlantTypes(),
      ]);
      setHarvests(harvestsData);
      setPlantings(plantingsData);
      setPlantTypes(plantTypesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const movementReport = useMemo(() => {
    const today = new Date();
    
    return plantings
      .filter(planting => {
        // Apply date range filter on planting date
        const plantingDate = new Date(planting.date_planted);
        if (startDate && plantingDate < new Date(startDate)) return false;
        if (endDate && plantingDate > new Date(endDate)) return false;

        // Apply plant type filter
        const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);
        if (plantTypeFilter !== "all" && plantType?.name !== plantTypeFilter) return false;

        // Apply variety filter
        const variety = planting.variety || plantType?.variety || "";
        if (varietyFilter !== "all" && variety !== varietyFilter) return false;

        return true;
      })
      .map(planting => {
        const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);
        const plantingHarvests = harvests
          .filter(h => h.planting_id === planting.id)
          .sort((a, b) => new Date(a.harvest_date).getTime() - new Date(b.harvest_date).getTime());

        const datePlanted = new Date(planting.date_planted);
        const firstHarvestDate = plantingHarvests.length > 0 ? new Date(plantingHarvests[0].harvest_date) : null;
        const lastHarvestDate = plantingHarvests.length > 0 ? new Date(plantingHarvests[plantingHarvests.length - 1].harvest_date) : null;
        
        // Calculate metrics
        const daysToFirstHarvest = firstHarvestDate 
          ? Math.ceil((firstHarvestDate.getTime() - datePlanted.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        const daysToCompletion = lastHarvestDate
          ? Math.ceil((lastHarvestDate.getTime() - datePlanted.getTime()) / (1000 * 60 * 60 * 24))
          : Math.ceil((today.getTime() - datePlanted.getTime()) / (1000 * 60 * 60 * 24));
        
        const totalHarvestEvents = plantingHarvests.length;
        const totalHarvestVolume = plantingHarvests.reduce((sum, h) => sum + h.quantity_harvested, 0);
        
        const avgDaysBetweenHarvests = totalHarvestEvents > 1
          ? daysToCompletion / (totalHarvestEvents - 1)
          : null;
        
        const harvestVelocity = daysToCompletion > 0
          ? totalHarvestVolume / daysToCompletion
          : 0;
        
        const isActive = planting.remaining_quantity && planting.remaining_quantity > 0;
        const completionStatus = isActive ? "active" : "completed";

        // Determine movement category
        let movementCategory: string;
        if (totalHarvestEvents === 0 && daysToCompletion >= 30) {
          movementCategory = "stalled";
        } else if (totalHarvestEvents >= 2 && daysToCompletion <= 30) {
          movementCategory = "fast";
        } else if (daysToCompletion <= 60) {
          movementCategory = "medium";
        } else {
          movementCategory = "slow";
        }

        return {
          batchId: planting.id,
          batchNumber: planting.batch_number,
          plantType: plantType?.name || "N/A",
          variety: planting.variety || plantType?.variety || "N/A",
          datePlanted: planting.date_planted,
          firstHarvestDate: firstHarvestDate?.toISOString() || null,
          lastHarvestDate: lastHarvestDate?.toISOString() || null,
          daysToFirstHarvest,
          daysToCompletion,
          totalHarvestEvents,
          totalHarvestVolume,
          avgDaysBetweenHarvests,
          harvestVelocity,
          completionStatus,
          movementCategory,
          totalPlanted: planting.quantity,
          remainingQuantity: planting.remaining_quantity || 0
        };
      })
      .filter(item => {
        // Apply status filter
        if (statusFilter !== "all" && item.completionStatus !== statusFilter) return false;
        
        // Apply movement category filter
        if (movementCategoryFilter !== "all" && item.movementCategory !== movementCategoryFilter) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by movement category priority, then by days to completion
        const categoryOrder = { fast: 0, medium: 1, slow: 2, stalled: 3 };
        const categoryDiff = categoryOrder[a.movementCategory as keyof typeof categoryOrder] - 
                            categoryOrder[b.movementCategory as keyof typeof categoryOrder];
        return categoryDiff !== 0 ? categoryDiff : a.daysToCompletion - b.daysToCompletion;
      });
  }, [plantings, harvests, plantTypes, startDate, endDate, plantTypeFilter, varietyFilter, statusFilter, movementCategoryFilter]);

  // Get distinct plant types
  const distinctPlantTypes = useMemo(() => {
    const uniqueTypes = new Map<string, string>();
    plantTypes.forEach(pt => {
      if (!uniqueTypes.has(pt.name)) {
        uniqueTypes.set(pt.name, pt.name);
      }
    });
    return Array.from(uniqueTypes.values()).sort();
  }, [plantTypes]);

  // Get varieties based on selected plant type
  const availableVarieties = useMemo(() => {
    if (plantTypeFilter === "all") {
      const allVarieties = new Set<string>();
      plantings.forEach(p => {
        const plantType = plantTypes.find(pt => pt.id === p.plant_type_id);
        const variety = p.variety || plantType?.variety;
        if (variety) allVarieties.add(variety);
      });
      return Array.from(allVarieties).sort();
    } else {
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

  useEffect(() => {
    setVarietyFilter("all");
  }, [plantTypeFilter]);

  // Chart data - Average days to completion by plant type
  const chartData = useMemo(() => {
    const byPlantType = movementReport.reduce((acc, item) => {
      if (!acc[item.plantType]) {
        acc[item.plantType] = { total: 0, count: 0 };
      }
      acc[item.plantType].total += item.daysToCompletion;
      acc[item.plantType].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const labels = Object.keys(byPlantType).sort();
    const data = labels.map(label => byPlantType[label].total / byPlantType[label].count);

    return {
      labels,
      datasets: [{
        label: "Average Days to Completion",
        data,
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      }],
    };
  }, [movementReport]);

  const exportToExcel = () => {
    const exportData = movementReport.map(item => ({
      "Batch Number": item.batchNumber,
      "Plant Type": item.plantType,
      "Variety": item.variety,
      "Date Planted": new Date(item.datePlanted).toLocaleDateString(),
      "First Harvest": item.firstHarvestDate ? new Date(item.firstHarvestDate).toLocaleDateString() : "N/A",
      "Last Harvest": item.lastHarvestDate ? new Date(item.lastHarvestDate).toLocaleDateString() : "N/A",
      "Days to First Harvest": item.daysToFirstHarvest ?? "N/A",
      "Days to Completion": item.daysToCompletion,
      "Total Harvest Events": item.totalHarvestEvents,
      "Total Harvest Volume": item.totalHarvestVolume,
      "Avg Days Between Harvests": item.avgDaysBetweenHarvests ? item.avgDaysBetweenHarvests.toFixed(1) : "N/A",
      "Harvest Velocity (units/day)": item.harvestVelocity.toFixed(2),
      "Total Planted": item.totalPlanted,
      "Remaining": item.remainingQuantity,
      "Status": item.completionStatus.charAt(0).toUpperCase() + item.completionStatus.slice(1),
      "Movement Category": item.movementCategory.charAt(0).toUpperCase() + item.movementCategory.slice(1)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movement Analysis");
    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `movement-analysis-${date}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading movement analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Movement Analysis</h1>
            <p className="text-muted-foreground">Track seedling production velocity and turnover rates</p>
          </div>
        </div>
        <Button onClick={exportToExcel} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Plant Type</Label>
              <Select value={plantTypeFilter} onValueChange={setPlantTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Plant Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plant Types</SelectItem>
                  {distinctPlantTypes.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variety</Label>
              <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Varieties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Varieties</SelectItem>
                  {availableVarieties.map(variety => (
                    <SelectItem key={variety} value={variety}>{variety}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Movement Category</Label>
              <Select value={movementCategoryFilter} onValueChange={setMovementCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="fast">Fast Movers</SelectItem>
                  <SelectItem value="medium">Medium Movers</SelectItem>
                  <SelectItem value="slow">Slow Movers</SelectItem>
                  <SelectItem value="stalled">Stalled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Days to Completion by Plant Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar data={chartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: { y: { beginAtZero: true, title: { display: true, text: "Days" } } }
            }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {movementReport.map(item => {
          const categoryConfig = {
            fast: { label: "Fast Mover", color: "bg-green-100 text-green-800", icon: TrendingUp },
            medium: { label: "Medium Mover", color: "bg-blue-100 text-blue-800", icon: Minus },
            slow: { label: "Slow Mover", color: "bg-yellow-100 text-yellow-800", icon: TrendingDown },
            stalled: { label: "Stalled", color: "bg-red-100 text-red-800", icon: AlertCircle }
          };
          const config = categoryConfig[item.movementCategory as keyof typeof categoryConfig];
          const Icon = config.icon;

          return (
            <Card key={item.batchId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{item.plantType}</CardTitle>
                    <CardDescription className="text-sm mt-1">{item.variety}</CardDescription>
                    <div className="text-xs text-gray-500 mt-1 font-mono">Batch: {item.batchNumber}</div>
                  </div>
                  <Badge className={config.color}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date Planted:</span>
                  <span className="font-medium">{new Date(item.datePlanted).toLocaleDateString()}</span>
                </div>
                {item.firstHarvestDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">First Harvest:</span>
                    <span className="font-medium">{new Date(item.firstHarvestDate).toLocaleDateString()}</span>
                  </div>
                )}
                {item.lastHarvestDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Harvest:</span>
                    <span className="font-medium">{new Date(item.lastHarvestDate).toLocaleDateString()}</span>
                  </div>
                )}
                <Separator className="my-2" />
                {item.daysToFirstHarvest !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Days to 1st Harvest:</span>
                    <span className="font-medium">{item.daysToFirstHarvest} days</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Days Active:</span>
                  <span className="font-medium">{item.daysToCompletion} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Harvests:</span>
                  <span className="font-medium">{item.totalHarvestEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Volume:</span>
                  <span className="font-medium">{formatNumber(item.totalHarvestVolume)}</span>
                </div>
                {item.avgDaysBetweenHarvests !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Between Harvests:</span>
                    <span className="font-medium">{item.avgDaysBetweenHarvests.toFixed(1)} days</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Harvest Velocity:</span>
                  <span className="font-bold text-blue-600">{item.harvestVelocity.toFixed(2)} units/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <Badge variant="outline" className="text-xs">
                    {item.completionStatus === "active" ? "Active" : "Completed"}
                  </Badge>
                </div>
                {item.completionStatus === "active" && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className="font-medium">{formatNumber(item.remainingQuantity)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {movementReport.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No batches found matching filters
          </div>
        )}
      </div>
    </div>
  );
}