
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Calendar, Package, MapPin, Sprout, TrendingUp, AlertCircle, FileText } from "lucide-react";
import { Planting, Harvest, PlantType, PlantVariety, Location, Treatment } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

export default function ReportsPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

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
          productName: t.productName,
          applicationDate: t.applicationDate,
          dosage: t.dosage,
          notes: t.notes
        }))
      };
    }).filter(report => report.treatments.length > 0);
  }, [plantings, treatments, plantTypes, varieties, locations]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <BarChart className="w-10 h-10 text-purple-600" />
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive reports for your nursery operations
          </p>
        </div>
      </div>

      <Tabs defaultValue="plantings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="plantings">Plantings</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="harvests">Harvests</TabsTrigger>
          <TabsTrigger value="location-summary">Location Summary</TabsTrigger>
          <TabsTrigger value="location-detail">Location Detail</TabsTrigger>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
        </TabsList>

        <TabsContent value="plantings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="w-5 h-5" />
                Plantings Report
              </CardTitle>
              <CardDescription>Filter and view planting records</CardDescription>
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

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredPlantings.length} planting(s)
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPlantingStartDate("");
                    setPlantingEndDate("");
                    setPlantingVarietyFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant Type</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Planting Date</TableHead>
                    <TableHead>Expected Harvest</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlantings.map(planting => {
                    const remaining = planting.remainingQuantity ?? planting.quantity;
                    return (
                      <TableRow key={planting.id}>
                        <TableCell className="font-medium">
                          {getPlantTypeName(planting.plantTypeId)}
                        </TableCell>
                        <TableCell>{getVarietyName(planting.varietyId)}</TableCell>
                        <TableCell>{getLocationName(planting.locationId)}</TableCell>
                        <TableCell>{planting.quantity}</TableCell>
                        <TableCell>
                          <span className={remaining === 0 ? "text-gray-400" : ""}>
                            {remaining}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(planting.plantingDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(planting.expectedHarvestDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            planting.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                            planting.status === "closed" ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" :
                            planting.status === "harvested" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }>
                            {planting.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPlantings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No plantings found matching the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Harvests
              </CardTitle>
              <CardDescription>Seedlings nearing harvest based on growth duration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
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

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">{upcomingHarvests.length} planting(s) ready for harvest soon</span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant Type</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Planted Date</TableHead>
                    <TableHead>Expected Harvest</TableHead>
                    <TableHead>Days Until Harvest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingHarvests.map(harvest => {
                    const remaining = harvest.remainingQuantity ?? harvest.quantity;
                    const urgencyColor = harvest.daysUntilHarvest <= 3 
                      ? "text-red-600 font-bold" 
                      : harvest.daysUntilHarvest <= 7 
                      ? "text-orange-600 font-semibold" 
                      : "text-green-600";
                    
                    return (
                      <TableRow key={harvest.id}>
                        <TableCell className="font-medium">{harvest.plantType}</TableCell>
                        <TableCell>{harvest.variety}</TableCell>
                        <TableCell>{harvest.location}</TableCell>
                        <TableCell>{harvest.quantity}</TableCell>
                        <TableCell>{remaining}</TableCell>
                        <TableCell>{new Date(harvest.plantingDate).toLocaleDateString()}</TableCell>
                        <TableCell>{harvest.expectedHarvestDate.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={urgencyColor}>
                            {harvest.daysUntilHarvest === 0 ? "Today" : 
                             harvest.daysUntilHarvest === 1 ? "Tomorrow" :
                             `${harvest.daysUntilHarvest} days`}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {upcomingHarvests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No upcoming harvests in the selected timeframe
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="harvests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Harvest Analysis
              </CardTitle>
              <CardDescription>Compare harvested vs planted quantities</CardDescription>
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

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {harvestsReport.length} harvest(s)
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHarvestStartDate("");
                    setHarvestEndDate("");
                    setHarvestVarietyFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant Type</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Harvest Date</TableHead>
                    <TableHead>Qty Planted</TableHead>
                    <TableHead>Qty Harvested</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Variance %</TableHead>
                    <TableHead>Quality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {harvestsReport.map(harvest => {
                    const isPositive = harvest.variance >= 0;
                    return (
                      <TableRow key={harvest.id}>
                        <TableCell className="font-medium">{harvest.plantType}</TableCell>
                        <TableCell>{harvest.variety}</TableCell>
                        <TableCell>{new Date(harvest.harvestDate).toLocaleDateString()}</TableCell>
                        <TableCell>{harvest.plantedQty}</TableCell>
                        <TableCell>{harvest.quantity}</TableCell>
                        <TableCell>
                          <span className={isPositive ? "text-green-600" : "text-red-600"}>
                            {isPositive ? "+" : ""}{harvest.variance}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={isPositive ? "text-green-600" : "text-red-600"}>
                            {isPositive ? "+" : ""}{harvest.variancePercent}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            harvest.quality === "excellent" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                            harvest.quality === "good" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                            harvest.quality === "fair" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }>
                            {harvest.quality}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {harvestsReport.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No harvests found matching the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location-summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Capacity Summary
              </CardTitle>
              <CardDescription>Overview of space utilization per location</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Total Capacity</TableHead>
                    <TableHead>Qty Planted</TableHead>
                    <TableHead>Available Space</TableHead>
                    <TableHead>Utilization %</TableHead>
                    <TableHead>Active Plantings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationSummary.map(location => {
                    const utilization = parseFloat(location.utilizationPercent);
                    const utilizationColor = utilization >= 90 
                      ? "text-red-600 font-bold" 
                      : utilization >= 70 
                      ? "text-orange-600 font-semibold" 
                      : "text-green-600";
                    
                    return (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>{location.capacity}</TableCell>
                        <TableCell>{location.totalPlanted}</TableCell>
                        <TableCell>
                          <span className={location.availableSpace <= 0 ? "text-red-600" : ""}>
                            {location.availableSpace}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={utilizationColor}>{location.utilizationPercent}%</span>
                        </TableCell>
                        <TableCell>{location.plantingCount}</TableCell>
                      </TableRow>
                    );
                  })}
                  {locationSummary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No locations available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location-detail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Details by Variety
              </CardTitle>
              <CardDescription>Varieties planted per location with expected harvest dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {locationDetail.map(location => (
                <div key={location.location} className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold">{location.location}</h3>
                    <Badge variant="outline">Capacity: {location.capacity}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plant Type</TableHead>
                        <TableHead>Variety</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Planting Date</TableHead>
                        <TableHead>Expected Harvest</TableHead>
                        <TableHead>Days Until Harvest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {location.plantings.map((planting, idx) => {
                        const urgencyColor = planting.daysUntilHarvest <= 3 
                          ? "text-red-600 font-bold" 
                          : planting.daysUntilHarvest <= 7 
                          ? "text-orange-600 font-semibold" 
                          : "text-green-600";
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{planting.plantType}</TableCell>
                            <TableCell>{planting.variety}</TableCell>
                            <TableCell>{planting.quantity}</TableCell>
                            <TableCell>{new Date(planting.plantingDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(planting.expectedHarvestDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <span className={urgencyColor}>
                                {planting.daysUntilHarvest <= 0 ? "Ready" : `${planting.daysUntilHarvest} days`}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
              {locationDetail.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No active plantings in any location
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Treatment Report
              </CardTitle>
              <CardDescription>Treatments applied per planting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {treatmentReport.map((report, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        {report.planting.plantType}
                        {report.planting.variety && <span className="text-gray-600 dark:text-gray-400"> ({report.planting.variety})</span>}
                      </h3>
                      <Badge variant="outline">{report.treatments.length} treatment(s)</Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>Location: {report.planting.location}</span>
                      <span>Planted: {new Date(report.planting.plantingDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Treatment Type</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Application Date</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.treatments.map((treatment, tIdx) => (
                        <TableRow key={tIdx}>
                          <TableCell>
                            <Badge className={
                              treatment.treatmentType === "fertilizer" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                              treatment.treatmentType === "pesticide" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }>
                              {treatment.treatmentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{treatment.productName}</TableCell>
                          <TableCell>{new Date(treatment.applicationDate).toLocaleDateString()}</TableCell>
                          <TableCell>{treatment.dosage}</TableCell>
                          <TableCell className="max-w-xs truncate">{treatment.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
              {treatmentReport.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No treatments recorded for any plantings
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
