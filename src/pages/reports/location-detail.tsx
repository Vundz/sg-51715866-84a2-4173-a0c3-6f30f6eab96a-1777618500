
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, TrendingUp } from "lucide-react";
import { Location, Planting, PlantType } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

interface LocationDetail {
  location: Location;
  plantings: Array<{
    planting: Planting;
    plantTypeName: string;
    expectedHarvestDate: Date;
  }>;
  totalPlanted: number;
  availableSpace: number;
}

export default function LocationDetailReportPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);

  useEffect(() => {
    setLocations(getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || []);
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
  }, []);

  const getPlantTypeDetails = (plantTypeId: string) => plantTypes.find(pt => pt.id === plantTypeId);

  const locationDetails: LocationDetail[] = useMemo(() => {
    return locations
      .map(location => {
        const locationPlantings = plantings
          .filter(p => p.locationId === location.id && p.status === "active")
          .map(planting => {
            const plantType = getPlantTypeDetails(planting.plantTypeId);
            const plantingDate = new Date(planting.datePlanted);
            const expectedHarvestDate = new Date(plantingDate);
            if (plantType?.growthDuration) {
              expectedHarvestDate.setDate(expectedHarvestDate.getDate() + plantType.growthDuration);
            }
            return {
              planting,
              plantTypeName: plantType?.name || "N/A",
              expectedHarvestDate
            };
          })
          .sort((a, b) => a.expectedHarvestDate.getTime() - b.expectedHarvestDate.getTime());
        
        const totalPlanted = locationPlantings.reduce((sum, lp) => sum + lp.planting.quantity, 0);
        const availableSpace = location.capacity - totalPlanted;
        
        return { location, plantings: locationPlantings, totalPlanted, availableSpace };
      })
      .filter(ld => ld.plantings.length > 0);
  }, [locations, plantings, plantTypes]);

  const exportToCSV = () => console.log("Exporting CSV...");
  const exportToExcel = () => console.log("Exporting Excel...");
  const exportToPDF = () => window.print();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="w-4 h-4" />Back to Reports</Button></Link>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3"><TrendingUp className="w-8 h-8 text-teal-600" />Location Details</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2"><FileText className="w-4 h-4" />CSV</Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2"><FileSpreadsheet className="w-4 h-4" />Excel</Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Overview</CardTitle><CardDescription>Varieties planted per location with harvest dates</CardDescription></CardHeader>
        <CardContent><p className="text-sm text-gray-600">Showing {locationDetails.length} location(s) with active plantings</p></CardContent>
      </Card>

      <div className="space-y-6">
        {locationDetails.map(detail => (
          <Card key={detail.location.id} className="border-l-4 border-l-teal-500">
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-xl">{detail.location.name}</CardTitle>
                  <CardDescription className="mt-2">Capacity: {detail.location.capacity} | Planted: {detail.totalPlanted} | Available: {detail.availableSpace}</CardDescription>
                </div>
                <Badge variant="outline" className="text-teal-600">{detail.plantings.length} Active Planting(s)</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {detail.plantings.map(({ planting, plantTypeName, expectedHarvestDate }) => {
                  const daysUntilHarvest = Math.ceil((expectedHarvestDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={planting.id} className="p-3 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1"><p className="font-medium text-sm">{plantTypeName}</p><p className="text-xs text-gray-600">{planting.variety}</p></div>
                        <Badge variant="outline" className="text-xs shrink-0">{planting.quantity} units</Badge>
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-600">Planted:</span><span>{new Date(planting.datePlanted).toLocaleDateString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Ready:</span><span className={daysUntilHarvest <= 7 ? "font-medium text-orange-600" : ""}>{expectedHarvestDate.toLocaleDateString()}</span></div>
                        {daysUntilHarvest <= 14 && <div className="flex justify-between mt-1 pt-1 border-t"><span className="text-gray-600">Days left:</span><span className={`font-medium ${daysUntilHarvest <= 3 ? "text-red-600" : daysUntilHarvest <= 7 ? "text-orange-600" : "text-green-600"}`}>{daysUntilHarvest}</span></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {locationDetails.length === 0 && <div className="text-center py-12 text-gray-500">No active plantings found across locations</div>}
      </div>
    </div>
  );
}
