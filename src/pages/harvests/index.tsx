
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
import { Plus, Edit, Trash2, Package, Calendar, TrendingUp } from "lucide-react";
import { Harvest, Planting, PlantType } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function HarvestsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);

  useEffect(() => {
    setHarvests(getStorageData<Harvest>(STORAGE_KEYS.HARVESTS));
    setPlantings(getStorageData<Planting>(STORAGE_KEYS.PLANTINGS));
    setPlantTypes(getStorageData<PlantType>(STORAGE_KEYS.PLANT_TYPES));
  }, []);

  const activePlantings = plantings.filter(p => p.status === "active");

  const handleSaveHarvest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plantingId = formData.get("plantingId") as string;
    const quantity = Number(formData.get("quantity"));
    const quality = formData.get("quality") as "excellent" | "good" | "fair" | "poor";

    const harvest: Harvest = editingHarvest ? {
      ...editingHarvest,
      plantingId,
      harvestDate: formData.get("harvestDate") as string,
      quantity,
      quality,
      notes: formData.get("notes") as string
    } : {
      id: generateId(),
      plantingId,
      harvestDate: formData.get("harvestDate") as string,
      quantity,
      quality,
      notes: formData.get("notes") as string,
      createdAt: new Date().toISOString()
    };

    const updatedHarvests = editingHarvest
      ? harvests.map(h => h.id === editingHarvest.id ? harvest : h)
      : [...harvests, harvest];
    
    setHarvests(updatedHarvests);
    setStorageData(STORAGE_KEYS.HARVESTS, updatedHarvests);

    if (!editingHarvest) {
      const planting = plantings.find(p => p.id === plantingId);
      if (planting) {
        const updatedPlanting = {
          ...planting,
          status: "harvested" as const
        };
        const updatedPlantings = plantings.map(p => p.id === plantingId ? updatedPlanting : p);
        setPlantings(updatedPlantings);
        setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
      }
    }

    setIsDialogOpen(false);
    setEditingHarvest(null);
  };

  const handleDeleteHarvest = (id: string) => {
    if (confirm("Are you sure you want to delete this harvest record?")) {
      const harvest = harvests.find(h => h.id === id);
      const updatedHarvests = harvests.filter(h => h.id !== id);
      setHarvests(updatedHarvests);
      setStorageData(STORAGE_KEYS.HARVESTS, updatedHarvests);

      if (harvest) {
        const planting = plantings.find(p => p.id === harvest.plantingId);
        if (planting) {
          const updatedPlanting = {
            ...planting,
            status: "active" as const
          };
          const updatedPlantings = plantings.map(p => p.id === harvest.plantingId ? updatedPlanting : p);
          setPlantings(updatedPlantings);
          setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
        }
      }
    }
  };

  const getPlantingInfo = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return { plantType: "Unknown", plantingDate: "", quantity: 0 };
    
    const plantType = plantTypes.find(pt => pt.id === planting.plantTypeId);
    return {
      plantType: plantType?.name || "Unknown",
      plantingDate: planting.plantingDate,
      quantity: planting.quantity
    };
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "good": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "fair": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "poor": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const totalHarvestQuantity = harvests.reduce((sum, h) => sum + h.quantity, 0);
  const averageYield = harvests.length > 0
    ? Math.round(harvests.reduce((sum, h) => {
        const plantingInfo = getPlantingInfo(h.plantingId);
        return sum + (h.quantity / plantingInfo.quantity);
      }, 0) / harvests.length * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Package className="w-10 h-10 text-amber-600" />
            Harvests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Record and track your harvest yields
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingHarvest(null)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Harvest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingHarvest ? "Edit" : "Record New"} Harvest</DialogTitle>
              <DialogDescription>
                Enter the details for the harvest
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveHarvest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plantingId">Select Planting *</Label>
                <Select name="plantingId" required defaultValue={editingHarvest?.plantingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a planting to harvest" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlantings.map(planting => {
                      const plantType = plantTypes.find(pt => pt.id === planting.plantTypeId);
                      return (
                        <SelectItem key={planting.id} value={planting.id}>
                          {plantType?.name} - {planting.quantity} units (Planted: {new Date(planting.plantingDate).toLocaleDateString()})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {activePlantings.length === 0 && (
                  <p className="text-sm text-amber-600">No active plantings available. Please add plantings first.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="harvestDate">Harvest Date *</Label>
                  <Input 
                    id="harvestDate" 
                    name="harvestDate" 
                    type="date" 
                    defaultValue={editingHarvest?.harvestDate} 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Harvested *</Label>
                  <Input 
                    id="quantity" 
                    name="quantity" 
                    type="number" 
                    defaultValue={editingHarvest?.quantity} 
                    required 
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality">Quality *</Label>
                <Select name="quality" required defaultValue={editingHarvest?.quality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
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
                <Textarea 
                  id="notes" 
                  name="notes" 
                  defaultValue={editingHarvest?.notes} 
                  rows={3} 
                  placeholder="Additional notes about this harvest"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { 
                    setIsDialogOpen(false); 
                    setEditingHarvest(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                  {editingHarvest ? "Update" : "Record"} Harvest
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Harvests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{harvests.length}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Yield</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalHarvestQuantity.toFixed(2)}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">units harvested</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Yield Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{averageYield}%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">of planted quantity</p>
          </CardContent>
        </Card>
      </div>

      {harvests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Harvests Recorded</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Record your first harvest to track yields</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Harvest
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Harvest Records</CardTitle>
            <CardDescription>View and manage your harvest history</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plant Type</TableHead>
                  <TableHead>Harvest Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Yield Rate</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {harvests.map((harvest) => {
                  const plantingInfo = getPlantingInfo(harvest.plantingId);
                  const yieldRate = plantingInfo.quantity > 0 
                    ? Math.round((harvest.quantity / plantingInfo.quantity) * 100) 
                    : 0;
                  
                  return (
                    <TableRow key={harvest.id}>
                      <TableCell className="font-medium">{plantingInfo.plantType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(harvest.harvestDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{harvest.quantity} units</TableCell>
                      <TableCell>
                        <Badge className={getQualityColor(harvest.quality)}>
                          {harvest.quality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{yieldRate}%</span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({harvest.quantity}/{plantingInfo.quantity})
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {harvest.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingHarvest(harvest);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteHarvest(harvest.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
