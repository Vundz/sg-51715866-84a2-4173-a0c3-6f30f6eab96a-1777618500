import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Sprout, ShoppingCart, Search, Filter, Upload, Download, PlusCircle, LayoutGrid, Table as TableIcon } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { locationService } from "@/services/locationService";
import { reservationService } from "@/services/reservationService";
import { inventoryService } from "@/services/inventoryService";
import type { InventoryItemWithLowStock } from "@/services/inventoryService";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";

type PlantingWithDetails = Database["public"]["Tables"]["plantings"]["Row"] & {
  plant_types: Database["public"]["Tables"]["plant_types"]["Row"] | null;
  locations: Database["public"]["Tables"]["locations"]["Row"] | null;
  treatments?: Database["public"]["Tables"]["planting_treatments"]["Row"][];
};
type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

// Generate batch number: first 2 chars of plant type + first 2 chars of variety + DDMMYY
const generateBatchNumber = (plantTypeName: string, variety: string, datePlanted: string): string => {
  const plantPrefix = plantTypeName.substring(0, 2).toUpperCase();
  const varietyPrefix = variety.substring(0, 2).toUpperCase();
  const date = new Date(datePlanted);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).substring(2);
  return `${plantPrefix}${varietyPrefix}${day}${month}${year}`;
};

