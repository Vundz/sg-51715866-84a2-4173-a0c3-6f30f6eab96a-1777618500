import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { plantingService } from "@/services/plantingService";
import { locationService } from "@/services/locationService";
import { Download, FileText, RefreshCw, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type PlantingWithDetails = Database["public"]["Tables"]["plantings"]["Row"] & {
  plant_types: Database["public"]["Tables"]["plant_types"]["Row"] | null;
  locations: Database["public"]["Tables"]["locations"]["Row"] | null;
};

type PlantingAgeData = PlantingWithDetails & {
  ageInDays: number;
  ageInMonths: number;
};

export default function PlantingAgeReport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plantings, setPlantings] = useState<PlantingAgeData[]>([]);
  const [locations, setLocations] = useState<Database["public"]["Tables"]["locations"]["Row"][]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedPlantType, setSelectedPlantType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState<"age" | "plant_type" | "location" | "harvest">("age");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plantingsData, locationsData] = await Promise.all([
        plantingService.getPlantingsWithDetails(),
        locationService.getLocations()
      ]);

      // Calculate age for each planting
      const today = new Date();
      const plantingsWithAge = plantingsData.map((planting: PlantingWithDetails) => {
        const plantedDate = new Date(planting.date_planted);
        const ageInDays = Math.floor((today.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
        const ageInMonths = parseFloat((ageInDays / 30).toFixed(1));

        return {
          ...planting,
          ageInDays,
          ageInMonths
        };
      });

      setPlantings(plantingsWithAge);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load plantings data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique plant types for filter
  const uniquePlantTypes = useMemo(() => {
    const types = new Set(plantings.map(p => p.plant_types?.name).filter(Boolean));
    return Array.from(types).sort();
  }, [plantings]);

  // Filter plantings
  const filteredPlantings = useMemo(() => {
    return plantings.filter(p => {
      // Location filter
      if (selectedLocation !== "all" && p.location_id !== selectedLocation) return false;

      // Plant type filter
      if (selectedPlantType !== "all" && p.plant_types?.name !== selectedPlantType) return false;

      // Status filter
      if (selectedStatus !== "all" && p.status !== selectedStatus) return false;

      // Age range filter
      if (selectedAgeRange !== "all") {
        const age = p.ageInDays;
        switch (selectedAgeRange) {
          case "0-30":
            if (age > 30) return false;
            break;
          case "31-60":
            if (age <= 30 || age > 60) return false;
            break;
          case "61-90":
            if (age <= 60 || age > 90) return false;
            break;
          case "90+":
            if (age <= 90) return false;
            break;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesPlantType = p.plant_types?.name?.toLowerCase().includes(query);
        const matchesVariety = p.plant_types?.variety?.toLowerCase().includes(query);
        const matchesBatch = p.batch_number.toLowerCase().includes(query);
        const matchesLocation = p.locations?.name?.toLowerCase().includes(query);
        
        if (!matchesPlantType && !matchesVariety && !matchesBatch && !matchesLocation) {
          return false;
        }
      }

      return true;
    });
  }, [plantings, selectedLocation, selectedPlantType, selectedStatus, selectedAgeRange, searchQuery]);

  // Sort plantings
  const sortedPlantings = useMemo(() => {
    const sorted = [...filteredPlantings];
    
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "age":
          comparison = a.ageInDays - b.ageInDays;
          break;
        case "plant_type":
          comparison = (a.plant_types?.name || "").localeCompare(b.plant_types?.name || "");
          break;
        case "location":
          comparison = (a.locations?.name || "").localeCompare(b.locations?.name || "");
          break;
        case "harvest":
          const dateA = a.expected_harvest_date ? new Date(a.expected_harvest_date).getTime() : 0;
          const dateB = b.expected_harvest_date ? new Date(b.expected_harvest_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredPlantings, sortBy, sortOrder]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (sortedPlantings.length === 0) {
      return {
        avgAge: 0,
        oldestAge: 0,
        newestAge: 0,
        totalActive: 0,
        totalClosed: 0,
        uniqueLocations: 0
      };
    }

    const totalAge = sortedPlantings.reduce((sum, p) => sum + p.ageInDays, 0);
    const ages = sortedPlantings.map(p => p.ageInDays);
    const uniqueLocs = new Set(sortedPlantings.map(p => p.location_id).filter(Boolean));

    return {
      avgAge: Math.round(totalAge / sortedPlantings.length),
      oldestAge: Math.max(...ages),
      newestAge: Math.min(...ages),
      totalActive: sortedPlantings.filter(p => p.status === "active").length,
      totalClosed: sortedPlantings.filter(p => p.status === "closed").length,
      uniqueLocations: uniqueLocs.size
    };
  }, [sortedPlantings]);

  const handleExportCSV = () => {
    const headers = [
      "Plant Type",
      "Variety",
      "Batch Number",
      "Location",
      "Date Planted",
      "Age (Days)",
      "Age (Months)",
      "Status",
      "Quantity Planted",
      "Remaining Quantity",
      "Expected Harvest Date"
    ];

    const rows = sortedPlantings.map(p => [
      p.plant_types?.name || "",
      p.plant_types?.variety || "",
      p.batch_number,
      p.locations?.name || "",
      p.date_planted,
      p.ageInDays.toString(),
      p.ageInMonths.toString(),
      p.status,
      p.quantity.toString(),
      p.remaining_quantity.toString(),
      p.expected_harvest_date || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planting-age-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: "Success", description: "CSV exported successfully" });
  };

  const handleExportPDF = () => {
    toast({ 
      title: "Info", 
      description: "PDF export coming soon. Use CSV export for now." 
    });
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Planting Age & Location Report
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track planting age and location distribution
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleExportPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search plantings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plant Type</Label>
                <Select value={selectedPlantType} onValueChange={setSelectedPlantType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniquePlantTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="closed">Closed Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Age Range</Label>
                <Select value={selectedAgeRange} onValueChange={setSelectedAgeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="0-30">0-30 days</SelectItem>
                    <SelectItem value="31-60">31-60 days</SelectItem>
                    <SelectItem value="61-90">61-90 days</SelectItem>
                    <SelectItem value="90+">90+ days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Avg Age</div>
              <div className="text-2xl font-bold">{stats.avgAge} days</div>
              <div className="text-xs text-gray-400">{(stats.avgAge / 30).toFixed(1)} months</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Oldest</div>
              <div className="text-2xl font-bold">{stats.oldestAge} days</div>
              <div className="text-xs text-gray-400">{(stats.oldestAge / 30).toFixed(1)} months</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Newest</div>
              <div className="text-2xl font-bold">{stats.newestAge} days</div>
              <div className="text-xs text-gray-400">{(stats.newestAge / 30).toFixed(1)} months</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Total Active</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalActive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Total Closed</div>
              <div className="text-2xl font-bold text-gray-600">{stats.totalClosed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Locations</div>
              <div className="text-2xl font-bold">{stats.uniqueLocations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Plantings</CardTitle>
                <CardDescription>
                  Showing {sortedPlantings.length} planting{sortedPlantings.length !== 1 ? "s" : ""} · 
                  As of {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={sortBy === "age" ? "default" : "outline"}
                  onClick={() => toggleSort("age")}
                >
                  Age {sortBy === "age" && (sortOrder === "asc" ? "↑" : "↓")}
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === "plant_type" ? "default" : "outline"}
                  onClick={() => toggleSort("plant_type")}
                >
                  Type {sortBy === "plant_type" && (sortOrder === "asc" ? "↑" : "↓")}
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === "location" ? "default" : "outline"}
                  onClick={() => toggleSort("location")}
                >
                  Location {sortBy === "location" && (sortOrder === "asc" ? "↑" : "↓")}
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === "harvest" ? "default" : "outline"}
                  onClick={() => toggleSort("harvest")}
                >
                  Harvest {sortBy === "harvest" && (sortOrder === "asc" ? "↑" : "↓")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedPlantings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No plantings found matching your filters
                </div>
              ) : (
                sortedPlantings.map(planting => (
                  <div
                    key={planting.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {planting.plant_types?.name}
                          </h3>
                          {planting.plant_types?.variety && (
                            <Badge variant="outline">
                              {planting.plant_types.variety}
                            </Badge>
                          )}
                          <Badge variant={planting.status === "active" ? "default" : "secondary"}>
                            {planting.status}
                          </Badge>
                          {planting.ageInDays > 90 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                              Mature
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Batch Number
                            </div>
                            <div className="font-medium">{planting.batch_number}</div>
                          </div>

                          <div>
                            <div className="text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Location
                            </div>
                            <div className="font-medium">
                              {planting.locations?.name || "No location"}
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-500">Date Planted</div>
                            <div className="font-medium">
                              {new Date(planting.date_planted).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-500">Expected Harvest</div>
                            <div className="font-medium">
                              {planting.expected_harvest_date
                                ? new Date(planting.expected_harvest_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                  })
                                : "Not set"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Age:</span>
                            <span className="font-bold text-lg text-lime-600">
                              {planting.ageInDays} days
                            </span>
                            <span className="text-gray-400">
                              ({planting.ageInMonths} months)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Quantity:</span>
                            <span className="font-medium">
                              {formatNumber(planting.quantity)} planted →{" "}
                              <span className={planting.remaining_quantity > 0 ? "text-green-600" : "text-gray-400"}>
                                {formatNumber(planting.remaining_quantity)} remaining
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}