
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { Harvest, Planting, PlantType } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function HarvestsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);

  useEffect(() => {
    setHarvests(getStorageData<Harvest[]>(STORAGE_KEYS.HARVESTS) || []);
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
  }, []);

  const getPlantingDetails = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return null;
    const plantType = plantTypes.find(pt => pt.id === planting.plantTypeId);
    return { ...planting, plantTypeName: plantType?.name || 'N/A' };
  };

  const handleSaveHarvest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantingId = formData.get("plantingId") as string;
    const quantityHarvested = parseInt(formData.get("quantityHarvested") as string);
    const closePlanting = formData.get("closePlanting") === "on";

    const harvestData: Omit<Harvest, 'id'> = {
      plantingId,
      quantityHarvested,
      harvestDate: formData.get("harvestDate") as string,
      quality: formData.get("quality") as Harvest['quality'],
      notes: formData.get("notes") as string,
      isClosed: closePlanting
    };

    let updatedPlantings = [...plantings];
    const plantingToUpdate = updatedPlantings.find(p => p.id === plantingId);

    if (plantingToUpdate) {
        if (editingHarvest) { // Reverting an edit
            const originalHarvest = harvests.find(h => h.id === editingHarvest.id);
            if(originalHarvest) {
                plantingToUpdate.remainingQuantity = (plantingToUpdate.remainingQuantity ?? plantingToUpdate.quantity) + originalHarvest.quantityHarvested - quantityHarvested;
            }
        } else {
             plantingToUpdate.remainingQuantity = (plantingToUpdate.remainingQuantity ?? plantingToUpdate.quantity) - quantityHarvested;
        }

      if (closePlanting || plantingToUpdate.remainingQuantity <= 0) {
        plantingToUpdate.status = 'closed';
        plantingToUpdate.remainingQuantity = 0;
      }
    }
    
    const updatedHarvests = editingHarvest
      ? harvests.map(h => h.id === editingHarvest.id ? { ...h, ...harvestData } : h)
      : [...harvests, { ...harvestData, id: generateId() }];
      
    setHarvests(updatedHarvests);
    setStorageData(STORAGE_KEYS.HARVESTS, updatedHarvests);
    setPlantings(updatedPlantings);
    setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
    setIsDialogOpen(false);
    setEditingHarvest(null);
  };

  const handleDeleteHarvest = (id: string) => {
    if (!confirm("Are you sure you want to delete this harvest record?")) return;
    
    const harvestToDelete = harvests.find(h => h.id === id);
    if (!harvestToDelete) return;

    let updatedPlantings = [...plantings];
    const plantingToUpdate = updatedPlantings.find(p => p.id === harvestToDelete.plantingId);
    if (plantingToUpdate) {
        plantingToUpdate.remainingQuantity = (plantingToUpdate.remainingQuantity ?? plantingToUpdate.quantity) + harvestToDelete.quantityHarvested;
        if (plantingToUpdate.status === 'closed' && plantingToUpdate.remainingQuantity > 0) {
            plantingToUpdate.status = 'active';
        }
    }

    const updatedHarvests = harvests.filter(h => h.id !== id);
    setHarvests(updatedHarvests);
    setStorageData(STORAGE_KEYS.HARVESTS, updatedHarvests);
    setPlantings(updatedPlantings);
    setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
  };

  const handleOpenDialog = (harvest: Harvest | null = null) => {
    setEditingHarvest(harvest);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Package className="w-10 h-10 text-blue-600" />
            Harvests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Record and manage harvests from your plantings.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Harvest
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingHarvest ? "Edit" : "Add"} Harvest</DialogTitle>
            <DialogDescription>
              {editingHarvest ? "Update the details for this harvest." : "Record a new harvest from a planting."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveHarvest} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="plantingId">Planting</Label>
              <Select name="plantingId" required defaultValue={editingHarvest?.plantingId}>
                <SelectTrigger><SelectValue placeholder="Select a planting" /></SelectTrigger>
                <SelectContent>
                  {plantings.filter(p => p.status === 'active').map(p => {
                    const details = getPlantingDetails(p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {details?.plantTypeName} ({details?.variety}) - Remaining: {details?.remainingQuantity ?? details?.quantity}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityHarvested">Quantity Harvested</Label>
                <Input id="quantityHarvested" name="quantityHarvested" type="number" defaultValue={editingHarvest?.quantityHarvested} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="harvestDate">Harvest Date</Label>
                <Input id="harvestDate" name="harvestDate" type="date" defaultValue={editingHarvest?.harvestDate || new Date().toISOString().split('T')[0]} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Quality</Label>
              <Select name="quality" required defaultValue={editingHarvest?.quality}>
                <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editingHarvest?.notes} />
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="closePlanting" name="closePlanting" defaultChecked={editingHarvest?.isClosed} />
                <label htmlFor="closePlanting" className="text-sm font-medium leading-none">
                Close this planting after harvest
                </label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Harvest</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Harvest Log</CardTitle>
          <CardDescription>A complete history of all recorded harvests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Planting</TableHead>
                <TableHead>Qty Harvested</TableHead>
                <TableHead>Harvest Date</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {harvests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">No harvests recorded yet.</TableCell></TableRow>
              ) : (
                harvests.map(h => {
                  const details = getPlantingDetails(h.plantingId);
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{details?.plantTypeName || 'N/A'}<br/><span className="text-xs text-gray-500">{details?.variety}</span></TableCell>
                      <TableCell>{h.quantityHarvested}</TableCell>
                      <TableCell>{new Date(h.harvestDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={h.quality === 'excellent' || h.quality === 'good' ? 'default' : 'destructive'}
                          className={
                            h.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                            h.quality === 'good' ? 'bg-blue-100 text-blue-800' :
                            h.quality === 'fair' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }
                        >{h.quality}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(h)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteHarvest(h.id)}><Trash2 className="w-4 h-4" /></Button>
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
