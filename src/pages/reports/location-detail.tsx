
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, TrendingUp } from "lucide-react";
import { Location, Planting, PlantType, PlantVariety } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

interface LocationDetail {
  location: Location;
  plantings: Array<{
    planting: Planting;
    plantType: string;
    variety: string;
    expectedHarvestDate: Date;
  }>;
  totalPlanted: number;
  availableSpace: number;
}

export default function LocationDetailReportPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);

  useEffect(() => {
    setLocations(getStorageData<Location>(STORAGE_KEYS.LOCATIONS));
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

  const getPlantType = (plantTypeId: string) => {
    return plantTypes.find(pt => pt.id === plantTypeId);
  };

  const locationDetails = useMemo(() => {
    return locations
      .map(location => {
        const locationPlantings = plantings
          .filter(p => p.locationId === location.id && p.status === "active")
          .map(planting => {
            const plantType = getPlantType(planting.plantTypeId);
            const plantingDate = new Date(planting.plantingDate);
            const expectedHarvestDate = new Date(plantingDate);
            
            if (plantType?.growthDuration) {
              expectedHarvestDate.setDate(expectedHarvestDate.getDate() + plantType.growthDuration);
            }
            
            return {
              planting,
              plantType: getPlantTypeName(planting.plantTypeId),
              variety: getVarietyName(planting.varietyId),
              expectedHarvestDate
            };
          })
          .sort((a, b) => a.expectedHarvestDate.getTime() - b.expectedHarvestDate.getTime());
        
        const totalPlanted = locationPlantings.reduce((sum, lp) => sum + lp.planting.quantity, 0);
        const availableSpace = location.capacity - totalPlanted;
        
        return {
          location,
          plantings: locationPlantings,
          totalPlanted,
          availableSpace
        };
      })
      .filter(ld => ld.plantings.length > 0);
  }, [locations, plantings, plantTypes, varieties]);

  const exportToCSV = () => {
    const headers = ["Location", "Plant Type", "Variety", "Quantity", "Planting Date", "Expected Harvest Date"];
    const rows: string[][] = [];
    
    locationDetails.forEach(detail => {
      detail.plantings.forEach(lp => {
        rows.push([
          detail.location.name,
          lp.plantType,
          lp.variety,
          lp.planting.quantity.toString(),
          new Date(lp.planting.plantingDate).toLocaleDateString(),
          lp.expectedHarvestDate.toLocaleDateString()
        ]);
      });
    });

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `location-detail-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    const headers = ["Location", "Plant Type", "Variety", "Quantity", "Planting Date", "Expected Harvest Date"];
    const rows: string[][] = [];
    
    locationDetails.forEach(detail => {
      detail.plantings.forEach(lp => {
        rows.push([
          detail.location.name,
          lp.plantType,
          lp.variety,
          lp.planting.quantity.toString(),
          new Date(lp.planting.plantingDate).toLocaleDateString(),
          lp.expectedHarvestDate.toLocaleDateString()
        ]);
      });
    });

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
    a.download = `location-detail-report-${new Date().toISOString().split("T")[0]}.xls`;
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
            <TrendingUp className="w-8 h-8 text-teal-600" />
            Location Details
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
          <CardTitle>Overview</CardTitle>
          <CardDescription>Varieties planted per location with harvest dates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {locationDetails.length} location(s) with active plantings
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {locationDetails.map(detail => (
          <Card key={detail.location.id} className="border-l-4 border-l-teal-500">
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-xl">{detail.location.name}</CardTitle>
                  <CardDescription className="mt-2">
                    Capacity: {detail.location.capacity} | Planted: {detail.totalPlanted} | Available: {detail.availableSpace}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-teal-600 dark:text-teal-400">
                  {detail.plantings.length} Active Planting{detail.plantings.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {detail.plantings.map(lp => {
                  const today = new Date();
                  const daysUntilHarvest = Math.ceil(
                    (lp.expectedHarvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  const urgencyClass = daysUntilHarvest <= 3 
                    ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" 
                    : daysUntilHarvest <= 7 
                    ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" 
                    : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800";
                  
                  return (
                    <div key={lp.planting.id} className={`p-3 rounded-lg border ${urgencyClass}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{lp.plantType}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{lp.variety}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {lp.planting.quantity} units
                        </Badge>
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                          <span>{new Date(lp.planting.plantingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Ready:</span>
                          <span className={daysUntilHarvest <= 7 ? "font-medium text-orange-600 dark:text-orange-400" : ""}>
                            {lp.expectedHarvestDate.toLocaleDateString()}
                          </span>
                        </div>
                        {daysUntilHarvest <= 14 && (
                          <div className="flex justify-between mt-1 pt-1 border-t">
                            <span className="text-gray-600 dark:text-gray-400">Days left:</span>
                            <span className={`font-medium ${
                              daysUntilHarvest <= 3 ? "text-red-600 dark:text-red-400" :
                              daysUntilHarvest <= 7 ? "text-orange-600 dark:text-orange-400" :
                              "text-green-600 dark:text-green-400"
                            }`}>
                              {daysUntilHarvest}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {locationDetails.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No active plantings found across locations
          </div>
        )}
      </div>
    </div>
  );
}
