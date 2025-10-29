
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/lib/storage";
import { Treatment, Planting, PlantType, PlantVariety } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";

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
    const migratedTreatments = storedTreatments.map(t => ({
      ...t,
      applicationMethod: t.applicationMethod || "other",
      dosage: t.dosage || 'N/A'
    }));

    if (JSON.stringify(storedTreatments) !== JSON.stringify(migratedTreatments)) {
        setStorageData(STORAGE_KEYS.TREATMENTS, migratedTreatments);
    }
    setTreatments(migratedTreatments);
    
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    setVarieties(getStorageData<PlantVariety[]>(STORAGE_KEYS.PLANT_VARIETIES) || []);
  }, []);

  const getPlantingDetails = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return { plantTypeName: "N/A", varietyName: "N/A" };
    
    const plantType = plantTypes.find(pt => pt.id === planting?.plantTypeId);
    const variety = varieties.find(v => v.id === planting?.varietyId);

    return {
      plantTypeName: plantType?.name || "N/A",
      varietyName: variety?.name || "N/A",
    };
  };

  const handleSave = (treatmentData: Omit<Treatment, "id" | "createdAt"> & { id?: string }) => {
    let updatedTreatments: Treatment[];
    if (isBulkMode) {
      const newTreatments: Treatment[] = selectedPlantings.map(plantingId => ({
        ...treatmentData,
        id: crypto.randomUUID(),
        plantingId: plantingId,
        createdAt: new Date().toISOString(),
      }));
      updatedTreatments = [...treatments, ...newTreatments];
    } else {
      if (editingTreatment) {
        updatedTreatments = treatments.map(t =>
          t.id === editingTreatment.id ? { ...t, ...treatmentData, id: t.id, createdAt: t.createdAt } as Treatment : t
        );
      } else {
        const newTreatment: Treatment = {
          ...treatmentData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        updatedTreatments = [...treatments, newTreatment];
      }
    }

    setTreatments(updatedTreatments);
    setStorageData(STORAGE_KEYS.TREATMENTS, updatedTreatments);
    setIsDialogOpen(false);
    setEditingTreatment(null);
    setIsBulkMode(false);
    setSelectedPlantings([]);
  };

  const handleEdit = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setIsDialogOpen(true);
    setIsBulkMode(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this treatment?")) {
      const updatedTreatments = treatments.filter(t => t.id !== id);
      setTreatments(updatedTreatments);
      setStorageData(STORAGE_KEYS.TREATMENTS, updatedTreatments);
    }
  };

  const handleBulkApply = () => {
    setIsBulkMode(true);
    setEditingTreatment(null);
    setIsDialogOpen(true);
  };

  const togglePlantingSelection = (plantingId: string) => {
    setSelectedPlantings(prev =>
      prev.includes(plantingId) ? prev.filter(id => id !== plantingId) : [...prev, plantingId]
    );
  };

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Treatments</h1>
          <div className="flex gap-2">
            <Button onClick={handleBulkApply} disabled={plantings.length === 0}>Bulk Apply</Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingTreatment(null); setIsBulkMode(false); setIsDialogOpen(true); }}>Add Treatment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isBulkMode ? "Bulk Apply Treatment" : editingTreatment ? "Edit Treatment" : "Add Treatment"}</DialogTitle>
                </DialogHeader>
                <TreatmentForm
                  plantings={plantings}
                  onSubmit={handleSave}
                  initialData={editingTreatment}
                  isBulkMode={isBulkMode}
                  selectedPlantings={selectedPlantings}
                  togglePlantingSelection={togglePlantingSelection}
                  getPlantingDetails={getPlantingDetails}
                />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Planting</TableHead>
                  <TableHead>Treatment Type</TableHead>
                  <TableHead>Chemical Name</TableHead>
                  <TableHead>Application Method</TableHead>
                  <TableHead>Date Applied</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treatments.length > 0 ? (
                  treatments.map(treatment => {
                    const { plantTypeName, varietyName } = getPlantingDetails(treatment.plantingId);
                    return (
                      <TableRow key={treatment.id}>
                        <TableCell>{plantTypeName} - {varietyName}</TableCell>
                        <TableCell>{treatment.treatmentType}</TableCell>
                        <TableCell>{treatment.chemicalName}</TableCell>
                        <TableCell>{treatment.applicationMethod}</TableCell>
                        <TableCell>{new Date(treatment.applicationDate).toLocaleDateString()}</TableCell>
                        <TableCell>{treatment.dosage}</TableCell>
                        <TableCell>{treatment.notes}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(treatment)}>Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(treatment.id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No treatments found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

interface TreatmentFormProps {
  plantings: Planting[];
  onSubmit: (data: Omit<Treatment, "id" | "createdAt">) => void;
  initialData?: Treatment | null;
  isBulkMode?: boolean;
  selectedPlantings?: string[];
  togglePlantingSelection?: (plantingId: string) => void;
  getPlantingDetails: (plantingId: string) => { plantTypeName: string, varietyName: string };
}

function TreatmentForm({
  plantings,
  onSubmit,
  initialData,
  isBulkMode = false,
  selectedPlantings = [],
  togglePlantingSelection = () => {},
  getPlantingDetails,
}: TreatmentFormProps) {
  const [formData, setFormData] = useState({
    plantingId: initialData?.plantingId || (plantings.length > 0 ? plantings[0].id : ""),
    treatmentType: initialData?.treatmentType || "fungicide",
    chemicalName: initialData?.chemicalName || "",
    applicationMethod: initialData?.applicationMethod || "drench",
    applicationDate: initialData?.applicationDate ? initialData.applicationDate.split('T')[0] : new Date().toISOString().split('T')[0],
    dosage: initialData?.dosage || "",
    notes: initialData?.notes || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        plantingId: initialData.plantingId,
        treatmentType: initialData.treatmentType,
        chemicalName: initialData.chemicalName,
        applicationMethod: initialData.applicationMethod,
        applicationDate: initialData.applicationDate.split('T')[0],
        dosage: initialData.dosage,
        notes: initialData.notes || "",
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulkMode && selectedPlantings.length === 0) {
      alert("Please select at least one planting for bulk application.");
      return;
    }
    if (!isBulkMode && !formData.plantingId) {
      alert("Please select a planting.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isBulkMode ? (
        <div>
          <Label>Select Plantings for Bulk Application</Label>
          <Card className="mt-2 max-h-60 overflow-y-auto">
            <CardContent className="p-4">
              {plantings.map(planting => {
                const { plantTypeName, varietyName } = getPlantingDetails(planting.id);
                return (
                  <div key={planting.id} className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id={`bulk-${planting.id}`}
                      checked={selectedPlantings.includes(planting.id)}
                      onCheckedChange={() => togglePlantingSelection(planting.id)}
                    />
                    <Label htmlFor={`bulk-${planting.id}`}>
                      {plantTypeName} - {varietyName} (Planted: {new Date(planting.plantingDate).toLocaleDateString()})
                    </Label>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div>
          <Label htmlFor="plantingId">Planting</Label>
          <Select
            name="plantingId"
            value={formData.plantingId}
            onValueChange={value => handleSelectChange("plantingId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a planting" />
            </SelectTrigger>
            <SelectContent>
              {plantings.map(planting => {
                const { plantTypeName, varietyName } = getPlantingDetails(planting.id);
                return (
                  <SelectItem key={planting.id} value={planting.id}>
                    {plantTypeName} - {varietyName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="treatmentType">Treatment Type</Label>
        <Select
          name="treatmentType"
          value={formData.treatmentType}
          onValueChange={value => handleSelectChange("treatmentType", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a treatment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fungicide">Fungicide</SelectItem>
            <SelectItem value="pesticide">Pesticide</SelectItem>
            <SelectItem value="fertilizer">Fertilizer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="chemicalName">Chemical/Fertilizer Name</Label>
        <Input
          id="chemicalName"
          name="chemicalName"
          value={formData.chemicalName}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="applicationMethod">Application Method</Label>
        <Select
          name="applicationMethod"
          value={formData.applicationMethod}
          onValueChange={value => handleSelectChange("applicationMethod", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select application method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="drench">Drench</SelectItem>
            <SelectItem value="spray">Spray</SelectItem>
            <SelectItem value="granular">Granular</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dosage">Dosage</Label>
        <Input
          id="dosage"
          name="dosage"
          value={formData.dosage}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="applicationDate">Date Applied</Label>
        <Input
          id="applicationDate"
          name="applicationDate"
          type="date"
          value={formData.applicationDate}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
