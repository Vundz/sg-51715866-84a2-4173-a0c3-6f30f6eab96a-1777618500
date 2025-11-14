
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Calendar, AlertCircle, Package, PackageCheck, PackageMinus } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { reservationService } from "@/services/reservationService";
import { plantTypeService } from "@/services/plantTypeService";
import { locationService } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";

type PlantingData = Awaited<ReturnType<typeof plantingService.getPlantingsWithDetails>>[0];
type ReservationData = Awaited<ReturnType<typeof reservationService.getReservations>>[0];
type PlantType = Awaited<ReturnType<typeof plantTypeService.getPlantTypes>>[0];
type Location = Awaited<ReturnType<typeof locationService.getLocations>>[0];

const UpcomingHarvestsReport: React.FC = () => {
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [daysThreshold, setDaysThreshold] = useState("14");
  const [selectedPlantType, setSelectedPlantType] = useState<string>("all");
  const [selectedVariety, setSelectedVariety] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [plantingsData, reservationsData, plantTypesData, locationsData] = await Promise.all([
          plantingService.getPlantingsWithDetails(),
          reservationService.getReservations(),
          plantTypeService.getPlantTypes(),
          locationService.getLocations(),
        ]);
        setPlantings(plantingsData);
        setReservations(reservationsData);
        setPlantTypes(plantTypesData);
        setLocations(locationsData);
      } catch (error) {
        console.error("Error fetching report data:", error);
        toast({
          title: "Error",
          description: "Failed to load report data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // Get unique varieties for the selected plant type
  const availableVarieties = useMemo(() => {
    if (selectedPlantType === "all") {
      return Array.from(new Set(plantings.map(p => p.variety).filter(Boolean)));
    }
    return Array.from(
      new Set(
        plantings
          .filter(p => p.plant_type_id === selectedPlantType)
          .map(p => p.variety)
          .filter(Boolean)
      )
    );
  }, [plantings, selectedPlantType]);

  // Filter and process upcoming harvests
  const upcomingHarvests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = parseInt(daysThreshold);
    
    return plantings
      .filter(p => {
        // Must be active and have expected harvest date
        if (p.status !== "active" || !p.expected_harvest_date) {
          return false;
        }

        // Filter by plant type
        if (selectedPlantType !== "all" && p.plant_type_id !== selectedPlantType) {
          return false;
        }

        // Filter by variety
        if (selectedVariety !== "all" && p.variety !== selectedVariety) {
          return false;
        }

        // Filter by location
        if (selectedLocation !== "all" && p.location_id !== selectedLocation) {
          return false;
        }

        // Calculate days until harvest
        const expectedHarvestDate = new Date(p.expected_harvest_date);
        expectedHarvestDate.setHours(0, 0, 0, 0);
        const daysUntilHarvest = Math.ceil((expectedHarvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Filter by days threshold
        return daysUntilHarvest >= 0 && daysUntilHarvest <= threshold;
      })
      .map(p => {
        const expectedHarvestDate = new Date(p.expected_harvest_date);
        expectedHarvestDate.setHours(0, 0, 0, 0);
        const daysUntilHarvest = Math.ceil((expectedHarvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate reserved quantity for this planting
        const plantingReservations = reservations.filter(r => r.planting_id === p.id && r.status === "pending");
        const reservedQty = plantingReservations.reduce((sum, r) => sum + (r.quantity || 0), 0);
        
        return {
          ...p,
          plantTypeName: p.plant_types?.name || "N/A",
          locationName: p.locations?.name || "N/A",
          expectedHarvestDate,
          daysUntilHarvest,
          reservedQuantity: reservedQty,
          availableQuantity: (p.remaining_quantity ?? p.quantity) - reservedQty,
        };
      })
      .sort((a, b) => a.daysUntilHarvest - b.daysUntilHarvest);
  }, [plantings, reservations, daysThreshold, selectedPlantType, selectedVariety, selectedLocation]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalHarvests = upcomingHarvests.length;
    const expectedQuantity = upcomingHarvests.reduce((sum, h) => sum + (h.remaining_quantity ?? h.quantity), 0);
    const reservedQuantity = upcomingHarvests.reduce((sum, h) => sum + h.reservedQuantity, 0);
    const availableQuantity = expectedQuantity - reservedQuantity;

    return {
      totalHarvests,
      expectedQuantity,
      reservedQuantity,
      availableQuantity,
    };
  }, [upcomingHarvests]);

  const exportToCSV = () => {
    const headers = ["Plant Type", "Variety", "Location", "Quantity", "Reserved", "Available", "Days Until Harvest", "Expected Date"];
    const rows = upcomingHarvests.map(h => [
      h.plantTypeName,
      h.variety || "N/A",
      h.locationName,
      h.remaining_quantity ?? h.quantity,
      h.reservedQuantity,
      h.availableQuantity,
      h.daysUntilHarvest,
      h.expectedHarvestDate.toLocaleDateString(),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upcoming-harvests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Excel export will be available in the next update.",
    });
  };

  const exportToPDF = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 px-4">
      {/* Header */}
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

      {/* Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Upcoming Harvests
              </CardTitle>
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{statistics.totalHarvests}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Within {daysThreshold} days
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Expected Quantity
              </CardTitle>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{formatNumber(statistics.expectedQuantity)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Total to be harvested
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Reserved Quantity
              </CardTitle>
              <PackageMinus className="w-5 h-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{formatNumber(statistics.reservedQuantity)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Already reserved
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Available Quantity
              </CardTitle>
              <PackageCheck className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatNumber(statistics.availableQuantity)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Available for reservation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your report view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Harvest Within</Label>
              <Select value={daysThreshold} onValueChange={setDaysThreshold}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="14">Next 14 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="45">Next 45 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plant Type</Label>
              <Select value={selectedPlantType} onValueChange={(value) => {
                setSelectedPlantType(value);
                setSelectedVariety("all");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plant Types</SelectItem>
                  {plantTypes.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variety</Label>
              <Select 
                value={selectedVariety} 
                onValueChange={setSelectedVariety}
                disabled={selectedPlantType === "all"}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {upcomingHarvests.length} upcoming harvest(s)
            </p>
            {(selectedPlantType !== "all" || selectedVariety !== "all" || selectedLocation !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPlantType("all");
                  setSelectedVariety("all");
                  setSelectedLocation("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Alert for urgent harvests */}
      {upcomingHarvests.filter(h => h.daysUntilHarvest <= 3).length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              {upcomingHarvests.filter(h => h.daysUntilHarvest <= 3).length} planting(s) need immediate attention (3 days or less)
            </span>
          </div>
        </div>
      )}

      {/* Harvests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingHarvests.map(h => (
          <Card 
            key={h.id} 
            className={`hover:shadow-md transition-shadow border-l-4 ${
              h.daysUntilHarvest <= 3 
                ? "border-red-500" 
                : h.daysUntilHarvest <= 7 
                ? "border-orange-500" 
                : "border-green-500"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{h.plantTypeName}</CardTitle>
                  <CardDescription className="text-sm mt-1">{h.variety || "No variety"}</CardDescription>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    h.daysUntilHarvest <= 3 
                      ? "text-red-600 border-red-600" 
                      : h.daysUntilHarvest <= 7
                      ? "text-orange-600 border-orange-600"
                      : "text-green-600 border-green-600"
                  }
                >
                  {h.daysUntilHarvest === 0 ? "Today!" : `${h.daysUntilHarvest} days`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Location:</span>
                <span className="font-medium">{h.locationName}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Remaining:</span>
                <span className="font-medium text-blue-600">{formatNumber(h.remaining_quantity ?? h.quantity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reserved:</span>
                <span className="font-medium text-purple-600">{formatNumber(h.reservedQuantity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Available:</span>
                <span className="font-medium text-green-600">{formatNumber(h.availableQuantity)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                <span className="font-medium">{new Date(h.date_planted).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Expected:</span>
                <span className="font-medium">{h.expectedHarvestDate.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {upcomingHarvests.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
              No upcoming harvests in the selected timeframe
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              Try adjusting your filters or checking your plantings data
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingHarvestsReport;
