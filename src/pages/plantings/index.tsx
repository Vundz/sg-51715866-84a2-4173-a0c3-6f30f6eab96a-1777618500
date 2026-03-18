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
  ChevronDown,
  Filter,
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
  const { user, profile } = useAuth() as any;
  const permissions = usePermissions("plantings");
  const canCreate = permissions.canCreate;
  const canEdit = permissions.canUpdate;
  const canDelete = permissions.canDelete;
  const isAdmin = profile?.role === 'admin';
  
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("plantings_rows_per_page");
      return saved ? parseInt(saved, 10) : 50;
    }
    return 50;
  });

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    location: string | null;
    plant_type: string | null;
    variety: string | null;
    status: "all" | "active" | "harvested" | "closed";
  }>({
    location: null,
    plant_type: null,
    variety: null,
    status: "all",
  });

  // Derived varieties list
  const varieties = useMemo(() => {
    const vSet = new Set<string>();
    plantings.forEach(p => {
      if (p.variety) vSet.add(p.variety);
    });
    return Array.from(vSet).sort();
  }, [plantings]);

  // Add view mode state
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<keyof Planting | 'plant_type_id' | 'location_id'>('batch_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk actions state
  const [selectedPlantings, setSelectedPlantings] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<'active' | 'harvested' | 'closed'>('active');

  useEffect(() => {
    loadData();
  }, []);

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
  const handleSort = (column: keyof Planting | 'plant_type_id' | 'location_id') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
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
    let result = plantings;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.batch_number.toLowerCase().includes(query) ||
        p.variety?.toLowerCase().includes(query) ||
        plantTypes.find(t => t.id === p.plant_type_id)?.name.toLowerCase().includes(query)
      );
    }

    // Filters
    if (filters.location) {
      result = result.filter(p => p.location_id === filters.location);
    }
    if (filters.plant_type) {
      result = result.filter(p => p.plant_type_id === filters.plant_type);
    }
    if (filters.variety) {
      result = result.filter(p => p.variety === filters.variety);
    }
    if (filters.status !== "all") {
      result = result.filter(p => p.status === filters.status);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortColumn as keyof Planting];
      let bVal = b[sortColumn as keyof Planting];

      // Handle related fields
      if (sortColumn === 'plant_type_id') {
        aVal = plantTypes.find(t => t.id === a.plant_type_id)?.name || '';
        bVal = plantTypes.find(t => t.id === b.plant_type_id)?.name || '';
      } else if (sortColumn === 'location_id') {
        aVal = locations.find(l => l.id === a.location_id)?.name || '';
        bVal = locations.find(l => l.id === b.location_id)?.name || '';
      }

      if (aVal === bVal) return 0;
      
      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [plantings, searchQuery, filters, plantTypes, locations, sortColumn, sortDirection]);

  // Calculate stats from filtered plantings
  const stats = useMemo(() => {
    const activePlantings = filteredPlantings.filter(p => p.status === 'active').length;
    const readyToHarvest = filteredPlantings.filter(p => {
      if (p.status !== 'active' || !p.expected_harvest_date) return false;
      const harvestDate = new Date(p.expected_harvest_date);
      const today = new Date();
      return today >= harvestDate;
    }).length;
    const totalInventoryValue = filteredPlantings.reduce((sum, p) => {
      return sum + ((p.quantity || 0) * (p.selling_price || 0));
    }, 0);

    return {
      activePlantings,
      readyToHarvest,
      totalInventoryValue
    };
  }, [filteredPlantings]);

  const filterPlantings = (type: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value === "all" ? null : value
    }));
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredPlantings.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPlantings = filteredPlantings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

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

  if (isLoading) {
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plantings</CardTitle>
              <CardDescription>Manage planting batches and schedules</CardDescription>
            </div>
            {canCreate && (
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Planting
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Stats and Search Section */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredPlantings.length} of {plantings.length} plantings
              </div>
              
              {/* Search Bar */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search plantings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Clear Search */}
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(filters.location || filters.plant_type || filters.status !== "all") && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {[filters.location, filters.plant_type, filters.status !== "all"].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select
                    value={filters.location || "__all__"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, location: value === "__all__" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Plant Type</label>
                  <Select
                    value={filters.plant_type || "__all__"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, plant_type: value === "__all__" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Plant Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Plant Types</SelectItem>
                      {plantTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Variety</label>
                  <Select
                    value={filters.variety || "__all__"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, variety: value === "__all__" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Varieties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Varieties</SelectItem>
                      {varieties.map((variety) => (
                        <SelectItem key={variety} value={variety}>
                          {variety}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters({ ...filters, status: value as typeof filters.status })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilters({
                        location: null,
                        plant_type: null,
                        variety: null,
                        status: "all",
                      });
                      setSearchQuery("");
                    }}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Plantings Card */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-2">Active Plantings</div>
                <div className="text-3xl font-bold text-blue-600">{stats.activePlantings}</div>
              </CardContent>
            </Card>

            {/* Ready to Harvest Card */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-2">Ready to Harvest</div>
                <div className="text-3xl font-bold text-green-600">{stats.readyToHarvest}</div>
              </CardContent>
            </Card>

            {/* Total Inventory Value Card (Admin Only) */}
            {isAdmin && (
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Total Inventory Value</div>
                  <div className="text-3xl font-bold text-purple-600">
                    ${stats.totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900">
                  <TableRow>
                    <TableHead className="w-[50px] sticky top-0 bg-background z-10">
                      <Checkbox 
                        checked={selectedPlantings.size === filteredPlantings.length && filteredPlantings.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[150px] cursor-pointer" onClick={() => handleSort('batch_number')}>
                      <div className="flex items-center">
                        Batch No. {sortColumn === 'batch_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[150px] cursor-pointer" onClick={() => handleSort('plant_type_id')}>
                      <div className="flex items-center">
                        Plant Type {sortColumn === 'plant_type_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[150px] cursor-pointer" onClick={() => handleSort('variety')}>
                      <div className="flex items-center">
                        Variety {sortColumn === 'variety' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[150px] cursor-pointer" onClick={() => handleSort('location_id')}>
                      <div className="flex items-center">
                        Location {sortColumn === 'location_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[120px] cursor-pointer" onClick={() => handleSort('date_planted')}>
                      <div className="flex items-center">
                        Planted {sortColumn === 'date_planted' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[120px] cursor-pointer" onClick={() => handleSort('expected_harvest_date')}>
                      <div className="flex items-center">
                        Expected Harvest {sortColumn === 'expected_harvest_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[100px]">
                      <div className="flex items-center">
                        Days Left
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right cursor-pointer" onClick={() => handleSort('quantity')}>
                      <div className="flex items-center justify-end">
                        Planted Qty {sortColumn === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right cursor-pointer" onClick={() => handleSort('remaining_quantity')}>
                      <div className="flex items-center justify-end">
                        Remaining Qty {sortColumn === 'remaining_quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right">
                      <div className="flex items-center justify-end">
                        Reserved
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right">
                      <div className="flex items-center justify-end">
                        For Sale
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[100px] cursor-pointer" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 w-[100px] text-right">Actions</TableHead>
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

            {/* Pagination Controls */}
            {filteredPlantings.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        const newRowsPerPage = parseInt(e.target.value, 10);
                        setRowsPerPage(newRowsPerPage);
                        setCurrentPage(1);
                        localStorage.setItem("plantings_rows_per_page", newRowsPerPage.toString());
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredPlantings.length)} of {filteredPlantings.length}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {getPageNumbers().map((pageNum, idx) => (
                      pageNum === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2">...</span>
                      ) : (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum as number)}
                        >
                          {pageNum}
                        </Button>
                      )
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}