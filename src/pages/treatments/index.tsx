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
import { Plus, Edit, Trash2, TestTube2, ChevronsRight, X } from "lucide-react";
import { treatmentService, TreatmentWithPlantings } from "@/services/treatmentService";
import { plantingService, PlantingWithDetails } from "@/services/plantingService";
import { locationService } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

interface Chemical {
  id: string;
  name: string;
  type: string;
  dosage: string;
}

interface GroupedTreatment {
  id: string;
  name: string;
  type: string;
  application_date: string;
  dosage: string;
  application_method: string;
  notes: string | null;
  applied_by: string | null;
  chemicals?: Chemical[];
  plantings: {
    id: string;
    batch_number: string | null;
  }[];
}

type Location = Awaited<ReturnType<typeof locationService.getLocations>>[0];

export default function TreatmentsPage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions("treatments");
  const [treatments, setTreatments] = useState<GroupedTreatment[]>([]);
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<GroupedTreatment | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [applicationMode, setApplicationMode] = useState<"batch" | "location" | "both">("batch");
  const [selectedPlantingIds, setSelectedPlantingIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([
    { id: crypto.randomUUID(), name: "", type: "fungicide", dosage: "" }
  ]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const isViewer = profile?.role === "viewer";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [treatmentsData, plantingsData, locationsData] = await Promise.all([
        treatmentService.getTreatments(),
        plantingService.getPlantingsWithDetails(),
        locationService.getLocations(),
      ]);

      const groupedTreatments = groupTreatments(treatmentsData);
      setTreatments(groupedTreatments);
      setPlantings(plantingsData);
      setLocations(locationsData);
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
        // Parse chemicals from notes if stored as JSON, otherwise use legacy format
        let parsedChemicals: Chemical[] = [];
        try {
          if (item.treatments.notes?.startsWith('[{')) {
            parsedChemicals = JSON.parse(item.treatments.notes);
          } else {
            // Legacy format: single chemical
            parsedChemicals = [{
              id: crypto.randomUUID(),
              name: item.treatments.name,
              type: item.treatments.type,
              dosage: item.treatments.dosage
            }];
          }
        } catch {
          // Fallback to legacy format
          parsedChemicals = [{
            id: crypto.randomUUID(),
            name: item.treatments.name,
            type: item.treatments.type,
            dosage: item.treatments.dosage
          }];
        }

        treatmentMap.set(treatmentId, {
          id: treatmentId,
          name: item.treatments.name,
          type: item.treatments.type,
          application_date: item.treatments.application_date,
          dosage: item.treatments.dosage,
          application_method: item.treatments.application_method,
          notes: item.treatments.notes,
          applied_by: item.treatments.applied_by,
          chemicals: parsedChemicals,
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
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.chemicals?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [treatments, searchQuery]);

  const activePlantings = plantings.filter(p => p.status === "active");

  const filteredPlantingsByLocation = useMemo(() => {
    if (applicationMode === "batch") {
      return activePlantings;
    }
    
    if (selectedLocationIds.length === 0) {
      return activePlantings;
    }
    
    return activePlantings.filter(p => selectedLocationIds.includes(p.location_id));
  }, [activePlantings, selectedLocationIds, applicationMode]);

  const getPlantingDetails = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    return {
      name: planting?.plant_types?.name || "N/A",
      variety: planting?.plant_types?.variety || "N/A",
      datePlanted: planting?.date_planted ? new Date(planting.date_planted).toLocaleDateString() : "N/A",
    };
  };

  const addChemical = () => {
    setChemicals([...chemicals, { id: crypto.randomUUID(), name: "", type: "fungicide", dosage: "" }]);
  };

  const removeChemical = (id: string) => {
    if (chemicals.length === 1) {
      toast({ title: "Error", description: "At least one chemical is required.", variant: "destructive" });
      return;
    }
    setChemicals(chemicals.filter(c => c.id !== id));
  };

  const updateChemical = (id: string, field: keyof Chemical, value: string) => {
    setChemicals(chemicals.map(c => c.id === id ? { ...c, [field]: value } : c));
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

    // Validate chemicals
    const validChemicals = chemicals.filter(c => c.name.trim() !== "");
    if (validChemicals.length === 0) {
      toast({ title: "Error", description: "Please add at least one chemical with a name.", variant: "destructive" });
      return;
    }

    // Use first chemical as primary for backward compatibility
    const primaryChemical = validChemicals[0];
    
    const treatmentData = {
      name: primaryChemical.name,
      type: primaryChemical.type,
      application_date: formData.get("application_date") as string,
      dosage: primaryChemical.dosage,
      application_method: formData.get("application_method") as string,
      notes: JSON.stringify(validChemicals), // Store all chemicals as JSON
      applied_by: formData.get("applied_by") as string,
    };
    
    const finalPlantingIds = isBulkMode ? selectedPlantingIds : editingTreatment ? editingTreatment.plantings.map(p => p.id) : [singlePlantingId];

    try {
      if (editingTreatment) {
        await treatmentService.updateTreatment(editingTreatment.id, treatmentData, finalPlantingIds);
        toast({ title: "Success", description: "Treatment updated." });
      } else {
        const treatmentPayload = {
          ...treatmentData,
          planting_ids: finalPlantingIds
        };
        await treatmentService.createTreatment(treatmentPayload, finalPlantingIds);
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
    setApplicationMode("batch");
    setSelectedPlantingIds(treatment?.plantings.map(p => p.id) || []);
    setSelectedLocationIds([]);
    
    // Load chemicals from treatment or start with empty one
    if (treatment?.chemicals && treatment.chemicals.length > 0) {
      setChemicals(treatment.chemicals.map(c => ({ ...c, id: crypto.randomUUID() })));
    } else {
      setChemicals([{ id: crypto.randomUUID(), name: "", type: "fungicide", dosage: "" }]);
    }
    
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTreatment(null);
    setSelectedPlantingIds([]);
    setSelectedLocationIds([]);
    setApplicationMode("batch");
    setChemicals([{ id: crypto.randomUUID(), name: "", type: "fungicide", dosage: "" }]);
  };
  
  const togglePlantingSelection = (plantingId: string) => {
    setSelectedPlantingIds(prev =>
      prev.includes(plantingId) ? prev.filter(id => id !== plantingId) : [...prev, plantingId]
    );
  };

  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocationIds(prev => {
      const newSelection = prev.includes(locationId) 
        ? prev.filter(id => id !== locationId) 
        : [...prev, locationId];
      
      if (applicationMode === "location") {
        const plantingsInLocations = activePlantings
          .filter(p => newSelection.includes(p.location_id))
          .map(p => p.id);
        setSelectedPlantingIds(plantingsInLocations);
      }
      
      return newSelection;
    });
  };

  const selectAllLocations = () => {
    if (selectedLocationIds.length === locations.length) {
      setSelectedLocationIds([]);
      if (applicationMode === "location") {
        setSelectedPlantingIds([]);
      }
    } else {
      const allLocationIds = locations.map(l => l.id);
      setSelectedLocationIds(allLocationIds);
      if (applicationMode === "location") {
        setSelectedPlantingIds(activePlantings.map(p => p.id));
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3"><TestTube2 className="w-10 h-10 text-cyan-600" />Treatments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Log and manage all chemical and fertilizer applications.</p>
        </div>
        
        {permissions.canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenDialog(null, true)} disabled={activePlantings.length === 0}><ChevronsRight className="w-4 h-4 mr-2" />Bulk Apply</Button>
            <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-2" />Add Treatment</Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTreatment ? "Edit Treatment" : "Add New Treatment"}</DialogTitle>
            <DialogDescription>{isViewer ? "Viewing treatment details. No changes can be made." : (isBulkMode ? "Apply the same treatment to multiple plantings at once." : "Log a single treatment application.")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTreatment} className="space-y-6 pt-4">
            {/* Chemicals Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Chemicals / Fertilizers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChemical}
                  disabled={isViewer}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Chemical
                </Button>
              </div>
              
              <div className="space-y-3">
                {chemicals.map((chemical, index) => (
                  <Card key={chemical.id} className="border-2">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-2">
                              <Label htmlFor={`chemical-name-${chemical.id}`}>
                                Chemical Name * {index === 0 && <span className="text-xs text-muted-foreground">(Primary)</span>}
                              </Label>
                              <Input
                                id={`chemical-name-${chemical.id}`}
                                value={chemical.name}
                                onChange={(e) => updateChemical(chemical.id, "name", e.target.value)}
                                placeholder="e.g., Mancozeb, NPK 20-20-20"
                                disabled={isViewer}
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`chemical-type-${chemical.id}`}>Type *</Label>
                              <Select
                                value={chemical.type}
                                onValueChange={(value) => updateChemical(chemical.id, "type", value)}
                                disabled={isViewer}
                              >
                                <SelectTrigger id={`chemical-type-${chemical.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fungicide">Fungicide</SelectItem>
                                  <SelectItem value="insecticide">Insecticide</SelectItem>
                                  <SelectItem value="fertilizer">Fertilizer</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`chemical-dosage-${chemical.id}`}>Dosage</Label>
                            <Input
                              id={`chemical-dosage-${chemical.id}`}
                              value={chemical.dosage}
                              onChange={(e) => updateChemical(chemical.id, "dosage", e.target.value)}
                              placeholder="e.g., 50ml/L, 2 scoops per 20L"
                              disabled={isViewer}
                            />
                          </div>
                        </div>
                        
                        {chemicals.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeChemical(chemical.id)}
                            disabled={isViewer}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Planting Selection */}
            {isBulkMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Application Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={applicationMode === "batch" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setApplicationMode("batch");
                        setSelectedLocationIds([]);
                      }}
                      className="w-full"
                      disabled={isViewer}
                    >
                      By Batch
                    </Button>
                    <Button
                      type="button"
                      variant={applicationMode === "location" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setApplicationMode("location");
                        setSelectedPlantingIds([]);
                      }}
                      className="w-full"
                      disabled={isViewer}
                    >
                      By Location
                    </Button>
                    <Button
                      type="button"
                      variant={applicationMode === "both" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setApplicationMode("both")}
                      className="w-full"
                      disabled={isViewer}
                    >
                      Both
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {applicationMode === "batch" && "Select specific planting batches"}
                    {applicationMode === "location" && "Apply to all plantings in selected locations"}
                    {applicationMode === "both" && "Select locations, then refine by specific batches"}
                  </p>
                </div>

                {(applicationMode === "location" || applicationMode === "both") && (
                  <div className="space-y-2">
                    <Label>Select Locations *</Label>
                    <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 dark:bg-purple-950 rounded border border-purple-200 dark:border-purple-800">
                      <Checkbox 
                        id="select-all-locations" 
                        checked={selectedLocationIds.length === locations.length && locations.length > 0}
                        onCheckedChange={selectAllLocations}
                        disabled={isViewer}
                      />
                      <Label htmlFor="select-all-locations" className="font-semibold text-purple-900 dark:text-purple-100 cursor-pointer">
                        Select All Locations ({locations.length} total)
                      </Label>
                    </div>
                    <ScrollArea className="h-32 rounded-md border p-2 bg-background">
                      {locations.map(loc => (
                        <div key={loc.id} className="flex items-center gap-2 mb-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                          <Checkbox 
                            id={`location-${loc.id}`} 
                            checked={selectedLocationIds.includes(loc.id)} 
                            onCheckedChange={() => toggleLocationSelection(loc.id)} 
                            disabled={isViewer}
                          />
                          <Label htmlFor={`location-${loc.id}`} className="font-normal w-full cursor-pointer flex justify-between">
                            <span>{loc.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {activePlantings.filter(p => p.location_id === loc.id).length} planting(s)
                            </span>
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedLocationIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedLocationIds.length} location(s) selected → {filteredPlantingsByLocation.length} planting(s) affected
                      </p>
                    )}
                  </div>
                )}

                {(applicationMode === "batch" || applicationMode === "both") && (
                  <div className="space-y-2">
                    <Label>
                      {applicationMode === "both" ? "Refine Selection (Optional)" : "Select Plantings *"}
                    </Label>
                    <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <Checkbox 
                        id="select-all" 
                        checked={selectedPlantingIds.length === filteredPlantingsByLocation.length && filteredPlantingsByLocation.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlantingIds(filteredPlantingsByLocation.map(p => p.id));
                          } else {
                            setSelectedPlantingIds([]);
                          }
                        }}
                        disabled={isViewer}
                      />
                      <Label htmlFor="select-all" className="font-semibold text-blue-900 dark:text-blue-100 cursor-pointer">
                        Select All ({filteredPlantingsByLocation.length} {applicationMode === "both" ? "filtered " : ""}plantings)
                      </Label>
                    </div>
                    <ScrollArea className="h-48 rounded-md border p-2 bg-background">
                      {filteredPlantingsByLocation.map(p => {
                        const details = getPlantingDetails(p.id);
                        return (
                        <div key={p.id} className="flex items-center gap-2 mb-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                          <Checkbox id={`bulk-${p.id}`} checked={selectedPlantingIds.includes(p.id)} onCheckedChange={() => togglePlantingSelection(p.id)} disabled={isViewer}/>
                          <Label htmlFor={`bulk-${p.id}`} className="font-normal w-full cursor-pointer text-sm">
                            <div className="flex justify-between items-center">
                              <span>{details.name} ({details.variety})</span>
                              <span className="text-xs text-muted-foreground">{p.locations?.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Batch: {p.batch_number} • Planted: {details.datePlanted}</div>
                          </Label>
                        </div>
                      )})}
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="planting_id">Select Planting *</Label>
                <Select name="planting_id" required defaultValue={editingTreatment?.plantings?.[0]?.id} onValueChange={(val) => setSelectedPlantingIds([val])} disabled={isViewer || !!editingTreatment}>
                  <SelectTrigger><SelectValue placeholder="Select a planting" /></SelectTrigger>
                  <SelectContent>
                    {activePlantings.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.plant_types?.name} ({p.batch_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Application Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="application_method">Application Method</Label>
                <Select name="application_method" defaultValue={editingTreatment?.application_method || undefined} disabled={isViewer}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drench">Drench</SelectItem>
                    <SelectItem value="spray">Spray</SelectItem>
                    <SelectItem value="granular">Granular</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="application_date">Application Date *</Label>
                <Input 
                  id="application_date" 
                  name="application_date" 
                  type="date" 
                  defaultValue={editingTreatment?.application_date ? new Date(editingTreatment.application_date).toISOString().split('T')[0] : new Date().toISOString().split("T")[0]} 
                  required 
                  disabled={isViewer}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applied_by">Applied By</Label>
              <Input 
                id="applied_by" 
                name="applied_by" 
                defaultValue={editingTreatment?.applied_by || ""} 
                placeholder="Person who applied the treatment"
                disabled={isViewer}
              />
            </div>

            {(permissions.canCreate || permissions.canUpdate) ? (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Save Treatment</Button>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Close</Button>
              </div>
            )}
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
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Chemicals Applied</TableHead>
                <TableHead>Applied To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
              ) : filteredTreatments.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.application_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {t.chemicals && t.chemicals.length > 0 ? (
                        t.chemicals.map((chem, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{chem.name}</span>
                            <span className="text-muted-foreground ml-2">({chem.type})</span>
                            {chem.dosage && <span className="text-xs text-muted-foreground ml-2">- {chem.dosage}</span>}
                          </div>
                        ))
                      ) : (
                        <span className="text-sm">{t.name} ({t.type})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{t.plantings.map(p => p.batch_number).join(', ')}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {permissions.canUpdate && (
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(t)} title="Edit treatment">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {permissions.canDelete && (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteTreatment(t.id)} title="Delete treatment">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {!permissions.canUpdate && !permissions.canDelete && (
                        <span className="text-xs text-gray-400 italic">View only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTreatments.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center h-24">No treatments found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}