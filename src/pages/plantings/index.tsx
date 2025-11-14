import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sprout, ShoppingCart, Search, Filter } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { locationService } from "@/services/locationService";
import { reservationService } from "@/services/reservationService";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Planting = Database["public"]["Tables"]["plantings"]["Row"] & { 
  plant_types: Database["public"]["Tables"]["plant_types"]["Row"] | null,
  locations: Database["public"]["Tables"]["locations"]["Row"] | null
};
type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

// Generate batch number: first 2 chars of plant type + first 2 chars of variety + DDMMYY
const generateBatchNumber = (plantTypeName: string, variety: string, datePlanted: string): string => {
  const plantPrefix = plantTypeName.substring(0, 2).toUpperCase();
  const varietyPrefix = variety.substring(0, 2).toUpperCase();
  const date = new Date(datePlanted);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).substring(2);
  return `${plantPrefix}${varietyPrefix}${day}${month}${year}`;
};

export default function PlantingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<Planting | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state for plant type and variety selection
  const [selectedPlantTypeName, setSelectedPlantTypeName] = useState<string>("");
  const [selectedVariety, setSelectedVariety] = useState<string>("");
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "location" | "variety" | "status">("all");
  const [filterValue, setFilterValue] = useState("");

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [plantingsData, plantTypesData, locationsData, reservationsData] = await Promise.all([
        plantingService.getPlantingsWithDetails(),
        plantTypeService.getPlantTypes(),
        locationService.getLocations(),
        reservationService.getReservations()
      ]);
      
      setPlantings(plantingsData as Planting[]);
      setPlantTypes(plantTypesData);
      setLocations(locationsData);
      setReservations(reservationsData as Reservation[]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data. Please try refreshing the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getReservedQuantity = (plantingId: string): number => {
    const activeReservations = reservations.filter(r => r.planting_id === plantingId && r.status === 'active');
    return activeReservations.reduce((sum, r) => sum + (r.quantity_reserved || 0), 0);
  };
  
  const getAvailableQuantity = (planting: Planting): number => {
    const reserved = getReservedQuantity(planting.id);
    const remaining = planting.remaining_quantity ?? planting.quantity;
    return Math.max(0, remaining - reserved);
  };

  const getReservationCount = (plantingId: string): number => {
    return reservations.filter(r => r.planting_id === plantingId && r.status === 'active').length;
  };

  // Get unique plant type names
  const uniquePlantTypeNames = useMemo(() => {
    const names = new Set(plantTypes.map(pt => pt.name));
    return Array.from(names).sort();
  }, [plantTypes]);

  // Get varieties for the selected plant type
  const availableVarieties = useMemo(() => {
    if (!selectedPlantTypeName) return [];
    return plantTypes
      .filter(pt => pt.name === selectedPlantTypeName)
      .map(pt => pt.variety)
      .filter(Boolean)
      .sort();
  }, [selectedPlantTypeName, plantTypes]);

  // Get unique varieties and locations for filter dropdowns
  const uniqueVarieties = useMemo(() => {
    const varieties = new Set(plantings.map(p => p.plant_types?.variety).filter(Boolean));
    return Array.from(varieties as string[]).sort();
  }, [plantings]);

  const uniqueLocations = useMemo(() => {
    return locations.map(l => ({ id: l.id, name: l.name }));
  }, [locations]);

  // Filter and search logic
  const filteredPlantings = useMemo(() => {
    let filtered = [...plantings];

    // Apply search filter (case-insensitive partial match)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const batchNumber = p.batch_number || '';
        const plantName = p.plant_types?.name || '';
        const variety = p.plant_types?.variety || '';
        const location = p.locations?.name || '';
        
        return (
          batchNumber.toLowerCase().includes(query) ||
          plantName.toLowerCase().includes(query) ||
          variety.toLowerCase().includes(query) ||
          location.toLowerCase().includes(query)
        );
      });
    }

    // Apply type-specific filters
    if (filterType !== "all" && filterValue) {
      switch (filterType) {
        case "location":
          filtered = filtered.filter(p => p.location_id === filterValue);
          break;
        case "variety":
          filtered = filtered.filter(p => p.plant_types?.variety === filterValue);
          break;
        case "status":
          filtered = filtered.filter(p => p.status === filterValue);
          break;
      }
    }

    return filtered;
  }, [plantings, searchQuery, filterType, filterValue]);

  const handleSavePlanting = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plantTypeId = plantTypes.find(pt => pt.name === selectedPlantTypeName && pt.variety === selectedVariety)?.id;
    if (!plantTypeId) {
        toast({ title: "Error", description: "Selected plant type and variety combination not found.", variant: "destructive" });
        return;
    }

    const datePlanted = new Date(formData.get("date_planted") as string);
    const selectedPlantType = plantTypes.find(pt => pt.id === plantTypeId);
    const expectedHarvestDate = new Date(datePlanted);
    if (selectedPlantType?.growth_duration) {
      expectedHarvestDate.setDate(datePlanted.getDate() + selectedPlantType.growth_duration);
    }
    
    const batch_number = generateBatchNumber(selectedPlantTypeName, selectedVariety, datePlanted.toISOString().split('T')[0]);

    const plantingData = {
      plant_type_id: plantTypeId,
      location_id: formData.get("location_id") as string,
      quantity: parseInt(formData.get("quantity") as string),
      date_planted: formData.get("date_planted") as string,
      expected_harvest_date: expectedHarvestDate.toISOString().split('T')[0],
      batch_number: batch_number,
      status: editingPlanting ? formData.get("status") as string : "active",
      notes: formData.get("notes") as string,
      variety: selectedVariety,
    };
    
    const finalPlantingData = {
        ...plantingData,
        remaining_quantity: editingPlanting?.remaining_quantity ?? plantingData.quantity,
    }

    try {
      if (editingPlanting) {
        await plantingService.updatePlanting(editingPlanting.id, finalPlantingData);
        toast({ title: "Success", description: "Planting updated successfully." });
      } else {
        await plantingService.addPlanting(finalPlantingData);
        toast({ title: "Success", description: "Planting created successfully." });
      }
      
      await loadData();
      setIsDialogOpen(false);
      setEditingPlanting(null);
      setSelectedPlantTypeName("");
      setSelectedVariety("");
    } catch (error) {
      console.error("Error saving planting:", error);
      toast({ title: "Error", description: "Failed to save planting. Please try again.", variant: "destructive" });
    }
  };

  const handleDeletePlanting = async (id: string) => {
    const reservationCount = getReservationCount(id);
    if (reservationCount > 0) {
      toast({ title: "Delete Error", description: `Cannot delete this planting. It has ${reservationCount} active reservation(s). Please cancel them first.`, variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure you want to delete this planting?")) return;
    
    try {
      await plantingService.deletePlanting(id);
      await loadData();
      toast({ title: "Success", description: "Planting deleted successfully." });
    } catch (error) {
      console.error("Error deleting planting:", error);
      toast({ title: "Error", description: "Failed to delete planting. Please try again.", variant: "destructive" });
    }
  };

  const handleOpenDialog = (planting: Planting | null = null) => {
    setEditingPlanting(planting);
    if (planting) {
      setSelectedPlantTypeName(planting.plant_types?.name || "");
      setSelectedVariety(planting.plant_types?.variety || "");
    } else {
      setSelectedPlantTypeName("");
      setSelectedVariety("");
    }
    setIsDialogOpen(true);
  };

  const handlePlantTypeChange = (value: string) => {
    setSelectedPlantTypeName(value);
    setSelectedVariety(""); // Reset variety when plant type changes
  };
  
  const getExpectedHarvestDate = (planting: Planting) => {
    if (!planting.expected_harvest_date) return "N/A";
    return new Date(planting.expected_harvest_date).toLocaleDateString();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterValue("");
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-600">Please log in to manage plantings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-600">Loading plantings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Sprout className="w-10 h-10 text-lime-600" />
            Plantings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track all your seedling batches from planting to harvest.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-lime-600 hover:bg-lime-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Planting
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingPlanting ? "Edit" : "Add"} Planting</DialogTitle>
            <DialogDescription>
              {editingPlanting ? "Update the details for this planting." : "Log a new batch of seedlings."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePlanting} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plantTypeName">
                  Plant Type <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={selectedPlantTypeName} 
                  onValueChange={handlePlantTypeChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plant type" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePlantTypeNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="variety">
                  Variety <span className="text-red-500">*</span>
                </Label>
                <Select 
                  name="variety"
                  value={selectedVariety} 
                  onValueChange={setSelectedVariety}
                  disabled={!selectedPlantTypeName}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedPlantTypeName ? "Select a variety" : "Select plant type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVarieties.map(variety => (
                      <SelectItem key={variety} value={variety}>{variety}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_id">Location</Label>
                <Select name="location_id" required defaultValue={editingPlanting?.location_id}>
                  <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity" 
                  name="quantity" 
                  type="number" 
                  defaultValue={editingPlanting?.quantity} 
                  required 
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0;
                    const trays = Math.round(qty / 220);
                    const trayDisplay = document.getElementById("trayUsageDisplay");
                    if (trayDisplay) {
                      trayDisplay.textContent = trays.toString();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">Estimated Tray Usage</Label>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Based on 220 seedlings per tray</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    <span id="trayUsageDisplay">
                      {editingPlanting ? Math.round(editingPlanting.quantity / 220) : "0"}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">trays</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_planted">Date Planted</Label>
                <Input id="date_planted" name="date_planted" type="date" defaultValue={editingPlanting?.date_planted || new Date().toISOString().split('T')[0]} required />
              </div>
              {editingPlanting && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingPlanting?.status}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="harvested">Harvested</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-lime-600 hover:bg-lime-700">Save Planting</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Plantings</CardTitle>
          <CardDescription>
            An overview of all seedling batches in the nursery. 
            {(searchQuery || filterType !== "all") && (
              <span className="ml-2 text-lime-600 font-medium">
                Showing {filteredPlantings.length} of {plantings.length} plantings
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 pb-4 border-b">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by batch, plant, variety, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filterType} onValueChange={(value: typeof filterType) => {
                setFilterType(value);
                setFilterValue("");
              }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plantings</SelectItem>
                  <SelectItem value="location">By Location</SelectItem>
                  <SelectItem value="variety">By Variety</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>

              {filterType === "location" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === "variety" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select variety..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueVarieties.map(variety => (
                      <SelectItem key={variety} value={variety}>{variety}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === "status" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="harvested">Harvested</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {(searchQuery || filterType !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Total Qty</TableHead>
                <TableHead>Trays</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Date Planted</TableHead>
                <TableHead>Expected Harvest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlantings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center h-24">
                    {searchQuery || filterType !== "all" 
                      ? "No plantings match your search or filter criteria." 
                      : "No plantings recorded yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlantings.map(p => {
                  const reserved = getReservedQuantity(p.id);
                  const available = getAvailableQuantity(p);
                  const reservationCount = getReservationCount(p.id);
                  const trayUsage = Math.round((p.remaining_quantity ?? p.quantity) / 220);
                  
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-semibold text-sm">
                        {p.batch_number || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.plant_types?.name || 'N/A'}
                        <br/>
                        <span className="text-xs text-gray-500">{p.plant_types?.variety}</span>
                      </TableCell>
                      <TableCell>{p.locations?.name || 'N/A'}</TableCell>
                      <TableCell>{p.remaining_quantity ?? p.quantity}</TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">{trayUsage}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={reserved > 0 ? "font-medium text-blue-600" : ""}>{reserved}</span>
                          {reservationCount > 0 && (
                            <Link 
                              href={`/reservations?planting=${p.id}`}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              title="View reservations"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span className="text-xs">({reservationCount})</span>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={available <= 0 ? "text-red-600 font-medium" : "font-medium text-green-600"}>
                          {available}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(p.date_planted).toLocaleDateString()}</TableCell>
                      <TableCell>{getExpectedHarvestDate(p)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'active' ? 'default' : p.status === 'closed' ? 'destructive' : 'secondary'}
                          className={p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'closed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(p)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeletePlanting(p.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}