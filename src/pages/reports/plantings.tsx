import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, FileSpreadsheet, FileText, ArrowUpDown } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { locationService } from "@/services/locationService";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";

type PlantingData = Awaited<ReturnType<typeof plantingService.getPlantings>>[0];
type PlantTypeData = Database["public"]["Tables"]["plant_types"]["Row"];
type LocationData = Database["public"]["Tables"]["locations"]["Row"];

type SortField = "batch_number" | "date_planted" | "plant_type" | "variety" | "location" | "quantity" | "remaining_quantity" | "status";
type SortDirection = "asc" | "desc";

const PlantingsSummaryReportPage: React.FC = () => {
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantTypeData[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plantTypeFilter, setPlantTypeFilter] = useState("all");
  const [varietyFilter, setVarietyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  
  const [sortField, setSortField] = useState<SortField>("date_planted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [plantingsData, plantTypesData, locationsData] = await Promise.all([
          plantingService.getPlantings(),
          plantTypeService.getPlantTypes(),
          locationService.getLocations(),
        ]);
        setPlantings(plantingsData as PlantingData[]);
        setPlantTypes(plantTypesData);
        setLocations(locationsData);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const getPlantTypeDetails = (plantTypeId: string) => plantTypes.find(pt => pt.id === plantTypeId);
  const getLocationName = (locationId: string) => locations.find(l => l.id === locationId)?.name || "N/A";

  const availableVarieties = useMemo(() => {
    if (plantTypeFilter === "all") {
      const varieties = new Set(plantTypes.map(pt => pt.variety));
      return Array.from(varieties).sort();
    }
    const selectedType = plantTypes.find(pt => pt.id === plantTypeFilter);
    return selectedType ? [selectedType.variety] : [];
  }, [plantTypeFilter, plantTypes]);

  const sortedAndFilteredPlantings = useMemo(() => {
    let filtered = [...plantings];

    // Apply filters
    if (locationFilter !== "all") {
      filtered = filtered.filter(p => p.location_id === locationFilter);
    }

    if (plantTypeFilter !== "all") {
      filtered = filtered.filter(p => p.plant_type_id === plantTypeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (startDate) {
      const startDateObj = new Date(startDate);
      filtered = filtered.filter(p => new Date(p.date_planted) >= startDateObj);
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      filtered = filtered.filter(p => new Date(p.date_planted) <= endDateObj);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "batch_number":
          aVal = a.batch_number || "";
          bVal = b.batch_number || "";
          break;
        case "date_planted":
          aVal = new Date(a.date_planted).getTime();
          bVal = new Date(b.date_planted).getTime();
          break;
        case "plant_type":
          aVal = getPlantTypeDetails(a.plant_type_id)?.name || "";
          bVal = getPlantTypeDetails(b.plant_type_id)?.name || "";
          break;
        case "variety":
          aVal = a.variety;
          bVal = b.variety;
          break;
        case "location":
          aVal = getLocationName(a.location_id);
          bVal = getLocationName(b.location_id);
          break;
        case "quantity":
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case "remaining_quantity":
          aVal = a.remaining_quantity ?? a.quantity;
          bVal = b.remaining_quantity ?? b.quantity;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [plantings, locationFilter, plantTypeFilter, statusFilter, startDate, endDate, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const totalQuantity = sortedAndFilteredPlantings.reduce((sum, p) => sum + p.quantity, 0);
    const totalRemaining = sortedAndFilteredPlantings.reduce((sum, p) => sum + (p.remaining_quantity ?? p.quantity), 0);
    const activeCount = sortedAndFilteredPlantings.filter(p => p.status === "active").length;
    const harvestedCount = sortedAndFilteredPlantings.filter(p => p.status === "harvested").length;
    const closedCount = sortedAndFilteredPlantings.filter(p => p.status === "closed").length;
    
    return {
      totalCount: sortedAndFilteredPlantings.length,
      totalQuantity,
      totalRemaining,
      totalHarvested: totalQuantity - totalRemaining,
      activeCount,
      harvestedCount,
      closedCount
    };
  }, [sortedAndFilteredPlantings]);

  const getExpectedHarvestDate = (planting: PlantingData) => {
    const plantType = getPlantTypeDetails(planting.plant_type_id);
    if (!plantType?.growth_duration) return "N/A";
    const date = new Date(planting.date_planted);
    date.setDate(date.getDate() + plantType.growth_duration);
    return date.toLocaleDateString();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="w-4 h-4 text-gray-400" />
      </div>
    </TableHead>
  );

  const exportToCSV = () => {
    const headers = [
      "Batch Number",
      "Date Planted",
      "Plant Type",
      "Variety",
      "Location",
      "Qty Planted",
      "Remaining",
      "Expected Harvest",
      "Status",
      "Notes"
    ];

    const csvData = sortedAndFilteredPlantings.map(p => [
      p.batch_number || "N/A",
      p.date_planted ? new Date(p.date_planted).toLocaleDateString() : "N/A",
      getPlantTypeDetails(p.plant_type_id)?.name || "N/A",
      p.variety || "",
      getLocationName(p.location_id),
      p.quantity,
      p.remaining_quantity ?? p.quantity,
      getExpectedHarvestDate(p),
      p.status,
      p.notes || ""
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantings_summary_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Reports
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">Planting Summary Report</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive overview of all plantings with filters</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Print PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Plantings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statistics.totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Planted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatNumber(statistics.totalQuantity)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(statistics.totalRemaining)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Harvested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{formatNumber(statistics.totalHarvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active:</span>
              <span className="font-semibold text-green-600">{statistics.activeCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Harvested:</span>
              <span className="font-semibold text-blue-600">{statistics.harvestedCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Closed:</span>
              <span className="font-semibold text-gray-600">{statistics.closedCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine your report data with advanced filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input 
                id="start-date"
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input 
                id="end-date"
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plant-type">Plant Type</Label>
              <Select value={plantTypeFilter} onValueChange={(val) => {
                setPlantTypeFilter(val);
                setVarietyFilter("all");
              }}>
                <SelectTrigger id="plant-type">
                  <SelectValue placeholder="Select plant type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plant Types</SelectItem>
                  {plantTypes.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="variety">Variety</Label>
              <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                <SelectTrigger id="variety">
                  <SelectValue placeholder="Select variety" />
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
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="harvested">Harvested</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold">{sortedAndFilteredPlantings.length}</span> planting{sortedAndFilteredPlantings.length !== 1 ? "s" : ""}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setPlantTypeFilter("all");
                setVarietyFilter("all");
                setStatusFilter("all");
                setLocationFilter("all");
              }}
            >
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planting Records</CardTitle>
          <CardDescription>Click column headers to sort the data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="batch_number">Batch Number</SortableHeader>
                  <SortableHeader field="date_planted">Date Planted</SortableHeader>
                  <SortableHeader field="plant_type">Plant Type</SortableHeader>
                  <SortableHeader field="variety">Variety</SortableHeader>
                  <SortableHeader field="location">Location</SortableHeader>
                  <SortableHeader field="quantity">Qty Planted</SortableHeader>
                  <SortableHeader field="remaining_quantity">Remaining</SortableHeader>
                  <TableHead>Harvested</TableHead>
                  <TableHead>Harvest %</TableHead>
                  <TableHead>Expected Harvest</TableHead>
                  <SortableHeader field="status">Status</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredPlantings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                      No plantings found matching the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAndFilteredPlantings.map(planting => {
                    const remaining = planting.remaining_quantity ?? planting.quantity;
                    const harvested = planting.quantity - remaining;
                    const harvestPercent = planting.quantity > 0 ? Math.round((harvested / planting.quantity) * 100) : 0;
                    
                    return (
                      <TableRow key={planting.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">
                          {planting.batch_number || "N/A"}
                        </TableCell>
                        <TableCell>
                          {new Date(planting.date_planted).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {getPlantTypeDetails(planting.plant_type_id)?.name || "N/A"}
                        </TableCell>
                        <TableCell>{planting.variety}</TableCell>
                        <TableCell>{getLocationName(planting.location_id)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(planting.quantity)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {formatNumber(remaining)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatNumber(harvested)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            harvestPercent === 0 ? "bg-gray-100 text-gray-800" :
                            harvestPercent < 50 ? "bg-yellow-100 text-yellow-800" :
                            harvestPercent < 100 ? "bg-orange-100 text-orange-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {harvestPercent}%
                          </span>
                        </TableCell>
                        <TableCell>{getExpectedHarvestDate(planting)}</TableCell>
                        <TableCell>
                          <Badge className={
                            planting.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-100" :
                            planting.status === "closed" ? "bg-gray-100 text-gray-800 hover:bg-gray-100" : 
                            "bg-blue-100 text-blue-800 hover:bg-blue-100"
                          }>
                            {planting.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantingsSummaryReportPage;