import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, TestTube2, ChevronsRight } from "lucide-react";
import { treatmentService } from "@/services/treatmentService";
import { plantingService } from "@/services/plantingService";
import type { Database } from "@/integrations/supabase/types";

type Treatment = Database["public"]["Tables"]["treatments"]["Row"];
type Planting = Database["public"]["Tables"]["plantings"]["Row"];
type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];

type PlantingWithDetails = Planting & {
  plant_types: PlantType;
};

type TreatmentWithDetails = Treatment & {
  plantings: PlantingWithDetails[];
};

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<TreatmentWithDetails[]>([]);
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentWithDetails | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPlantingIds, setSelectedPlantingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [treatmentsData, plantingsData] = await Promise.all([
        treatmentService.getTreatments(),
        plantingService.getPlantings(),
      ]);
      setTreatments(treatmentsData as TreatmentWithDetails[]);
      setPlantings(plantingsData as PlantingWithDetails[]);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activePlantings = plantings.filter(p => p.status === "active");
  
  const getPlantingDetails = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    return {
      name: planting?.plant_types?.name || "N/A",
      variety: planting?.plant_types?.variety || "N/A",
      datePlanted: planting?.date_planted ? new Date(planting.date_planted).toLocaleDateString() : "N/A",
    };
  };

  const handleSaveTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const targetPlantingIds = isBulkMode ? selectedPlantingIds : [formData.get("planting_ids") as string];

    if (targetPlantingIds.length === 0 || !targetPlantingIds[0]) {
      alert("Please select at least one planting.");
      return;
    }

    const treatmentData = {
      chemical_name: formData.get("chemical_name") as string,
      treatment_type: formData.get("treatment_type") as string,
      date_applied: formData.get("date_applied") as string,
      planting_ids: targetPlantingIds,
      dosage: (formData.get("dosage") as string) || null,
      application_method: (formData.get("application_method") as string) || null,
      notes: (formData.get("notes") as string) || null,
      applied_by: (formData.get("applied_by") as string) || null,
    };
    
    try {
      if (editingTreatment) {
        await treatmentService.updateTreatment(editingTreatment.id, treatmentData);
      } else {
        await treatmentService.createTreatment(treatmentData);
      }
      
      await loadData();
      setIsDialogOpen(false);
      setEditingTreatment(null);
      setSelectedPlantingIds([]);
    } catch (error) {
      console.error("Error saving treatment:", error);
      alert("Failed to save treatment. Please try again.");
    }
  };
  
  const handleDeleteTreatment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this treatment record?")) return;
    
    try {
      await treatmentService.deleteTreatment(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting treatment:", error);
      alert("Failed to delete treatment. Please try again.");
    }
  };

  const handleOpenDialog = (treatment: TreatmentWithDetails | null = null, bulk = false) => {
    setEditingTreatment(treatment);
    setIsBulkMode(bulk);
    setSelectedPlantingIds(treatment && treatment.planting_ids ? treatment.planting_ids : []);
    setIsDialogOpen(true);
  };
  
  const togglePlantingSelection = (plantingId: string) => {
    setSelectedPlantingIds(prev =>
      prev.includes(plantingId) ? prev.filter(id => id !== plantingId) : [...prev, plantingId]
    );
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3"><TestTube2 className="w-10 h-10 text-cyan-600" />Treatments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Log and manage all chemical and fertilizer applications.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenDialog(null, true)} disabled={activePlantings.length === 0}><ChevronsRight className="w-4 h-4 mr-2" />Bulk Apply</Button>
          <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-2" />Add Treatment</Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isBulkMode ? "Bulk Apply Treatment" : (editingTreatment ? "Edit" : "Add") + " Treatment"}</DialogTitle>
            <DialogDescription>{isBulkMode ? "Apply the same treatment to multiple plantings at once." : "Log a single treatment application."}</DialogDescription>
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
                <Label htmlFor="planting_ids">Select Planting *</Label>
                <Select name="planting_ids" required defaultValue={editingTreatment?.planting_ids?.[0]}>
                  <SelectTrigger><SelectValue placeholder="Select a planting" /></SelectTrigger>
                  <SelectContent>
                    {activePlantings.map(p => <SelectItem key={p.id} value={p.id}>{getPlantingDetails(p.id).name} ({getPlantingDetails(p.id).variety})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="chemical_name">Chemical/Fertilizer Name *</Label><Input id="chemical_name" name="chemical_name" defaultValue={editingTreatment?.chemical_name || ""} required /></div>
              <div className="space-y-2"><Label htmlFor="treatment_type">Treatment Type *</Label><Select name="treatment_type" required defaultValue={editingTreatment?.treatment_type || undefined}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fungicide">Fungicide</SelectItem><SelectItem value="pesticide">Pesticide</SelectItem><SelectItem value="fertilizer">Fertilizer</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="dosage">Dosage</Label><Input id="dosage" name="dosage" defaultValue={editingTreatment?.dosage || ""} /></div>
              <div className="space-y-2"><Label htmlFor="application_method">Application Method</Label><Select name="application_method" defaultValue={editingTreatment?.application_method || undefined}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="drench">Drench</SelectItem><SelectItem value="spray">Spray</SelectItem><SelectItem value="granular">Granular</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="date_applied">Application Date *</Label><Input id="date_applied" name="date_applied" type="date" defaultValue={editingTreatment?.date_applied || new Date().toISOString().split("T")[0]} required /></div>
              <div className="space-y-2"><Label htmlFor="applied_by">Applied By</Label><Input id="applied_by" name="applied_by" defaultValue={editingTreatment?.applied_by || ""} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={editingTreatment?.notes || ""} /></div>
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
                    <TableCell>{new Date(treatment.date_applied).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{treatment.chemical_name}</TableCell>
                    <TableCell>{treatment.treatment_type}</TableCell>
                    <TableCell>{treatment.planting_ids?.length} planting(s)</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(treatment)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteTreatment(treatment.id)}><Trash2 className="w-4 h-4" /></Button>
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