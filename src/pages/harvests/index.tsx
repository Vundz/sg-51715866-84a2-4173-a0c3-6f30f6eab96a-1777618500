
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Package, Calendar, TrendingUp, Archive, AlertTriangle } from "lucide-react";
import { Harvest, Planting, PlantType } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function HarvestsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("harvests", "create");
  const canEdit = hasPermission("harvests", "update");
  const canDelete = hasPermission("harvests", "delete");
  const canView = hasPermission("harvests", "read");

  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>("");
  const [closePlanting, setClosePlanting] = useState(false);

  useEffect(() => {
    if (canView) {
      setHarvests(getStorageData<Harvest[]>(STORAGE_KEYS.HARVESTS) || []);
      setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
      setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    }
  }, [canView]);

  const activePlantings = plantings.filter(p => p.status === "active");
  const selectedPlanting = plantings.find(p => p.id === selectedPlantingId);
  
  const getRemainingQuantity = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return 0;
    const totalHarvested = harvests
      .filter(h => h.plantingId === plantingId)
      .reduce((sum, h) => sum + h.quantityHarvested, 0);
    return planting.quantity - totalHarvested;
  };

  const maxHarvestQuantity = selectedPlanting ? getRemainingQuantity(selectedPlanting.id) : 0;

  const handleSaveHarvest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantingId = formData.get("plantingId") as string;
    const quantityHarvested = Number(formData.get("quantityHarvested"));
    
    if (quantityHarvested > maxHarvestQuantity && !editingHarvest) {
      alert(`Cannot harvest more than the remaining quantity of ${maxHarvestQuantity}.`);
      return;
    }

    const harvest: Omit<Harvest, "id"> = {
      plantingId,
      harvestDate: formData.get("harvestDate") as string,
      quantityHarvested,
      quality: formData.get("quality") as "excellent" | "good" | "fair" | "poor",
      notes: formData.get("notes") as string,
    };

    const updatedHarvest: Harvest = editingHarvest 
        ? { ...editingHarvest, ...harvest } 
        : { ...harvest, id: generateId() };

    const updatedHarvests = editingHarvest
      ? harvests.map(h => h.id === editingHarvest.id ? updatedHarvest : h)
      : [...harvests, updatedHarvest];
    
    setHarvests(updatedHarvests);
    setStorageData(STORAGE_KEYS.HARVESTS, updatedHarvests);

    if (!editingHarvest) {
        const planting = plantings.find(p => p.id === plantingId);
        if (planting) {
          const remainingAfter = getRemainingQuantity(plantingId) - quantityHarvested;
          if (closePlanting || remainingAfter <= 0) {
            const updatedPlanting = { ...planting, status: "closed" as const };
            const updatedPlantings = plantings.map(p => p.id === plantingId ? updatedPlanting : p);
            setPlantings(updatedPlantings);
            setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
          }
        }
    }


    setIsDialogOpen(false);
    setEditingHarvest(null);
    setSelectedPlantingId("");
    setClosePlanting(false);
  };

  const handleDeleteHarvest = (id: string) => {
    if (!canDelete || !confirm("Are you sure you want to delete this harvest record? This cannot be undone.")) return;

    const harvestToDelete = harvests.find(h => h.id === id);
    if (!harvestToDelete) return;
    
    const updatedHarvests = harvests.filter(h => h.id !== id);
    setHarvests(updatedHarvests);
    setStorageData(STORAGE_KEYS.HARVESTS, updatedHarvests);

    const planting = plantings.find(p => p.id === harvestToDelete.plantingId);
    if (planting && planting.status === "closed") {
      const updatedPlanting = { ...planting, status: "active" as const };
      const updatedPlantings = plantings.map(p => p.id === planting.id ? updatedPlanting : p);
      setPlantings(updatedPlantings);
      setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
    }
  };

  const getPlantingInfo = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    const plantType = plantTypes.find(pt => pt.id === planting?.plantTypeId);
    return {
      plantTypeName: plantType?.name || "Unknown",
      variety: planting?.variety || "N/A",
      originalQty: planting?.quantity || 0,
      status: planting?.status || "active",
    };
  };
  
  const handleOpenDialog = (harvest?: Harvest) => {
    if (harvest) {
      if (!canEdit) {
        alert("You don't have permission to edit harvests.");
        return;
      }
      setEditingHarvest(harvest);
      setSelectedPlantingId(harvest.plantingId);
    } else {
      if (!canCreate) {
        alert("You don't have permission to create harvests.");
        return;
      }
      setEditingHarvest(null);
      setSelectedPlantingId("");
    }
    setIsDialogOpen(true);
  };

  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don't have permission to view harvests. Please contact your administrator.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const totalHarvestedQuantity = harvests.reduce((sum, h) => sum + h.quantityHarvested, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Package className="w-10 h-10 text-amber-600" />
            Harvests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Record and track your harvest yields.</p>
        </div>
        
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Record Harvest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingHarvest ? "Edit" : "Record New"} Harvest</DialogTitle>
                <DialogDescription>
                  Enter the details for the harvest. You can close the planting if it's the final harvest.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveHarvest} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="plantingId">Select Planting *</Label>
                  <Select name="plantingId" required defaultValue={editingHarvest?.plantingId} onValueChange={setSelectedPlantingId} disabled={!!editingHarvest}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a planting" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePlantings.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {getPlantingInfo(p.id).plantTypeName} ({getPlantingInfo(p.id).variety}) - {getRemainingQuantity(p.id)} of {p.quantity} left
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activePlantings.length === 0 && !editingHarvest && <p className="text-sm text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No active plantings available.</p>}
                  {selectedPlanting && <div className="p-2 text-sm text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 rounded-md mt-2">Max harvest quantity: {maxHarvestQuantity}</div>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="harvestDate">Harvest Date *</Label>
                    <Input id="harvestDate" name="harvestDate" type="date" defaultValue={editingHarvest?.harvestDate} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantityHarvested">Quantity Harvested *</Label>
                    <Input id="quantityHarvested" name="quantityHarvested" type="number" defaultValue={editingHarvest?.quantityHarvested} required min="1" max={editingHarvest ? undefined : maxHarvestQuantity}/>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quality">Quality *</Label>
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
                  <Textarea id="notes" name="notes" defaultValue={editingHarvest?.notes} placeholder="Additional notes about this harvest" />
                </div>
                
                {!editingHarvest && selectedPlantingId && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="closePlanting" checked={closePlanting} onCheckedChange={(checked) => setClosePlanting(checked === true)} />
                    <Label htmlFor="closePlanting">Close this planting after harvest</Label>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-amber-600 hover:bg-amber-700">{editingHarvest ? "Update" : "Record"} Harvest</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader className="pb-3"><CardTitle>Total Harvests</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-amber-600">{harvests.length}</div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-3"><CardTitle>Total Yield</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-green-600">{totalHarvestedQuantity.toLocaleString()}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">units harvested</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Harvest Records</CardTitle>
          <CardDescription>A log of all your recorded harvests.</CardDescription>
        </CardHeader>
        <CardContent>
          {harvests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Harvests Recorded</h3>
              <p className="text-gray-600 dark:text-gray-400">Record your first harvest to track yields.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plant</TableHead>
                  <TableHead>Harvest Date</TableHead>
                  <TableHead>Qty Harvested</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {harvests.map((harvest) => {
                  const info = getPlantingInfo(harvest.plantingId);
                  return (
                    <TableRow key={harvest.id}>
                      <TableCell className="font-medium">{info.plantTypeName} ({info.variety})</TableCell>
                      <TableCell>{new Date(harvest.harvestDate).toLocaleDateString()}</TableCell>
                      <TableCell>{harvest.quantityHarvested}</TableCell>
                      <TableCell><Badge variant="outline">{harvest.quality}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{harvest.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {canEdit && <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(harvest)}><Edit className="w-4 h-4" /></Button>}
                          {canDelete && <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteHarvest(harvest.id)}><Trash2 className="w-4 h-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
