
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

type HarvestPayload = Omit&lt;Database["public"]["Tables"]["harvests"]["Row"], "id" | "created_at" | "updated_at"&gt;;

interface SelectedHarvest {
  planting: PlantingWithDetails;
  quantity: number;
  error?: string;
}

export default function BulkHarvestPage() {
  const { user, profile } = useAuth();
  const [plantings, setPlantings] = useState&lt;PlantingWithDetails[]&gt;([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHarvests, setSelectedHarvests] = useState&lt;Record&lt;string, SelectedHarvest&gt;&gt;({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState&lt;Record&lt;string, string&gt;&gt;({});
  const [harvestedQuantities, setHarvestedQuantities] = useState&lt;Record&lt;string, number&gt;&gt;({});
  const { toast } = useToast();
  const router = useRouter();

  const isViewer = profile?.role === "viewer";

  const filteredPlantings = useMemo(() =&gt; {
    if (!searchQuery) return plantings;
    const query = searchQuery.toLowerCase();
    return plantings.filter(p =&gt;
      p.batch_number?.toLowerCase().includes(query) ||
      p.plant_types?.name.toLowerCase().includes(query) ||
      p.plant_types?.variety.toLowerCase().includes(query) ||
      p.locations?.name.toLowerCase().includes(query)
    );
  }, [plantings, searchQuery]);
  
  useEffect(() =&gt; {
    if (isViewer) {
      toast({ 
        title: "Access Denied", 
        description: "Viewers cannot create harvests. Redirecting...", 
        variant: "destructive" 
      });
      router.push("/harvests");
    }
  }, [isViewer, router, toast]);

  useEffect(() =&gt; {
    const loadPlantings = async () =&gt; {
      try {
        setLoading(true);
        const [plantingsData, harvestsData] = await Promise.all([
          plantingService.getPlantingsWithDetails(),
          harvestService.getHarvests()
        ]);
        
        const quantities: Record&lt;string, number&gt; = {};
        plantingsData.forEach(p =&gt; {
          const totalHarvested = harvestsData
            .filter(h =&gt; h.planting_id === p.id)
            .reduce((sum, h) =&gt; sum + h.quantity_harvested, 0);
          quantities[p.id] = totalHarvested;
        });
        setHarvestedQuantities(quantities);
        
        const activePlantings = plantingsData.filter(p =&gt; {
          if (p.status !== 'active') return false;
          const totalHarvested = quantities[p.id] || 0;
          const available = p.quantity - totalHarvested;
          return available &gt; 0;
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

  if (isViewer) {
    return (
      &lt;div className="max-w-7xl mx-auto p-8 text-center"&gt;
        &lt;p className="text-gray-600"&gt;Redirecting...&lt;/p&gt;
      &lt;/div&gt;
    );
  }

  const getAvailableQuantity = (planting: PlantingWithDetails): number =&gt; {
    const totalHarvested = harvestedQuantities[planting.id] || 0;
    return planting.quantity - totalHarvested;
  };

  const validateQuantity = (plantingId: string, quantity: number, available: number): string =&gt; {
    if (quantity &lt;= 0) {
      return "Quantity must be greater than 0";
    }
    if (quantity &gt; available) {
      return `Exceeds available: ${available}`;
    }
    return "";
  };

  const handleSelect = (planting: PlantingWithDetails) =&gt; {
    setSelectedHarvests(prev =&gt; {
      const newSelected = { ...prev };
      if (newSelected[planting.id]) {
        delete newSelected[planting.id];
        setValidationErrors(prevErrors =&gt; {
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

  const handleQuantityChange = (plantingId: string, quantity: string) =&gt; {
    const qty = parseInt(quantity, 10) || 0;
    const planting = plantings.find(p =&gt; p.id === plantingId);
    if (!planting) return;

    const available = getAvailableQuantity(planting);
    const error = validateQuantity(plantingId, qty, available);

    setSelectedHarvests(prev =&gt; ({
      ...prev,
      [plantingId]: { 
        ...prev[plantingId], 
        quantity: qty,
        error 
      },
    }));

    setValidationErrors(prev =&gt; {
      const newErrors = { ...prev };
      if (error) {
        newErrors[plantingId] = error;
      } else {
        delete newErrors[plantingId];
      }
      return newErrors;
    });
  };
  
  const handleSubmit = async () =&gt; {
    const validHarvests = Object.values(selectedHarvests).filter(h =&gt; h.quantity &gt; 0 &amp;&amp; !h.error);
    const invalidHarvests = Object.values(selectedHarvests).filter(h =&gt; h.quantity &gt; 0 &amp;&amp; h.error);

    if (invalidHarvests.length &gt; 0) {
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
    
    const harvestsToCreate: HarvestPayload[] = validHarvests.map(h =&gt; ({
      planting_id: h.planting.id,
      quantity_harvested: h.quantity,
      harvest_date: new Date().toISOString().split('T')[0],
      status: "harvested",
      quality: "good",
      is_closed: false,
      notes: "Bulk harvest entry",
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
  const validCount = Object.values(selectedHarvests).filter(h =&gt; h.quantity &gt; 0 &amp;&amp; !h.error).length;
  const errorCount = Object.keys(validationErrors).length;

  return (
    &lt;div className="max-w-7xl mx-auto space-y-6"&gt;
      &lt;Link href="/harvests"&gt;
        &lt;Button variant="ghost" size="sm" className="gap-2 -ml-2"&gt;
          &lt;ArrowLeft className="w-4 h-4" /&gt;
          Back to Harvests
        &lt;/Button&gt;
      &lt;/Link&gt;
      &lt;h1 className="text-4xl font-bold"&gt;Bulk Harvest&lt;/h1&gt;
      
      {errorCount &gt; 0 &amp;&amp; (
        &lt;Alert variant="destructive"&gt;
          &lt;AlertCircle className="h-4 w-4" /&gt;
          &lt;AlertDescription&gt;
            {errorCount} planting(s) have invalid quantities. Please review the highlighted rows below.
          &lt;/AlertDescription&gt;
        &lt;/Alert&gt;
      )}
      
      &lt;Card&gt;
        &lt;CardHeader&gt;
          &lt;CardTitle&gt;Select Plantings to Harvest&lt;/CardTitle&gt;
          &lt;CardDescription&gt;Search and select active plantings. Enter the quantity you wish to harvest from each.&lt;/CardDescription&gt;
          &lt;div className="relative pt-2"&gt;
            &lt;Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" /&gt;
            &lt;Input
              placeholder="Search by Batch, Variety, Plant Type, or Location..."
              value={searchQuery}
              onChange={(e) =&gt; setSearchQuery(e.target.value)}
              className="pl-10"
            /&gt;
          &lt;/div&gt;
        &lt;/CardHeader&gt;
        &lt;CardContent&gt;
          &lt;div className="border rounded-md"&gt;
            &lt;Table&gt;
              &lt;TableHeader&gt;
                &lt;TableRow&gt;
                  &lt;TableHead className="w-[50px]"&gt;&lt;/TableHead&gt;
                  &lt;TableHead&gt;Plant Name&lt;/TableHead&gt;
                  &lt;TableHead&gt;Variety&lt;/TableHead&gt;
                  &lt;TableHead&gt;Batch&lt;/TableHead&gt;
                  &lt;TableHead&gt;Location&lt;/TableHead&gt;
                  &lt;TableHead&gt;Available Qty&lt;/TableHead&gt;
                  &lt;TableHead className="w-[200px]"&gt;Harvest Qty&lt;/TableHead&gt;
                &lt;/TableRow&gt;
              &lt;/TableHeader&gt;
              &lt;TableBody&gt;
                {loading ? (
                  &lt;TableRow&gt;&lt;TableCell colSpan={7} className="text-center h-24"&gt;Loading plantings...&lt;/TableCell&gt;&lt;/TableRow&gt;
                ) : filteredPlantings.length &gt; 0 ? (
                  filteredPlantings.map(p =&gt; {
                    const available = getAvailableQuantity(p);
                    const hasError = validationErrors[p.id];
                    const isSelected = !!selectedHarvests[p.id];
                    
                    return (
                      &lt;TableRow 
                        key={p.id} 
                        data-state={isSelected ? 'selected' : ''}
                        className={hasError ? 'bg-red-50 dark:bg-red-950/20' : ''}
                      &gt;
                        &lt;TableCell&gt;
                          &lt;Checkbox
                            checked={isSelected}
                            onCheckedChange={() =&gt; handleSelect(p)}
                          /&gt;
                        &lt;/TableCell&gt;
                        &lt;TableCell className="font-medium"&gt;{p.plant_types?.name}&lt;/TableCell&gt;
                        &lt;TableCell&gt;{p.plant_types?.variety}&lt;/TableCell&gt;
                        &lt;TableCell className="font-mono text-xs"&gt;{p.batch_number}&lt;/TableCell&gt;
                        &lt;TableCell&gt;{p.locations?.name}&lt;/TableCell&gt;
                        &lt;TableCell className="font-semibold"&gt;{formatNumber(available)}&lt;/TableCell&gt;
                        &lt;TableCell&gt;
                          &lt;div className="space-y-1"&gt;
                            &lt;Input
                              type="number"
                              value={selectedHarvests[p.id]?.quantity || ""}
                              onChange={(e) =&gt; handleQuantityChange(p.id, e.target.value)}
                              disabled={!isSelected}
                              placeholder="0"
                              max={available}
                              className={hasError ? "border-red-500 focus-visible:ring-red-500" : ""}
                            /&gt;
                            {hasError &amp;&amp; (
                              &lt;p className="text-xs text-red-600 flex items-center gap-1"&gt;
                                &lt;AlertCircle className="w-3 h-3" /&gt;
                                {hasError}
                              &lt;/p&gt;
                            )}
                          &lt;/div&gt;
                        &lt;/TableCell&gt;
                      &lt;/TableRow&gt;
                    );
                  })
                ) : (
                  &lt;TableRow&gt;&lt;TableCell colSpan={7} className="text-center h-24"&gt;No active plantings found.&lt;/TableCell&gt;&lt;/TableRow&gt;
                )}
              &lt;/TableBody&gt;
            &lt;/Table&gt;
          &lt;/div&gt;
        &lt;/CardContent&gt;
      &lt;/Card&gt;
      
      &lt;div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"&gt;
        &lt;div className="space-y-1"&gt;
          &lt;span className="font-medium block"&gt;{selectionCount} item(s) selected&lt;/span&gt;
          {errorCount &gt; 0 &amp;&amp; (
            &lt;span className="text-sm text-red-600"&gt;
              {errorCount} error(s) - {validCount} valid harvest(s) ready
            &lt;/span&gt;
          )}
          {errorCount === 0 &amp;&amp; validCount &gt; 0 &amp;&amp; (
            &lt;span className="text-sm text-green-600"&gt;
              All {validCount} harvest(s) are valid
            &lt;/span&gt;
          )}
        &lt;/div&gt;
        &lt;Button 
          onClick={handleSubmit} 
          disabled={isSaving || validCount === 0 || errorCount &gt; 0} 
          className="gap-2"
        &gt;
          &lt;Save className="w-4 h-4" /&gt;
          {isSaving ? "Saving..." : `Save ${validCount} Harvest(s)`}
        &lt;/Button&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}
