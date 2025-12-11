import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, Printer } from "lucide-react";
import { harvestService, HarvestWithDetails } from "@/services/harvestService";
import { plantingService, PlantingWithDetails } from "@/services/plantingService";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export default function HarvestsPage() {
  const { user, profile } = useAuth();
  const [harvests, setHarvests] = useState<HarvestWithDetails[]>([]);
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [harvestedQuantities, setHarvestedQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredHarvests, setFilteredHarvests] = useState<HarvestWithDetails[]>([]);
  const [filters, setFilters] = useState({
    planting_id: "__all__",
    variety: "__all__",
    date_from: "",
    date_to: "",
    status: "__all__",
  });
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>("");
  const [harvestQuantity, setHarvestQuantity] = useState<number>(0);
  const [quantityError, setQuantityError] = useState<string>("");
  const { toast } = useToast();

  const isViewer = profile?.role === "viewer";

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [harvestsData, plantingsData] = await Promise.all([
        harvestService.getHarvests(),
        plantingService.getPlantingsWithDetails()
      ]);
      setHarvests(harvestsData);
      setPlantings(plantingsData);

      // Calculate total harvested quantity for each planting
      const quantities: Record<string, number> = {};
      for (const p of plantingsData) {
        const totalHarvested = harvestsData
          .filter(h => h.planting_id === p.id)
          .reduce((sum, h) => sum + h.quantity_harvested, 0);
        quantities[p.id] = totalHarvested;
      }
      setHarvestedQuantities(quantities);

    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = harvests;
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(h => 
        h.plantings?.plant_types?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.plantings?.plant_types?.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.plantings?.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Planting filter
    if (filters.planting_id && filters.planting_id !== "__all__") {
      filtered = filtered.filter(h => h.planting_id === filters.planting_id);
    }
    
    // Variety filter
    if (filters.variety && filters.variety !== "__all__") {
      filtered = filtered.filter(h => h.plantings?.plant_types?.variety === filters.variety);
    }
    
    // Date range filters
    if (filters.date_from) {
      filtered = filtered.filter(h => new Date(h.harvest_date) >= new Date(filters.date_from));
    }
    if (filters.date_to) {
      filtered = filtered.filter(h => new Date(h.harvest_date) <= new Date(filters.date_to));
    }
    
    // Status filter
    if (filters.status && filters.status !== "__all__") {
      filtered = filtered.filter(h => h.status === filters.status);
    }
    
    setFilteredHarvests(filtered);
  }, [harvests, searchQuery, filters]);

  // Calculate total harvested based on filters
  const totalHarvested = filteredHarvests.reduce((sum, h) => sum + h.quantity_harvested, 0);

  // Get unique varieties for filter
  const uniqueVarieties = Array.from(
    new Set(
      harvests
        .map(h => h.plantings?.plant_types?.variety)
        .filter(Boolean)
    )
  ).sort();

  const getRemainingQuantity = (planting: PlantingWithDetails) => {
    const harvested = harvestedQuantities[planting.id] || 0;
    return planting.quantity - harvested;
  };

  const getAvailableQuantity = (plantingId: string): number => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return 0;
    const harvested = harvestedQuantities[plantingId] || 0;
    return planting.quantity - harvested;
  };

  const validateHarvestQuantity = (quantity: number, plantingId: string): boolean => {
    if (!plantingId) {
      setQuantityError("Please select a planting first");
      return false;
    }
    
    const available = getAvailableQuantity(plantingId);
    
    if (quantity <= 0) {
      setQuantityError("Quantity must be greater than 0");
      return false;
    }
    
    if (quantity > available) {
      setQuantityError(`Quantity exceeds available: ${available} seedlings`);
      return false;
    }
    
    setQuantityError("");
    return true;
  };

  const handlePlantingChange = (plantingId: string) => {
    setSelectedPlantingId(plantingId);
    setHarvestQuantity(0);
    setQuantityError("");
  };

  const handleQuantityChange = (value: string) => {
    const qty = parseInt(value) || 0;
    setHarvestQuantity(qty);
    if (selectedPlantingId) {
      validateHarvestQuantity(qty, selectedPlantingId);
    }
  };

  const handlePrintDispatchSlip = (harvest: HarvestWithDetails) => {
    const details = harvest.plantings;
    if (!details) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print dispatch slips");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dispatch Slip - ${harvest.id}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.4; 
            padding: 10mm; 
            max-width: 80mm; 
            margin: 0 auto; 
            color: #000 !important;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 8px; 
            margin-bottom: 12px; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 18px; 
            font-weight: bold; 
            color: #000 !important;
          }
          .header h2 { 
            margin: 4px 0 0 0; 
            font-size: 14px; 
            font-weight: normal; 
            color: #000 !important;
          }
          .section { 
            margin-bottom: 12px; 
          }
          .section-title { 
            font-weight: bold; 
            font-size: 14px; 
            margin-bottom: 4px; 
            text-transform: uppercase; 
            color: #000 !important;
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px; 
            color: #000 !important;
          }
          .label { 
            font-weight: bold; 
            color: #000 !important;
          }
          .value { 
            text-align: right; 
            color: #000 !important;
            font-weight: bold !important;
          }
          .footer { 
            border-top: 2px dashed #000; 
            padding-top: 8px; 
            margin-top: 12px; 
            text-align: center; 
            font-size: 10px; 
            color: #000 !important;
          }
          .notes { 
            border: 1px solid #000; 
            padding: 6px; 
            margin-top: 8px; 
            min-height: 40px; 
            color: #000 !important;
            font-weight: bold !important;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 8px 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          th, td { 
            text-align: left; 
            padding: 8px 4px; 
            border-bottom: 2px solid #000 !important;
            font-size: 16px !important;
            color: #000 !important;
            font-weight: bold !important;
          }
          th { 
            font-weight: 900 !important;
            background: #f0f0f0 !important;
            color: #000 !important;
            font-size: 18px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          td {
            font-weight: 700 !important;
            color: #000 !important;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DISPATCH SLIP</h1>
          <h2>Seedlings Nursery</h2>
        </div>
        <div class="section">
          <div class="section-title">Order Details</div>
          <div class="info-row"><span class="label">Dispatch ID:</span><span class="value">${harvest.id.slice(0, 8)}</span></div>
          <div class="info-row"><span class="label">Date:</span><span class="value">${new Date(harvest.harvest_date).toLocaleDateString()}</span></div>
          <div class="info-row"><span class="label">Time:</span><span class="value">${new Date().toLocaleTimeString()}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Product Information</div>
          <table>
            <tr>
              <th>Variety</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Location</th>
            </tr>
            <tr>
              <td>${details.plant_types?.variety || 'N/A'}</td>
              <td>${details.batch_number || 'N/A'}</td>
              <td>${formatNumber(harvest.quantity_harvested)}</td>
              <td>${details.locations?.name || 'N/A'}</td>
            </tr>
          </table>
        </div>
        ${harvest.notes ? `<div class="section"><div class="notes">${harvest.notes}</div></div>` : '<div class="section"><div class="notes"></div></div>'}
        <div class="footer"><p>Packed by: _________________</p><p>Checked by: _________________</p><p style="margin-top: 8px;">Thank you for your business!</p></div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleSaveHarvest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plantingId = formData.get("planting_id") as string;
    const quantity = parseInt(formData.get("quantity_harvested") as string);
    
    // Validate before saving
    if (!validateHarvestQuantity(quantity, plantingId)) {
      toast({ 
        title: "Validation Error", 
        description: quantityError,
        variant: "destructive" 
      });
      return;
    }

    const harvestData = {
      planting_id: formData.get("planting_id") as string,
      quantity_harvested: parseInt(formData.get("quantity_harvested") as string),
      harvest_date: formData.get("harvest_date") as string,
      status: formData.get("status") as string,
      notes: (formData.get("notes") as string) || null,
      quality: formData.get("quality") as string,
      is_closed: formData.get("is_closed") === 'on',
    };

    try {
      if (editingHarvest) {
        await harvestService.updateHarvest(editingHarvest.id, harvestData);
      } else {
        await harvestService.createHarvest(harvestData);
      }
      
      await loadInitialData();
      setIsDialogOpen(false);
      setEditingHarvest(null);
      setSelectedPlantingId("");
      setHarvestQuantity(0);
      setQuantityError("");
    } catch (error) {
      console.error("Error saving harvest:", error);
      alert("Failed to save harvest. Please try again.");
    }
  };

  const handleDeleteHarvest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this harvest record?")) return;
    
    try {
      await harvestService.deleteHarvest(id);
      await loadInitialData();
    } catch (error) {
      console.error("Error deleting harvest:", error);
      alert("Failed to delete harvest. Please try again.");
    }
  };

  const handleOpenDialog = (harvest: HarvestWithDetails | null = null) => {
    setEditingHarvest(harvest);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading harvests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3"><Package className="w-10 h-10 text-blue-600" />Harvests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Record and manage harvests from your plantings.</p>
        </div>
        {!isViewer && (
          <div className="flex items-center gap-2">
            <Link href="/harvests/bulk">
              <Button variant="outline">Bulk Harvest</Button>
            </Link>
            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Harvest
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingHarvest ? "Edit Harvest" : "Add New Harvest"}</DialogTitle>
            <DialogDescription>
              {isViewer ? "Viewing harvest details. No changes can be made." : (editingHarvest ? "Update harvest details." : "Log a new harvest record.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveHarvest} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planting_id">Planting Batch</Label>
                <Select 
                  name="planting_id" 
                  defaultValue={editingHarvest?.planting_id}
                  onValueChange={handlePlantingChange}
                  required
                  disabled={isViewer || !!editingHarvest}
                >
                  <SelectTrigger><SelectValue placeholder="Select a planting" /></SelectTrigger>
                  <SelectContent>
                    {plantings.filter(p => p.status === "active").map(p => {
                      const available = getAvailableQuantity(p.id);
                      return (
                        <SelectItem key={p.id} value={p.id} disabled={available <= 0}>
                          {p.plant_types?.name} ({p.plant_types?.variety}) - Available: {formatNumber(available)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedPlantingId && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Available: <strong>{formatNumber(getAvailableQuantity(selectedPlantingId))}</strong> seedlings
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="harvest_date">Harvest Date</Label>
                <Input id="harvest_date" name="harvest_date" type="date" defaultValue={editingHarvest?.harvest_date.split('T')[0]} required disabled={isViewer}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity_harvested">Quantity Harvested</Label>
                <Input 
                  id="quantity_harvested" 
                  name="quantity_harvested" 
                  type="number" 
                  defaultValue={editingHarvest?.quantity_harvested}
                  value={harvestQuantity || ""}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className={quantityError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required 
                  disabled={isViewer}
                />
                {quantityError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {quantityError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <Select name="quality" defaultValue={editingHarvest?.quality ?? 'good'} disabled={isViewer}>
                  <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingHarvest?.status ?? 'harvested'} disabled={isViewer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harvested">Harvested</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="waste">Waste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={editingHarvest?.notes ?? ""} disabled={isViewer}/>
            </div>
            {!isViewer ? (
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedPlantingId("");
                  setHarvestQuantity(0);
                  setQuantityError("");
                }}>Cancel</Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!!quantityError || harvestQuantity === 0}
                >
                  Save Harvest
                </Button>
              </div>
            ) : (
              <div className="flex justify-end pt-4">
                 <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Harvest Log</CardTitle>
          <CardDescription>A complete history of all recorded harvests with dispatch slip printing.</CardDescription>
          
          {/* Search and Filters */}
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Search by plant name, variety, or batch number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select 
                value={filters.planting_id} 
                onValueChange={(value) => setFilters({ ...filters, planting_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Plantings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Plantings</SelectItem>
                  {plantings.filter(p => p.status === "active" && p.batch_number && p.batch_number.trim() !== "").map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.plant_types?.name} ({p.batch_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.variety} 
                onValueChange={(value) => setFilters({ ...filters, variety: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Varieties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Varieties</SelectItem>
                  {uniqueVarieties.map(variety => (
                    <SelectItem key={variety} value={variety}>
                      {variety}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="harvested">Harvested</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="waste">Waste</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="From Date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />

              <Input
                type="date"
                placeholder="To Date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>

            {(filters.planting_id !== "__all__" || filters.variety !== "__all__" || filters.status !== "__all__" || filters.date_from || filters.date_to || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({ planting_id: "__all__", variety: "__all__", date_from: "", date_to: "", status: "__all__" });
                  setSearchQuery("");
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Planting</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead>Qty Harvested</TableHead>
                <TableHead>Harvest Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHarvests.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No harvests found matching your filters.</TableCell></TableRow>
              ) : (
                filteredHarvests.map(h => {
                  const details = h.plantings;
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{details?.plant_types?.name || "N/A"}<br/><span className="text-xs text-gray-500">{details?.plant_types?.variety}</span></TableCell>
                      <TableCell className="font-mono text-sm">{details?.batch_number || "N/A"}</TableCell>
                      <TableCell>{formatNumber(h.quantity_harvested)}</TableCell>
                      <TableCell>{new Date(h.harvest_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={h.status === 'sold' ? 'default' : 'secondary'}>{h.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isViewer ? (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handlePrintDispatchSlip(h)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Print Dispatch Slip"><Printer className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(h)}><Edit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteHarvest(h.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handlePrintDispatchSlip(h)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Print Dispatch Slip"><Printer className="w-4 h-4" /></Button>
                            <span className="text-xs text-gray-400 italic ml-2">View only</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Total Harvested Summary */}
          {filteredHarvests.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Total Harvested:
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatNumber(totalHarvested)}
                  </span>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    seedlings
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 text-right">
                  {filteredHarvests.length} harvest record{filteredHarvests.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}