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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Grid3x3,
  List,
  Pencil,
  AlertTriangle,
  TrendingUp,
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

export type SortColumn = 
  | "batch_number" 
  | "plant_type" 
  | "variety" 
  | "location" 
  | "date_planted" 
  | "expected_harvest_date" 
  | "days_to_harvest" 
  | "remaining_quantity" 
  | "reserved" 
  | "for_sale" 
  | "status";

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
  const [sortColumn, setSortColumn] = useState<SortColumn>("date_planted");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("plantings_rows_per_page");
      return saved ? parseInt(saved, 10) : 50;
    }
    return 50;
  });

  // Add view mode state
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

  const handleEditClick = (planting: Planting) => {
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

  const handleEdit = handleEditClick;

  const handleDeleteClick = (id: string) => {
    setDeletingPlantingId(id);
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

  // Sorting function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column as SortColumn);
      setSortDirection("asc");
    }
  };

  const getReservationCount = (plantingId: string): number => {
    return reservations.filter(r => r.planting_id === plantingId && r.status === 'pending').length;
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredPlantings.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPlantings = filteredPlantings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterValue]);

  // Save rows per page preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("plantings_rows_per_page", rowsPerPage.toString());
    }
  }, [rowsPerPage]);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

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
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Plantings</h1>
              <p className="text-gray-600 mt-1">Manage your planting batches and inventory</p>
            </div>
            {canCreate && (
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Planting
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedPlantings.size > 0 && (
          <Card className="border-primary/50 bg-primary/5 mb-4">
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

        {/* Search and Filters */}
        <Card className="mb-4">
          <CardContent className="pt-6">
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

            <div className="text-sm text-gray-600 mt-4">
              Showing {paginatedPlantings.length} of {filteredPlantings.length} plantings
              {filteredPlantings.length !== plantings.length && ` (filtered from ${plantings.length} total)`}
            </div>
          </CardContent>
        </Card>

        {/* Table View */}
        {viewMode === "table" && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedPlantings.size === paginatedPlantings.length && paginatedPlantings.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-32 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("batch_number")}>
                        <div className="flex items-center gap-1">
                          Batch #
                          {sortColumn === "batch_number" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-32 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("plant_type")}>
                        <div className="flex items-center gap-1">
                          Type
                          {sortColumn === "plant_type" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-32 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("variety")}>
                        <div className="flex items-center gap-1">
                          Variety
                          {sortColumn === "variety" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-28 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("location")}>
                        <div className="flex items-center gap-1">
                          Location
                          {sortColumn === "location" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-28 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("date_planted")}>
                        <div className="flex items-center gap-1">
                          Planted
                          {sortColumn === "date_planted" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-28 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("expected_harvest_date")}>
                        <div className="flex items-center gap-1">
                          Harvest
                          {sortColumn === "expected_harvest_date" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-20 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("days_to_harvest")}>
                        <div className="flex items-center justify-center gap-1">
                          Days
                          {sortColumn === "days_to_harvest" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-24 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("remaining_quantity")}>
                        <div className="flex items-center justify-end gap-1">
                          Avail.
                          {sortColumn === "remaining_quantity" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-24 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("reserved")}>
                        <div className="flex items-center justify-end gap-1">
                          Resv.
                          {sortColumn === "reserved" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-24 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("for_sale")}>
                        <div className="flex items-center justify-end gap-1">
                          Sale
                          {sortColumn === "for_sale" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-24 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-1">
                          Status
                          {sortColumn === "status" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPlantings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                          No plantings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPlantings.map((planting) => {
                        const plantType = plantTypes.find(
                          pt => pt.id === planting.plant_type_id
                        );
                        const location = locations.find(
                          l => l.id === planting.location_id
                        );
                        const reservedQty = reservations
                          .filter(r => r.planting_id === planting.id && r.status === 'pending')
                          .reduce((sum, r) => sum + (r.quantity_reserved || 0), 0);
                        const forSale = (planting.remaining_quantity || 0) - reservedQty;
                        const daysToHarvest = getDaysToHarvest(planting);

                        return (
                          <TableRow key={planting.id}>
                            <TableCell className="py-2">
                              <Checkbox
                                checked={selectedPlantings.has(planting.id)}
                                onCheckedChange={() => togglePlantingSelection(planting.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium py-2 text-sm">{planting.batch_number}</TableCell>
                            <TableCell className="py-2 text-sm">{plantType?.name || "Unknown"}</TableCell>
                            <TableCell className="py-2 text-sm">{planting.variety || "-"}</TableCell>
                            <TableCell className="py-2 text-sm">{location?.name || "Unknown"}</TableCell>
                            <TableCell className="py-2 text-sm text-center text-sm">{format(new Date(planting.date_planted), "MMM d")}</TableCell>
                            <TableCell className="py-2 text-sm text-sm">
                              {planting.expected_harvest_date 
                                ? format(new Date(planting.expected_harvest_date), "MMM d")
                                : "-"
                              }
                            </TableCell>
                            <TableCell className="text-center py-2 text-sm">
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
                            <TableCell className="text-right font-medium py-2 text-sm">{(planting.remaining_quantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right py-2 text-sm">{reservedQty.toLocaleString()}</TableCell>
                            <TableCell className="text-right py-2">
                              <span className="text-green-600 font-medium text-sm">{forSale.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="py-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                planting.status === 'active' ? 'bg-green-100 text-green-800' :
                                planting.status === 'harvested' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {planting.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <div className="flex items-center justify-end gap-1">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditClick(planting)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(planting.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
            </CardContent>
          </Card>
        )}

        {/* Cards View */}
        {viewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPlantings.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No plantings found
              </div>
            ) : (
              paginatedPlantings.map((p) => {
                const location = locations.find(l => l.id === p.location_id);
                const reservedQty = reservations
                  .filter(r => r.planting_id === p.id && r.status === 'pending')
                  .reduce((sum, r) => sum + (r.quantity_reserved || 0), 0);
                const forSaleQty = (p.remaining_quantity || 0) - reservedQty;

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

        {/* Pagination Controls */}
        {filteredPlantings.length > 0 && (
          <Card className="mt-4">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows per page:</span>
                  <Select
                    value={rowsPerPage.toString()}
                    onValueChange={handleRowsPerPageChange}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredPlantings.length)} of {filteredPlantings.length}
                  </span>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="hidden md:flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === "..." ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page as number)}
                          className="h-9 w-9 p-0"
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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