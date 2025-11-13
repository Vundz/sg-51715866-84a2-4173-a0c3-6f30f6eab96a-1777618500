import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, Printer } from "lucide-react";
import { harvestService } from "@/services/harvestService";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { locationService } from "@/services/locationService";
import type { Tables } from "@/integrations/supabase/types";

type Harvest = Tables<"harvests">;
type Planting = Tables<"plantings">;
type PlantType = Tables<"plant_types">;
type Location = Tables<"locations">;

export default function HarvestsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [harvestsData, plantingsData, plantTypesData, locationsData] = await Promise.all([
        harvestService.getHarvests(),
        plantingService.getPlantings(),
        plantTypeService.getPlantTypes(),
        locationService.getLocations()
      ]);
      setHarvests(harvestsData);
      setPlantings(plantingsData);
      setPlantTypes(plantTypesData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPlantingDetails = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return null;
    const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);
    const location = locations.find(l => l.id === planting.location_id);
    return { 
      ...planting, 
      plantTypeName: plantType?.name || "N/A",
      locationName: location?.name || "N/A"
    };
  };

  const handlePrintDispatchSlip = (harvest: Harvest) => {
    const details = getPlantingDetails(harvest.planting_id);
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
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            padding: 10mm;
            max-width: 80mm;
            margin: 0 auto;
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
          }
          
          .header h2 {
            margin: 4px 0 0 0;
            font-size: 14px;
            font-weight: normal;
          }
          
          .section {
            margin-bottom: 12px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          
          .label {
            font-weight: bold;
          }
          
          .value {
            text-align: right;
          }
          
          .highlight {
            background: #000;
            color: #fff;
            padding: 4px 8px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin: 8px 0;
          }
          
          .footer {
            border-top: 2px dashed #000;
            padding-top: 8px;
            margin-top: 12px;
            text-align: center;
            font-size: 10px;
          }
          
          .notes {
            border: 1px solid #000;
            padding: 6px;
            margin-top: 8px;
            min-height: 40px;
          }
          
          .barcode {
            text-align: center;
            font-size: 10px;
            margin: 8px 0;
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
          <div class="info-row">
            <span class="label">Dispatch ID:</span>
            <span class="value">${harvest.id}</span>
          </div>
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">${new Date(harvest.harvest_date).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="label">Time:</span>
            <span class="value">${new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div class="highlight">
          QUANTITY: ${harvest.quantity_harvested} UNITS
        </div>
        
        <div class="section">
          <div class="section-title">Product Information</div>
          <div class="info-row">
            <span class="label">Plant Type:</span>
            <span class="value">${details.plantTypeName}</span>
          </div>
          <div class="info-row">
            <span class="label">Variety:</span>
            <span class="value">${details.variety}</span>
          </div>
          <div class="info-row">
            <span class="label">Batch:</span>
            <span class="value">${details.batch_number || details.id}</span>
          </div>
          <div class="info-row">
            <span class="label">Quality:</span>
            <span class="value">${harvest.quality.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Location Details</div>
          <div class="info-row">
            <span class="label">Greenhouse:</span>
            <span class="value">${details.locationName}</span>
          </div>
          <div class="info-row">
            <span class="label">Planting Date:</span>
            <span class="value">${new Date(details.date_planted).toLocaleDateString()}</span>
          </div>
        </div>
        
        ${harvest.notes ? `
        <div class="section">
          <div class="section-title">Notes</div>
          <div class="notes">${harvest.notes}</div>
        </div>
        ` : ""}
        
        <div class="barcode">
          <div style="font-size: 20px; letter-spacing: 2px;">||||| ${harvest.id.slice(-8)} |||||</div>
        </div>
        
        <div class="footer">
          <p>Packed by: _________________</p>
          <p>Checked by: _________________</p>
          <p style="margin-top: 8px;">Thank you for your business!</p>
        </div>
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
    const plantingId = formData.get("plantingId") as string;
    const quantityHarvested = parseInt(formData.get("quantityHarvested") as string);
    const closePlanting = formData.get("closePlanting") === "on";

    const harvestData = {
      planting_id: plantingId,
      quantity_harvested: quantityHarvested,
      harvest_date: formData.get("harvestDate") as string,
      quality: formData.get("quality") as string,
      notes: formData.get("notes") as string || null,
      is_closed: closePlanting
    };

    try {
      if (editingHarvest) {
        await harvestService.updateHarvest(editingHarvest.id, harvestData);
      } else {
        await harvestService.addHarvest(harvestData);
      }
      
      await loadData();
      setIsDialogOpen(false);
      setEditingHarvest(null);
    } catch (error) {
      console.error("Error saving harvest:", error);
      alert("Failed to save harvest. Please try again.");
    }
  };

  const handleDeleteHarvest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this harvest record?")) return;
    
    try {
      await harvestService.deleteHarvest(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting harvest:", error);
      alert("Failed to delete harvest. Please try again.");
    }
  };

  const handleOpenDialog = (harvest: Harvest | null = null) => {
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
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Package className="w-10 h-10 text-blue-600" />
            Harvests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Record and manage harvests from your plantings.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Harvest
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingHarvest ? "Edit" : "Add"} Harvest</DialogTitle>
            <DialogDescription>
              {editingHarvest ? "Update the details for this harvest." : "Record a new harvest from a planting."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveHarvest} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="plantingId">Planting</Label>
              <Select name="plantingId" required defaultValue={editingHarvest?.planting_id}>
                <SelectTrigger><SelectValue placeholder="Select a planting" /></SelectTrigger>
                <SelectContent>
                  {plantings.filter(p => p.status === "active").map(p => {
                    const details = getPlantingDetails(p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {details?.plantTypeName} ({details?.variety}) - Remaining: {details?.remaining_quantity ?? details?.quantity}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityHarvested">Quantity Harvested</Label>
                <Input id="quantityHarvested" name="quantityHarvested" type="number" defaultValue={editingHarvest?.quantity_harvested} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="harvestDate">Harvest Date</Label>
                <Input id="harvestDate" name="harvestDate" type="date" defaultValue={editingHarvest?.harvest_date || new Date().toISOString().split("T")[0]} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Quality</Label>
              <Select name="quality" required defaultValue={editingHarvest?.quality}>
                <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editingHarvest?.notes || ""} />
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="closePlanting" name="closePlanting" defaultChecked={editingHarvest?.is_closed || false} />
                <label htmlFor="closePlanting" className="text-sm font-medium leading-none">
                Close this planting after harvest
                </label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Harvest</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Harvest Log</CardTitle>
          <CardDescription>A complete history of all recorded harvests with dispatch slip printing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Planting</TableHead>
                <TableHead>Qty Harvested</TableHead>
                <TableHead>Harvest Date</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {harvests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">No harvests recorded yet.</TableCell></TableRow>
              ) : (
                harvests.map(h => {
                  const details = getPlantingDetails(h.planting_id);
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{details?.plantTypeName || "N/A"}<br/><span className="text-xs text-gray-500">{details?.variety}</span></TableCell>
                      <TableCell>{h.quantity_harvested}</TableCell>
                      <TableCell>{new Date(h.harvest_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={h.quality === "excellent" || h.quality === "good" ? "default" : "destructive"}
                          className={
                            h.quality === "excellent" ? "bg-green-100 text-green-800" :
                            h.quality === "good" ? "bg-blue-100 text-blue-800" :
                            h.quality === "fair" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                          }
                        >{h.quality}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handlePrintDispatchSlip(h)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Print Dispatch Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(h)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteHarvest(h.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}