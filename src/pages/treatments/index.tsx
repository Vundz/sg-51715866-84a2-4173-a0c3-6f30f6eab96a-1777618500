import { useState, useEffect, useMemo } from "react";
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
import { treatmentService, TreatmentWithPlantings } from "@/services/treatmentService";
import { plantingService, PlantingWithDetails } from "@/services/plantingService";
import { useToast } from "@/hooks/use-toast";
import { group } from "console";

// We need to group the results from the service by treatment
interface GroupedTreatment {
  id: string;
  name: string;
  type: string;
  application_date: string;
  dosage: string;
  application_method: string;
  notes: string | null;
  applied_by: string | null;
  plantings: {
    id: string;
    batch_number: string | null;
  }[];
}

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<GroupedTreatment[]>([]);
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<GroupedTreatment | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPlantingIds, setSelectedPlantingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [treatmentsData, plantingsData] = await Promise.all([
        treatmentService.getTreatments(),
        plantingService.getPlantingsWithDetails(),
      ]);

      const groupedTreatments = groupTreatments(treatmentsData);
      setTreatments(groupedTreatments);
      setPlantings(plantingsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const groupTreatments = (data: TreatmentWithPlantings[]): GroupedTreatment[] => {
    const treatmentMap = new Map<string, GroupedTreatment>();

    data.forEach(item => {
      if (!item.treatments) return;

      const treatmentId = item.treatments.id;
      if (!treatmentMap.has(treatmentId)) {
        treatmentMap.set(treatmentId, {
          id: treatmentId,
          name: item.treatments.name,
          type: item.treatments.type,
          application_date: item.treatments.application_date,
          dosage: item.treatments.dosage,
          application_method: item.treatments.application_method,
          notes: item.treatments.notes,
          applied_by: item.treatments.applied_by,
          plantings: [],
        });
      }

      const existingTreatment = treatmentMap.get(treatmentId)!;
      if (item.plantings && !existingTreatment.plantings.some(p => p.id === item.plantings!.id)) {
        existingTreatment.plantings.push({
            id: item.plantings.id,
            batch_number: item.plantings.batch_number
        });
      }
    });

    return Array.from(treatmentMap.values());
  };

  const filteredTreatments = useMemo(() => 
    treatments.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase())
    ), [treatments, searchQuery]);

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
    
    if (isBulkMode && selectedPlantingIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one planting for bulk application.", variant: "destructive" });
      return;
    }
    
    const singlePlantingId = formData.get("planting_id") as string;
    if (!isBulkMode && !singlePlantingId && !editingTreatment) {
      toast({ title: "Error", description: "Please select a planting.", variant: "destructive" });
      return;
    }

    const treatmentData = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      application_date: formData.get("application_date") as string,
      dosage: formData.get("dosage") as string,
      application_method: formData.get("application_method") as string,
      notes: formData.get("notes") as string,
      applied_by: formData.get("applied_by") as string,
    };
    
    const finalPlantingIds = isBulkMode ? selectedPlantingIds : editingTreatment ? selectedPlantingIds : [singlePlantingId];

    try {
      if (editingTreatment) {
        await treatmentService.updateTreatment(editingTreatment.id, treatmentData, finalPlantingIds);
        toast({ title: "Success", description: "Treatment updated." });
      } else {
        await treatmentService.createTreatment(treatmentData, finalPlantingIds);
        toast({ title: "Success", description: "Treatment created." });
      }
      
      await loadData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving treatment:", error);
      toast({ title: "Error", description: "Failed to save treatment.", variant: "destructive" });
    }
  };
  
  const handleDeleteTreatment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this treatment record?")) return;
    
    try {
      await treatmentService.deleteTreatment(id);
      await loadData();
      toast({ title: "Success", description: "Treatment deleted." });
    } catch (error) {
      console.error("Error deleting treatment:", error);
      toast({ title: "Error", description: "Failed to delete treatment.", variant: "destructive" });
    }
  };

  const handleOpenDialog = (treatment: GroupedTreatment | null = null, bulk = false) => {
    setEditingTreatment(treatment);
    setIsBulkMode(bulk || (treatment !== null && treatment.plantings.length > 1));
    setSelectedPlantingIds(treatment?.plantings.map(p => p.id) || []);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTreatment(null);
    setSelectedPlantingIds([]);
  }
  
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
            <DialogTitle>{editingTreatment ? "Edit Treatment" : "Add New Treatment"}</DialogTitle>
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
                <Label htmlFor="planting_id">Select Planting *</Label>
                <Select name="planting_id" required defaultValue={editingTreatment?.plantings?.[0]?.id} onValueChange={(val) => setSelectedPlantingIds([val])}>
                  <SelectTrigger><SelectValue placeholder="Select a planting" /></SelectTrigger>
                  <SelectContent>
                    {activePlantings.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.plant_types?.name} ({p.batch_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="name">Chemical/Fertilizer Name *</Label><Input id="name" name="name" defaultValue={editingTreatment?.name || ""} required /></div>
              <div className="space-y-2"><Label htmlFor="type">Treatment Type *</Label><Select name="type" required defaultValue={editingTreatment?.type || undefined}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fungicide">Fungicide</SelectItem><SelectItem value="pesticide">Pesticide</SelectItem><SelectItem value="fertilizer">Fertilizer</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="dosage">Dosage</Label><Input id="dosage" name="dosage" defaultValue={editingTreatment?.dosage || ""} /></div>
              <div className="space-y-2"><Label htmlFor="application_method">Application Method</Label><Select name="application_method" defaultValue={editingTreatment?.application_method || undefined}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="drench">Drench</SelectItem><SelectItem value="spray">Spray</SelectItem><SelectItem value="granular">Granular</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="application_date">Application Date *</Label><Input id="application_date" name="application_date" type="date" defaultValue={editingTreatment?.application_date ? new Date(editingTreatment.application_date).toISOString().split('T')[0] : new Date().toISOString().split("T")[0]} required /></div>
              <div className="space-y-2"><Label htmlFor="applied_by">Applied By</Label><Input id="applied_by" name="applied_by" defaultValue={editingTreatment?.applied_by || ""} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={editingTreatment?.notes || ""} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button><Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Save Treatment</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Treatment History</CardTitle>
          <CardDescription>A log of all treatments applied.</CardDescription>
          <Input 
            placeholder="Search by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm mt-2"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Applied To</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : filteredTreatments.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.application_date).toLocaleDateString()}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.type}</TableCell>
                  <TableCell>{t.plantings.map(p => p.batch_number).join(', ')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(t)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteTreatment(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
               {filteredTreatments.length === 0 && (
                 <TableRow><TableCell colSpan={5} className="text-center h-24">No treatments found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}