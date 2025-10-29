
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Calendar, AlertCircle } from "lucide-react";
import { Planting, PlantType, PlantVariety, Location } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

export default function UpcomingHarvestsReportPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [daysThreshold, setDaysThreshold] = useState("7");

  useEffect(() => {
    setPlantings(getStorageData<Planting>(STORAGE_KEYS.PLANTINGS));
    setPlantTypes(getStorageData<PlantType>(STORAGE_KEYS.PLANT_TYPES));
    setVarieties(getStorageData<PlantVariety>(STORAGE_KEYS.PLANT_VARIETIES));
    setLocations(getStorageData<Location>(STORAGE_KEYS.LOCATIONS));
  }, []);

  const getPlantTypeName = (plantTypeId: string) => {
    return plantTypes.find(pt => pt.id === plantTypeId)?.name || "Unknown";
  };

  const getVarietyName = (varietyId: string) => {
    return varieties.find(v => v.id === varietyId)?.name || "";
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || "Unknown";
  };

  const getPlantType = (plantTypeId: string) => {
    return plantTypes.find(pt => pt.id === plantTypeId);
  };

  const upcomingHarvests = useMemo(() => {
    const today = new Date();
    const thresholdDays = parseInt(daysThreshold);
    
    return plantings
      .filter(p => p.status === "active")
      .map(planting => {
        const plantType = getPlantType(planting.plantTypeId);
        const plantingDate = new Date(planting.plantingDate);
        const expectedHarvestDate = new Date(plantingDate);
        
        if (plantType?.growthDuration) {
          expectedHarvestDate.setDate(expectedHarvestDate.getDate() + plantType.growthDuration);
        }
        
        const daysUntilHarvest = Math.ceil((expectedHarvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...planting,
          expectedHarvestDate,
          daysUntilHarvest,
          plantType: plantType?.name || "Unknown",
          variety: getVarietyName(planting.varietyId),
          location: getLocationName(planting.locationId)
        };
      })
      .filter(p => p.daysUntilHarvest >= 0 && p.daysUntilHarvest <= thresholdDays)
      .sort((a, b) => a.daysUntilHarvest - b.daysUntilHarvest);
  }, [plantings, plantTypes, varieties, locations, daysThreshold]);

  const exportToCSV = () => {
    const headers = ["Plant Type", "Variety", "Location", "Quantity", "Remaining", "Planting Date", "Expected Harvest", "Days Until Harvest"];
    const rows = upcomingHarvests.map(h => [
      h.plantType,
      h.variety,
      h.location,
      h.quantity.toString(),
      (h.remainingQuantity ?? h.quantity).toString(),
      new Date(h.plantingDate).toLocaleDateString(),
      h.expectedHarvestDate.toLocaleDateString(),
      h.daysUntilHarvest.toString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upcoming-harvests-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    const headers = ["Plant Type", "Variety", "Location", "Quantity", "Remaining", "Planting Date", "Expected Harvest", "Days Until Harvest"];
    const rows = upcomingHarvests.map(h => [
      h.plantType,
      h.variety,
      h.location,
      h.quantity.toString(),
      (h.remainingQuantity ?? h.quantity).toString(),
      new Date(h.plantingDate).toLocaleDateString(),
      h.expectedHarvestDate.toLocaleDateString(),
      h.daysUntilHarvest.toString()
    ]);

    let excelContent = "<table><thead><tr>";
    headers.forEach(header => {
      excelContent += `<th>${header}</th>`;
    });
    excelContent += "</tr></thead><tbody>";
    
    rows.forEach(row => {
      excelContent += "<tr>";
      row.forEach(cell => {
        excelContent += `<td>${cell}</td>`;
      });
      excelContent += "</tr>";
    });
    excelContent += "</tbody></table>";

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upcoming-harvests-report-${new Date().toISOString().split("T")[0]}.xls`;
    a.click();
  };

  const exportToPDF = () => {
    window.print();
  };

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
            <Calendar className="w-8 h-8 text-orange-600" />
            Upcoming Harvests
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            CSV
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your report view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Label>Show harvests within:</Label>
              <Select value={daysThreshold} onValueChange={setDaysThreshold}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Next 3 days</SelectItem>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="14">Next 14 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {upcomingHarvests.length} upcoming harvest(s)
            </p>
          </div>
        </CardContent>
      </Card>

      {upcomingHarvests.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{upcomingHarvests.length} planting(s) ready for harvest soon</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingHarvests.map(harvest => {
          const remaining = harvest.remainingQuantity ?? harvest.quantity;
          const urgencyClass = harvest.daysUntilHarvest <= 3 
            ? "border-red-500 bg-red-50 dark:bg-red-950" 
            : harvest.daysUntilHarvest <= 7 
            ? "border-orange-500 bg-orange-50 dark:bg-orange-950" 
            : "border-green-500";
          
          const urgencyTextClass = harvest.daysUntilHarvest <= 3 
            ? "text-red-600 dark:text-red-400" 
            : harvest.daysUntilHarvest <= 7 
            ? "text-orange-600 dark:text-orange-400" 
            : "text-green-600 dark:text-green-400";
          
          return (
            <Card key={harvest.id} className={`hover:shadow-md transition-shadow border-l-4 ${urgencyClass}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{harvest.plantType}</CardTitle>
                    <CardDescription className="text-sm mt-1">{harvest.variety}</CardDescription>
                  </div>
                  <Badge variant="outline" className={urgencyTextClass}>
                    {harvest.daysUntilHarvest === 0 ? "Today" : 
                     harvest.daysUntilHarvest === 1 ? "Tomorrow" :
                     `${harvest.daysUntilHarvest}d`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Location:</span>
                  <span className="font-medium">{harvest.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                  <span className="font-medium">{harvest.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                  <span className="font-medium">{remaining}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                  <span className="font-medium">{new Date(harvest.plantingDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Expected:</span>
                  <span className="font-medium">{harvest.expectedHarvestDate.toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {upcomingHarvests.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No upcoming harvests in the selected timeframe
          </div>
        )}
      </div>
    </div>
  );
}
