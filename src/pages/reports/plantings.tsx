
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
import { Planting, PlantType, PlantVariety, Location } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

export default function PlantingsReportPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [varietyFilter, setVarietyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filteredPlantings = useMemo(() => {
    return plantings.filter(planting => {
      const plantingDate = new Date(planting.plantingDate);
      const matchesDate = (!startDate || plantingDate >= new Date(startDate)) &&
                         (!endDate || plantingDate <= new Date(endDate));
      const matchesVariety = varietyFilter === "all" || planting.varietyId === varietyFilter;
      const matchesStatus = statusFilter === "all" || planting.status === statusFilter;
      return matchesDate && matchesVariety && matchesStatus;
    });
  }, [plantings, startDate, endDate, varietyFilter, statusFilter]);

  const exportToCSV = () => {
    const headers = ["Plant Type", "Variety", "Location", "Quantity", "Remaining", "Status", "Planting Date", "Expected Harvest"];
    const rows = filteredPlantings.map(p => [
      getPlantTypeName(p.plantTypeId),
      getVarietyName(p.varietyId),
      getLocationName(p.locationId),
      p.quantity.toString(),
      (p.remainingQuantity ?? p.quantity).toString(),
      p.status,
      new Date(p.plantingDate).toLocaleDateString(),
      new Date(p.expectedHarvestDate).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantings-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    const headers = ["Plant Type", "Variety", "Location", "Quantity", "Remaining", "Status", "Planting Date", "Expected Harvest"];
    const rows = filteredPlantings.map(p => [
      getPlantTypeName(p.plantTypeId),
      getVarietyName(p.varietyId),
      getLocationName(p.locationId),
      p.quantity.toString(),
      (p.remainingQuantity ?? p.quantity).toString(),
      p.status,
      new Date(p.plantingDate).toLocaleDateString(),
      new Date(p.expectedHarvestDate).toLocaleDateString()
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
    a.download = `plantings-report-${new Date().toISOString().split("T")[0]}.xls`;
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
            <Sprout className="w-8 h-8 text-green-600" />
            Plantings Report
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="harvested">Harvested</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredPlantings.length} planting(s)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setVarietyFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlantings.map(planting => {
          const remaining = planting.remainingQuantity ?? planting.quantity;
          return (
            <Card key={planting.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {getPlantTypeName(planting.plantTypeId)}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {getVarietyName(planting.varietyId)}
                    </CardDescription>
                  </div>
                  <Badge className={
                    planting.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    planting.status === "closed" ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" :
                    planting.status === "harvested" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }>
                    {planting.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Location:</span>
                  <span className="font-medium">{getLocationName(planting.locationId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                  <span className="font-medium">{planting.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                  <span className={`font-medium ${remaining === 0 ? "text-gray-400" : ""}`}>
                    {remaining}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Planted Date:</span>
                  <span className="font-medium">{new Date(planting.plantingDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Expected Harvest:</span>
                  <span className="font-medium">{new Date(planting.expectedHarvestDate).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredPlantings.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No plantings found matching the selected filters
          </div>
        )}
      </div>
    </div>
  );
}
