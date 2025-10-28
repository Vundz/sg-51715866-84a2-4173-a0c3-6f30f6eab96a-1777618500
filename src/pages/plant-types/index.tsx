
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sprout } from "lucide-react";
import { PlantType, PlantVariety } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function PlantTypesPage() {
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isAddVarietyOpen, setIsAddVarietyOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [editingType, setEditingType] = useState<PlantType | null>(null);
  const [editingVariety, setEditingVariety] = useState<PlantVariety | null>(null);

  useEffect(() => {
    setPlantTypes(getStorageData<PlantType>(STORAGE_KEYS.PLANT_TYPES));
    setVarieties(getStorageData<PlantVariety>(STORAGE_KEYS.PLANT_VARIETIES));
  }, []);

  const handleSavePlantType = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plantType: PlantType = editingType ? {
      ...editingType,
      name: formData.get("name") as string,
      scientificName: formData.get("scientificName") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      growthDuration: Number(formData.get("growthDuration"))
    } : {
      id: generateId(),
      name: formData.get("name") as string,
      scientificName: formData.get("scientificName") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      growthDuration: Number(formData.get("growthDuration")),
      createdAt: new Date().toISOString()
    };

    const updatedTypes = editingType
      ? plantTypes.map(t => t.id === editingType.id ? plantType : t)
      : [...plantTypes, plantType];
    
    setPlantTypes(updatedTypes);
    setStorageData(STORAGE_KEYS.PLANT_TYPES, updatedTypes);
    setIsAddTypeOpen(false);
    setEditingType(null);
  };

  const handleSaveVariety = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const variety: PlantVariety = editingVariety ? {
      ...editingVariety,
      name: formData.get("name") as string,
      characteristics: formData.get("characteristics") as string
    } : {
      id: generateId(),
      plantTypeId: selectedTypeId,
      name: formData.get("name") as string,
      characteristics: formData.get("characteristics") as string,
      createdAt: new Date().toISOString()
    };

    const updatedVarieties = editingVariety
      ? varieties.map(v => v.id === editingVariety.id ? variety : v)
      : [...varieties, variety];
    
    setVarieties(updatedVarieties);
    setStorageData(STORAGE_KEYS.PLANT_VARIETIES, updatedVarieties);
    setIsAddVarietyOpen(false);
    setEditingVariety(null);
    setSelectedTypeId("");
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

  const handleDeleteVariety = (id: string) => {
    if (confirm("Are you sure you want to delete this variety?")) {
      const updatedVarieties = varieties.filter(v => v.id !== id);
      setVarieties(updatedVarieties);
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
            <Button onClick={() => setEditingType(null)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Plant Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit" : "Add New"} Plant Type</DialogTitle>
              <DialogDescription>
                Enter the details for the plant type
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePlantType} className="space-y-4">
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
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsAddTypeOpen(false); setEditingType(null); }}>
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
              <Button onClick={() => setIsAddTypeOpen(true)} className="bg-green-600 hover:bg-green-700">
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
                      onClick={() => {
                        setEditingType(type);
                        setIsAddTypeOpen(true);
                      }}
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
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg">Varieties ({getVarietiesForType(type.id).length})</h4>
                  <Dialog open={isAddVarietyOpen && selectedTypeId === type.id} onOpenChange={(open) => {
                    setIsAddVarietyOpen(open);
                    if (!open) setSelectedTypeId("");
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTypeId(type.id);
                          setEditingVariety(null);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variety
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingVariety ? "Edit" : "Add New"} Variety</DialogTitle>
                        <DialogDescription>
                          Add a variety for {type.name}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSaveVariety} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="variety-name">Variety Name *</Label>
                          <Input id="variety-name" name="name" defaultValue={editingVariety?.name} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="characteristics">Characteristics</Label>
                          <Textarea id="characteristics" name="characteristics" defaultValue={editingVariety?.characteristics} rows={3} placeholder="Describe unique characteristics of this variety" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => { setIsAddVarietyOpen(false); setSelectedTypeId(""); setEditingVariety(null); }}>
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-green-600 hover:bg-green-700">
                            {editingVariety ? "Update" : "Add"} Variety
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {getVarietiesForType(type.id).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variety Name</TableHead>
                        <TableHead>Characteristics</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getVarietiesForType(type.id).map((variety) => (
                        <TableRow key={variety.id}>
                          <TableCell className="font-medium">{variety.name}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {variety.characteristics || "No characteristics specified"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingVariety(variety);
                                  setSelectedTypeId(type.id);
                                  setIsAddVarietyOpen(true);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteVariety(variety.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500 py-4 text-sm">
                    No varieties added yet. Click &quot;Add Variety&quot; to get started.
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
