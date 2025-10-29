
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BarChart, Calendar, Package, MapPin, Sprout, TrendingUp, AlertCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Planting, Harvest, PlantType, PlantVariety, Location, Treatment } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

export default function ReportsPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    plantings: false,
    upcoming: false,
    harvests: false,
    locationSummary: false,
    locationDetail: false,
    treatments: false
  });

  const [plantingStartDate, setPlantingStartDate] = useState("");
  const [plantingEndDate, setPlantingEndDate] = useState("");
  const [plantingVarietyFilter, setPlantingVarietyFilter] = useState("all");

  const [harvestStartDate, setHarvestStartDate] = useState("");
  const [harvestEndDate, setHarvestEndDate] = useState("");
  const [harvestVarietyFilter, setHarvestVarietyFilter] = useState("all");

  const [upcomingDaysThreshold, setUpcomingDaysThreshold] = useState("7");

  useEffect(() => {
    setPlantings(getStorageData<Planting>(STORAGE_KEYS.PLANTINGS));
    setHarvests(getStorageData<Harvest>(STORAGE_KEYS.HARVESTS));
    setPlantTypes(getStorageData<PlantType>(STORAGE_KEYS.PLANT_TYPES));
    setVarieties(getStorageData<PlantVariety>(STORAGE_KEYS.PLANT_VARIETIES));
    setLocations(getStorageData<Location>(STORAGE_KEYS.LOCATIONS));
    setTreatments(getStorageData<Treatment>(STORAGE_KEYS.TREATMENTS));
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  const filteredPlantings = useMemo(() => {
    return plantings.filter(planting => {
      const plantingDate = new Date(planting.plantingDate);
      const matchesDate = (!plantingStartDate || plantingDate >= new Date(plantingStartDate)) &&
                         (!plantingEndDate || plantingDate <= new Date(plantingEndDate));
      const matchesVariety = plantingVarietyFilter === "all" || planting.varietyId === plantingVarietyFilter;
      return matchesDate && matchesVariety;
    });
  }, [plantings, plantingStartDate, plantingEndDate, plantingVarietyFilter]);

  const upcomingHarvests = useMemo(() => {
    const today = new Date();
    const thresholdDays = parseInt(upcomingDaysThreshold);
    
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
  }, [plantings, plantTypes, varieties, locations, upcomingDaysThreshold]);

  const harvestsReport = useMemo(() => {
    return harvests
      .filter(harvest => {
        const harvestDate = new Date(harvest.harvestDate);
        const matchesDate = (!harvestStartDate || harvestDate >= new Date(harvestStartDate)) &&
                           (!harvestEndDate || harvestDate <= new Date(harvestEndDate));
        
        const planting = plantings.find(p => p.id === harvest.plantingId);
        const matchesVariety = harvestVarietyFilter === "all" || planting?.varietyId === harvestVarietyFilter;
        
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
  }, [harvests, plantings, harvestStartDate, harvestEndDate, harvestVarietyFilter]);

  const locationSummary = useMemo(() => {
    return locations.map(location => {
      const locationPlantings = plantings.filter(p => 
        p.locationId === location.id && p.status === "active"
      );
      const totalPlanted = locationPlantings.reduce((sum, p) => sum + p.quantity, 0);
      const availableSpace = location.capacity - totalPlanted;
      const utilizationPercent = location.capacity > 0 
        ? ((totalPlanted / location.capacity) * 100).toFixed(1) 
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

  const locationDetail = useMemo(() => {
    return locations.map(location => {
      const locationPlantings = plantings.filter(p => 
        p.locationId === location.id && p.status === "active"
      );
      
      const plantingDetails = locationPlantings.map(planting => {
        const plantType = getPlantType(planting.plantTypeId);
        const variety = getVarietyName(planting.varietyId);
        const plantingDate = new Date(planting.plantingDate);
        const expectedHarvestDate = new Date(plantingDate);
        
        if (plantType?.growthDuration) {
          expectedHarvestDate.setDate(expectedHarvestDate.getDate() + plantType.growthDuration);
        }
        
        return {
          plantType: plantType?.name || "Unknown",
          variety,
          quantity: planting.quantity,
          plantingDate: planting.plantingDate,
          expectedHarvestDate: expectedHarvestDate.toISOString().split("T")[0],
          daysUntilHarvest: Math.ceil((expectedHarvestDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        };
      });
      
      return {
        location: location.name,
        capacity: location.capacity,
        plantings: plantingDetails
      };
    }).filter(loc => loc.plantings.length > 0);
  }, [locations, plantings, plantTypes, varieties]);

  const treatmentReport = useMemo(() => {
    return plantings.map(planting => {
      const plantingTreatments = treatments.filter(t => t.plantingId === planting.id);
      
      return {
        planting: {
          plantType: getPlantTypeName(planting.plantTypeId),
          variety: getVarietyName(planting.varietyId),
          location: getLocationName(planting.locationId),
          plantingDate: planting.plantingDate
        },
        treatments: plantingTreatments.map(t => ({
          treatmentType: t.treatmentType,
          chemicalName: t.chemicalName,
          applicationDate: t.applicationDate,
          dosage: t.dosage,
          notes: t.notes
        }))
      };
    }).filter(report => report.treatments.length > 0);
  }, [plantings, treatments, plantTypes, varieties, locations]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <BarChart className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
          Reports & Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive insights for your nursery operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-green-500"
          onClick={() => toggleSection("plantings")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Sprout className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Plantings Report</CardTitle>
                  <CardDescription className="text-sm">View all plantings</CardDescription>
                </div>
              </div>
              {expandedSections.plantings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">{filteredPlantings.length}</span>
              <Badge variant="outline">Total Records</Badge>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-orange-500"
          onClick={() => toggleSection("upcoming")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Upcoming Harvests</CardTitle>
                  <CardDescription className="text-sm">Ready soon</CardDescription>
                </div>
              </div>
              {expandedSections.upcoming ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-orange-600">{upcomingHarvests.length}</span>
              <Badge variant="outline">Next {upcomingDaysThreshold} Days</Badge>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
          onClick={() => toggleSection("harvests")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Harvest Analysis</CardTitle>
                  <CardDescription className="text-sm">Performance metrics</CardDescription>
                </div>
              </div>
              {expandedSections.harvests ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600">{harvestsReport.length}</span>
              <Badge variant="outline">Completed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-purple-500"
          onClick={() => toggleSection("locationSummary")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Location Summary</CardTitle>
                  <CardDescription className="text-sm">Capacity overview</CardDescription>
                </div>
              </div>
              {expandedSections.locationSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-purple-600">{locations.length}</span>
              <Badge variant="outline">Locations</Badge>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-teal-500"
          onClick={() => toggleSection("locationDetail")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Location Details</CardTitle>
                  <CardDescription className="text-sm">By variety</CardDescription>
                </div>
              </div>
              {expandedSections.locationDetail ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-teal-600">{locationDetail.length}</span>
              <Badge variant="outline">Active Locations</Badge>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-red-500"
          onClick={() => toggleSection("treatments")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Treatment Report</CardTitle>
                  <CardDescription className="text-sm">Application history</CardDescription>
                </div>
              </div>
              {expandedSections.treatments ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-red-600">{treatmentReport.length}</span>
              <Badge variant="outline">Plantings Treated</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {expandedSections.plantings && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5" />
              Plantings Report - Detailed View
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={plantingStartDate}
                  onChange={(e) => setPlantingStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={plantingEndDate}
                  onChange={(e) => setPlantingEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Variety</Label>
                <Select value={plantingVarietyFilter} onValueChange={setPlantingVarietyFilter}>
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

            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredPlantings.length} planting(s)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPlantingStartDate("");
                  setPlantingEndDate("");
                  setPlantingVarietyFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>

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
          </CardContent>
        </Card>
      )}

      {expandedSections.upcoming && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Harvests - Detailed View
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Label>Show harvests within:</Label>
              <Select value={upcomingDaysThreshold} onValueChange={setUpcomingDaysThreshold}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Next 3 days</SelectItem>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="14">Next 14 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {upcomingHarvests.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <AlertCircle className="w-4 h-4" />
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
          </CardContent>
        </Card>
      )}

      {expandedSections.harvests && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Harvest Analysis - Detailed View
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={harvestStartDate}
                  onChange={(e) => setHarvestStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={harvestEndDate}
                  onChange={(e) => setHarvestEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Variety</Label>
                <Select value={harvestVarietyFilter} onValueChange={setHarvestVarietyFilter}>
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

            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {harvestsReport.length} harvest(s)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHarvestStartDate("");
                  setHarvestEndDate("");
                  setHarvestVarietyFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>

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
          </CardContent>
        </Card>
      )}

      {expandedSections.locationSummary && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Capacity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {expandedSections.locationDetail && (
        <Card className="border-l-4 border-l-teal-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Location Details by Variety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {locationDetail.map(location => (
              <div key={location.location} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-lg font-semibold">{location.location}</h3>
                  <Badge variant="outline">Capacity: {location.capacity}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {location.plantings.map((planting, idx) => {
                    const urgencyClass = planting.daysUntilHarvest <= 3 
                      ? "border-red-500 bg-red-50 dark:bg-red-950" 
                      : planting.daysUntilHarvest <= 7 
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950" 
                      : "border-green-500";
                    
                    const urgencyTextClass = planting.daysUntilHarvest <= 3 
                      ? "text-red-600 dark:text-red-400" 
                      : planting.daysUntilHarvest <= 7 
                      ? "text-orange-600 dark:text-orange-400" 
                      : "text-green-600 dark:text-green-400";
                    
                    return (
                      <Card key={idx} className={`hover:shadow-md transition-shadow border-l-4 ${urgencyClass}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{planting.plantType}</CardTitle>
                              <CardDescription className="text-sm mt-1">{planting.variety}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                            <span className="font-medium">{planting.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                            <span className="font-medium">{new Date(planting.plantingDate).toLocaleDateString()}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Expected Harvest:</span>
                            <span className="font-medium">{new Date(planting.expectedHarvestDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Days Until:</span>
                            <span className={`font-bold ${urgencyTextClass}`}>
                              {planting.daysUntilHarvest <= 0 ? "Ready" : `${planting.daysUntilHarvest} days`}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
            {locationDetail.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No active plantings in any location
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {expandedSections.treatments && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Treatment Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {treatmentReport.map((report, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        {report.planting.plantType}
                        {report.planting.variety && <span className="text-gray-600 dark:text-gray-400"> ({report.planting.variety})</span>}
                      </CardTitle>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {report.planting.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.planting.plantingDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline">{report.treatments.length} treatment(s)</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.treatments.map((treatment, tIdx) => (
                      <div key={tIdx} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-medium">{treatment.chemicalName}</span>
                          <Badge className={
                            treatment.treatmentType === "fertilizer" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                            treatment.treatmentType === "pesticide" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }>
                            {treatment.treatmentType}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Date: </span>
                            <span className="font-medium">{new Date(treatment.applicationDate).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Dosage: </span>
                            <span className="font-medium">{treatment.dosage}</span>
                          </div>
                        </div>
                        {treatment.notes && (
                          <div className="text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Notes: </span>
                            <span>{treatment.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {treatmentReport.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No treatments recorded for any plantings
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
