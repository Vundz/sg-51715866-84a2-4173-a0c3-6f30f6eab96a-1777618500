
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Sprout } from "lucide-react";
import { PlantType } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PlantTypesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("plantTypes", "create");
  const canEdit = hasPermission("plantTypes", "update");
  const canDelete = hasPermission("plantTypes", "delete");
  const canView = hasPermission("plantTypes", "read");

  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PlantType | null>(null);

  useEffect(() => {
    if (canView) {
      setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    }
  }, [canView]);

  const handleOpenDialog = (type?: PlantType) => {
    if (type) {
      if (!canEdit) {
        alert("You don't have permission to edit plant types.");
        return;
      }
      setEditingType(type);
    } else {
      if (!canCreate) {
        alert("You don't have permission to create plant types.");
        return;
      }
      setEditingType(null);
    }
    setIsDialogOpen(true);
  };

  const handleSavePlantType = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantTypeId = editingType?.id || generateId();

    const plantType: PlantType = {
      id: plantTypeId,
      name: formData.get("name") as string,
      variety: formData.get("variety") as string,
      growthDuration: Number(formData.get("growthDuration")),
    };

    const updatedTypes = editingType
      ? plantTypes.map((t) => (t.id === editingType.id ? plantType : t))
      : [...plantTypes, plantType];

    setPlantTypes(updatedTypes);
    setStorageData(STORAGE_KEYS.PLANT_TYPES, updatedTypes);
    setIsDialogOpen(false);
    setEditingType(null);
  };

  const handleDeleteType = (id: string) => {
    if (!canDelete) {
      alert("You don't have permission to delete plant types.");
      return;
    }
    if (confirm("Are you sure you want to delete this plant type?")) {
      const updatedTypes = plantTypes.filter((t) => t.id !== id);
      setPlantTypes(updatedTypes);
      setStorageData(STORAGE_KEYS.PLANT_TYPES, updatedTypes);
    }
  };

  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view plant types. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Sprout className="w-10 h-10 text-green-600" />
            Plant Types
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your seedling plant types and their varieties.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {canCreate && (
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Plant Type
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit" : "Add New"} Plant Type</DialogTitle>
              <DialogDescription>
                Enter the details for the plant type.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePlantType} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plant Name *</Label>
                <Input id="name" name="name" defaultValue={editingType?.name} required placeholder="e.g., Tomato" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variety">Variety *</Label>
                <Input id="variety" name="variety" defaultValue={editingType?.variety} required placeholder="e.g., Roma" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="growthDuration">Growth Duration (days) *</Label>
                <Input id="growthDuration" name="growthDuration" type="number" defaultValue={editingType?.growthDuration} required min="1" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingType(null); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingType ? "Update" : "Create"} Plant Type
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plant Types</CardTitle>
          <CardDescription>
            A list of all plant types in your nursery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plantTypes.length === 0 ? (
            <div className="text-center py-12">
              <Sprout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Plant Types Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by adding your first plant type.</p>
              {canCreate && (
                <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Plant Type
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plant Name</TableHead>
                  <TableHead>Variety</TableHead>
                  <TableHead>Growth Duration</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.variety}</TableCell>
                    <TableCell>{type.growthDuration} days</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {canEdit && (
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(type)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteType(type.id)}>
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
