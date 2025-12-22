import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, X, ShoppingCart, CheckCircle2, AlertCircle, Filter, Trash2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useRouter } from "next/router";
import { reservationService } from "@/services/reservationService";
import { plantingService } from "@/services/plantingService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Planting = Database["public"]["Tables"]["plantings"]["Row"];
type PlantType = Database["public"]["Tables"]["plant_types"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];

type PlantingWithDetails = Planting & {
  plant_types: PlantType | null;
  locations: Location | null;
};

type ReservationWithDetails = Reservation & {
  plantings: PlantingWithDetails | null;
};

// Updated type for batch selection with per-batch variety filter
type BatchSelection = {
  id: string;
  planting_id: string;
  quantity: number;
  varietyFilter: string; // NEW: per-batch variety filter
};

// New helper function to calculate days remaining
const calculateDaysRemaining = (planting: PlantingWithDetails): string => {
  if (!planting.date_planted || !planting.plant_types?.growth_duration) {
    return "";
  }
  
  const plantedDate = new Date(planting.date_planted);
  const daysToGrow = planting.plant_types.growth_duration;
  const readyDate = new Date(plantedDate);
  readyDate.setDate(readyDate.getDate() + daysToGrow);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  readyDate.setHours(0, 0, 0, 0);
  
  const diffTime = readyDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    return `Ready in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  } else if (diffDays === 0) {
    return "Ready now";
  } else {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`;
  }
};

const ReservationsPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const permissions = usePermissions("reservations");
  const { planting: plantingIdFilter } = router.query;
  
  const isViewer = profile?.role === "viewer";
  
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [editingReservation, setEditingReservation] = useState<ReservationWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [pendingReservationData, setPendingReservationData] = useState<any>(null);
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
  const [newStatus, setNewStatus] = useState<"pending" | "completed" | "cancelled">("pending");
  const [finalQuantity, setFinalQuantity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // View mode toggle (table vs cards)
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Updated: Batch selections now include varietyFilter
  const [batchSelections, setBatchSelections] = useState<BatchSelection[]>([
    { id: crypto.randomUUID(), planting_id: "", quantity: 0, varietyFilter: "" }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const filteredReservations = useMemo(() => {
    let filtered = reservations;
    
    if (plantingIdFilter) {
      filtered = filtered.filter(r => r.planting_id === plantingIdFilter);
    }
    
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.plantings?.plant_types?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.plantings?.variety?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [reservations, searchQuery, statusFilter, plantingIdFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reservationsData, plantingsData] = await Promise.all([
        reservationService.getReservationsWithDetails(),
        plantingService.getPlantingsWithDetails()
      ]);
      setReservations(reservationsData);
      setPlantings(plantingsData);

    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const getReservedQuantity = (plantingId: string): number => {
    return reservations
      .filter(r => r.planting_id === plantingId && r.status === "pending")
      .reduce((sum, r) => sum + r.quantity_reserved, 0);
  };

  const getAvailableQuantity = (plantingId: string): number => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return 0;

    const totalReserved = getReservedQuantity(plantingId);
    
    const editingQty = (editingReservation && editingReservation.planting_id === plantingId) 
      ? editingReservation.quantity_reserved
      : 0;

    const remainingAfterHarvest = planting.remaining_quantity ?? planting.quantity;
      
    return (remainingAfterHarvest - totalReserved) + editingQty;
  };

  const handleSaveReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const validBatchSelections = batchSelections.filter(bs => bs.planting_id && bs.quantity > 0);
    
    if (validBatchSelections.length === 0) {
      toast({ 
        title: "Validation Error", 
        description: "Please select at least one batch with quantity.", 
        variant: "destructive" 
      });
      return;
    }
    
    for (const selection of validBatchSelections) {
      const available = getAvailableQuantity(selection.planting_id);
      if (selection.quantity > available) {
        const planting = plantings.find(p => p.id === selection.planting_id);
        const batchName = planting ? `Batch #${planting.batch_number}` : "Selected batch";
        toast({ 
          title: "Overbooking Error", 
          description: `${batchName} only has ${formatNumber(available)} seedlings available. You're trying to reserve ${formatNumber(selection.quantity)}.`, 
          variant: "destructive" 
        });
        return;
      }
    }
    
    const reservationData = {
      customer_name: formData.get("customer_name") as string,
      customer_phone: formData.get("customer_phone") as string,
      customer_email: (formData.get("customer_email") as string) || null,
      reserved_date: formData.get("reserved_date") as string,
      collection_date: (formData.get("collection_date") as string) || null,
      payment_status: formData.get("payment_status") as string,
      amount_paid: parseFloat(formData.get("amount_paid") as string) || 0,
      total_amount: parseFloat(formData.get("total_amount") as string) || 0,
      notes: (formData.get("notes") as string) || null,
      batches: validBatchSelections,
    };

    setPendingReservationData(reservationData);
    setIsConfirmationDialogOpen(true);
  };

  const handleConfirmAndSave = async () => {
    if (!pendingReservationData) return;

    const { batches, ...baseData } = pendingReservationData;
    
    const reservationData = {
      planting_id: batches[0].planting_id,
      quantity_reserved: batches[0].quantity,
      ...baseData,
      status: editingReservation?.status || "pending",
      final_quantity: editingReservation?.final_quantity ?? null,
    };

    try {
      if (editingReservation) {
        await reservationService.updateReservation(editingReservation.id, reservationData);
        toast({ title: "Success", description: "Reservation updated." });
      } else {
        // Create reservation for first batch
        await reservationService.createReservation(reservationData);
        
        // Create additional reservations for other batches
        for (let i = 1; i < batches.length; i++) {
          const additionalReservation = {
            ...reservationData,
            planting_id: batches[i].planting_id,
            quantity_reserved: batches[i].quantity,
          };
          await reservationService.createReservation(additionalReservation);
        }
        
        toast({ 
          title: "Success", 
          description: `${batches.length} reservation${batches.length > 1 ? "s" : ""} created.` 
        });
      }
      
      await loadData();
      setIsConfirmationDialogOpen(false);
      setIsDialogOpen(false);
      setPendingReservationData(null);
    } catch (error) {
      console.error("Error saving reservation:", error);
      toast({ title: "Error", description: "Failed to save reservation.", variant: "destructive" });
    }
  };

  const handleOpenStatusDialog = (reservation: ReservationWithDetails, status: "pending" | "completed" | "cancelled") => {
    setSelectedReservation(reservation);
    setNewStatus(status);
    setFinalQuantity(reservation.quantity_reserved);
    setIsStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReservation) return;

    try {
      await reservationService.updateReservationStatus(
        selectedReservation.id,
        newStatus,
        newStatus === "completed" ? finalQuantity : undefined
      );
      
      toast({ 
        title: "Success", 
        description: `Reservation ${newStatus === "completed" ? "completed" : "cancelled"} successfully.${newStatus === "completed" ? ` Stock deducted: ${finalQuantity}` : " Stock returned to batch."}` 
      });
      
      await loadData();
      setIsStatusDialogOpen(false);
      setSelectedReservation(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update reservation status.", variant: "destructive" });
    }
  };

  const handleOpenDialog = (reservation: ReservationWithDetails | null = null) => {
    setEditingReservation(reservation);
    
    if (reservation) {
      setBatchSelections([{
        id: crypto.randomUUID(),
        planting_id: reservation.planting_id,
        quantity: reservation.quantity_reserved,
        varietyFilter: ""
      }]);
    } else {
      setBatchSelections([{ id: crypto.randomUUID(), planting_id: "", quantity: 0, varietyFilter: "" }]);
    }
    
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingReservation(null);
    setBatchSelections([{ id: crypto.randomUUID(), planting_id: "", quantity: 0, varietyFilter: "" }]);
  };

  const handleAddBatchSelection = () => {
    setBatchSelections([
      ...batchSelections,
      { id: crypto.randomUUID(), planting_id: "", quantity: 0, varietyFilter: "" }
    ]);
  };

  const handleRemoveBatchSelection = (id: string) => {
    if (batchSelections.length === 1) {
      toast({ 
        title: "Cannot Remove", 
        description: "At least one batch must be selected.", 
        variant: "destructive" 
      });
      return;
    }
    setBatchSelections(batchSelections.filter(bs => bs.id !== id));
  };

  const handleBatchSelectionChange = (id: string, field: "planting_id" | "quantity" | "varietyFilter", value: string | number) => {
    setBatchSelections(batchSelections.map(bs => 
      bs.id === id ? { ...bs, [field]: value } : bs
    ));
  };

  const activePlantings = plantings.filter(p => p.status === "active");

  const availableVarieties = useMemo(() => {
    const varieties = new Set<string>();
    activePlantings.forEach(p => {
      if (p.variety) varieties.add(p.variety);
    });
    return Array.from(varieties).sort();
  }, [activePlantings]);

  const getFilteredPlantingsForBatch = (batchVarietyFilter: string) => {
    if (!batchVarietyFilter) return activePlantings;
    return activePlantings.filter(p => p.variety === batchVarietyFilter);
  };

  const getPlantingName = (plantingId: string | null) => {
    if (!plantingId) return "Unknown Planting";
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting?.plant_types) return "Unknown Planting";
    return `${planting.plant_types.name}${planting.variety ? ` (${planting.variety})` : ""}`;
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case "pending":
        return { variant: "default" as const, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" };
      case "completed":
        return { variant: "default" as const, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" };
      case "cancelled":
        return { variant: "destructive" as const, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" };
      default:
        return { variant: "outline" as const };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
            Reservations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage customer orders and track reserved seedlings.
            {plantingIdFilter && (
              <span className="block text-sm mt-1">
                Showing reservations for: <strong>{getPlantingName(plantingIdFilter as string)}</strong>
              </span>
            )}
          </p>
        </div>
        {permissions.canCreate && (
          <div className="flex flex-wrap gap-2">
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
            
            {plantingIdFilter && (
              <Button variant="outline" onClick={() => router.push("/reservations")}>
                Show All
              </Button>
            )}
            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Reservation
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {reservations.filter(r => r.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Completed Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {reservations.filter(r => r.status === "completed").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Cancelled Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {reservations.filter(r => r.status === "cancelled").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Reserved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatNumber(reservations.filter(r => r.status === "pending").reduce((sum, r) => sum + (r.quantity_reserved || 0), 0))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">pending seedlings</p>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Confirm Reservation Details</DialogTitle>
            <DialogDescription>
              Please review all details carefully before finalizing the reservation
            </DialogDescription>
          </DialogHeader>
          
          {pendingReservationData && (
            <div className="space-y-6 pt-4">
              <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/30">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Name</Label>
                    <p className="font-semibold text-base">{pendingReservationData.customer_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Phone</Label>
                    <p className="font-semibold text-base">{pendingReservationData.customer_phone}</p>
                  </div>
                  {pendingReservationData.customer_email && (
                    <div className="col-span-2">
                      <Label className="text-gray-600 dark:text-gray-400">Email</Label>
                      <p className="font-semibold text-base">{pendingReservationData.customer_email}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-2 border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-950/30">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-green-900 dark:text-green-100">
                  <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                  Batch Selections ({pendingReservationData.batches.length})
                </h3>
                <div className="space-y-3">
                  {pendingReservationData.batches.map((batch: BatchSelection) => {
                    const planting = plantings.find(p => p.id === batch.planting_id);
                    if (!planting) return null;
                    
                    return (
                      <div key={batch.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-base">
                              Batch #{planting.batch_number}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {planting.plant_types?.name}{planting.variety ? ` (${planting.variety})` : ""}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Location: {planting.locations?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {formatNumber(batch.quantity)}
                            </p>
                            <p className="text-xs text-gray-500">seedlings</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="bg-green-600 text-white rounded-lg p-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total Quantity:</span>
                      <span className="text-2xl font-bold">
                        {formatNumber(pendingReservationData.batches.reduce((sum: number, b: BatchSelection) => sum + b.quantity, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-950/30">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-purple-900 dark:text-purple-100">
                  <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
                  Important Dates
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Reservation Date</Label>
                    <p className="font-semibold text-base">
                      {new Date(pendingReservationData.reserved_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Collection Date</Label>
                    <p className="font-semibold text-base">
                      {pendingReservationData.collection_date 
                        ? new Date(pendingReservationData.collection_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-950/30">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-orange-900 dark:text-orange-100">
                  <span className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">4</span>
                  Payment Details
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Payment Status</Label>
                    <Badge className="mt-1 capitalize">
                      {pendingReservationData.payment_status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Total Amount</Label>
                    <p className="font-semibold text-base">
                      {pendingReservationData.total_amount > 0 
                        ? `K${formatNumber(pendingReservationData.total_amount)}` 
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Amount Paid</Label>
                    <p className="font-semibold text-base">
                      {pendingReservationData.amount_paid > 0 
                        ? `K${formatNumber(pendingReservationData.amount_paid)}` 
                        : "K0"}
                    </p>
                  </div>
                </div>
                
                {pendingReservationData.total_amount > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Balance Due:</span>
                      <span className="text-xl font-bold text-orange-600">
                        K{formatNumber(pendingReservationData.total_amount - pendingReservationData.amount_paid)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {pendingReservationData.notes && (
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/30">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <span className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm">5</span>
                    Additional Notes
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {pendingReservationData.notes}
                  </p>
                </div>
              )}

              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Important:</strong> Once confirmed, this reservation will deduct the selected quantities from available stock. 
                  Please ensure all details are correct before proceeding.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsConfirmationDialogOpen(false);
                setPendingReservationData(null);
              }}
            >
              Go Back & Edit
            </Button>
            <Button 
              onClick={handleConfirmAndSave}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Save Reservation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === "completed" ? "Complete Reservation" : "Cancel Reservation"}
            </DialogTitle>
            <DialogDescription>
              {newStatus === "completed" 
                ? "Enter the final quantity delivered to the customer. Stock will be deducted from the batch." 
                : "This will return the reserved quantity back to the available stock."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {newStatus === "completed" && (
              <div className="space-y-2">
                <Label htmlFor="final_quantity">Final Quantity Delivered *</Label>
                <Input
                  id="final_quantity"
                  type="number"
                  min="1"
                  max={selectedReservation?.quantity_reserved}
                  value={finalQuantity}
                  onChange={(e) => setFinalQuantity(parseInt(e.target.value))}
                  required
                />
                <p className="text-sm text-gray-500">
                  Originally reserved: {selectedReservation?.quantity_reserved}
                </p>
              </div>
            )}
            {newStatus === "cancelled" && selectedReservation && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedReservation.quantity_reserved} seedlings will be returned to available stock.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateStatus}
              className={newStatus === "completed" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {newStatus === "completed" ? "Complete Order" : "Cancel Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReservation ? "Edit Reservation" : "Add New Reservation"}</DialogTitle>
            <DialogDescription>
              {isViewer ? "Viewing reservation details. No changes can be made." : (editingReservation ? "Update the reservation details." : "Create a new customer reservation. Each batch can filter by variety independently.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveReservation} className="space-y-4 pt-4">
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Batch Selections *</Label>
                {!editingReservation && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddBatchSelection}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Batch
                  </Button>
                )}
              </div>

              {batchSelections.map((selection, index) => {
                const batchFilteredPlantings = getFilteredPlantingsForBatch(selection.varietyFilter);
                
                return (
                  <Card key={selection.id} className="p-4 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 border-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold text-blue-900 dark:text-blue-100">
                          Batch #{index + 1}
                        </Label>
                        {!editingReservation && batchSelections.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBatchSelection(selection.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2 bg-white dark:bg-gray-800 p-3 rounded-lg border">
                        <Label htmlFor={`variety_filter_${selection.id}`} className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-blue-600" />
                          Filter by Variety (Optional)
                        </Label>
                        <Select 
                          value={selection.varietyFilter || "all"} 
                          onValueChange={(value) => handleBatchSelectionChange(selection.id, "varietyFilter", value === "all" ? "" : value)}
                          disabled={isViewer}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All varieties" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All varieties</SelectItem>
                            {availableVarieties.map(variety => (
                              <SelectItem key={variety} value={variety}>
                                {variety}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Filter planting options for this batch only
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Select Planting Batch *</Label>
                          <Select 
                            value={selection.planting_id} 
                            onValueChange={(value) => handleBatchSelectionChange(selection.id, "planting_id", value)}
                            disabled={!!editingReservation || isViewer}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a batch" />
                            </SelectTrigger>
                            <SelectContent>
                              {batchFilteredPlantings.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-gray-500">
                                  {selection.varietyFilter 
                                    ? `No batches available for ${selection.varietyFilter}`
                                    : "No active planting batches available"}
                                </div>
                              ) : (
                                batchFilteredPlantings.map(p => {
                                  const daysInfo = calculateDaysRemaining(p);
                                  const availableQty = getAvailableQuantity(p.id);
                                  return (
                                    <SelectItem key={p.id} value={p.id}>
                                      Batch #{p.batch_number} - {p.plant_types?.name}{p.variety ? ` (${p.variety})` : ""} - Available: {formatNumber(availableQty)}{daysInfo ? ` - ${daysInfo}` : ""}
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity *</Label>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              min="1"
                              max={selection.planting_id ? getAvailableQuantity(selection.planting_id) : undefined}
                              value={selection.quantity || ""}
                              onChange={(e) => handleBatchSelectionChange(selection.id, "quantity", parseInt(e.target.value) || 0)}
                              placeholder="Enter quantity"
                              required
                              disabled={isViewer}
                            />
                            {selection.quantity > 0 && (
                              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Formatted:</span>
                                <span className="text-sm font-bold text-blue-900 dark:text-blue-100">{formatNumber(selection.quantity)} seedlings</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {selection.planting_id && (
                        <Alert className={selection.quantity > getAvailableQuantity(selection.planting_id) ? "border-red-500" : ""}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Available: <strong>{formatNumber(getAvailableQuantity(selection.planting_id))}</strong> seedlings
                            {selection.quantity > getAvailableQuantity(selection.planting_id) && (
                              <span className="text-red-600 block mt-1">
                                ⚠️ Quantity exceeds available stock!
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </Card>
                );
              })}

              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  <strong>Total across all batches:</strong> {formatNumber(batchSelections.reduce((sum, bs) => sum + (bs.quantity || 0), 0))} seedlings from {batchSelections.length} batch{batchSelections.length !== 1 ? "es" : ""}
                </AlertDescription>
              </Alert>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input 
                    id="customer_name" 
                    name="customer_name" 
                    defaultValue={editingReservation?.customer_name || ""} 
                    required 
                    disabled={isViewer}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone Number *</Label>
                  <Input 
                    id="customer_phone" 
                    name="customer_phone" 
                    type="tel" 
                    defaultValue={editingReservation?.customer_phone || ""} 
                    required 
                    disabled={isViewer}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="customer_email">Email (Optional)</Label>
                <Input 
                  id="customer_email" 
                  name="customer_email" 
                  type="email" 
                  defaultValue={editingReservation?.customer_email || ""} 
                  disabled={isViewer}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Reservation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reserved_date">Reservation Date *</Label>
                  <Input 
                    id="reserved_date" 
                    name="reserved_date" 
                    type="date" 
                    defaultValue={editingReservation?.reserved_date ? new Date(editingReservation.reserved_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} 
                    required 
                    disabled={isViewer}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collection_date">Collection Date (Optional)</Label>
                  <Input 
                    id="collection_date" 
                    name="collection_date" 
                    type="date" 
                    defaultValue={editingReservation?.collection_date ? new Date(editingReservation.collection_date).toISOString().split("T")[0] : ""} 
                    disabled={isViewer}
                  />
                  <p className="text-xs text-gray-500">When customer wants to collect</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select name="payment_status" defaultValue={editingReservation?.payment_status || "pending"} disabled={isViewer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount</Label>
                  <Input 
                    id="total_amount" 
                    name="total_amount" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingReservation?.total_amount || ""} 
                    disabled={isViewer}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_paid">Amount Paid</Label>
                  <Input 
                    id="amount_paid" 
                    name="amount_paid" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingReservation?.amount_paid || ""} 
                    disabled={isViewer}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                name="notes" 
                rows={3} 
                defaultValue={editingReservation?.notes || ""} 
                placeholder="Additional information..." 
                disabled={isViewer}
              />
            </div>

            {(permissions.canCreate || permissions.canUpdate) ? (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Save Reservation
                </Button>
              </div>
            ) : (
               <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Close
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>All Reservations</CardTitle>
          <CardDescription>Track and manage customer reservations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Input
              placeholder="Search by customer name or plant type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reservations</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table View */}
          {viewMode === "table" ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Planting</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reservation Date</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">
                        No reservations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReservations.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{r.customer_name}</div>
                            <div className="text-sm text-gray-500">{r.customer_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{r.plantings?.plant_types?.name}</div>
                            {r.plantings?.variety && (
                              <div className="text-sm text-gray-500">Variety: {r.plantings.variety}</div>
                            )}
                            <div className="text-xs text-gray-400">Batch: {r.plantings?.batch_number}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{formatNumber(r.quantity_reserved)}</div>
                            {r.status === "completed" && r.final_quantity && r.final_quantity !== r.quantity_reserved && (
                              <div className="text-xs text-green-600">
                                Delivered: {formatNumber(r.final_quantity)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(r.reserved_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {r.collection_date ? (
                            <div className="text-sm">
                              {new Date(r.collection_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.payment_status === "paid" ? "default" : "outline"}>
                            {r.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge {...getStatusBadgeProps(r.status)}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {r.status === "pending" && (
                              <>
                                {permissions.canUpdate && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => handleOpenDialog(r)} 
                                      title="Edit reservation"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-green-600 hover:text-green-700" 
                                      onClick={() => handleOpenStatusDialog(r, "completed")} 
                                      title="Complete reservation"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-red-600 hover:text-red-700" 
                                      onClick={() => handleOpenStatusDialog(r, "cancelled")} 
                                      title="Cancel reservation"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {!permissions.canUpdate && (
                              <span className="text-xs text-gray-400 italic">View only</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReservations.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No reservations found.</p>
                </div>
              ) : (
                filteredReservations.map(r => (
                  <Card key={r.id} className="border-2 hover:border-blue-500 transition-colors">
                    <CardContent className="pt-6 space-y-4">
                      {/* Customer Info */}
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {r.customer_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{r.customer_phone}</p>
                        {r.customer_email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{r.customer_email}</p>
                        )}
                      </div>

                      {/* Planting Info */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Plant Type</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {r.plantings?.plant_types?.name}
                        </p>
                        {r.plantings?.variety && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Variety: {r.plantings.variety}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          Batch: {r.plantings?.batch_number}
                        </p>
                      </div>

                      {/* Quantity - Prominent */}
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {formatNumber(r.quantity_reserved)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          seedlings reserved
                        </div>
                        {r.status === "completed" && r.final_quantity && r.final_quantity !== r.quantity_reserved && (
                          <div className="text-sm text-green-600 mt-1">
                            Delivered: {formatNumber(r.final_quantity)}
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Reserved</p>
                          <p className="font-medium">{new Date(r.reserved_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Collection</p>
                          <p className="font-medium">
                            {r.collection_date 
                              ? new Date(r.collection_date).toLocaleDateString()
                              : "Not set"}
                          </p>
                        </div>
                      </div>

                      {/* Status & Payment */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                          <Badge {...getStatusBadgeProps(r.status)}>
                            {r.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment</p>
                          <Badge variant={r.payment_status === "paid" ? "default" : "outline"}>
                            {r.payment_status}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      {r.status === "pending" && permissions.canUpdate && (
                        <div className="flex gap-2 pt-3 border-t">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleOpenDialog(r)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleOpenStatusDialog(r, "completed")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleOpenStatusDialog(r, "cancelled")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationsPage;
