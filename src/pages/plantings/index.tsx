import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar,
  MapPin,
  Sprout,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  X,
  Grid3x3,
  List,
  Pencil,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Layout } from "@/components/Layout";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { locationService } from "@/services/locationService";
import { reservationService, type Reservation } from "@/services/reservationService";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

type Location = Database["public"]["Tables"]["locations"]["Row"];

interface SeedInventory {
  plant_type_id: string;
  quantity: number;
  reorder_point?: number;
}

interface PlantType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  varieties?: string[];
  days_to_harvest?: number;
  tray_size?: number;
  selling_price?: number;
}

interface Planting {
  id: string;
  batch_number: string;
  plant_type_id: string;
  variety?: string;
  location_id: string;
  date_planted: string;
  expected_harvest_date?: string;
  quantity: number;
  remaining_quantity: number;
  selling_price: number;
  status: "active" | "harvested" | "closed";
  notes?: string;
  created_at: string;
  updated_at: string;
  plant_types?: PlantType;
  locations?: Location;
}

export default function PlantingsPage() {
  const { user } = useAuth();
  const permissions = usePermissions('plantings');
  const permissionsLoading = false;
  
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [seedInventory, setSeedInventory] = useState<SeedInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<Planting | null>(null);
  const [deletingPlantingId, setDeletingPlantingId] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "location" | "plant_type" | "variety" | "status">("status");
  const [filterValue, setFilterValue] = useState("active");

  // Bulk operations states
  const [selectedPlantings, setSelectedPlantings] = useState<Set<string>>(new Set());
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<"active" | "harvested" | "closed">("active");
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>("date_planted");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sorting function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Add view mode state here
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  
  useEffect(() => {
    if (!permissionsLoading) {
      loadData();
    }
  }, [permissionsLoading]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plantingsData, plantTypesData, locationsData, reservationsData] = await Promise.all([
        plantingService.getPlantings(),
        plantTypeService.getPlantTypes(),
        locationService.getLocations(),
        reservationService.getReservations(),
      ]);

      setPlantings(plantingsData as Planting[]);
      setPlantTypes(plantTypesData as PlantType[]);
      setLocations(locationsData);
      setReservations(reservationsData as Reservation[]);
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    batch_number: "",
    plant_type_id: "",
    variety: "",
    location_id: "",
    date_planted: format(new Date(), "yyyy-MM-dd"),
    expected_harvest_date: "",
    quantity: "",
    selling_price: "",
    status: "active" as "active" | "harvested" | "closed",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      batch_number: "",
      plant_type_id: "",
      variety: "",
      location_id: "",
      date_planted: format(new Date(), "yyyy-MM-dd"),
      expected_harvest_date: "",
      quantity: "",
      selling_price: "",
      status: "active",
      notes: "",
    });
    setEditingPlanting(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const selectedType = plantTypes.find(pt => pt.id === formData.plant_type_id);
      
      const plantingData = {
        batch_number: formData.batch_number,
        plant_type_id: formData.plant_type_id,
        variety: formData.variety || "",
        location_id: formData.location_id,
        date_planted: formData.date_planted,
        expected_harvest_date: formData.expected_harvest_date || null,
        status: formData.status,
        notes: formData.notes || "",
        quantity: parseInt(formData.quantity),
        remaining_quantity: editingPlanting ? editingPlanting.remaining_quantity : parseInt(formData.quantity),
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : (selectedType?.selling_price || 0),
      };

      if (editingPlanting) {
        await plantingService.updatePlanting(editingPlanting.id, plantingData);
      } else {
        await plantingService.createPlanting(plantingData);
      }

      await loadData();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving planting:", error);
      alert("Failed to save planting");
    }
  };

  const handleEdit = (planting: Planting) => {
    setEditingPlanting(planting);
    setFormData({
      batch_number: planting.batch_number,
      plant_type_id: planting.plant_type_id,
      variety: planting.variety || "",
      location_id: planting.location_id,
      date_planted: planting.date_planted,
      expected_harvest_date: planting.expected_harvest_date || "",
      quantity: planting.quantity.toString(),
      selling_price: planting.selling_price?.toString() || "",
      status: planting.status,
      notes: planting.notes || "",
    });
    setShowDialog(true);
  };

  const handleDeleteClick = (plantingId: string) => {
    setDeletingPlantingId(plantingId);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingPlantingId) return;

    try {
      await plantingService.deletePlanting(deletingPlantingId);
      await loadData();
      setShowDeleteDialog(false);
      setDeletingPlantingId(null);
    } catch (error) {
      console.error("Error deleting planting:", error);
      alert("Failed to delete planting");
    }
  };

  // Bulk operations handlers
  const togglePlantingSelection = (plantingId: string) => {
    setSelectedPlantings(prev => {
      const next = new Set(prev);
      if (next.has(plantingId)) {
        next.delete(plantingId);
      } else {
        next.add(plantingId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlantings.size === filteredPlantings.length) {
      setSelectedPlantings(new Set());
    } else {
      setSelectedPlantings(new Set(filteredPlantings.map(p => p.id)));
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedPlantings.size === 0) return;

    setIsBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedPlantings).map(id =>
          plantingService.updatePlanting(id, { status: bulkUpdateStatus })
        )
      );
      await loadData();
      setShowBulkUpdateDialog(false);
      setSelectedPlantings(new Set());
      setBulkUpdateStatus("active");
    } catch (error) {
      console.error("Error updating plantings:", error);
      alert("Failed to update plantings");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlantings.size === 0) return;

    setIsBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedPlantings).map(id => plantingService.deletePlanting(id))
      );
      await loadData();
      setShowBulkDeleteDialog(false);
      setSelectedPlantings(new Set());
    } catch (error) {
      console.error("Error deleting plantings:", error);
      alert("Failed to delete plantings");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const getReservationCount = (plantingId: string): number => {
    return reservations.filter(r => r.planting_id === plantingId && r.status === 'pending').length;
  };

  // Validate seed quantity and show warnings
  const validateSeedQuantity = (plantTypeId: string, quantity: number): { isValid: boolean; message?: string } => {
    const inventory = seedInventory.find(inv => inv.plant_type_id === plantTypeId);
    
    if (!inventory) {
      return { isValid: false, message: "No seed inventory found for this plant type" };
    }

    if (inventory.quantity < quantity) {
      return { 
        isValid: false, 
        message: `Not enough seeds. Available: ${inventory.quantity}, Required: ${quantity}` 
      };
    }

    if (inventory.quantity - quantity < (inventory.reorder_point || 0)) {
      return { 
        isValid: true, 
        message: `Warning: This will bring seed inventory below reorder point (${inventory.reorder_point})` 
      };
    }

    return { isValid: true };
  };

  // Get unique varieties and locations for filter dropdowns
  const uniqueVarieties = useMemo(() => {
    const varieties = new Set(plantings.map(p => p.variety).filter(Boolean) as string[]);
    return Array.from(varieties).sort();
  }, [plantings]);

  const uniqueLocations = useMemo(() => {
    return locations.map(l => ({ id: l.id, name: l.name }));
  }, [locations]);

  const uniquePlantTypes = useMemo(() => {
    const plantTypeNames = new Set(plantings.map(p => p.plant_types?.name).filter(Boolean));
    return Array.from(plantTypeNames).sort();
  }, [plantings]);

  // Filter plantings based on search and filters
  const filteredPlantings = useMemo(() => {
    let filtered = [...plantings];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.batch_number.toLowerCase().includes(query) ||
          p.plant_types?.name.toLowerCase().includes(query) ||
          p.variety?.toLowerCase().includes(query) ||
          p.locations?.name.toLowerCase().includes(query)
      );
    }

    // Apply type-specific filters
    if (filterType !== "all" && filterValue) {
      switch (filterType) {
        case "status":
          filtered = filtered.filter(p => p.status === filterValue);
          break;
        case "location":
          filtered = filtered.filter(p => p.location_id === filterValue);
          break;
        case "variety":
          filtered = filtered.filter(p => p.variety === filterValue);
          break;
        case "plant_type":
          filtered = filtered.filter(p => p.plant_types?.name === filterValue);
          break;
      }
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "batch_number":
          aValue = a.batch_number.toLowerCase();
          bValue = b.batch_number.toLowerCase();
          break;
        case "plant_type":
          aValue = (a.plant_types?.name || "").toLowerCase();
          bValue = (b.plant_types?.name || "").toLowerCase();
          break;
        case "variety":
          aValue = (a.variety || "").toLowerCase();
          bValue = (b.variety || "").toLowerCase();
          break;
        case "location":
          aValue = (a.locations?.name || "").toLowerCase();
          bValue = (b.locations?.name || "").toLowerCase();
          break;
        case "date_planted":
          aValue = new Date(a.date_planted).getTime();
          bValue = new Date(b.date_planted).getTime();
          break;
        case "expected_harvest_date":
          aValue = a.expected_harvest_date ? new Date(a.expected_harvest_date).getTime() : 0;
          bValue = b.expected_harvest_date ? new Date(b.expected_harvest_date).getTime() : 0;
          break;
        case "days_to_harvest":
          aValue = getDaysToHarvest(a);
          bValue = getDaysToHarvest(b);
          break;
        case "remaining_quantity":
          aValue = a.remaining_quantity || 0;
          bValue = b.remaining_quantity || 0;
          break;
        case "reserved":
          aValue = getReservationCount(a.id);
          bValue = getReservationCount(b.id);
          break;
        case "for_sale":
          const aReserved = getReservationCount(a.id);
          const bReserved = getReservationCount(b.id);
          aValue = (a.remaining_quantity || 0) - aReserved;
          bValue = (b.remaining_quantity || 0) - bReserved;
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [plantings, searchQuery, filterType, filterValue, sortColumn, sortDirection]);

  // Calculate dashboard metrics based on filtered plantings
  const dashboardMetrics = useMemo(() => {
    const totalAvailable = filteredPlantings.reduce((sum, p) => sum + (p.remaining_quantity || 0), 0);
    const totalReserved = filteredPlantings.reduce((sum, p) => {
      const reserved = reservations
        .filter(r => r.planting_id === p.id && r.status === 'pending')
        .reduce((rSum, r) => rSum + (r.quantity_reserved || 0), 0);
      return sum + reserved;
    }, 0);
    const totalForSale = totalAvailable - totalReserved;
    const inventoryValue = filteredPlantings.reduce((sum, p) => {
      const price = p.plant_types?.selling_price || 0;
      return sum + (p.remaining_quantity * price);
    }, 0);

    return {
      totalAvailable,
      totalReserved,
      totalForSale,
      inventoryValue,
    };
  }, [filteredPlantings, reservations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "harvested":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDaysToHarvest = (planting: Planting) => {
    if (!planting.expected_harvest_date) return null;
    const days = differenceInDays(new Date(planting.expected_harvest_date), new Date());
    return days;
  };

  const selectedPlantType = plantTypes.find(pt => pt.id === formData.plant_type_id);

  if (permissionsLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading plantings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const canCreate = permissions.canCreate;
  const canEdit = permissions.canUpdate;
  const canDelete = permissions.canDelete;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Plantings Management</h1>
            <p className="text-gray-600 mt-1">Track and manage all your plantings</p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Planting
            </Button>
          )}
        </div>

        {/* Dashboard Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.totalAvailable.toLocaleString()}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Total seedlings in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reserved</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.totalReserved.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Committed to customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">For Sale</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.totalForSale.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Available - Reserved</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold">${dashboardMetrics.inventoryValue.toLocaleString()}</p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Based on current selling prices</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Plantings</CardTitle>
            <CardDescription>
              View and manage your planting batches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-4">
              {/* Bulk Actions Bar */}
              {selectedPlantings.size > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CheckSquare className="h-5 w-5 text-primary" />
                        <span className="font-medium">
                          {selectedPlantings.size} planting(s) selected
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkUpdateDialog(true)}
                          disabled={!canEdit}
                        >
                          Update Status
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkDeleteDialog(true)}
                          disabled={!canDelete}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPlantings(new Set())}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search plantings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex gap-2">
                  <Select
                    value={filterType}
                    onValueChange={(value: typeof filterType) => {
                      setFilterType(value);
                      setFilterValue(value === "status" ? "active" : "");
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Filter by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plantings</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                      <SelectItem value="location">By Location</SelectItem>
                      <SelectItem value="plant_type">By Plant Type</SelectItem>
                      <SelectItem value="variety">By Variety</SelectItem>
                    </SelectContent>
                  </Select>

                  {filterType === "status" && (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="harvested">Harvested</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {filterType === "location" && (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {filterType === "plant_type" && (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select plant type" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniquePlantTypes.map((plantType) => (
                          <SelectItem key={plantType} value={plantType}>
                            {plantType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {filterType === "variety" && (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select variety" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueVarieties.map((variety) => (
                          <SelectItem key={variety} value={variety}>
                            {variety}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {filterType !== "all" && filterValue && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setFilterType("all");
                        setFilterValue("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
                  >
                    {viewMode === "table" ? (
                      <Grid3x3 className="h-4 w-4" />
                    ) : (
                      <List className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Showing {filteredPlantings.length} of {plantings.length} plantings
              </div>
            </div>

            {/* Table View */}
            {viewMode === "table" && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-950 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedPlantings.size === filteredPlantings.length && filteredPlantings.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("batch_number")}
                      >
                        <div className="flex items-center gap-2">
                          Batch #
                          {sortColumn === "batch_number" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("plant_type")}
                      >
                        <div className="flex items-center gap-2">
                          Plant Type
                          {sortColumn === "plant_type" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("variety")}
                      >
                        <div className="flex items-center gap-2">
                          Variety
                          {sortColumn === "variety" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("location")}
                      >
                        <div className="flex items-center gap-2">
                          Location
                          {sortColumn === "location" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("date_planted")}
                      >
                        <div className="flex items-center gap-2">
                          Date Planted
                          {sortColumn === "date_planted" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("expected_harvest_date")}
                      >
                        <div className="flex items-center gap-2">
                          Expected Harvest
                          {sortColumn === "expected_harvest_date" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("days_to_harvest")}
                      >
                        <div className="flex items-center gap-2">
                          Days to Harvest
                          {sortColumn === "days_to_harvest" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("remaining_quantity")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Available
                          {sortColumn === "remaining_quantity" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("reserved")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Reserved
                          {sortColumn === "reserved" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("for_sale")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          For Sale
                          {sortColumn === "for_sale" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {sortColumn === "status" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlantings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                          No plantings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPlantings.map((planting) => {
                        const location = locations.find(l => l.id === planting.location_id);
                        const reservedQty = reservations
                          .filter(r => r.planting_id === planting.id && r.status === 'pending')
                          .reduce((sum, r) => sum + (r.quantity_reserved || 0), 0);
                        const forSale = (planting.remaining_quantity || 0) - reservedQty;
                        const daysToHarvest = getDaysToHarvest(planting);
                        const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);

                        return (
                          <TableRow key={planting.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedPlantings.has(planting.id)}
                                onCheckedChange={() => togglePlantingSelection(planting.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{planting.batch_number}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{planting.plant_types?.name}</span>
                                <span className="text-xs text-gray-500">{planting.plant_types?.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{planting.variety || 'N/A'}</TableCell>
                            <TableCell>{location?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{format(new Date(planting.date_planted), "MMM dd, yyyy")}</span>
                                <span className="text-xs text-gray-500">{format(new Date(planting.date_planted), "p")}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {planting.expected_harvest_date ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">{format(new Date(planting.expected_harvest_date), "MMM dd, yyyy")}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not set</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {daysToHarvest !== null ? (
                                daysToHarvest <= 0 ? (
                                  <span className="text-green-600 font-semibold">Ready!</span>
                                ) : (
                                  <span className="text-gray-600">{daysToHarvest} days</span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">{(planting.remaining_quantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{reservedQty.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600 font-medium">{forSale.toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                planting.status === 'active' ? 'bg-green-100 text-green-800' :
                                planting.status === 'harvested' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {planting.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(planting)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(planting.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
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
            )}

            {/* Cards View */}
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlantings.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No plantings found
                  </div>
                ) : (
                  filteredPlantings.map((p) => {
                    const location = locations.find(l => l.id === p.location_id);
                    const reservedQty = reservations
                      .filter(r => r.planting_id === p.id && r.status === 'pending')
                      .reduce((sum, r) => sum + (r.quantity_reserved || 0), 0);
                    const forSaleQty = (p.remaining_quantity || 0) - reservedQty;
                    const daysToHarvest = getDaysToHarvest(p);
                    const plantType = plantTypes.find(pt => pt.id === p.plant_type_id);

                    return (
                      <Card key={p.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Checkbox
                                    checked={selectedPlantings.has(p.id)}
                                    onCheckedChange={() => togglePlantingSelection(p.id)}
                                  />
                                  <h3 className="font-semibold text-lg">{p.plant_types?.name}</h3>
                                </div>
                                <p className="text-sm text-gray-600">{p.variety || 'No variety'}</p>
                                <p className="text-xs text-gray-500 mt-1">Batch: {p.batch_number}</p>
                              </div>
                              <Badge className={getStatusColor(p.status)}>
                                {p.status}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="h-4 w-4" />
                                <span>{location?.name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {format(new Date(p.date_planted), "MMM dd, yyyy")}
                                  <span className="text-xs ml-1">
                                    ({differenceInDays(new Date(), new Date(p.date_planted))} days ago)
                                  </span>
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 py-3 border-t border-b">
                              <div>
                                <p className="text-xs text-gray-500">Available</p>
                                <p className="font-bold">{p.remaining_quantity?.toLocaleString() || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Reserved</p>
                                <p className="font-bold">{reservedQty.toLocaleString()}</p>
                                {getReservationCount(p.id) > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {getReservationCount(p.id)} res.
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">For Sale</p>
                                <p className="font-bold">{forSaleQty.toLocaleString()}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleEdit(p)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(p.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkUpdateDialog} onOpenChange={setShowBulkUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status for {selectedPlantings.size} Planting(s)</DialogTitle>
            <DialogDescription>
              Select the new status for the selected plantings. This action will update all selected plantings at once.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="bulk-status">New Status</Label>
            <Select
              value={bulkUpdateStatus}
              onValueChange={(value: "active" | "harvested" | "closed") => setBulkUpdateStatus(value)}
            >
              <SelectTrigger id="bulk-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="harvested">Harvested</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkUpdateDialog(false)}
              disabled={isBulkActionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={isBulkActionLoading}>
              {isBulkActionLoading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedPlantings.size} Planting(s)?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the selected plantings? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={isBulkActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isBulkActionLoading}
            >
              {isBulkActionLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlanting ? "Edit Planting" : "New Planting"}
            </DialogTitle>
            <DialogDescription>
              {editingPlanting
                ? "Update the planting information below"
                : "Enter the details for the new planting batch"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch Number *</Label>
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) =>
                    setFormData({ ...formData, batch_number: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plant_type_id">Plant Type *</Label>
                <Select
                  value={formData.plant_type_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, plant_type_id: value })
                  }
                >
                  <SelectTrigger id="plant_type_id">
                    <SelectValue placeholder="Select plant type" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlantType?.varieties && selectedPlantType.varieties.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="variety">Variety</Label>
                  <Select
                    value={formData.variety}
                    onValueChange={(value) =>
                      setFormData({ ...formData, variety: value })
                    }
                  >
                    <SelectTrigger id="variety">
                      <SelectValue placeholder="Select variety" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPlantType.varieties.map((variety) => (
                        <SelectItem key={variety} value={variety}>
                          {variety}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location_id">Location *</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location_id: value })
                  }
                >
                  <SelectTrigger id="location_id">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_planted">Planting Date *</Label>
                <Input
                  id="date_planted"
                  type="date"
                  value={formData.date_planted}
                  onChange={(e) =>
                    setFormData({ ...formData, date_planted: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_harvest_date">Expected Harvest Date</Label>
                <Input
                  id="expected_harvest_date"
                  type="date"
                  value={formData.expected_harvest_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_harvest_date: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  required
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) =>
                    setFormData({ ...formData, selling_price: e.target.value })
                  }
                  placeholder="Defaults to plant type price"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "harvested" | "closed") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="harvested">Harvested</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes or observations"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPlanting ? "Update" : "Create"} Planting
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Planting?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this planting? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingPlantingId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}