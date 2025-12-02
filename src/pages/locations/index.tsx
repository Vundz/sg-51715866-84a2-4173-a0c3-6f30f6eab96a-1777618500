import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, MapPin, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { locationService } from "@/services/locationService";
import { plantingService } from "@/services/plantingService";
import { formatNumber } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Location = Database["public"]["Tables"]["locations"]["Row"];
type Planting = Database["public"]["Tables"]["plantings"]["Row"] & {
  plant_types: Database["public"]["Tables"]["plant_types"]["Row"] | null;
};

export default function LocationsPage() {
  const { user, profile } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);

  const isViewer = profile?.role === "viewer";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [locationsData, plantingsData] = await Promise.all([
        locationService.getLocations(),
        plantingService.getPlantingsWithDetails()
      ]);
      setLocations(locationsData);
      setPlantings(plantingsData as Planting[]);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getLocationPlantings = (locationId: string) => {
    return plantings.filter(p => p.location_id === locationId && p.status === "active");
  };

  const getLocationOccupancy = (locationId: string) => {
    return plantings
      .filter(p => p.location_id === locationId && p.status === "active")
      .reduce((acc, p) => acc + ((p.remaining_quantity ?? p.quantity) || 0), 0);
  };

  const getPlantingUtilization = (planting: Planting, locationCapacity: number) => {
    const plantingQty = planting.remaining_quantity ?? planting.quantity;
    return locationCapacity > 0 ? (plantingQty / locationCapacity) * 100 : 0;
  };

  const getDaysUntilHarvest = (expectedDate: string | null) => {
    if (!expectedDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const harvestDate = new Date(expectedDate);
    harvestDate.setHours(0, 0, 0, 0);
    
    const diffTime = harvestDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let text = "";
    let colorClass = "";
    
    if (diffDays < 0) {
      text = `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'} overdue`;
      colorClass = "text-red-600 dark:text-red-400";
    } else if (diffDays === 0) {
      text = "Today";
      colorClass = "text-orange-600 dark:text-orange-400";
    } else if (diffDays <= 7) {
      text = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} away`;
      colorClass = "text-orange-600 dark:text-orange-400";
    } else if (diffDays <= 30) {
      text = `${diffDays} days away`;
      colorClass = "text-green-600 dark:text-green-400";
    } else {
      text = `${diffDays} days away`;
      colorClass = "text-blue-600 dark:text-blue-400";
    }
    
    return { days: diffDays, text, colorClass };
  };

  const handleSaveLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      setLoading(true);
      const locationData = {
        name: formData.get("name") as string,
        type: formData.get("type") as string,
        capacity: parseInt(formData.get("capacity") as string, 10),
      };

      if (editingLocation) {
        await locationService.updateLocation(editingLocation.id, locationData);
      } else {
        await locationService.createLocation(locationData);
      }
      
      await loadData();
      setIsDialogOpen(false);
      setEditingLocation(null);
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Failed to save location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    const locationPlantings = getLocationPlantings(id);
    if (locationPlantings.length > 0) {
      alert(`Cannot delete this location. It has ${locationPlantings.length} active planting(s). Please move or harvest them first.`);
      return;
    }
    
    if (!confirm("Are you sure you want to delete this location? This cannot be undone.")) return;
    
    try {
      setLoading(true);
      await locationService.deleteLocation(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting location:", error);
      alert("Failed to delete location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (location: Location | null = null) => {
    setEditingLocation(location);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <MapPin className="w-10 h-10 text-green-600" />
            Locations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your greenhouses and nursery locations.</p>
        </div>
        {!isViewer && (
          <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit" : "Add"} Location</DialogTitle>
            <DialogDescription>
              {editingLocation ? "Update the details of this location." : "Create a new location for your plantings."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLocation} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input id="name" name="name" defaultValue={editingLocation?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Location Type</Label>
              <Input id="type" name="type" defaultValue={editingLocation?.type || "Greenhouse"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" defaultValue={editingLocation?.capacity || ""} required />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Nursery Locations</CardTitle>
          <CardDescription>Click on a location to view plantings and utilization details.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No locations created yet.</div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {locations.map(location => {
                const occupancy = getLocationOccupancy(location.id);
                const utilization = location.capacity && location.capacity > 0 ? (occupancy / location.capacity) * 100 : 0;
                const locationPlantings = getLocationPlantings(location.id);
                
                return (
                  <AccordionItem 
                    key={location.id} 
                    value={location.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-1 text-left">
                            <h3 className="font-semibold text-lg">{location.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{location.type}</p>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupancy</p>
                              <p className="text-lg font-bold">{formatNumber(occupancy)} / {formatNumber(location.capacity || 0)}</p>
                            </div>
                            
                            <div className="w-32">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Utilization</span>
                                <span className="text-xs font-semibold">{utilization.toFixed(1)}%</span>
                              </div>
                              <Progress 
                                value={utilization} 
                                className="h-2"
                              />
                            </div>
                            
                            <Badge variant="outline" className="ml-2">
                              {locationPlantings.length} {locationPlantings.length === 1 ? 'Planting' : 'Plantings'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                          {!isViewer && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(location)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600" 
                                onClick={() => handleDeleteLocation(location.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pt-4">
                      {locationPlantings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No active plantings in this location.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
                            Active Plantings
                          </h4>
                          {locationPlantings.map(planting => {
                            const plantingQty = planting.remaining_quantity ?? planting.quantity;
                            const plantingUtil = getPlantingUtilization(planting, location.capacity || 1);
                            const trays = Math.round(plantingQty / 220);
                            
                            return (
                              <div 
                                key={planting.id}
                                className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-base">
                                      {planting.plant_types?.name}
                                    </h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {planting.plant_types?.variety}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 font-mono">
                                      Batch: {planting.batch_number || 'N/A'}
                                    </p>
                                  </div>
                                  
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-green-600">
                                      {formatNumber(plantingQty)}
                                    </p>
                                    <p className="text-xs text-gray-500">seedlings</p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      ({trays} {trays === 1 ? 'tray' : 'trays'})
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Location Utilization
                                    </span>
                                    <span className="font-semibold">
                                      {plantingUtil.toFixed(2)}%
                                    </span>
                                  </div>
                                  <Progress value={plantingUtil} className="h-1.5" />
                                  
                                  <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                                      <span className="ml-2 font-medium">
                                        {new Date(planting.date_planted).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Expected Harvest:</span>
                                      {planting.expected_harvest_date ? (
                                        <div className="ml-2">
                                          <span className="font-medium">
                                            {new Date(planting.expected_harvest_date).toLocaleDateString()}
                                          </span>
                                          {(() => {
                                            const daysInfo = getDaysUntilHarvest(planting.expected_harvest_date);
                                            return daysInfo ? (
                                              <span className={`ml-1.5 font-semibold ${daysInfo.colorClass}`}>
                                                ({daysInfo.text})
                                              </span>
                                            ) : null;
                                          })()}
                                        </div>
                                      ) : (
                                        <span className="ml-2 font-medium text-gray-500">N/A</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
