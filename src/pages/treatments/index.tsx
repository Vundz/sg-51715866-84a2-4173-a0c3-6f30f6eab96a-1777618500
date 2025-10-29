
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, TestTube2, ChevronsRight } from "lucide-react";
import { Treatment, Planting, PlantType } from "@/types";
import { getStorageData, setStorageData, generateId, STORAGE_KEYS } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function TreatmentsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("treatments", "create");
  const canEdit = hasPermission("treatments", "update");
  const canDelete = hasPermission("treatments", "delete");
  const canView = hasPermission("treatments", "read");

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPlantingIds, setSelectedPlantingIds] = useState<string[]>([]);

  useEffect(() => {
    if (canView) {
      setTreatments(getStorageData<Treatment[]>(STORAGE_KEYS.TREATMENTS) || []);
      setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
      setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    }
  }, [canView]);

  const activePlantings = plantings.filter(p => p.status === "active");

  const getPlantingDetails = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    const plantType = plantTypes.find(pt => pt.id === planting?.plantTypeId);
    return {
      name: plantType?.name || "N/A",
      variety: planting?.variety || "N/A",
      datePlanted: planting?.datePlanted ? new Date(planting.datePlanted).toLocaleDateString() : "N/A",
    };
  };

  const handleSaveTreatment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canCreate && !canEdit) return;

    const formData = new FormData(e.currentTarget);
    const targetPlantingIds = isBulkMode ? selectedPlantingIds : [formData.get("plantingIds") as string];

    if (targetPlantingIds.length === 0 || !targetPlantingIds[0]) {
      alert("Please select at least one planting.");
      return;
    }

    const treatmentData: Omit<Treatment, "id"> = {
      name: formData.get("name") as string,
      type: formData.get("type") as "fungicide" | "pesticide" | "fertilizer",
      applicationDate: formData.get("applicationDate") as string,
      plantingIds: targetPlantingIds,
      dosage: formData.get("dosage") as string,
      applicationMethod: formData.get("applicationMethod") as "drench" | "spray" | "granular" | "other",
      notes: formData.get("notes") as string,
    };
    
    const updatedTreatments = editingTreatment
      ? treatments.map(t => t.id === editingTreatment.id ? { ...t, ...treatmentData } : t)
      : [...treatments, { ...treatmentData, id: generateId() }];
      
    setTreatments(updatedTreatments);
    setStorageData(STORAGE_KEYS.TREATMENTS, updatedTreatments);
    setIsDialogOpen(false);
  };
  
  const handleDeleteTreatment = (id: string) => {
    if (!canDelete || !confirm("Are you sure you want to delete this treatment record?")) return;
    const updatedTreatments = treatments.filter(t => t.id !== id);
    setTreatments(updatedTreatments);
    setStorageData(STORAGE_KEYS.TREATMENTS, updatedTreatments);
  };

  const handleOpenDialog = (treatment: Treatment | null = null, bulk = false) => {
    setEditingTreatment(treatment);
    setIsBulkMode(bulk);
    setSelectedPlantingIds(treatment ? treatment.plantingIds : []);
    setIsDialogOpen(true);
  };
  
  const togglePlantingSelection = (plantingId: string) => {
    setSelectedPlantingIds(prev =>
      prev.includes(plantingId) ? prev.filter(id => id !== plantingId) : [...prev, plantingId]
    );
  };

  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don't have permission to view treatments.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <TestTube2 className="w-10 h-10 text-cyan-600" />
            Treatments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Log and manage all chemical and fertilizer applications.</p>
        </div>
        
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenDialog(null, true)} disabled={activePlantings.length === 0}>
                <ChevronsRight className="w-4 h-4 mr-2" />
                Bulk Apply
            </Button>
            <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Treatment
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isBulkMode ? "Bulk Apply Treatment" : (editingTreatment ? "Edit" : "Add") + " Treatment"}</DialogTitle>
            <DialogDescription>
              {isBulkMode ? "Apply the same treatment to multiple plantings at once." : "Log a single treatment application."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTreatment} className="space-y-4 pt-4">
            {isBulkMode ? (
              <div className="space-y-2">
                <Label>Select Plantings *</Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  {activePlantings.map(p => {
                    const details = getPlantingDetails(p.id);
                    return (
                    <div key={p.id} className="flex items-center gap-2 mb-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Checkbox id={`bulk-${p.id}`} checked={selectedPlantingIds.includes(p.id)} onCheckedChange={() => togglePlantingSelection(p.id)} />
                      <Label htmlFor={`bulk-${p.id}`} className="font-normal w-full">{details.name} ({details.variety}) - Planted: {details.datePlanted}</Label>
                    </div>
                  )})}
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="plantingIds">Select Planting *</Label>
                <Select name="plantingIds" required defaultValue={editingTreatment?.plantingIds[0]}>
                  <SelectTrigger><SelectValue placeholder="Select a planting" /></SelectTrigger>
                  <SelectContent>
                    {activePlantings.map(p => <SelectItem key={p.id} value={p.id}>{getPlantingDetails(p.id).name} ({getPlantingDetails(p.id).variety})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="name">Chemical/Fertilizer Name *</Label><Input id="name" name="name" defaultValue={editingTreatment?.name} required /></div>
              <div className="space-y-2"><Label htmlFor="type">Treatment Type *</Label><Select name="type" required defaultValue={editingTreatment?.type}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fungicide">Fungicide</SelectItem><SelectItem value="pesticide">Pesticide</SelectItem><SelectItem value="fertilizer">Fertilizer</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="dosage">Dosage</Label><Input id="dosage" name="dosage" defaultValue={editingTreatment?.dosage} /></div>
              <div className="space-y-2"><Label htmlFor="applicationMethod">Application Method</Label><Select name="applicationMethod" defaultValue={editingTreatment?.applicationMethod}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="drench">Drench</SelectItem><SelectItem value="spray">Spray</SelectItem><SelectItem value="granular">Granular</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="applicationDate">Application Date *</Label><Input id="applicationDate" name="applicationDate" type="date" defaultValue={editingTreatment?.applicationDate || new Date().toISOString().split('T')[0]} required /></div>
            <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={editingTreatment?.notes} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Save Treatment</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader><CardTitle>Treatment History</CardTitle><CardDescription>A log of all treatments applied.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Applied To</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {treatments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">No treatments recorded yet.</TableCell></TableRow>
              ) : (
                treatments.map(treatment => (
                  <TableRow key={treatment.id}>
                    <TableCell>{new Date(treatment.applicationDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{treatment.name}</TableCell>
                    <TableCell>{treatment.type}</TableCell>
                    <TableCell>{treatment.plantingIds.length} planting(s)</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {canEdit && <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(treatment)}><Edit className="w-4 h-4" /></Button>}
                        {canDelete && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteTreatment(treatment.id)}><Trash2 className="w-4 h-4" /></Button>}
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
