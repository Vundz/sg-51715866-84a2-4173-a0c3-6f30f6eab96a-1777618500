import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ArrowLeft, Save } from "lucide-react";
import { plantingService, PlantingWithDetails } from "@/services/plantingService";
import { harvestService } from "@/services/harvestService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type HarvestPayload = Omit<Database["public"]["Tables"]["harvests"]["Row"], "id" | "created_at" | "updated_at">;

interface SelectedHarvest {
  planting: PlantingWithDetails;
  quantity: number;
}

export default function BulkHarvestPage() {
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHarvests, setSelectedHarvests] = useState<Record<string, SelectedHarvest>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const loadPlantings = async () => {
      try {
        setLoading(true);
        const data = await plantingService.getPlantingsWithDetails();
        // Only show active plantings that have quantity remaining
        setPlantings(data.filter(p => p.status === 'active' && (p.remaining_quantity ?? p.quantity) > 0));
      } catch (error) {
        console.error("Error loading plantings:", error);
        toast({ title: "Error", description: "Failed to load plantings.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadPlantings();
  }, [toast]);

  const filteredPlantings = useMemo(() => {
    if (!searchQuery) return plantings;
    const query = searchQuery.toLowerCase();
    return plantings.filter(p =>
      p.batch_number?.toLowerCase().includes(query) ||
      p.plant_types?.name.toLowerCase().includes(query) ||
      p.plant_types?.variety.toLowerCase().includes(query) ||
      p.locations?.name.toLowerCase().includes(query)
    );
  }, [plantings, searchQuery]);

  const handleSelect = (planting: PlantingWithDetails) => {
    setSelectedHarvests(prev => {
      const newSelected = { ...prev };
      if (newSelected[planting.id]) {
        delete newSelected[planting.id];
      } else {
        newSelected[planting.id] = { planting, quantity: 0 };
      }
      return newSelected;
    });
  };

  const handleQuantityChange = (plantingId: string, quantity: string) => {
    const qty = parseInt(quantity, 10);
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return;

    const available = planting.remaining_quantity ?? planting.quantity;
    const finalQty = Math.max(0, Math.min(qty, available));

    setSelectedHarvests(prev => ({
      ...prev,
      [plantingId]: { ...prev[plantingId], quantity: finalQty },
    }));
  };
  
  const handleSubmit = async () => {
    const harvestsToCreate: HarvestPayload[] = Object.values(selectedHarvests)
      .filter(h => h.quantity > 0)
      .map(h => ({
        planting_id: h.planting.id,
        quantity_harvested: h.quantity,
        harvest_date: new Date().toISOString().split('T')[0],
        status: "harvested",
        quality: "good",
        is_closed: false,
        notes: "Bulk harvest entry",
      }));
      
    if (harvestsToCreate.length === 0) {
      toast({ title: "Nothing to Save", description: "Please select plantings and enter quantities.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      await harvestService.createBulkHarvests(harvestsToCreate);
      toast({ title: "Success", description: `${harvestsToCreate.length} harvest(s) created successfully.` });
      router.push("/harvests");
    } catch (error) {
      console.error("Error creating bulk harvests:", error);
      toast({ title: "Error", description: "Failed to create harvests.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const selectionCount = Object.keys(selectedHarvests).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/harvests">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Harvests
        </Button>
      </Link>
      <h1 className="text-4xl font-bold">Bulk Harvest</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Select Plantings to Harvest</CardTitle>
          <CardDescription>Search and select active plantings. Enter the quantity you wish to harvest from each.</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by Batch, Variety, Plant Type, or Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Plant Name</TableHead>
                  <TableHead>Variety</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Available Qty</TableHead>
                  <TableHead className="w-[150px]">Harvest Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Loading plantings...</TableCell></TableRow>
                ) : filteredPlantings.length > 0 ? (
                  filteredPlantings.map(p => (
                    <TableRow key={p.id} data-state={selectedHarvests[p.id] ? 'selected' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={!!selectedHarvests[p.id]}
                          onCheckedChange={() => handleSelect(p)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{p.plant_types?.name}</TableCell>
                      <TableCell>{p.plant_types?.variety}</TableCell>
                      <TableCell className="font-mono text-xs">{p.batch_number}</TableCell>
                      <TableCell>{p.locations?.name}</TableCell>
                      <TableCell>{p.remaining_quantity ?? p.quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={selectedHarvests[p.id]?.quantity || ""}
                          onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                          disabled={!selectedHarvests[p.id]}
                          placeholder="0"
                          max={p.remaining_quantity ?? p.quantity}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">No active plantings found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <span className="font-medium">{selectionCount} item(s) selected</span>
        <Button onClick={handleSubmit} disabled={isSaving || selectionCount === 0} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : `Save ${Object.values(selectedHarvests).filter(h => h.quantity > 0).length} Harvest(s)`}
        </Button>
      </div>
    </div>
  );
}