export default function PlantingsPage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions("plantings");
  const { toast } = useToast();
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<PlantingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isViewer = profile?.role === "viewer";
  
  // Form state for plant type and variety selection
  const [selectedPlantTypeName, setSelectedPlantTypeName] = useState<string>("");
  const [selectedVariety, setSelectedVariety] = useState<string>("");
  
  // Quick-add dialogs
  const [isAddPlantTypeDialogOpen, setIsAddPlantTypeDialogOpen] = useState(false);
  const [isAddVarietyDialogOpen, setIsAddVarietyDialogOpen] = useState(false);
  const [newPlantTypeName, setNewPlantTypeName] = useState("");
  const [newVarietyName, setNewVarietyName] = useState("");
  const [newPlantTypeGrowthDuration, setNewPlantTypeGrowthDuration] = useState("30");
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "location" | "variety" | "status" | "plant_type">("status");
  const [filterValue, setFilterValue] = useState("active");
  
  // Bulk update states
  const [selectedPlantings, setSelectedPlantings] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  // CSV Import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  
  // Inventory tracking states
  const [seedInventory, setSeedInventory] = useState<InventoryItemWithLowStock[]>([]);
  const [trackInventory, setTrackInventory] = useState(false);
  const [selectedSeedId, setSelectedSeedId] = useState<string>("");
  const [seedQuantityUsed, setSeedQuantityUsed] = useState<string>("");
  const [seedStockWarning, setSeedStockWarning] = useState<string>("");

  // Add view mode state here
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plantingsData, plantTypesData, locationsData] = await Promise.all([
          plantingService.getAllPlantings(),
          plantTypeService.getAllPlantTypes(),
          locationService.getAllLocations()
        ]);
        setPlantings(plantingsData as PlantingWithDetails[]);
        setPlantTypes(plantTypesData);
        setLocations(locationsData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    });
    fetchData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [plantingsData, plantTypesData, locationsData, reservationsData, inventoryData] = await Promise.all([
        plantingService.getPlantingsWithDetails(),
        plantTypeService.getPlantTypes(),
        locationService.getLocations(),
        reservationService.getReservations(),
        inventoryService.getInventoryItemsByCategory("Seed")
      ]);
      
      setPlantings(plantingsData as PlantingWithDetails[]);
      setPlantTypes(plantTypesData);
      setLocations(locationsData);
      setReservations(reservationsData as Reservation[]);
      setSeedInventory(inventoryData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data. Please try refreshing the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getReservedQuantity = (plantingId: string): number => {
    const activeReservations = reservations.filter(r => r.planting_id === plantingId && r.status === 'pending');
    return activeReservations.reduce((sum, r) => sum + (r.quantity_reserved || 0), 0);
  };
  
  const getAvailableQuantity = (planting: PlantingWithDetails): number => {
    const reserved = getReservedQuantity(planting.id);
    const remaining = planting.remaining_quantity ?? planting.quantity;
    return Math.max(0, remaining - reserved);
  };

  const getReservationCount = (plantingId: string): number => {
    return reservations.filter(r => r.planting_id === plantingId && r.status === 'active').length;
  };

  // Validate seed quantity and show warnings
  const validateSeedQuantity = (seedId: string, quantityUsed: string) => {
    const seed = seedInventory.find(s => s.id === seedId);
    const qty = parseFloat(quantityUsed);

    if (!seed || isNaN(qty) || qty <= 0) {
      setSeedStockWarning("Please enter a valid seed quantity");
      return;
    }

    if (qty > Number(seed.current_stock)) {
      setSeedStockWarning(`Only ${formatNumber(Number(seed.current_stock))} ${seed.unit_of_measure} available`);
    } else {
      setSeedStockWarning("");
    }
  };

  // Get unique plant type names
  const uniquePlantTypeNames = useMemo(() => {
    const names = new Set(plantTypes.map(pt => pt.name));
    return Array.from(names).sort();
  }, [plantTypes]);

  // Get varieties for the selected plant type
  const availableVarieties = useMemo(() => {
    if (!selectedPlantTypeName) return [];
    return plantTypes
      .filter(pt => pt.name === selectedPlantTypeName)
      .map(pt => pt.variety)
      .filter(Boolean)
      .sort();
  }, [selectedPlantTypeName, plantTypes]);

  // Get unique varieties and locations for filter dropdowns
  const uniqueVarieties = useMemo(() => {
    const varieties = new Set(plantings.map(p => p.plant_types?.variety).filter(Boolean));
    return Array.from(varieties).sort();
  }, [plantings]);

  const uniqueLocations = useMemo(() => {
    return locations.map(l => ({ id: l.id, name: l.name }));
  }, [locations]);

  const uniquePlantTypesForFilter = useMemo(() => {
    const plantTypeNames = new Set(plantings.map(p => p.plant_types?.name).filter(Boolean));
    return Array.from(plantTypeNames).sort();
  }, [plantings]);

  // Filter and search logic
  const filteredPlantings = useMemo(() => {
    let filtered = [...plantings];

    // Apply search filter (case-insensitive partial match)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const batchNumber = p.batch_number || '';
        const plantName = p.plant_types?.name || '';
        const variety = p.plant_types?.variety || '';
        const location = p.locations?.name || '';
        
        return (
          batchNumber.toLowerCase().includes(query) ||
          plantName.toLowerCase().includes(query) ||
          variety.toLowerCase().includes(query) ||
          location.toLowerCase().includes(query)
        );
      });
    }

    // Apply type-specific filters
    if (filterType !== "all" && filterValue) {
      switch (filterType) {
        case "location":
          filtered = filtered.filter(p => p.location_id === filterValue);
          break;
        case "variety":
          filtered = filtered.filter(p => p.plant_types?.variety === filterValue);
          break;
        case "status":
          filtered = filtered.filter(p => p.status === filterValue);
          break;
        case "plant_type":
          filtered = filtered.filter(p => p.plant_types?.name === filterValue);
          break;
      }
    }

    return filtered;
  }, [plantings, searchQuery, filterType, filterValue]);

  // Calculate dashboard metrics based on filtered plantings
  const dashboardMetrics = useMemo(() => {
    const totalPlantings = filteredPlantings.length;
    const totalAvailable = filteredPlantings.reduce((sum, p) => sum + (p.remaining_quantity ?? p.quantity), 0);
    const totalReserved = filteredPlantings.reduce((sum, p) => sum + getReservedQuantity(p.id), 0);
    const totalForSale = filteredPlantings.reduce((sum, p) => sum + getAvailableQuantity(p), 0);
    const inventoryValue = filteredPlantings.reduce((sum, p) => {
      const qty = p.remaining_quantity ?? p.quantity;
      const price = p.selling_price || 0;
      return sum + (qty * price);
    }, 0);

    return {
      totalPlantings,
      totalAvailable,
      totalReserved,
      totalForSale,
      inventoryValue,
    };
  }, [filteredPlantings, reservations]);

  // Quick-add Plant Type
  const handleQuickAddPlantType = async () => {
    if (!newPlantTypeName.trim()) {
      toast({ title: "Error", description: "Please enter a plant type name.", variant: "destructive" });
      return;
    }

    try {
      const newPlantType = await plantTypeService.createPlantType({
        name: newPlantTypeName.trim(),
        variety: "Standard", // Default variety
        growth_duration: parseInt(newPlantTypeGrowthDuration),
        description: null,
        germination_rate: null,
        default_selling_price: 0,
      });

      // Reload plant types
      const updatedPlantTypes = await plantTypeService.getPlantTypes();
      setPlantTypes(updatedPlantTypes);

      // Auto-select the new plant type
      setSelectedPlantTypeName(newPlantType.name);
      setSelectedVariety("Standard");

      // Close dialog and reset
      setIsAddPlantTypeDialogOpen(false);
      setNewPlantTypeName("");
      setNewPlantTypeGrowthDuration("30");

      toast({ title: "Success", description: `Plant type "${newPlantType.name}" added successfully!` });
    } catch (error) {
      console.error("Error adding plant type:", error);
      toast({ title: "Error", description: "Failed to add plant type.", variant: "destructive" });
    }
  };

  // Quick-add Variety
  const handleQuickAddVariety = async () => {
    if (!selectedPlantTypeName) {
      toast({ title: "Error", description: "Please select a plant type first.", variant: "destructive" });
      return;
    }

    if (!newVarietyName.trim()) {
      toast({ title: "Error", description: "Please enter a variety name.", variant: "destructive" });
      return;
    }

    try {
      const newPlantType = await plantTypeService.createPlantType({
        name: selectedPlantTypeName,
        variety: newVarietyName.trim(),
        growth_duration: parseInt(newPlantTypeGrowthDuration),
        description: null,
        germination_rate: null,
        default_selling_price: 0,
      });

      // Reload plant types
      const updatedPlantTypes = await plantTypeService.getPlantTypes();
      setPlantTypes(updatedPlantTypes);

      // Auto-select the new variety
      setSelectedVariety(newPlantType.variety);

      // Close dialog and reset
      setIsAddVarietyDialogOpen(false);
      setNewVarietyName("");
      setNewPlantTypeGrowthDuration("30");

      toast({ title: "Success", description: `Variety "${newPlantType.variety}" added successfully!` });
    } catch (error) {
      console.error("Error adding variety:", error);
      toast({ title: "Error", description: "Failed to add variety.", variant: "destructive" });
    }
  };

  const handleSavePlanting = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const plantTypeId = plantTypes.find(pt => pt.name === selectedPlantTypeName && pt.variety === selectedVariety)?.id;
    if (!plantTypeId) {
        toast({ title: "Error", description: "Selected plant type and variety combination not found.", variant: "destructive" });
        return;
    }

    // Validate inventory deduction if enabled
    if (trackInventory && !editingPlanting) {
      if (!selectedSeedId) {
        toast({ title: "Error", description: "Please select a seed from inventory", variant: "destructive" });
        return;
      }

      const seed = seedInventory.find(s => s.id === selectedSeedId);
      const qtyUsed = parseFloat(seedQuantityUsed);

      if (!seed || isNaN(qtyUsed) || qtyUsed <= 0) {
        toast({ title: "Error", description: "Please enter a valid seed quantity", variant: "destructive" });
        return;
      }

      if (qtyUsed > Number(seed.current_stock)) {
        toast({ 
          title: "Insufficient Stock", 
          description: `Only ${formatNumber(Number(seed.current_stock))} ${seed.unit_of_measure} available`, 
          variant: "destructive" 
        });
        return;
      }
    }

    const datePlanted = new Date(formData.get("date_planted") as string);
    const selectedPlantType = plantTypes.find(pt => pt.id === plantTypeId);
    const expectedHarvestDate = new Date(datePlanted);
    if (selectedPlantType?.growth_duration) {
      expectedHarvestDate.setDate(datePlanted.getDate() + selectedPlantType.growth_duration);
    }
    
    const batch_number = generateBatchNumber(selectedPlantTypeName, selectedVariety, datePlanted.toISOString().split('T')[0]);

    const plantingData = {
      plant_type_id: plantTypeId,
      location_id: formData.get("location_id") as string,
      quantity: parseInt(formData.get("quantity") as string),
      date_planted: formData.get("date_planted") as string,
      expected_harvest_date: expectedHarvestDate.toISOString().split('T')[0],
      batch_number: batch_number,
      status: editingPlanting ? formData.get("status") as string : "active",
      notes: formData.get("notes") as string,
      variety: selectedVariety,
      selling_price: parseFloat(formData.get("selling_price") as string) || 0,
    };
    
    const finalPlantingData = {
        ...plantingData,
        remaining_quantity: editingPlanting?.remaining_quantity ?? plantingData.quantity,
    }

    try {
      let createdPlanting;
      
      if (editingPlanting) {
        await plantingService.updatePlanting(editingPlanting.id, finalPlantingData);
        toast({ title: "Success", description: "Planting updated successfully." });
      } else {
        createdPlanting = await plantingService.addPlanting(finalPlantingData);
        
        // Create inventory transaction if tracking is enabled
        if (trackInventory && selectedSeedId && seedQuantityUsed) {
          const seed = seedInventory.find(s => s.id === selectedSeedId);
          const qtyUsed = parseFloat(seedQuantityUsed);
          
          if (seed && !isNaN(qtyUsed) && qtyUsed > 0) {
            const location = locations.find(l => l.id === plantingData.location_id);
            const notes = `Used for planting: ${selectedPlantTypeName} (${selectedVariety}) at ${location?.name || 'Unknown Location'}`;
            
            await inventoryService.createStockTransaction({
              item_id: selectedSeedId,
              transaction_type: "usage",
              quantity: -Math.abs(qtyUsed), // Negative for usage
              reference_id: createdPlanting.id,
              reference_type: "planting",
              notes: notes,
              transaction_date: plantingData.date_planted,
            });
          }
        }
        
        toast({ title: "Success", description: "Planting created successfully." });
      }
      
      await loadData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving planting:", error);
      toast({ title: "Error", description: "Failed to save planting. Please try again.", variant: "destructive" });
    }
  };

  const handleDeletePlanting = async (id: string) => {
    const reservationCount = getReservationCount(id);
    if (reservationCount > 0) {
      toast({ title: "Delete Error", description: `Cannot delete this planting. It has ${reservationCount} active reservation(s). Please cancel them first.`, variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure you want to delete this planting?")) return;
    
    try {
      await plantingService.deletePlanting(id);
      await loadData();
      toast({ title: "Success", description: "Planting deleted successfully." });
    } catch (error) {
      console.error("Error deleting planting:", error);
      toast({ title: "Error", description: "Failed to delete planting. Please try again.", variant: "destructive" });
    }
  };

  const handleOpenDialog = (planting: PlantingWithDetails | null = null) => {
    setEditingPlanting(planting);
    if (planting) {
      setSelectedPlantTypeName(planting.plant_types?.name || "");
      setSelectedVariety(planting.plant_types?.variety || "");
    } else {
      setSelectedPlantTypeName("");
      setSelectedVariety("");
    }
    
    // Reset inventory tracking states
    setTrackInventory(false);
    setSelectedSeedId("");
    setSeedQuantityUsed("");
    setSeedStockWarning("");
    
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlanting(null);
    setSelectedPlantTypeName("");
    setSelectedVariety("");
    setTrackInventory(false);
    setSelectedSeedId("");
    setSeedQuantityUsed("");
    setSeedStockWarning("");
  };

  const handlePlantTypeChange = (value: string) => {
    setSelectedPlantTypeName(value);
    setSelectedVariety(""); // Reset variety when plant type changes
  };
  
  const getExpectedHarvestDate = (planting: PlantingWithDetails) => {
    if (!planting.expected_harvest_date) return "N/A";
    return new Date(planting.expected_harvest_date).toLocaleDateString();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterValue("");
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlantings(filteredPlantings.map(p => p.id));
    } else {
      setSelectedPlantings([]);
    }
  };

  const handleSelectOne = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedPlantings(prev => [...prev, id]);
    } else {
      setSelectedPlantings(prev => prev.filter(pId => pId !== id));
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedPlantings.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(selectedPlantings.map(id => 
        plantingService.updatePlanting(id, { status: bulkStatus })
      ));
      toast({ title: "Success", description: `Updated ${selectedPlantings.length} plantings to ${bulkStatus}.` });
      setSelectedPlantings([]);
      setBulkStatus("");
      await loadData();
    } catch (error) {
      console.error("Bulk update error:", error);
      toast({ title: "Error", description: "Failed to update some plantings.", variant: "destructive" });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // CSV Import Functions
  const downloadCsvTemplate = () => {
    const headers = ["Plant Type", "Variety", "Location", "Quantity", "Date Planted", "Notes"];
    const example = ["Tomato", "Cherry Red", "Greenhouse A", "1000", "2025-01-15", "First batch"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantings_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCsvFile = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const validateAndParseCsv = async (file: File) => {
    setIsProcessingCsv(true);
    setCsvErrors([]);
    setCsvData([]);
    setInvalidRows([]);

    try {
      const csvText = await parseCsvFile(file);
      const lines = csvText.split("\n").map(line => line.trim()).filter(line => line);
      
      if (lines.length < 2) {
        setCsvErrors(["CSV file must contain at least a header row and one data row"]);
        setIsProcessingCsv(false);
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim());
      const requiredHeaders = ["Plant Type", "Variety", "Location", "Quantity", "Date Planted"];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setCsvErrors([`Missing required columns: ${missingHeaders.join(", ")}`]);
        setIsProcessingCsv(false);
        return;
      }

      const parsedData = [];
      const invalidData = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        if (values.length < requiredHeaders.length) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Validate row data
        const rowErrors: string[] = [];
        
        // Check plant type exists
        const plantTypeName = row["Plant Type"];
        const variety = row["Variety"];
        const matchingPlantType = plantTypes.find(pt => 
          pt.name.toLowerCase() === plantTypeName.toLowerCase() && 
          pt.variety.toLowerCase() === variety.toLowerCase()
        );
        
        if (!matchingPlantType) {
          rowErrors.push(`Plant type "${plantTypeName}" with variety "${variety}" not found`);
        }

        // Check location exists
        const locationName = row["Location"];
        const matchingLocation = locations.find(l => 
          l.name.toLowerCase() === locationName.toLowerCase()
        );
        
        if (!matchingLocation) {
          rowErrors.push(`Location "${locationName}" not found`);
        }

        // Validate quantity
        const quantity = parseInt(row["Quantity"]);
        if (isNaN(quantity) || quantity <= 0) {
          rowErrors.push(`Invalid quantity "${row["Quantity"]}"`);
        }

        // Validate date
        const datePlanted = new Date(row["Date Planted"]);
        if (isNaN(datePlanted.getTime())) {
          rowErrors.push(`Invalid date "${row["Date Planted"]}"`);
        }

        const rowData = {
          plantType: matchingPlantType,
          location: matchingLocation,
          quantity,
          datePlanted: row["Date Planted"],
          notes: row["Notes"] || "",
          rowNumber: i,
          rawData: row
        };

        if (rowErrors.length === 0) {
          parsedData.push(rowData);
        } else {
          invalidData.push({
            ...rowData,
            errors: rowErrors
          });
          errors.push(`Row ${i}: ${rowErrors.join(", ")}`);
        }
      }

      if (errors.length > 0) {
        setCsvErrors(errors);
      }
      
      setCsvData(parsedData);
      setInvalidRows(invalidData);
    } catch (error) {
      setCsvErrors(["Failed to parse CSV file. Please ensure it's a valid CSV format."]);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      validateAndParseCsv(file);
    }
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) {
      toast({ title: "Error", description: "No valid data to import", variant: "destructive" });
      return;
    }

    if (!ignoreErrors && csvErrors.length > 0) {
      toast({ 
        title: "Validation Errors", 
        description: "Please fix all errors or enable 'Ignore errors and import valid data' to continue", 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessingCsv(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const row of csvData) {
        try {
          const datePlanted = new Date(row.datePlanted);
          const expectedHarvestDate = new Date(datePlanted);
          if (row.plantType?.growth_duration) {
            expectedHarvestDate.setDate(datePlanted.getDate() + row.plantType.growth_duration);
          }

          const batchNumber = generateBatchNumber(
            row.plantType.name,
            row.plantType.variety,
            row.datePlanted
          );

          const plantingData = {
            plant_type_id: row.plantType.id,
            location_id: row.location.id,
            quantity: row.quantity,
            remaining_quantity: row.quantity,
            date_planted: row.datePlanted,
            expected_harvest_date: expectedHarvestDate.toISOString().split('T')[0],
            batch_number: batchNumber,
            status: "active",
            notes: row.notes,
            variety: row.plantType.variety,
            selling_price: row.plantType.default_selling_price || 0,
          };

          await plantingService.addPlanting(plantingData);
          successCount++;
        } catch (error) {
          console.error(`Error importing row ${row.rowNumber}:`, error);
          failCount++;
        }
      }

      await loadData();
      
      const skippedCount = invalidRows.length;
      let message = `Successfully imported ${successCount} plantings`;
      if (skippedCount > 0) {
        message += `. Skipped ${skippedCount} rows with errors`;
      }
      if (failCount > 0) {
        message += `. ${failCount} failed to save`;
      }

      toast({ 
        title: "Import Complete", 
        description: message
      });

      setIsImportDialogOpen(false);
      setCsvFile(null);
      setCsvData([]);
      setCsvErrors([]);
      setInvalidRows([]);
      setIgnoreErrors(false);
    } catch (error) {
      console.error("Error during bulk import:", error);
      toast({ title: "Error", description: "Failed to complete bulk import", variant: "destructive" });
    } finally {
      setIsProcessingCsv(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-600">Please log in to manage plantings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-600">Loading plantings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Sprout className="w-10 h-10 text-lime-600" />
            Plantings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track all your seedling batches from planting to harvest.</p>
        </div>
        {permissions.canCreate && (
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                onClick={() => setViewMode("table")}
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-1"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                onClick={() => setViewMode("cards")}
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                className="rounded-none gap-1"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
            </div>
            
            <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" className="border-lime-600 text-lime-600 hover:bg-lime-50">
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Bulk Import</span>
            </Button>
            <Button onClick={() => handleOpenDialog()} className="bg-lime-600 hover:bg-lime-700">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Planting</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Tabs */}
      {/* Dashboard Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Plantings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboardMetrics.totalPlantings}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Seedlings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(dashboardMetrics.totalAvailable)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-orange-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reserved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(dashboardMetrics.totalReserved)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-purple-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">K{formatNumber(dashboardMetrics.inventoryValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on current selling prices</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Planting Dialog with Smart Dropdowns */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingPlanting ? "Edit" : "Add"} Planting</DialogTitle>
            <DialogDescription>
              {isViewer ? "Viewing planting details. No changes can be made." : (editingPlanting ? "Update the details for this planting." : "Log a new batch of seedlings.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePlanting} className="space-y-4 pt-4">
            {/* Plant Type with Quick Add */}
            <div className="space-y-2">
              <Label htmlFor="plantTypeName">
                Plant Type <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedPlantTypeName} 
                  onValueChange={handlePlantTypeChange}
                  required
                  disabled={isViewer || !!editingPlanting}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a plant type" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePlantTypeNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!editingPlanting && !isViewer && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddPlantTypeDialogOpen(true)}
                    title="Add new plant type"
                    className="shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Variety with Quick Add */}
            <div className="space-y-2">
              <Label htmlFor="variety">
                Variety <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select 
                  name="variety"
                  value={selectedVariety} 
                  onValueChange={setSelectedVariety}
                  disabled={!selectedPlantTypeName || isViewer || !!editingPlanting}
                  required
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={selectedPlantTypeName ? "Select a variety" : "Select plant type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVarieties.map(variety => (
                      <SelectItem key={variety} value={variety}>{variety}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!editingPlanting && !isViewer && selectedPlantTypeName && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddVarietyDialogOpen(true)}
                    title="Add new variety"
                    className="shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_id">Location</Label>
                <Select name="location_id" required defaultValue={editingPlanting?.location_id} disabled={isViewer}>
                  <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity" 
                  name="quantity" 
                  type="number" 
                  defaultValue={editingPlanting?.quantity} 
                  required 
                  disabled={isViewer}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0;
                    const trays = Math.round(qty / 220);
                    const trayDisplay = document.getElementById("trayUsageDisplay");
                    if (trayDisplay) {
                      trayDisplay.textContent = trays.toString();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price per Seedling (ZMW)</Label>
              <Input 
                id="selling_price" 
                name="selling_price" 
                type="number" 
                step="0.01" 
                min="0"
                defaultValue={
                  editingPlanting?.selling_price || 
                  plantTypes.find(pt => pt.name === selectedPlantTypeName && pt.variety === selectedVariety)?.default_selling_price || 
                  0
                }
                placeholder="0.00"
                disabled={isViewer}
              />
              <p className="text-xs text-gray-500">
                {selectedPlantTypeName && selectedVariety ? (
                  `Default from plant type: K${(plantTypes.find(pt => pt.name === selectedPlantTypeName && pt.variety === selectedVariety)?.default_selling_price || 0).toFixed(2)}`
                ) : (
                  "Select a plant type to see default price"
                )}
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">Estimated Tray Usage</Label>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Based on 220 seedlings per tray</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    <span id="trayUsageDisplay">
                      {editingPlanting ? Math.round(editingPlanting.quantity / 220) : "0"}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">trays</p>
                </div>
              </div>
            </div>

            {/* Inventory Tracking Section - Only show for new plantings */}
            {!editingPlanting && (
              <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trackInventory"
                    checked={trackInventory}
                    onCheckedChange={(checked) => {
                      setTrackInventory(checked as boolean);
                      if (!checked) {
                        setSelectedSeedId("");
                        setSeedQuantityUsed("");
                        setSeedStockWarning("");
                      }
                    }}
                    disabled={isViewer}
                  />
                  <Label
                    htmlFor="trackInventory"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Track seed usage from inventory
                  </Label>
                </div>

                {trackInventory && (
                  <div className="space-y-4 pl-6 border-l-2 border-green-300 dark:border-green-700">
                    {seedInventory.length === 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          ⚠️ No seeds found in inventory. Please add seed items in the{" "}
                          <Link href="/inventory" className="underline font-medium">
                            Inventory module
                          </Link>{" "}
                          first.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="seedSelect">
                            Select Seed <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedSeedId}
                            onValueChange={(value) => {
                              setSelectedSeedId(value);
                              validateSeedQuantity(value, seedQuantityUsed);
                            }}
                            disabled={isViewer}
                          >
                            <SelectTrigger id="seedSelect">
                              <SelectValue placeholder="Choose a seed from inventory" />
                            </SelectTrigger>
                            <SelectContent>
                              {seedInventory.map((seed) => (
                                <SelectItem 
                                  key={seed.id} 
                                  value={seed.id}
                                  disabled={Number(seed.current_stock) <= 0}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <span>{seed.name}</span>
                                    <span className={`text-xs ${Number(seed.current_stock) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ({formatNumber(Number(seed.current_stock))} {seed.unit_of_measure} available)
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="seedQuantity">
                            Quantity Used <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="seedQuantity"
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0.00"
                              value={seedQuantityUsed}
                              onChange={(e) => {
                                setSeedQuantityUsed(e.target.value);
                                validateSeedQuantity(selectedSeedId, e.target.value);
                              }}
                              disabled={isViewer || !selectedSeedId}
                            />
                            <span className="flex items-center text-sm text-gray-600 dark:text-gray-400 min-w-[60px]">
                              {selectedSeedId && seedInventory.find(s => s.id === selectedSeedId)?.unit_of_measure}
                            </span>
                          </div>
                          {seedStockWarning && (
                            <p className={`text-xs ${
                              seedStockWarning.startsWith('❌') ? 'text-red-600 dark:text-red-400' :
                              seedStockWarning.startsWith('⚠️') ? 'text-amber-600 dark:text-amber-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {seedStockWarning}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_planted">Date Planted</Label>
                <Input id="date_planted" name="date_planted" type="date" defaultValue={editingPlanting?.date_planted || new Date().toISOString().split('T')[0]} required disabled={isViewer} />
              </div>
              {editingPlanting && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingPlanting?.status} disabled={isViewer}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {(permissions.canCreate || permissions.canUpdate) ? (
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-lime-600 hover:bg-lime-700">Save Planting</Button>
              </div>
            ) : (
              <div className="flex justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Plant Type Dialog */}
      <Dialog open={isAddPlantTypeDialogOpen} onOpenChange={setIsAddPlantTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Plant Type</DialogTitle>
            <DialogDescription>
              Create a new plant type to add to the list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="newPlantTypeName">Plant Type Name *</Label>
              <Input
                id="newPlantTypeName"
                value={newPlantTypeName}
                onChange={(e) => setNewPlantTypeName(e.target.value)}
                placeholder="e.g., Tomato, Cabbage, Lettuce"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPlantTypeGrowthDuration">Growth Duration (days) *</Label>
              <Input
                id="newPlantTypeGrowthDuration"
                type="number"
                value={newPlantTypeGrowthDuration}
                onChange={(e) => setNewPlantTypeGrowthDuration(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-gray-500">Days from planting to harvest</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsAddPlantTypeDialogOpen(false);
              setNewPlantTypeName("");
              setNewPlantTypeGrowthDuration("30");
            }}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddPlantType} className="bg-lime-600 hover:bg-lime-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Plant Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Variety Dialog */}
      <Dialog open={isAddVarietyDialogOpen} onOpenChange={setIsAddVarietyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Variety</DialogTitle>
            <DialogDescription>
              Add a new variety for <strong>{selectedPlantTypeName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="newVarietyName">Variety Name *</Label>
              <Input
                id="newVarietyName"
                value={newVarietyName}
                onChange={(e) => setNewVarietyName(e.target.value)}
                placeholder="e.g., Cherry Red, Roma, Beefsteak"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newVarietyGrowthDuration">Growth Duration (days) *</Label>
              <Input
                id="newVarietyGrowthDuration"
                type="number"
                value={newPlantTypeGrowthDuration}
                onChange={(e) => setNewPlantTypeGrowthDuration(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-gray-500">Days from planting to harvest for this variety</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsAddVarietyDialogOpen(false);
              setNewVarietyName("");
              setNewPlantTypeGrowthDuration("30");
            }}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddVariety} className="bg-lime-600 hover:bg-lime-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Variety
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Plantings</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple plantings at once
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Download Template */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Need a template?</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Download our CSV template with the correct column format
                </p>
              </div>
              <Button onClick={downloadCsvTemplate} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csvFile">Upload CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isProcessingCsv}
              />
              <p className="text-xs text-gray-500">
                Required columns: Plant Type, Variety, Location, Quantity, Date Planted
              </p>
            </div>

            {/* Processing Indicator */}
            {isProcessingCsv && (
              <div className="text-center py-4">
                <p className="text-gray-600">Processing CSV file...</p>
              </div>
            )}

            {/* Errors Display */}
            {csvErrors.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">Validation Errors</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                  {csvErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ignore Errors Option */}
            {(csvData.length > 0 || invalidRows.length > 0) && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">Import Summary</h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        {csvData.length} valid rows • {invalidRows.length} rows with errors
                      </p>
                    </div>
                    {invalidRows.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ignoreErrors"
                          checked={ignoreErrors}
                          onCheckedChange={(checked) => setIgnoreErrors(checked as boolean)}
                        />
                        <Label
                          htmlFor="ignoreErrors"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Ignore errors and import valid data
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {(csvData.length > 0 || invalidRows.length > 0) && (
              <div className="space-y-2">
                <h3 className="font-medium">Data Preview</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-950 shadow-sm">
                      <TableRow className="border-b">
                        <TableHead className="sticky top-0 bg-white dark:bg-gray-950">Row</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-gray-950">Plant Type</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-gray-950">Variety</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-gray-950">Location</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-gray-950">Quantity</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-gray-950">Date Planted</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-gray-950">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, index) => (
                        <TableRow key={`valid-${index}`} className="bg-green-50 dark:bg-green-950">
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell>{row.plantType?.name}</TableCell>
                          <TableCell>{row.plantType?.variety}</TableCell>
                          <TableCell>{row.location?.name}</TableCell>
                          <TableCell>{formatNumber(row.quantity)}</TableCell>
                          <TableCell>{new Date(row.datePlanted).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-600 text-white">Valid</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {invalidRows.slice(0, 5).map((row, index) => (
                        <TableRow key={`invalid-${index}`} className="bg-red-50 dark:bg-red-950">
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell>{row.rawData["Plant Type"]}</TableCell>
                          <TableCell>{row.rawData["Variety"]}</TableCell>
                          <TableCell>{row.rawData["Location"]}</TableCell>
                          <TableCell>{row.rawData["Quantity"]}</TableCell>
                          <TableCell>{row.rawData["Date Planted"]}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="destructive">Error</Badge>
                              <p className="text-xs text-red-600 dark:text-red-400">{row.errors[0]}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {(csvData.length + invalidRows.length) > 10 && (
                    <p className="text-sm text-gray-500 text-center p-2">
                      Showing first 10 rows. {csvData.length + invalidRows.length - 10} more rows in file.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setCsvFile(null);
                  setCsvData([]);
                  setCsvErrors([]);
                  setInvalidRows([]);
                  setIgnoreErrors(false);
                }}
                disabled={isProcessingCsv}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkImport}
                disabled={csvData.length === 0 || (!ignoreErrors && csvErrors.length > 0) || isProcessingCsv}
                className="bg-lime-600 hover:bg-lime-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {csvData.length} {csvData.length === 1 ? 'Planting' : 'Plantings'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Plantings</CardTitle>
          <CardDescription>
            An overview of all seedling batches in the nursery. 
            {(searchQuery || filterType !== "all") && (
              <span className="ml-2 text-lime-600 font-medium">
                Showing {filteredPlantings.length} of {plantings.length} plantings
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 pb-4 border-b">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by batch, plant, variety, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filterType} onValueChange={(value: typeof filterType) => {
                setFilterType(value);
                setFilterValue("");
              }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plantings</SelectItem>
                  <SelectItem value="plant_type">By Plant Type</SelectItem>
                  <SelectItem value="variety">By Variety</SelectItem>
                  <SelectItem value="location">By Location</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>

              {filterType === "plant_type" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select plant type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePlantTypesForFilter.map(plantType => (
                      <SelectItem key={plantType} value={plantType}>{plantType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === "location" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === "variety" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select variety..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueVarieties.map(variety => (
                      <SelectItem key={variety} value={variety}>{variety}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === "status" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {(searchQuery || filterType !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedPlantings.length > 0 && permissions.canUpdate && (
            <div className="bg-lime-50 dark:bg-lime-950 border border-lime-200 dark:border-lime-800 rounded-lg p-3 flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-lime-800 dark:text-lime-200">
                {selectedPlantings.length} planting(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-[150px] h-8 bg-white dark:bg-gray-900 border-lime-300">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleBulkUpdate} 
                  disabled={!bulkStatus || isBulkUpdating}
                  className="bg-lime-600 hover:bg-lime-700 h-8"
                >
                  {isBulkUpdating ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          )}

          {/* Table or Card View */}
          {viewMode === "table" ? (
            /* TABLE VIEW */
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-950 shadow-sm">
                    <TableRow className="border-b">
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={filteredPlantings.length > 0 && selectedPlantings.length === filteredPlantings.length}
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="min-w-[120px]">Batch #</TableHead>
                      <TableHead className="min-w-[150px]">Plant</TableHead>
                      <TableHead className="min-w-[100px]">Total Planted</TableHead>
                      <TableHead className="min-w-[100px]">Location</TableHead>
                      <TableHead className="min-w-[100px]">Harvested</TableHead>
                      <TableHead className="min-w-[100px]">Reserved</TableHead>
                      <TableHead className="min-w-[100px]">For Sale</TableHead>
                      <TableHead className="min-w-[70px]">Trays</TableHead>
                      <TableHead className="min-w-[100px]">Price (ZMW)</TableHead>
                      <TableHead className="min-w-[120px]">Date Planted</TableHead>
                      <TableHead className="min-w-[130px]">Expected Harvest</TableHead>
                      <TableHead className="min-w-[90px]">Status</TableHead>
                      <TableHead className="min-w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlantings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center h-24">
                          No plantings found matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPlantings.map(p => {
                        const totalPlanted = p.quantity;
                        const remaining = p.remaining_quantity ?? p.quantity;
                        const harvested = totalPlanted - remaining;
                        const reserved = getReservedQuantity(p.id);
                        const forSale = getAvailableQuantity(p);
                        const reservationCount = getReservationCount(p.id);
                        const trayUsage = Math.round(remaining / 220);
                        
                        return (
                          <TableRow key={p.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                            <TableCell>
                              <Checkbox 
                                checked={selectedPlantings.includes(p.id)}
                                onCheckedChange={(checked) => handleSelectOne(checked as boolean, p.id)}
                                aria-label={`Select planting ${p.batch_number}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono font-semibold text-sm">
                              {p.batch_number || 'N/A'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {p.plant_types?.variety || 'N/A'}
                              <br/>
                              <span className="text-xs text-gray-500">{p.plant_types?.name}</span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatNumber(totalPlanted)}
                            </TableCell>
                            <TableCell>
                              {p.locations?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="font-medium text-amber-600">
                              {formatNumber(harvested)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={reserved > 0 ? "font-medium text-orange-600" : ""}>{formatNumber(reserved)}</span>
                                {reservationCount > 0 && (
                                  <Link 
                                    href={`/reservations?planting=${p.id}`}
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    title="View reservations"
                                  >
                                    <ShoppingCart className="w-3 h-3" />
                                    <span className="text-xs">({reservationCount})</span>
                                  </Link>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={forSale <= 0 ? "text-red-600 font-medium" : "font-medium text-green-600"}>
                                {formatNumber(forSale)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-600">{trayUsage}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              K{(p.selling_price || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>{new Date(p.date_planted).toLocaleDateString()}</TableCell>
                            <TableCell>{getExpectedHarvestDate(p)}</TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'active' ? 'default' : p.status === 'closed' ? 'destructive' : 'secondary'}
                                className={p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'closed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}
                              >
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {permissions.canUpdate && (
                                  <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(p)} title="Edit planting">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {permissions.canDelete && (
                                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeletePlanting(p.id)} title="Delete planting">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                                {!permissions.canUpdate && !permissions.canDelete && (
                                  <span className="text-xs text-gray-400 italic flex-1 text-center py-2">View only</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            /* CARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlantings.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  {searchQuery || filterType !== "all" 
                    ? "No plantings match your search or filter criteria." 
                    : "No plantings recorded yet."}
                </div>
              ) : (
                filteredPlantings.map(p => {
                  const totalPlanted = p.quantity;
                  const remaining = p.remaining_quantity ?? p.quantity;
                  const harvested = totalPlanted - remaining;
                  const reserved = getReservedQuantity(p.id);
                  const forSale = getAvailableQuantity(p);
                  const reservationCount = getReservationCount(p.id);
                  const trayUsage = Math.round(remaining / 220);
                  
                  return (
                    <Card key={p.id} className={`border-2 transition-colors ${selectedPlantings.includes(p.id) ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-900/20' : 'hover:border-lime-500'}`}>
                      <CardContent className="pt-6 relative">
                        {permissions.canUpdate && (
                          <div className="absolute top-4 right-4 z-10">
                            <Checkbox 
                              checked={selectedPlantings.includes(p.id)}
                              onCheckedChange={(checked) => handleSelectOne(checked as boolean, p.id)}
                            />
                          </div>
                        )}
                        <div className="space-y-3">
                          {/* Header: Variety + Status */}
                          <div className="flex items-start justify-between pr-8">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                                {p.plant_types?.variety || 'N/A'}
                              </h3>
                              <p className="text-sm text-gray-500">{p.plant_types?.name}</p>
                            </div>
                            <Badge variant={p.status === 'active' ? 'default' : p.status === 'closed' ? 'destructive' : 'secondary'}
                              className={p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'closed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}
                            >
                              {p.status}
                            </Badge>
                          </div>

                          {/* Batch Number */}
                          <div className="text-xs font-mono text-gray-500">
                            Batch: {p.batch_number || 'N/A'}
                          </div>

                          {/* Key Metrics Grid - 4 columns */}
                          <div className="grid grid-cols-4 gap-2">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-center">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Planted</div>
                              <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                {formatNumber(totalPlanted)}
                              </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-2 text-center">
                              <div className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">Harvested</div>
                              <div className="text-lg font-bold text-amber-600">
                                {formatNumber(harvested)}
                              </div>
                            </div>

                            <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-2 text-center">
                              <div className="text-[10px] text-orange-600 dark:text-orange-500 uppercase tracking-wider mb-1">Reserved</div>
                              <div className={`text-lg font-bold ${reserved > 0 ? "text-orange-600" : "text-gray-400"}`}>
                                {formatNumber(reserved)}
                              </div>
                            </div>

                            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2 text-center">
                              <div className="text-[10px] text-green-600 dark:text-green-500 uppercase tracking-wider mb-1">For Sale</div>
                              <div className={`text-lg font-bold ${forSale <= 0 ? "text-red-600" : "text-green-600"}`}>
                                {formatNumber(forSale)}
                              </div>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Location:</span>
                              <span className="font-medium">{p.locations?.name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Price:</span>
                              <span className="font-mono font-semibold">K{(p.selling_price || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Planted:</span>
                              <span>{new Date(p.date_planted).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Harvest:</span>
                              <span>{getExpectedHarvestDate(p)}</span>
                            </div>
                            {reservationCount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Reservations:</span>
                                <Link 
                                  href={`/reservations?planting=${p.id}`}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                >
                                  <ShoppingCart className="w-3 h-3" />
                                  {reservationCount}
                                </Link>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            {permissions.canUpdate && (
                              <Button size="sm" variant="outline" onClick={() => handleOpenDialog(p)} className="flex-1">
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            )}
                            {permissions.canDelete && (
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeletePlanting(p.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            {!permissions.canUpdate && !permissions.canDelete && (
                              <span className="text-xs text-gray-400 italic flex-1 text-center py-2">View only</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}