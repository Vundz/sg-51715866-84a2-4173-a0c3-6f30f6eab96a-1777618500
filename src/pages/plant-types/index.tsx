
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Leaf } from "lucide-react";
import { PlantType } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function PlantTypesPage() {
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlantType, setEditingPlantType] = useState<PlantType | null>(null);

  useEffect(() => {
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
  }, []);

  const handleSavePlantType = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantTypeData: Omit<PlantType, 'id'> = {
      name: formData.get("name") as string,
      variety: formData.get("variety") as string,
      growthDuration: parseInt(formData.get("growthDuration") as string, 10),
    };

    const updatedPlantTypes = editingPlantType
      ? plantTypes.map(pt => pt.id === editingPlantType.id ? { ...pt, ...plantTypeData } : pt)
      : [...plantTypes, { ...plantTypeData, id: generateId() }];
      
    setPlantTypes(updatedPlantTypes);
    setStorageData(STORAGE_KEYS.PLANT_TYPES, updatedPlantTypes);
    setIsDialogOpen(false);
    setEditingPlantType(null);
  };

  const handleDeletePlantType = (id: string) => {
    if (!confirm("Are you sure you want to delete this plant type? This might affect existing plantings.")) return;
    const updatedPlantTypes = plantTypes.filter(pt => pt.id !== id);
    setPlantTypes(updatedPlantTypes);
    setStorageData(STORAGE_KEYS.PLANT_TYPES, updatedPlantTypes);
  };

  const handleOpenDialog = (plantType: PlantType | null = null) => {
    setEditingPlantType(plantType);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Leaf className="w-10 h-10 text-green-600" />
            Plant Types
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage the types and varieties of plants you grow.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Plant Type
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlantType ? "Edit" : "Add"} Plant Type</DialogTitle>
            <DialogDescription>
              {editingPlantType ? "Update the details for this plant type." : "Create a new plant type and variety."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePlantType} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plant Name</Label>
              <Input id="name" name="name" defaultValue={editingPlantType?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variety">Variety</Label>
              <Input id="variety" name="variety" defaultValue={editingPlantType?.variety} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="growthDuration">Growth Duration (days)</Label>
              <Input id="growthDuration" name="growthDuration" type="number" defaultValue={editingPlantType?.growthDuration} required />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Plant Type List</CardTitle>
          <CardDescription>All the plant types and varieties in your system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Variety</TableHead>
                <TableHead>Growth Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">No plant types created yet.</TableCell>
                </TableRow>
              ) : (
                plantTypes.map(pt => (
                  <TableRow key={pt.id}>
                    <TableCell className="font-medium">{pt.name}</TableCell>
                    <TableCell>{pt.variety}</TableCell>
                    <TableCell>{pt.growthDuration} days</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(pt)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeletePlantType(pt.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
