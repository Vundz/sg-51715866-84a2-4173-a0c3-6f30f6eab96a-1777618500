import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Leaf } from "lucide-react";
import { plantTypeService } from "@/services/plantTypeService";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];

export default function PlantTypesPage() {
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlantType, setEditingPlantType] = useState<PlantType | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPlantTypes();
  }, []);

  const loadPlantTypes = async () => {
    try {
      setLoading(true);
      const data = await plantTypeService.getPlantTypes();
      setPlantTypes(data);
    } catch (error) {
      console.error("Error loading plant types:", error);
      toast({
        title: "Error",
        description: "Failed to load plant types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlantType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantTypeData = {
      name: formData.get("name") as string,
      variety: formData.get("variety") as string,
      growth_duration: parseInt(formData.get("growthDuration") as string, 10),
    };

    try {
      if (editingPlantType) {
        await plantTypeService.updatePlantType(editingPlantType.id, plantTypeData);
        toast({
          title: "Success",
          description: "Plant type updated successfully.",
        });
      } else {
        await plantTypeService.createPlantType(plantTypeData);
        toast({
          title: "Success",
          description: "Plant type created successfully.",
        });
      }
      
      await loadPlantTypes();
      setIsDialogOpen(false);
      setEditingPlantType(null);
    } catch (error) {
      console.error("Error saving plant type:", error);
      toast({
        title: "Error",
        description: "Failed to save plant type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlantType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plant type? This might affect existing plantings.")) return;
    
    try {
      await plantTypeService.deletePlantType(id);
      toast({
        title: "Success",
        description: "Plant type deleted successfully.",
      });
      await loadPlantTypes();
    } catch (error) {
      console.error("Error deleting plant type:", error);
      toast({
        title: "Error",
        description: "Failed to delete plant type. Please try again.",
        variant: "destructive",
      });
    }
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
              <Input id="growthDuration" name="growthDuration" type="number" defaultValue={editingPlantType?.growth_duration} required />
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
          {loading ? (
            <div className="text-center py-8">Loading plant types...</div>
          ) : (
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
                      <TableCell>{pt.growth_duration} days</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}