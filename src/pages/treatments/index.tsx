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
import { Plus, Edit, Trash2, Droplets, Calendar, Leaf, AlertTriangle } from "lucide-react";
import { Treatment, Planting, PlantType, PlantVariety } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [varieties, setVarieties] = useState<PlantVariety[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPlantings, setSelectedPlantings] = useState<string[]>([]);

  useEffect(() => {
    const storedTreatments = getStorageData<Treatment[]>(STORAGE_KEYS.TREATMENTS) || [];
    const migratedTreatments: Treatment[] = storedTreatments.map(t => ({
      ...t,
      applicationMethod: t.applicationMethod || "other"
    }));
    setTreatments(migratedTreatments);
    
    const needsMigration = storedTreatments.some(t => !t.applicationMethod);
    if (needsMigration) {
      setStorageData(STORAGE_KEYS.TREATMENTS, migratedTreatments);
    }
    
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    setVarieties(getStorageData<PlantVariety[]>(STORAGE_KEYS.PLANT_VARIETIES) || []);
  }, []);

  const activePlantings = plantings.filter(p => p.status === "active");

  const handleSaveTreatment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const treatmentType = formData.get("treatmentType") as "fungicide" | "pesticide" | "fertilizer" | "other";
    const applicationMethod = formData.get("applicationMethod") as "spray" | "drench" | "granular" | "other";
    const chemicalName = formData.get("chemicalName") as string;
    const applicationDate = formData.get("applicationDate") as string;
    const dosage = formData.get("dosage") as string;
    const notes = formData.get("notes") as string;

    if (isBulkMode && selectedPlantings.length > 0) {
      const newTreatments: Treatment[] = selectedPlantings.map(plantingId => ({
        id: generateId(),
        plantingId,
        treatmentType,
        applicationMethod,
        chemicalName,
        applicationDate,
        dosage,
        notes,
        createdAt: new Date().toISOString()
      }));

      const updatedTreatments = [...treatments, ...newTreatments];
      setTreatments(updatedTreatments);
      setStorageData(STORAGE_KEYS.TREATMENTS, updatedTreatments);
      setSelectedPlantings([]);
    } else {
      const plantingId = formData.get("plantingId") as string;

      const treatment: Treatment = editingTreatment ? {
        ...editingTreatment,
        plantingId,
        treatmentType,
        applicationMethod,
        chemicalName,
        applicationDate,
        dosage,
        notes
      } : {
        id: generateId(),
        plantingId,
        treatmentType,
        applicationMethod,
        chemicalName,
        applicationDate,
        dosage,
        notes,
        createdAt: new Date().toISOString()
      };

      const updatedTreatments = editingTreatment
        ? treatments.map(t => t.id === editingTreatment.id ? treatment : t)
        : [...treatments, treatment];
      
      setTreatments(updatedTreatments);
      setStorageData(STORAGE_KEYS.TREATMENTS, updatedTreatments);
    }

    setIsDialogOpen(false);
    setEditingTreatment(null);
    setIsBulkMode(false);
  };

  const handleDeleteTreatment = (id: string) => {
    if (confirm("Are you sure you want to delete this treatment record?")) {
      const updatedTreatments = treatments.filter(t => t.id !== id);
      setTreatments(updatedTreatments);
      setStorageData(STORAGE_KEYS.TREATMENTS, updatedTreatments);
    }
  };

  const handlePlantingSelect = (plantingId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlantings([...selectedPlantings, plantingId]);
    } else {
      setSelectedPlantings(selectedPlantings.filter(id => id !== plantingId));
    }
  };

  const getPlantingInfo = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return { plantType: "Unknown", variety: "", plantingDate: "", location: "" };
    
    const plantType = plantTypes.find(pt => pt.id === planting.plantTypeId);
    const variety = planting.varietyId ? varieties.find(v => v.id === planting.varietyId) : null;
    return {
      plantType: plantType?.name || "Unknown",
      variety: variety?.name || "",
      plantingDate: planting.plantingDate,
      location: planting.locationId
    };
  };

  const getTreatmentTypeColor = (type: string) => {
    switch (type) {
      case "fungicide": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "pesticide": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "fertilizer": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "other": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const treatmentsByType = {
    fungicide: treatments.filter(t => t.treatmentType === "fungicide").length,
    pesticide: treatments.filter(t => t.treatmentType === "pesticide").length,
    fertilizer: treatments.filter(t => t.treatmentType === "fertilizer").length,
    other: treatments.filter(t => t.treatmentType === "other").length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Droplets className="w-10 h-10 text-blue-600" />
            Treatments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track chemical applications for your plantings
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsBulkMode(false);
            setSelectedPlantings([]);
            setEditingTreatment(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTreatment(null)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Treatment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTreatment ? "Edit" : "Record New"} Treatment</DialogTitle>
              <DialogDescription>
                Enter the details for the treatment application
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveTreatment} className="space-y-4">
              {!editingTreatment && (
                <div className="flex items-center space-x-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Checkbox 
                    id="bulkMode" 
                    checked={isBulkMode}
                    onCheckedChange={(checked) => {
                      setIsBulkMode(checked === true);
                      setSelectedPlantings([]);
                    }}
                  />
                  <Label htmlFor="bulkMode" className="cursor-pointer font-medium">
                    Bulk Application Mode (Apply to multiple plantings)
                  </Label>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="treatmentType">Treatment Type *</Label>
                  <Select name="treatmentType" required defaultValue={editingTreatment?.treatmentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fungicide">Fungicide</SelectItem>
                      <SelectItem value="pesticide">Pesticide</SelectItem>
                      <SelectItem value="fertilizer">Fertilizer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationMethod">Application Method *</Label>
                  <Select name="applicationMethod" required defaultValue={editingTreatment?.applicationMethod || 'other'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spray">Spray</SelectItem>
                      <SelectItem value="drench">Drench</SelectItem>
                      <SelectItem value="granular">Granular</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chemicalName">Chemical/Product Name *</Label>
                  <Input 
                    id="chemicalName" 
                    name="chemicalName" 
                    defaultValue={editingTreatment?.chemicalName} 
                    required 
                    placeholder="e.g., Copper Sulfate"
                  />
                </div>
              </div>

              {isBulkMode ? (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Select Plantings to Treat * ({selectedPlantings.length} selected)
                  </Label>
                  <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                    {activePlantings.length === 0 ? (
                      <p className="text-sm text-gray-500">No active plantings available</p>
                    ) : (
                      activePlantings.map(planting => {
                        const plantType = plantTypes.find(pt => pt.id === planting.plantTypeId);
                        const variety = planting.varietyId ? varieties.find(v => v.id === planting.varietyId) : null;
                        return (
                          <div key={planting.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded">
                            <Checkbox
                              id={`planting-${planting.id}`}
                              checked={selectedPlantings.includes(planting.id)}
                              onCheckedChange={(checked) => handlePlantingSelect(planting.id, checked === true)}
                            />
                            <Label htmlFor={`planting-${planting.id}`} className="flex-1 cursor-pointer">
                              <span className="font-medium">{plantType?.name}</span>
                              {variety && <span className="text-sm text-gray-600 dark:text-gray-400"> ({variety.name})</span>}
                              <span className="text-sm text-gray-500 ml-2">
                                - {planting.quantity} units (Planted: {new Date(planting.plantingDate).toLocaleDateString()})
                              </span>
                            </Label>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {selectedPlantings.length === 0 && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Please select at least one planting
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="plantingId">Select Planting *</Label>
                  <Select name="plantingId" required={!isBulkMode} defaultValue={editingTreatment?.plantingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a planting" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePlantings.map(planting => {
                        const plantType = plantTypes.find(pt => pt.id === planting.plantTypeId);
                        const variety = planting.varietyId ? varieties.find(v => v.id === planting.varietyId) : null;
                        return (
                          <SelectItem key={planting.id} value={planting.id}>
                            {plantType?.name}{variety ? ` (${variety.name})` : ""} - {planting.quantity} units (Planted: {new Date(planting.plantingDate).toLocaleDateString()})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicationDate">Application Date *</Label>
                  <Input 
                    id="applicationDate" 
                    name="applicationDate" 
                    type="date" 
                    defaultValue={editingTreatment?.applicationDate} 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage/Amount *</Label>
                  <Input 
                    id="dosage" 
                    name="dosage" 
                    defaultValue={editingTreatment?.dosage} 
                    required 
                    placeholder="e.g., 50ml per liter"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  defaultValue={editingTreatment?.notes} 
                  rows={3} 
                  placeholder="Application method, weather conditions, observations..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { 
                    setIsDialogOpen(false); 
                    setEditingTreatment(null);
                    setIsBulkMode(false);
                    setSelectedPlantings([]);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isBulkMode && selectedPlantings.length === 0}
                >
                  {editingTreatment ? "Update" : isBulkMode ? `Apply to ${selectedPlantings.length} Plantings` : "Record"} Treatment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Fungicides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{treatmentsByType.fungicide}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pesticides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{treatmentsByType.pesticide}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Fertilizers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{treatmentsByType.fertilizer}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Treatments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{treatments.length}</div>
          </CardContent>
        </Card>
      </div>

      {treatments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Droplets className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Treatments Recorded</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Record your first treatment application</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Treatment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Treatment Records</CardTitle>
            <CardDescription>View and manage your treatment history</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plant Type</TableHead>
                  <TableHead>Treatment Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Chemical/Product</TableHead>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treatments.map((treatment) => {
                  const plantingInfo = getPlantingInfo(treatment.plantingId);
                  
                  return (
                    <TableRow key={treatment.id}>
                      <TableCell className="font-medium">
                        {plantingInfo.plantType}
                        {plantingInfo.variety && <span className="text-sm text-gray-600 dark:text-gray-400"> ({plantingInfo.variety})</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTreatmentTypeColor(treatment.treatmentType)}>
                          {treatment.treatmentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{treatment.applicationMethod}</TableCell>
                      <TableCell>{treatment.chemicalName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(treatment.applicationDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{treatment.dosage}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {treatment.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTreatment(treatment);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteTreatment(treatment.id)}
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
