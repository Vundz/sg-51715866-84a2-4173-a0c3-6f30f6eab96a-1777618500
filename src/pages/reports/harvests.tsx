
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
import { Harvest, Planting, PlantType, PlantVariety } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

export default function HarvestsReportPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [varietyFilter, setVarietyFilter] = useState("all");

  useEffect(() => {
    setHarvests(getStorageData<Harvest>(STORAGE_KEYS.HARVESTS));
    setPlantings(getStorageData<Planting>(STORAGE_KEYS.PLANTINGS));
    setPlantTypes(getStorageData<PlantType>(STORAGE_KEYS.PLANT_TYPES));
    setVarieties(getStorageData<PlantVariety>(STORAGE_KEYS.PLANT_VARIETIES));
  }, []);

  const getPlantTypeName = (plantTypeId: string) => {
    return plantTypes.find(pt => pt.id === plantTypeId)?.name || "Unknown";
  };

  const getVarietyName = (varietyId: string) => {
    return varieties.find(v => v.id === varietyId)?.name || "";
  };

  const harvestsReport = useMemo(() => {
    return harvests
      .filter(harvest => {
        const harvestDate = new Date(harvest.harvestDate);
        const matchesDate = (!startDate || harvestDate >= new Date(startDate)) &&
                           (!endDate || harvestDate <= new Date(endDate));
        
        const planting = plantings.find(p => p.id === harvest.plantingId);
        const matchesVariety = varietyFilter === "all" || planting?.varietyId === varietyFilter;
        
        return matchesDate && matchesVariety;
      })
      .map(harvest => {
        const planting = plantings.find(p => p.id === harvest.plantingId);
        const plantType = planting ? getPlantTypeName(planting.plantTypeId) : "Unknown";
        const variety = planting ? getVarietyName(planting.varietyId) : "";
        const plantedQty = planting?.quantity || 0;
        const variance = harvest.quantity - plantedQty;
        const variancePercent = plantedQty > 0 ? ((variance / plantedQty) * 100).toFixed(1) : "0";
        
        return {
          ...harvest,
          plantType,
          variety,
          plantedQty,
          variance,
          variancePercent
        };
      });
  }, [harvests, plantings, startDate, endDate, varietyFilter]);

  const exportToCSV = () => {
    const headers = ["Plant Type", "Variety", "Harvest Date", "Quality", "Planted Qty", "Harvested Qty", "Variance", "Variance %"];
    const rows = harvestsReport.map(h => [
      h.plantType,
      h.variety,
      new Date(h.harvestDate).toLocaleDateString(),
      h.quality,
      h.plantedQty.toString(),
      h.quantity.toString(),
      h.variance.toString(),
      h.variancePercent
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harvests-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    const headers = ["Plant Type", "Variety", "Harvest Date", "Quality", "Planted Qty", "Harvested Qty", "Variance", "Variance %"];
    const rows = harvestsReport.map(h => [
      h.plantType,
      h.variety,
      new Date(h.harvestDate).toLocaleDateString(),
      h.quality,
      h.plantedQty.toString(),
      h.quantity.toString(),
      h.variance.toString(),
      h.variancePercent
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
    a.download = `harvests-report-${new Date().toISOString().split("T")[0]}.xls`;
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
            <Package className="w-8 h-8 text-blue-600" />
            Harvest Analysis
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Variety</Label>
              <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Varieties</SelectItem>
                  {varieties.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {harvestsReport.length} harvest(s)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setVarietyFilter("all");
              }}
            >
              Clear Filters
            </Button>
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
                  <div className="flex-1">
                    <CardTitle className="text-base">{harvest.plantType}</CardTitle>
                    <CardDescription className="text-sm mt-1">{harvest.variety}</CardDescription>
                  </div>
                  <Badge className={
                    harvest.quality === "excellent" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    harvest.quality === "good" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    harvest.quality === "fair" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }>
                    {harvest.quality}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Harvest Date:</span>
                  <span className="font-medium">{new Date(harvest.harvestDate).toLocaleDateString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                  <span className="font-medium">{harvest.plantedQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Harvested:</span>
                  <span className="font-medium">{harvest.quantity}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                  <span className={`font-bold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {isPositive ? "+" : ""}{harvest.variance}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Variance %:</span>
                  <span className={`font-bold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {isPositive ? "+" : ""}{harvest.variancePercent}%
                  </span>
                </div>
                {harvest.notes && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Notes: </span>
                      {harvest.notes}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
        {harvestsReport.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No harvests found matching the selected filters
          </div>
        )}
      </div>
    </div>
  );
}
