
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sprout, X } from "lucide-react";
import { PlantType, PlantVariety } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function PlantTypesPage() {
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<PlantType | null>(null);
  const [tempVarieties, setTempVarieties] = useState<Array<{id?: string; name: string; characteristics: string}>>([]);

  useEffect(() => {
    setPlantTypes(getStorageData<PlantType>(STORAGE_KEYS.PLANT_TYPES));
    setVarieties(getStorageData<PlantVariety>(STORAGE_KEYS.PLANT_VARIETIES));
  }, []);

  const handleOpenDialog = (type?: PlantType) => {
    if (type) {
      setEditingType(type);
      const typeVarieties = varieties.filter(v => v.plantTypeId === type.id);
      setTempVarieties(typeVarieties.map(v => ({
        id: v.id,
        name: v.name,
        characteristics: v.characteristics || ""
      })));
    } else {
      setEditingType(null);
      setTempVarieties([]);
    }
    setIsAddTypeOpen(true);
  };

  const handleAddVarietyField = () => {
    setTempVarieties([...tempVarieties, { name: "", characteristics: "" }]);
  };

  const handleRemoveVarietyField = (index: number) => {
    setTempVarieties(tempVarieties.filter((_, i) => i !== index));
  };

  const handleVarietyChange = (index: number, field: "name" | "characteristics", value: string) => {
    const updated = [...tempVarieties];
    updated[index][field] = value;
    setTempVarieties(updated);
  };

  const handleSavePlantType = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plantTypeId = editingType?.id || generateId();
    
    const plantType: PlantType = {
      id: plantTypeId,
      name: formData.get("name") as string,
      scientificName: formData.get("scientificName") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      growthDuration: Number(formData.get("growthDuration")),
      createdAt: editingType?.createdAt || new Date().toISOString()
    };

    const updatedTypes = editingType
      ? plantTypes.map(t => t.id === editingType.id ? plantType : t)
      : [...plantTypes, plantType];
    
    setPlantTypes(updatedTypes);
    setStorageData(STORAGE_KEYS.PLANT_TYPES, updatedTypes);

    // Handle varieties
    const existingVarietiesForType = varieties.filter(v => v.plantTypeId === plantTypeId);
    const existingIds = new Set(existingVarietiesForType.map(v => v.id));
    
    // Filter valid varieties (with non-empty names)
    const validVarieties = tempVarieties.filter(v => v.name.trim() !== "");
    
    const updatedVarieties = validVarieties.map(v => {
      if (v.id) {
        // Existing variety - update it
        return {
          id: v.id,
          plantTypeId: plantTypeId,
          name: v.name,
          characteristics: v.characteristics,
          createdAt: existingVarietiesForType.find(ev => ev.id === v.id)?.createdAt || new Date().toISOString()
        };
      } else {
        // New variety
        return {
          id: generateId(),
          plantTypeId: plantTypeId,
          name: v.name,
          characteristics: v.characteristics,
          createdAt: new Date().toISOString()
        };
      }
    });

    // Remove varieties that were deleted
    const updatedVarietyIds = new Set(updatedVarieties.map(v => v.id));
    const varietiesToKeep = varieties.filter(v => 
      v.plantTypeId !== plantTypeId || updatedVarietyIds.has(v.id)
    );

    const finalVarieties = [
      ...varietiesToKeep.filter(v => v.plantTypeId !== plantTypeId),
      ...updatedVarieties
    ];

    setVarieties(finalVarieties);
    setStorageData(STORAGE_KEYS.PLANT_VARIETIES, finalVarieties);
    
    setIsAddTypeOpen(false);
    setEditingType(null);
    setTempVarieties([]);
  };

  const handleDeleteType = (id: string) => {
    if (confirm("Are you sure? This will also delete all varieties of this plant type.")) {
      const updatedTypes = plantTypes.filter(t => t.id !== id);
      const updatedVarieties = varieties.filter(v => v.plantTypeId !== id);
      setPlantTypes(updatedTypes);
      setVarieties(updatedVarieties);
      setStorageData(STORAGE_KEYS.PLANT_TYPES, updatedTypes);
      setStorageData(STORAGE_KEYS.PLANT_VARIETIES, updatedVarieties);
    }
  };

  const getVarietiesForType = (typeId: string) => {
    return varieties.filter(v => v.plantTypeId === typeId);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Sprout className="w-10 h-10 text-green-600" />
            Plant Types & Varieties
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your seedling plant types and their varieties
          </p>
        </div>
        
        <Dialog open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Plant Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit" : "Add New"} Plant Type</DialogTitle>
              <DialogDescription>
                Enter the details for the plant type and add varieties
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePlantType} className="space-y-6">
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-lg">Plant Type Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Plant Name *</Label>
                    <Input id="name" name="name" defaultValue={editingType?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scientificName">Scientific Name</Label>
                    <Input id="scientificName" name="scientificName" defaultValue={editingType?.scientificName} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input id="category" name="category" defaultValue={editingType?.category} required placeholder="e.g., Vegetable, Herb, Flower" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="growthDuration">Growth Duration (days) *</Label>
                    <Input id="growthDuration" name="growthDuration" type="number" defaultValue={editingType?.growthDuration} required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" defaultValue={editingType?.description} rows={3} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Varieties</h3>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddVarietyField}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variety
                  </Button>
                </div>

                {tempVarieties.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No varieties added. Click &quot;Add Variety&quot; to include varieties for this plant type.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tempVarieties.map((variety, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Variety {index + 1}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveVarietyField(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Variety Name *</Label>
                            <Input
                              value={variety.name}
                              onChange={(e) => handleVarietyChange(index, "name", e.target.value)}
                              placeholder="e.g., Cherry, Roma"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Characteristics</Label>
                            <Input
                              value={variety.characteristics}
                              onChange={(e) => handleVarietyChange(index, "characteristics", e.target.value)}
                              placeholder="e.g., Sweet, Early maturing"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setIsAddTypeOpen(false); setEditingType(null); setTempVarieties([]); }}>
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

      <div className="grid gap-6">
        {plantTypes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sprout className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Plant Types Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by adding your first plant type</p>
              <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Plant Type
              </Button>
            </CardContent>
          </Card>
        ) : (
          plantTypes.map((type) => (
            <Card key={type.id} className="border-2 hover:border-green-500 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-2xl">{type.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{type.category}</Badge>
                    </div>
                    {type.scientificName && (
                      <p className="text-sm italic text-gray-600 dark:text-gray-400">{type.scientificName}</p>
                    )}
                    <CardDescription className="mt-2">
                      {type.description || "No description provided"}
                    </CardDescription>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Growth Duration: <strong>{type.growthDuration} days</strong>
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(type)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteType(type.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <h4 className="font-semibold text-lg mb-3">Varieties ({getVarietiesForType(type.id).length})</h4>
                
                {getVarietiesForType(type.id).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variety Name</TableHead>
                        <TableHead>Characteristics</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getVarietiesForType(type.id).map((variety) => (
                        <TableRow key={variety.id}>
                          <TableCell className="font-medium">{variety.name}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {variety.characteristics || "No characteristics specified"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500 py-4 text-sm">
                    No varieties added yet. Click &quot;Edit&quot; to add varieties.
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
