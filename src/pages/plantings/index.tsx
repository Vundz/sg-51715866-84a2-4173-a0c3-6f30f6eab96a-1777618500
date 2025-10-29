
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sprout } from "lucide-react";
import { Planting, PlantType, Location } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function PlantingsPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<Planting | null>(null);

  useEffect(() => {
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    setLocations(getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || []);
  }, []);

  const getPlantTypeDetails = (plantTypeId: string) => plantTypes.find(pt => pt.id === plantTypeId);
  const getLocationName = (locationId: string) => locations.find(l => l.id === locationId)?.name || 'N/A';

  const handleSavePlanting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantTypeId = formData.get("plantTypeId") as string;
    const plantType = getPlantTypeDetails(plantTypeId);
    
    const plantingData: Omit<Planting, 'id'> = {
      plantTypeId,
      variety: plantType?.variety || '',
      locationId: formData.get("locationId") as string,
      quantity: parseInt(formData.get("quantity") as string),
      datePlanted: formData.get("datePlanted") as string,
      status: (formData.get("status") as Planting['status']) || 'active',
    };
    
    const newPlanting = { ...plantingData, id: generateId("pln"), remainingQuantity: plantingData.quantity };

    const updatedPlantings = editingPlanting
      ? plantings.map(p => p.id === editingPlanting.id ? { ...p, ...plantingData, variety: plantType?.variety || '' } : p)
      : [...plantings, newPlanting];

    setPlantings(updatedPlantings);
    setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
    setIsDialogOpen(false);
    setEditingPlanting(null);
  };

  const handleDeletePlanting = (id: string) => {
    if (!confirm("Are you sure you want to delete this planting?")) return;
    const updatedPlantings = plantings.filter(p => p.id !== id);
    setPlantings(updatedPlantings);
    setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
  };

  const handleOpenDialog = (planting: Planting | null = null) => {
    setEditingPlanting(planting);
    setIsDialogOpen(true);
  };
  
  const getExpectedHarvestDate = (planting: Planting) => {
    const plantType = getPlantTypeDetails(planting.plantTypeId);
    if (!plantType?.growthDuration) return "N/A";
    const date = new Date(planting.datePlanted);
    date.setDate(date.getDate() + plantType.growthDuration);
    return date.toLocaleDateString();
  };


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
                <Label htmlFor="plantTypeId">Plant Type</Label>
                <Select name="plantTypeId" required defaultValue={editingPlanting?.plantTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select a plant type" /></SelectTrigger>
                  <SelectContent>
                    {plantTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name} ({pt.variety})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Select name="locationId" required defaultValue={editingPlanting?.locationId}>
                  <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" defaultValue={editingPlanting?.quantity} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="datePlanted">Date Planted</Label>
                <Input id="datePlanted" name="datePlanted" type="date" defaultValue={editingPlanting?.datePlanted || new Date().toISOString().split('T')[0]} required />
              </div>
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
          <CardDescription>An overview of all seedling batches in the nursery.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plant</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Date Planted</TableHead>
                <TableHead>Expected Harvest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantings.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No plantings recorded yet.</TableCell></TableRow>
              ) : (
                plantings.map(p => {
                  const plantType = getPlantTypeDetails(p.plantTypeId);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{plantType?.name || 'N/A'}<br/><span className="text-xs text-gray-500">{p.variety}</span></TableCell>
                      <TableCell>{getLocationName(p.locationId)}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{new Date(p.datePlanted).toLocaleDateString()}</TableCell>
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
