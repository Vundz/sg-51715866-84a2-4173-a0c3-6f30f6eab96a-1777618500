import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, MapPin } from "lucide-react";
import { locationService } from "@/services/locationService";
import { plantingService } from "@/services/plantingService";
import { useToast } from "@/hooks/use-toast";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import type { Database } from "@/integrations/supabase/types";

type LocationData = Database["public"]["Tables"]["locations"]["Row"];
type PlantingData = Database["public"]["Tables"]["plantings"]["Row"];

const LocationSummaryReport: React.FC = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [locationsData, plantingsData] = await Promise.all([
          locationService.getLocations(),
          plantingService.getPlantings(),
        ]);
        setLocations(locationsData);
        setPlantings(plantingsData as PlantingData[]);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const locationSummary = useMemo(() => {
    return locations.map(location => {
      const locationPlantings = plantings.filter(p => 
        p.location_id === location.id && p.status === "active"
      );
      const totalPlanted = locationPlantings.reduce((sum, p) => sum + p.quantity, 0);
      const capacity = location.capacity ?? 0;
      const availableSpace = capacity - totalPlanted;
      const utilizationPercent = capacity > 0 
        ? ((totalPlanted / capacity) * 100).toFixed(1) 
        : "0";
      
      return {
        ...location,
        totalPlanted,
        availableSpace,
        utilizationPercent,
        plantingCount: locationPlantings.length
      };
    });
  }, [locations, plantings]);

  const exportToCSV = () => console.log("Exporting to CSV is not implemented yet.");
  const exportToExcel = () => console.log("Exporting to Excel is not implemented yet.");
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
            <MapPin className="w-8 h-8 text-purple-600" />
            Location Summary
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
          <CardDescription>Capacity utilization across all locations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {locationSummary.length} location(s)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationSummary.map(location => {
          const utilization = parseFloat(location.utilizationPercent);
          const utilizationClass = utilization >= 90 
            ? "border-red-500 bg-red-50 dark:bg-red-950" 
            : utilization >= 70 
            ? "border-orange-500 bg-orange-50 dark:bg-orange-950" 
            : "border-green-500";
          
          const utilizationTextClass = utilization >= 90 
            ? "text-red-600 dark:text-red-400" 
            : utilization >= 70 
            ? "text-orange-600 dark:text-orange-400" 
            : "text-green-600 dark:text-green-400";
          
          return (
            <Card key={location.id} className={`hover:shadow-md transition-shadow border-l-4 ${utilizationClass}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{location.name}</CardTitle>
                  <Badge variant="outline" className={utilizationTextClass}>
                    {location.utilizationPercent}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                  <span className="font-medium">{location.capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                  <span className="font-medium">{location.totalPlanted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Available:</span>
                  <span className={`font-medium ${location.availableSpace <= 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {location.availableSpace}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active Plantings:</span>
                  <span className="font-medium">{location.plantingCount}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {locationSummary.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No locations available
          </div>
        )}
      </div>
    </div>
  );
}