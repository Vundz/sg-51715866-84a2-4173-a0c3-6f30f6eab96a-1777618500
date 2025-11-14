
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
import { Plus, Edit, X, ShoppingCart, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/router";
import { reservationService } from "@/services/reservationService";
import { plantingService } from "@/services/plantingService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";

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

const ReservationsPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { planting: plantingIdFilter } = router.query;
  
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [plantings, setPlantings] = useState<PlantingWithDetails[]>([]);
  const [editingReservation, setEditingReservation] = useState<ReservationWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const filteredReservations = useMemo(() => {
    let filtered = reservations;
    if (plantingIdFilter) {
      filtered = filtered.filter(r => r.planting_id === plantingIdFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.plantings?.plant_types?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [reservations, searchQuery, plantingIdFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reservationsData, plantingsData] = await Promise.all([
        reservationService.getReservationsWithDetails(),
        plantingService.getPlantingsWithDetails()
      ]);
      setReservations(reservationsData);
      setPlantings(plantingsData);
      
      if (plantingIdFilter && typeof plantingIdFilter === "string") {
        setSelectedPlantingId(plantingIdFilter);
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const getReservedQuantity = (plantingId: string): number => {
    return reservations
      .filter(r => r.planting_id === plantingId && r.status === "active")
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
    
    const reservationData = {
      planting_id: formData.get("planting_id") as string,
      customer_name: formData.get("customer_name") as string,
      customer_phone: formData.get("customer_phone") as string,
      customer_email: (formData.get("customer_email") as string) || null,
      quantity_reserved: parseInt(formData.get("quantity_reserved") as string, 10),
      reserved_date: formData.get("reserved_date") as string,
      payment_status: formData.get("payment_status") as string,
      amount_paid: parseFloat(formData.get("amount_paid") as string) || 0,
      total_amount: parseFloat(formData.get("total_amount") as string) || 0,
      notes: (formData.get("notes") as string) || null,
      status: editingReservation?.status || "active",
    };

    try {
      if (editingReservation) {
        await reservationService.updateReservation(editingReservation.id, reservationData);
        toast({ title: "Success", description: "Reservation updated." });
      } else {
        await reservationService.createReservation(reservationData);
        toast({ title: "Success", description: "Reservation created." });
      }
      
      await loadData();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving reservation:", error);
      toast({ title: "Error", description: "Failed to save reservation.", variant: "destructive" });
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this reservation? The reserved quantity will be returned to available stock.")) return;
    try {
      await reservationService.updateReservation(id, { status: "cancelled" });
      await loadData();
      toast({ title: "Reservation Cancelled" });
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      toast({ title: "Error", description: "Failed to cancel reservation.", variant: "destructive" });
    }
  };

  const handleCompleteReservation = async (id: string) => {
    if (!confirm("Mark this reservation as completed?")) return;
    try {
      await reservationService.updateReservation(id, { status: "completed" });
      await loadData();
      toast({ title: "Reservation Completed" });
    } catch (error) {
      console.error("Error completing reservation:", error);
      toast({ title: "Error", description: "Failed to complete reservation.", variant: "destructive" });
    }
  };

  const handleOpenDialog = (reservation: ReservationWithDetails | null = null) => {
    setEditingReservation(reservation);
    setSelectedPlantingId(reservation?.planting_id || (plantingIdFilter as string) || "");
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingReservation(null);
    setSelectedPlantingId("");
  };

  const activePlantings = plantings.filter(p => p.status === "active");

  const getPlantingName = (plantingId: string | null) => {
    if (!plantingId) return "Unknown Planting";
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting?.plant_types) return "Unknown Planting";
    return `${planting.plant_types.name}${planting.variety ? ` (${planting.variety})` : ""}`;
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
        <div className="flex gap-2">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {plantingIdFilter ? "Filtered" : "Active"} Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {filteredReservations.filter(r => r.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Reserved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatNumber(filteredReservations.filter(r => r.status === "active").reduce((sum, r) => sum + (r.quantity_reserved || 0), 0))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">seedlings</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {filteredReservations.filter(r => r.status === "active" && r.payment_status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReservation ? "Edit Reservation" : "Add New Reservation"}</DialogTitle>
            <DialogDescription>
              {editingReservation ? "Update the reservation details." : "Create a new customer reservation."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveReservation} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="planting_id">Planting Batch *</Label>
              <Select name="planting_id" required value={selectedPlantingId} onValueChange={setSelectedPlantingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a planting batch" />
                </SelectTrigger>
                <SelectContent>
                  {activePlantings.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.plant_types?.name} ({p.plant_types?.variety}) - Available: {formatNumber(getAvailableQuantity(p.id))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlantingId && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Available: <strong>{formatNumber(getAvailableQuantity(selectedPlantingId))}</strong> seedlings
                  </AlertDescription>
                </Alert>
              )}
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
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Reservation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity_reserved">Quantity Reserved *</Label>
                  <Input 
                    id="quantity_reserved" 
                    name="quantity_reserved" 
                    type="number" 
                    min="1" 
                    max={selectedPlantingId ? getAvailableQuantity(selectedPlantingId) : undefined} 
                    defaultValue={editingReservation?.quantity_reserved || ""} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reserved_date">Reservation Date *</Label>
                  <Input 
                    id="reserved_date" 
                    name="reserved_date" 
                    type="date" 
                    defaultValue={editingReservation?.reserved_date ? new Date(editingReservation.reserved_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select name="payment_status" defaultValue={editingReservation?.payment_status || "pending"}>
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
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Reservation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>All Reservations</CardTitle>
          <CardDescription>Track and manage customer reservations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by customer name or plant type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Planting</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
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
                        {r.plantings?.plant_types?.name} ({r.plantings?.batch_number})
                      </TableCell>
                      <TableCell>{formatNumber(r.quantity_reserved)}</TableCell>
                      <TableCell>{new Date(r.reserved_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={r.payment_status === "paid" ? "default" : "outline"}>
                          {r.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={r.status === "active" ? "default" : r.status === "completed" ? "secondary" : "destructive"}
                          className={
                            r.status === "active" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" :
                            r.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" :
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {r.status === "active" && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleOpenDialog(r)} 
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-green-600 hover:text-green-700" 
                                onClick={() => handleCompleteReservation(r.id)} 
                                title="Complete"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600 hover:text-red-700" 
                                onClick={() => handleCancelReservation(r.id)} 
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationsPage;
