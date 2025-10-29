import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Leaf, Calendar, MapPin } from "lucide-react";
import { Planting, PlantType, Location } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function PlantingsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("plantings", "create");
  const canEdit = hasPermission("plantings", "update");
  const canDelete = hasPermission("plantings", "delete");
  const canView = hasPermission("plantings", "read");

  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<Planting | null>(null);

  useEffect(() => {
    if (canView) {
      setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
      setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
      setLocations(getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || []);
    }
  }, [canView]);

  const handleSavePlanting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantTypeId = formData.get("plantTypeId") as string;
    const selectedPlantType = plantTypes.find(pt => pt.id === plantTypeId);

    if (!selectedPlantType) {
      alert("Please select a valid plant type.");
      return;
    }

    const planting: Omit<Planting, "id" | "status"> = {
      plantTypeId,
      variety: selectedPlantType.variety,
      locationId: formData.get("locationId") as string,
      quantity: Number(formData.get("quantity")),
      datePlanted: formData.get("datePlanted") as string,
    };

    const updatedPlanting: Planting = editingPlanting
      ? { ...editingPlanting, ...planting }
      : { ...planting, id: generateId(), status: "active" };

    const updatedPlantings = editingPlanting
      ? plantings.map(p => p.id === editingPlanting.id ? updatedPlanting : p)
      : [...plantings, updatedPlanting];

    setPlantings(updatedPlantings);
    setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
    setIsDialogOpen(false);
    setEditingPlanting(null);
  };

  const handleDeletePlanting = (id: string) => {
    if (!canDelete) {
      alert("You don't have permission to delete plantings.");
      return;
    }
    if (confirm("Are you sure you want to delete this planting? This action cannot be undone.")) {
      const updatedPlantings = plantings.filter(p => p.id !== id);
      setPlantings(updatedPlantings);
      setStorageData(STORAGE_KEYS.PLANTINGS, updatedPlantings);
    }
  };
  
  const getPlantTypeName = (id: string) => plantTypes.find(pt => pt.id === id)?.name || "Unknown";
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || "Unknown";
  
  const getExpectedHarvestDate = (planting: Planting) => {
    const plantType = plantTypes.find(pt => pt.id === planting.plantTypeId);
    if (!plantType || !planting.datePlanted) return "N/A";
    const date = new Date(planting.datePlanted);
    date.setDate(date.getDate() + plantType.growthDuration);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: Planting["status"]) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "harvested": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };
  
  const handleOpenDialog = (planting?: Planting) => {
    if (planting) {
      if (!canEdit) {
        alert("You don't have permission to edit plantings.");
        return;
      }
      setEditingPlanting(planting);
    } else {
      if (!canCreate) {
        alert("You don't have permission to create plantings.");
        return;
      }
      setEditingPlanting(null);
    }
    setIsDialogOpen(true);
  };

  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view plantings. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
        
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Planting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingPlanting ? "Edit" : "Add New"} Planting</DialogTitle>
                <DialogDescription>Enter the details for the planting.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSavePlanting} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plantTypeId">Plant Type *</Label>
                    <Select name="plantTypeId" required defaultValue={editingPlanting?.plantTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plant type" />
                      </SelectTrigger>
                      <SelectContent>
                        {plantTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} - {type.variety}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationId">Location *</Label>
                    <Select name="locationId" required defaultValue={editingPlanting?.locationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(location => (
                          <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input id="quantity" name="quantity" type="number" defaultValue={editingPlanting?.quantity} required min="1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="datePlanted">Planting Date *</Label>
                    <Input id="datePlanted" name="datePlanted" type="date" defaultValue={editingPlanting?.datePlanted} required />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingPlanting(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    {editingPlanting ? "Update" : "Create"} Planting
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Active Plantings</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-emerald-600">{activePlantings.length}</div></CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Total Quantity</CardTitle></CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{totalQuantity}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">active units</p>
              </CardContent>
          </Card>
          <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3"><CardTitle className="text-lg">All-Time Plantings</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-purple-600">{plantings.length}</div></CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plantings</CardTitle>
          <CardDescription>A log of all plantings, including active and completed ones.</CardDescription>
        </CardHeader>
        <CardContent>
          {plantings.length === 0 ? (
             <div className="text-center py-12">
              <Leaf className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Plantings Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first planting to get started</p>
              {canCreate && (
                <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Planting
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plant</TableHead>
                  <TableHead>Variety</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Planted</TableHead>
                  <TableHead>Est. Harvest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantings.map((planting) => (
                  <TableRow key={planting.id}>
                    <TableCell className="font-medium">{getPlantTypeName(planting.plantTypeId)}</TableCell>
                    <TableCell>{planting.variety}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{getLocationName(planting.locationId)}</div>
                    </TableCell>
                    <TableCell>{planting.quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" />{new Date(planting.datePlanted).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>{getExpectedHarvestDate(planting)}</TableCell>
                    <TableCell><Badge className={getStatusColor(planting.status)}>{planting.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {canEdit && (
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(planting)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeletePlanting(planting.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
