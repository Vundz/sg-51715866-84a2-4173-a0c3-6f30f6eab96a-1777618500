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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

type HarvestPayload = Omit<Database["public"]["Tables"]["harvests"]["Row"], "id" | "created_at" | "updated_at">;

interface SelectedHarvest {
  planting: PlantingWithDetails;
  quantity: number;
  error?: string;
}

export default function BulkHarvestPage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions("harvests");
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHarvests, setSelectedHarvests] = useState<Record<string, SelectedHarvest>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [harvestedQuantities, setHarvestedQuantities] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const router = useRouter();

  const isViewer = profile?.role === "viewer";

  const filteredPlantings = useMemo(() => {
    if (!searchQuery) return plantings;
    const query = searchQuery.toLowerCase();
    return plantings.filter((p) =>
    p.batch_number?.toLowerCase().includes(query) ||
    p.plant_types?.name.toLowerCase().includes(query) ||
    p.plant_types?.variety.toLowerCase().includes(query) ||
    p.locations?.name.toLowerCase().includes(query)
    );
  }, [plantings, searchQuery]);

  useEffect(() => {
    if (!permissions.canCreate) {
      toast({ 
        title: "Access Denied", 
        description: "You don't have permission to create harvests. Redirecting...", 
        variant: "destructive" 
      });
      router.push("/harvests");
    }
  }, [permissions.canCreate, router, toast]);

  useEffect(() => {
    const loadPlantings = async () => {
      try {
        setLoading(true);
        const [plantingsData, harvestsData] = await Promise.all([
        plantingService.getPlantingsWithDetails(),
        harvestService.getHarvests()]
        );

        const quantities: Record<string, number> = {};
        plantingsData.forEach((p) => {
          const totalHarvested = harvestsData.
          filter((h) => h.planting_id === p.id).
          reduce((sum, h) => sum + h.quantity_harvested, 0);
          quantities[p.id] = totalHarvested;
        });
        setHarvestedQuantities(quantities);

        const activePlantings = plantingsData.filter((p) => {
          if (p.status !== 'active') return false;
          const totalHarvested = quantities[p.id] || 0;
          const available = p.quantity - totalHarvested;
          return available > 0;
        });

        setPlantings(activePlantings);
      } catch (error) {
        console.error("Error loading plantings:", error);
        toast({ title: "Error", description: "Failed to load plantings.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadPlantings();
  }, [toast]);

  if (!permissions.canCreate) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>);

  }

  const getAvailableQuantity = (planting: PlantingWithDetails): number => {
    const totalHarvested = harvestedQuantities[planting.id] || 0;
    return planting.quantity - totalHarvested;
  };

  const validateQuantity = (plantingId: string, quantity: number, available: number): string => {
    if (quantity <= 0) {
      return "Quantity must be greater than 0";
    }
    if (quantity > available) {
      return `Exceeds available: ${available}`;
    }
    return "";
  };

  const handleSelect = (planting: PlantingWithDetails) => {
    setSelectedHarvests((prev) => {
      const newSelected = { ...prev };
      if (newSelected[planting.id]) {
        delete newSelected[planting.id];
        setValidationErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          delete newErrors[planting.id];
          return newErrors;
        });
      } else {
        newSelected[planting.id] = { planting, quantity: 0 };
      }
      return newSelected;
    });
  };

  const handleQuantityChange = (plantingId: string, quantity: string) => {
    const qty = parseInt(quantity, 10) || 0;
    const planting = plantings.find((p) => p.id === plantingId);
    if (!planting) return;

    const available = getAvailableQuantity(planting);
    const error = validateQuantity(plantingId, qty, available);

    setSelectedHarvests((prev) => ({
      ...prev,
      [plantingId]: {
        ...prev[plantingId],
        quantity: qty,
        error
      }
    }));

    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[plantingId] = error;
      } else {
        delete newErrors[plantingId];
      }
      return newErrors;
    });
  };

  const handleSubmit = async () => {
    const validHarvests = Object.values(selectedHarvests).filter((h) => h.quantity > 0 && !h.error);
    const invalidHarvests = Object.values(selectedHarvests).filter((h) => h.quantity > 0 && h.error);

    if (invalidHarvests.length > 0) {
      toast({
        title: "Validation Error",
        description: `${invalidHarvests.length} planting(s) have invalid quantities. Please correct the highlighted rows.`,
        variant: "destructive"
      });
      return;
    }

    if (validHarvests.length === 0) {
      toast({ title: "Nothing to Save", description: "Please select plantings and enter valid quantities.", variant: "destructive" });
      return;
    }

    const harvestsToCreate: HarvestPayload[] = validHarvests.map((h) => ({
      planting_id: h.planting.id,
      quantity_harvested: h.quantity,
      harvest_date: new Date().toISOString().split('T')[0],
      status: "harvested",
      quality: "good",
      is_closed: false,
      notes: "Bulk harvest entry"
    }));

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
  const validCount = Object.values(selectedHarvests).filter((h) => h.quantity > 0 && !h.error).length;
  const errorCount = Object.keys(validationErrors).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/harvests">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Harvests
        </Button>
      </Link>
      <h1 className="text-4xl font-bold">Bulk Harvest</h1>
      
      {errorCount > 0 &&
      <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorCount} planting(s) have invalid quantities. Please review the highlighted rows below.
          </AlertDescription>
        </Alert>
      }
      
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
              className="pl-10" />

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
                  <TableHead className="w-[200px]">Harvest Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                <TableRow><TableCell colSpan={7} className="text-center h-24">Loading plantings...</TableCell></TableRow> :
                filteredPlantings.length > 0 ?
                filteredPlantings.map((p) => {
                  const available = getAvailableQuantity(p);
                  const hasError = validationErrors[p.id];
                  const isSelected = !!selectedHarvests[p.id];

                  return (
                    <TableRow
                      key={p.id}
                      data-state={isSelected ? 'selected' : ''}
                      className={hasError ? 'bg-red-50 dark:bg-red-950/20' : ''}>

                        <TableCell>
                          <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelect(p)} />

                        </TableCell>
                        <TableCell className="font-medium">{p.plant_types?.name}</TableCell>
                        <TableCell>{p.plant_types?.variety}</TableCell>
                        <TableCell className="font-mono text-xs">{p.batch_number}</TableCell>
                        <TableCell>{p.locations?.name}</TableCell>
                        <TableCell className="font-semibold">{formatNumber(available)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                            type="number"
                            value={selectedHarvests[p.id]?.quantity || ""}
                            onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                            disabled={!isSelected}
                            placeholder="0"
                            max={available}
                            className={hasError ? "border-red-500 focus-visible:ring-red-500" : ""} style={{ opacity: "0.85" }} />

                            {hasError &&
                          <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {hasError}
                              </p>
                          }
                          </div>
                        </TableCell>
                      </TableRow>);

                }) :

                <TableRow><TableCell colSpan={7} className="text-center h-24">No active plantings found.</TableCell></TableRow>
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <div className="space-y-1">
          <span className="font-medium block">{selectionCount} item(s) selected</span>
          {errorCount > 0 &&
          <span className="text-sm text-red-600">
              {errorCount} error(s) - {validCount} valid harvest(s) ready
            </span>
          }
          {errorCount === 0 && validCount > 0 &&
          <span className="text-sm text-green-600">
              All {validCount} harvest(s) are valid
            </span>
          }
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSaving || validCount === 0 || errorCount > 0}
          className="gap-2">

          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : `Save ${validCount} Harvest(s)`}
        </Button>
      </div>
    </div>);

}