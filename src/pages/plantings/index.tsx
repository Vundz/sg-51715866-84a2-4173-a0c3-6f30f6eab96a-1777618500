
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Leaf, Calendar, MapPin } from "lucide-react";
import { Planting, PlantType, PlantVariety, Location } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function PlantingsPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<Planting | null>(null);
  const [selectedPlantType, setSelectedPlantType] = useState<string>("");
  const [filteredVarieties, setFilteredVarieties] = useState<PlantVariety[]>([]);

  useEffect(() => {
    setPlantings(getStorageData<Planting>(STORAGE_KEYS.PLANTINGS));
    setPlantTypes(getStorageData<PlantType>(STORAGE_KEYS.PLANT_TYPES));
    setVarieties(getStorageData<PlantVariety>(STORAGE_KEYS.PLANT_VARIETIES));
    setLocations(getStorageData<Location>(STORAGE_KEYS.LOCATIONS));
  }, []);

  useEffect(() => {
    if (selectedPlantType) {
      setFilteredVarieties(varieties.filter(v => v.plantTypeId === selectedPlantType));
    } else {
      setFilteredVarieties([]);
    }
  }, [selectedPlantType, varieties]);

  const handleSavePlanting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plantTypeId = formData.get("plantTypeId") as string;
    const locationId = formData.get("locationId") as string;
    const quantity = Number(formData.get("quantity"));
    
    const plantType = plantTypes.find(pt => pt.id === plantTypeId);
    const plantingDate = new Date(formData.get("plantingDate") as string);
    const expectedHarvestDate = new Date(plantingDate);
    if (plantType) {
      expectedHarvestDate.setDate(expectedHarvestDate.getDate() + plantType.growthDuration);
    }

    const planting: Planting = editingPlanting ? {
      ...editingPlanting,
      plantTypeId,
      varietyId: formData.get("varietyId") as string || undefined,
      locationId,
      quantity,
      plantingDate: formData.get("plantingDate") as string,
      expectedHarvestDate: expectedHarvestDate.toISOString().split("T")[0],
      notes: formData.get("notes") as string
    } : {
      id: generateId(),
      plantTypeId,
      varietyId: formData.get("varietyId") as string || undefined,
      locationId,
      quantity,
      plantingDate: formData.get("plantingDate") as string,
      expectedHarvestDate: expectedHarvestDate.toISOString().split("T")[0],
      status: "active",
      notes: formData.get("notes") as string,
      createdAt: new Date().toISOString()
    };

    const updatedPlantings = editingPlanting
      ? plantings.map(p => p.id === editingPlanting.id ? planting : p)
      : [...plantings, planting];
    
    setPlantings(updatedPlantings);
    setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);

    if (!editingPlanting) {
      const location = locations.find(l => l.id === locationId);
      if (location) {
        const updatedLocation = {
          ...location,
          currentOccupancy: location.currentOccupancy + quantity
        };
        const updatedLocations = locations.map(l => l.id === locationId ? updatedLocation : l);
        setLocations(updatedLocations);
        setStorageData(STORAGE_KEYS.LOCATIONS, updatedLocations);
      }
    }

    setIsDialogOpen(false);
    setEditingPlanting(null);
    setSelectedPlantType("");
  };

  const handleDeletePlanting = (id: string) => {
    if (confirm("Are you sure you want to delete this planting?")) {
      const planting = plantings.find(p => p.id === id);
      const updatedPlantings = plantings.filter(p => p.id !== id);
      setPlantings(updatedPlantings);
      setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);

      if (planting) {
        const location = locations.find(l => l.id === planting.locationId);
        if (location) {
          const updatedLocation = {
            ...location,
            currentOccupancy: Math.max(0, location.currentOccupancy - planting.quantity)
          };
          const updatedLocations = locations.map(l => l.id === planting.locationId ? updatedLocation : l);
          setLocations(updatedLocations);
          setStorageData(STORAGE_KEYS.LOCATIONS, updatedLocations);
        }
      }
    }
  };

  const getPlantTypeName = (id: string) => plantTypes.find(pt => pt.id === id)?.name || "Unknown";
  const getVarietyName = (id?: string) => id ? varieties.find(v => v.id === id)?.name : "-";
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || "Unknown";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "harvested": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const activePlantings = plantings.filter(p => p.status === "active");
  const totalQuantity = activePlantings.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Leaf className="w-10 h-10 text-emerald-600" />
            Plantings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your active plantings and their progress
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlanting(null)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Planting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlanting ? "Edit" : "Add New"} Planting</DialogTitle>
              <DialogDescription>
                Enter the details for the planting
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePlanting} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plantTypeId">Plant Type *</Label>
                  <Select 
                    name="plantTypeId" 
                    required 
                    defaultValue={editingPlanting?.plantTypeId}
                    onValueChange={setSelectedPlantType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant type" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="varietyId">Variety (Optional)</Label>
                  <Select 
                    name="varietyId" 
                    defaultValue={editingPlanting?.varietyId}
                    disabled={!selectedPlantType && !editingPlanting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select variety" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No variety</SelectItem>
                      {filteredVarieties.map(variety => (
                        <SelectItem key={variety.id} value={variety.id}>{variety.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locationId">Location *</Label>
                  <Select name="locationId" required defaultValue={editingPlanting?.locationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} ({location.currentOccupancy}/{location.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input 
                    id="quantity" 
                    name="quantity" 
                    type="number" 
                    defaultValue={editingPlanting?.quantity} 
                    required 
                    min="1" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plantingDate">Planting Date *</Label>
                <Input 
                  id="plantingDate" 
                  name="plantingDate" 
                  type="date" 
                  defaultValue={editingPlanting?.plantingDate} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  defaultValue={editingPlanting?.notes} 
                  rows={3} 
                  placeholder="Additional notes about this planting"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { 
                    setIsDialogOpen(false); 
                    setEditingPlanting(null);
                    setSelectedPlantType("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {editingPlanting ? "Update" : "Create"} Planting
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Plantings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{activePlantings.length}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalQuantity}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">units planted</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Plantings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{plantings.length}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">all time</p>
          </CardContent>
        </Card>
      </div>

      {plantings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Leaf className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Plantings Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first planting to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Planting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Plantings</CardTitle>
            <CardDescription>Manage and track your plantings</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plant Type</TableHead>
                  <TableHead>Variety</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Planted</TableHead>
                  <TableHead>Expected Harvest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantings.map((planting) => (
                  <TableRow key={planting.id}>
                    <TableCell className="font-medium">{getPlantTypeName(planting.plantTypeId)}</TableCell>
                    <TableCell>{getVarietyName(planting.varietyId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {getLocationName(planting.locationId)}
                      </div>
                    </TableCell>
                    <TableCell>{planting.quantity} units</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {new Date(planting.plantingDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(planting.expectedHarvestDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(planting.status)}>
                        {planting.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPlanting(planting);
                            setSelectedPlantType(planting.plantTypeId);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeletePlanting(planting.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
