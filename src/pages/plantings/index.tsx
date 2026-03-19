import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Edit, 
  Trash2, 
  X, 
  Filter, 
  Search, 
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sprout,
  Table as TableIcon,
  LayoutGrid,
  Upload,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  plantingService,
  type Planting,
} from "@/services/plantingService";
import { locationService } from "@/services/locationService";
import { plantTypeService, type PlantType } from "@/services/plantTypeService";
import { formatNumberWithDecimals } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/format";

type Location = Database["public"]["Tables"]["locations"]["Row"];

export default function PlantingsPage() {
  const { user, profile } = useAuth() as any;
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';
  
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<Planting | null>(null);
  const [formData, setFormData] = useState({
    batch_number: "",
    plant_type_id: "",
    variety: "",
    location_id: "",
    quantity: "",
    date_planted: "",
    expected_harvest_date: "",
    selling_price: "",
    notes: "",
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    plant_type: null as string | null,
    variety: null as string | null,
    location: null as string | null,
    status: "all" as string,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Column visibility state - default values
  const [columnVisibility, setColumnVisibility] = useState({
    batchNumber: true,
    plant: true,
    location: true,
    totalQty: true,
    trays: false,
    reserved: false,
    available: true,
    price: false,
    datePlanted: false,
    expectedHarvest: true,
    status: true,
  });

  // Load column visibility from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('plantings_column_visibility');
      if (saved) {
        try {
          setColumnVisibility(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to parse column visibility:', error);
        }
      }
    }
  }, []);

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('plantings_column_visibility', JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<keyof Planting | 'plant_type_id' | 'location_id'>('date_planted');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk actions state
  const [selectedPlantings, setSelectedPlantings] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<'active' | 'harvested' | 'closed'>('active');

  // Add view mode state
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plantingsData, locationsData, plantTypesData] = await Promise.all([
        plantingService.getPlantings(),
        locationService.getLocations(),
        plantTypeService.getPlantTypes(),
      ]);
      setPlantings(plantingsData);
      setLocations(locationsData);
      setPlantTypes(plantTypesData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPlantings = useMemo(() => {
    let result = plantings;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.batch_number?.toLowerCase().includes(query) ||
        plantTypes.find(pt => pt.id === p.plant_type_id)?.name?.toLowerCase().includes(query) ||
        p.variety?.toLowerCase().includes(query) ||
        locations.find(l => l.id === p.location_id)?.name?.toLowerCase().includes(query)
      );
    }

    // Filters
    if (filters.plant_type) {
      result = result.filter(p => p.plant_type_id === filters.plant_type);
    }
    if (filters.variety) {
      result = result.filter(p => p.variety === filters.variety);
    }
    if (filters.location) {
      result = result.filter(p => p.location_id === filters.location);
    }
    if (filters.status !== "all") {
      result = result.filter(p => p.status === filters.status);
    }

    return result;
  }, [plantings, searchQuery, filters, plantTypes, locations]);

  // Calculate stats from filtered plantings
  const stats = useMemo(() => {
    const totalPlantings = filteredPlantings.length;
    
    const totalSeedlings = filteredPlantings.reduce((sum, p) => {
      return sum + (p.quantity || 0);
    }, 0);
    
    const reserved = filteredPlantings.reduce((sum, p) => {
      return sum + ((p as any).reserved_quantity || 0);
    }, 0);
    
    const inventoryValue = filteredPlantings.reduce((sum, p) => {
      return sum + (p.quantity * (p.selling_price || 0));
    }, 0);

    return {
      totalPlantings,
      totalSeedlings,
      reserved,
      inventoryValue
    };
  }, [filteredPlantings]);

  const varieties = useMemo(() => {
    const uniqueVarieties = new Set(
      plantings
        .filter(p => p.variety)
        .map(p => p.variety)
    );
    return Array.from(uniqueVarieties).sort();
  }, [plantings]);

  const toggleSelectAll = () => {
    if (selectedPlantings.size === paginatedPlantings.length) {
      setSelectedPlantings(new Set());
    } else {
      setSelectedPlantings(new Set(paginatedPlantings.map(p => p.id)));
    }
  };

  const toggleSelectPlanting = (id: string) => {
    const newSelected = new Set(selectedPlantings);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPlantings(newSelected);
  };

  const handleBulkStatusUpdate = async () => {
    try {
      setIsBulkActionLoading(true);
      const selectedIds = Array.from(selectedPlantings);
      
      await Promise.all(
        selectedIds.map(id => {
          const planting = plantings.find(p => p.id === id);
          if (planting) {
            return plantingService.updatePlanting(id, { ...planting, status: bulkUpdateStatus });
          }
        })
      );

      toast({
        title: "Success",
        description: `Updated ${selectedIds.length} planting(s)`,
      });

      setSelectedPlantings(new Set());
      setShowBulkUpdateDialog(false);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update plantings",
        variant: "destructive",
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const paginatedPlantings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPlantings.slice(startIndex, endIndex);
  }, [filteredPlantings, currentPage]);

  const totalPages = Math.ceil(filteredPlantings.length / itemsPerPage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        quantity: parseInt(formData.quantity),
        selling_price: parseFloat(formData.selling_price),
        status: editingPlanting ? editingPlanting.status : 'active',
        remaining_quantity: editingPlanting ? editingPlanting.remaining_quantity : parseInt(formData.quantity),
      };

      if (editingPlanting) {
        await plantingService.updatePlanting(editingPlanting.id, data);
        toast({
          title: "Success",
          description: "Planting updated successfully",
        });
      } else {
        await plantingService.createPlanting(data);
        toast({
          title: "Success",
          description: "Planting created successfully",
        });
      }

      setShowDialog(false);
      setEditingPlanting(null);
      setFormData({
        batch_number: "",
        plant_type_id: "",
        variety: "",
        location_id: "",
        quantity: "",
        date_planted: "",
        expected_harvest_date: "",
        selling_price: "",
        notes: "",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save planting",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (planting: Planting) => {
    setEditingPlanting(planting);
    setFormData({
      batch_number: planting.batch_number || "",
      plant_type_id: planting.plant_type_id,
      variety: planting.variety || "",
      location_id: planting.location_id,
      quantity: planting.quantity.toString(),
      date_planted: planting.date_planted || "",
      expected_harvest_date: planting.expected_harvest_date || "",
      selling_price: planting.selling_price?.toString() || "",
      notes: planting.notes || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this planting?")) return;

    try {
      await plantingService.deletePlanting(id);
      toast({
        title: "Success",
        description: "Planting deleted successfully",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete planting",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sprout className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl font-bold">Plantings</h1>
            </div>
            <p className="text-muted-foreground">
              Track all your seedling batches from planting to harvest.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none"
              >
                <TableIcon className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Cards
              </Button>
            </div>

            {/* Bulk Import Button */}
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>

            {/* Add Planting Button */}
            <Button onClick={() => setShowDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Planting
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Plantings */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Total Plantings</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalPlantings.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Seedlings */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Total Seedlings</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalSeedlings.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Reserved */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Reserved</p>
                <p className="text-3xl font-bold text-orange-600">{stats.reserved.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Value (Admin Only) */}
          {isAdmin && (
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Inventory Value</p>
                  <p className="text-3xl font-bold text-purple-600">K{formatNumberWithDecimals(stats.inventoryValue, 2)}</p>
                  <p className="text-xs text-muted-foreground">Based on current selling prices</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Current Plantings Section */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plantings</CardTitle>
            <CardDescription>An overview of all seedling batches in the nursery.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by batch, plant, variety, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Filter Dropdown */}
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plantings</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="harvested">Harvested</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Column Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Columns
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px]" align="end">
                    <div className="space-y-3">
                      <div className="font-medium text-sm">Toggle Columns</div>
                      <div className="space-y-2">
                        {[
                          { key: 'batchNumber', label: 'Batch #' },
                          { key: 'plant', label: 'Plant' },
                          { key: 'location', label: 'Location' },
                          { key: 'totalQty', label: 'Total Qty' },
                          { key: 'trays', label: 'Trays' },
                          { key: 'reserved', label: 'Reserved' },
                          { key: 'available', label: 'Available' },
                          { key: 'price', label: 'Price (ZMW)' },
                          { key: 'datePlanted', label: 'Date Planted' },
                          { key: 'expectedHarvest', label: 'Expected Harvest' },
                          { key: 'status', label: 'Status' },
                        ].map((column) => (
                          <div key={column.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={column.key}
                              checked={columnVisibility[column.key as keyof typeof columnVisibility]}
                              onCheckedChange={(checked) => {
                                setColumnVisibility(prev => ({
                                  ...prev,
                                  [column.key]: checked
                                }));
                              }}
                            />
                            <label
                              htmlFor={column.key}
                              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {column.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedPlantings.size > 0 && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedPlantings.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkUpdateDialog(true)}
                >
                  Update Status
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPlantings(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columnVisibility.batchNumber && <TableHead className="w-[140px]">Batch #</TableHead>}
                        {columnVisibility.plant && <TableHead className="w-[200px]">Plant</TableHead>}
                        {columnVisibility.location && <TableHead className="w-[120px]">Location</TableHead>}
                        {columnVisibility.totalQty && <TableHead className="text-right">Total Qty</TableHead>}
                        {columnVisibility.trays && <TableHead className="text-right">Trays</TableHead>}
                        {columnVisibility.reserved && <TableHead className="text-right">Reserved</TableHead>}
                        {columnVisibility.available && <TableHead className="text-right">Available</TableHead>}
                        {columnVisibility.price && <TableHead className="text-right">Price (ZMW)</TableHead>}
                        {columnVisibility.datePlanted && <TableHead>Date Planted</TableHead>}
                        {columnVisibility.expectedHarvest && <TableHead>Expected Harvest</TableHead>}
                        {columnVisibility.status && <TableHead>Status</TableHead>}
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPlantings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                            No plantings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedPlantings.map((planting) => {
                          const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);
                          const location = locations.find(loc => loc.id === planting.location_id);
                          const reserved = (planting as any).reserved_quantity || 0;
                          const available = planting.remaining_quantity - reserved;

                          return (
                            <TableRow key={planting.id}>
                              {columnVisibility.batchNumber && (
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={selectedPlantings.has(planting.id)}
                                      onCheckedChange={() => toggleSelectPlanting(planting.id)}
                                    />
                                    <span className="text-blue-600 font-medium">{planting.batch_number}</span>
                                  </div>
                                </TableCell>
                              )}
                              {columnVisibility.plant && (
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{plantType?.name || "Unknown"}</div>
                                    <div className="text-sm text-muted-foreground">{planting.variety}</div>
                                  </div>
                                </TableCell>
                              )}
                              {columnVisibility.location && (
                                <TableCell>{location?.name || "N/A"}</TableCell>
                              )}
                              {columnVisibility.totalQty && (
                                <TableCell className="text-right">{planting.quantity.toLocaleString()}</TableCell>
                              )}
                              {columnVisibility.trays && (
                                <TableCell className="text-right">
                                  <span className="text-blue-600 font-medium">{(planting as any).number_of_trays || Math.ceil(planting.quantity / 200)}</span>
                                </TableCell>
                              )}
                              {columnVisibility.reserved && (
                                <TableCell className="text-right">{reserved.toLocaleString()}</TableCell>
                              )}
                              {columnVisibility.available && (
                                <TableCell className="text-right text-green-600 font-medium">{available.toLocaleString()}</TableCell>
                              )}
                              {columnVisibility.price && (
                                <TableCell className="text-right">{formatCurrency(planting.selling_price)}</TableCell>
                              )}
                              {columnVisibility.datePlanted && (
                                <TableCell>{new Date(planting.date_planted).toLocaleDateString()}</TableCell>
                              )}
                              {columnVisibility.expectedHarvest && (
                                <TableCell>{new Date(planting.expected_harvest_date).toLocaleDateString()}</TableCell>
                              )}
                              {columnVisibility.status && (
                                <TableCell>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    planting.status === "active" ? "bg-green-100 text-green-800" :
                                    planting.status === "harvested" ? "bg-blue-100 text-blue-800" :
                                    "bg-gray-100 text-gray-800"
                                  }`}>
                                    {planting.status}
                                  </span>
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(planting)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(planting.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
            </div>

            {/* Pagination Controls */}
            {filteredPlantings.length > 0 && (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPlantings.length)} of {filteredPlantings.length}
                  </span>
                  
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
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
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
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlanting ? "Edit Planting" : "Add New Planting"}</DialogTitle>
              <DialogDescription>
                {editingPlanting ? "Update planting details" : "Create a new planting batch"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch_number">Batch Number</Label>
                  <Input
                    id="batch_number"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plant_type_id">Plant Type</Label>
                  <Select
                    value={formData.plant_type_id}
                    onValueChange={(value) => setFormData({ ...formData, plant_type_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant type" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="variety">Variety</Label>
                  <Input
                    id="variety"
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_id">Location</Label>
                  <Select
                    value={formData.location_id}
                    onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price (ZMW)</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_planted">Date Planted</Label>
                  <Input
                    id="date_planted"
                    type="date"
                    value={formData.date_planted}
                    onChange={(e) => setFormData({ ...formData, date_planted: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_harvest_date">Expected Harvest Date</Label>
                  <Input
                    id="expected_harvest_date"
                    type="date"
                    value={formData.expected_harvest_date}
                    onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlanting ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Update Dialog */}
        <Dialog open={showBulkUpdateDialog} onOpenChange={setShowBulkUpdateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Update Status</DialogTitle>
              <DialogDescription>
                Update the status for {selectedPlantings.size} selected planting(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={bulkUpdateStatus} onValueChange={(value: any) => setBulkUpdateStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="harvested">Harvested</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBulkUpdateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkStatusUpdate} disabled={isBulkActionLoading}>
                  {isBulkActionLoading ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}