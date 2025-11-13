import { useState, useEffect } from "react";
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
import { plantTypeService } from "@/services/plantTypeService";
import type { Tables } from "@/integrations/supabase/types";

type Reservation = Tables<"reservations">;
type Planting = Tables<"plantings">;
type PlantType = Tables<"plant_types">;

export default function ReservationsPage() {
  const router = useRouter();
  const { planting: plantingIdFilter } = router.query;
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reservationsData, plantingsData, plantTypesData] = await Promise.all([
        reservationService.getReservations(),
        plantingService.getPlantings(),
        plantTypeService.getPlantTypes()
      ]);
      setReservations(reservationsData);
      setPlantings(plantingsData);
      setPlantTypes(plantTypesData);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableQuantity = (plantingId: string): number => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return 0;
    
    const activeReservations = reservations.filter(r => r.planting_id === plantingId && r.status === "active");
    const reservedQuantity = activeReservations.reduce((sum, r) => sum + r.quantity_reserved, 0);
    
    return (planting.remaining_quantity || planting.quantity) - reservedQuantity;
  };

  const getPlantingDetails = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (!planting) return null;
    const plantType = plantTypes.find(pt => pt.id === planting.plant_type_id);
    return { planting, plantType };
  };

  const handleSaveReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const plantingId = formData.get("plantingId") as string;
    const quantityReserved = parseInt(formData.get("quantityReserved") as string);
    
    const availableQty = getAvailableQuantity(plantingId);
    
    if (!editingReservation && quantityReserved > availableQty) {
      alert(`Only ${availableQty} seedlings available for this batch.`);
      return;
    }
    
    const reservationData = {
      planting_id: plantingId,
      customer_name: formData.get("customerName") as string,
      customer_phone: formData.get("customerPhone") as string,
      customer_email: (formData.get("customerEmail") as string) || null,
      quantity_reserved: quantityReserved,
      reservation_date: formData.get("reservationDate") as string,
      payment_status: (formData.get("paymentStatus") as string) || "pending",
      amount_paid: parseFloat(formData.get("amountPaid") as string) || null,
      total_amount: parseFloat(formData.get("totalAmount") as string) || null,
      notes: (formData.get("notes") as string) || null,
      status: "active"
    };

    try {
      if (editingReservation) {
        await reservationService.updateReservation(editingReservation.id, reservationData);
      } else {
        await reservationService.addReservation(reservationData);
      }
      
      await loadData();
      setIsDialogOpen(false);
      setEditingReservation(null);
      setSelectedPlantingId("");
    } catch (error) {
      console.error("Error saving reservation:", error);
      alert("Failed to save reservation. Please try again.");
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this reservation? The reserved quantity will be returned to available stock.")) return;
    
    try {
      await reservationService.updateReservation(id, { status: "cancelled" });
      await loadData();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      alert("Failed to cancel reservation. Please try again.");
    }
  };

  const handleCompleteReservation = async (id: string) => {
    if (!confirm("Mark this reservation as completed?")) return;
    
    try {
      await reservationService.updateReservation(id, { 
        status: "completed", 
        payment_status: "paid" 
      });
      await loadData();
    } catch (error) {
      console.error("Error completing reservation:", error);
      alert("Failed to complete reservation. Please try again.");
    }
  };

  const handleOpenDialog = (reservation: Reservation | null = null) => {
    setEditingReservation(reservation);
    if (reservation) {
      setSelectedPlantingId(reservation.planting_id);
    }
    setIsDialogOpen(true);
  };

  const activePlantings = plantings.filter(p => p.status === "active");

  const filteredReservations = plantingIdFilter 
    ? reservations.filter(r => r.planting_id === plantingIdFilter)
    : reservations;

  const getPlantingName = (plantingId: string) => {
    const details = getPlantingDetails(plantingId);
    return details ? `${details.plantType?.name} (${details.planting.variety})` : "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-10 h-10 text-blue-600" />
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
            <Button 
              variant="outline" 
              onClick={() => router.push("/reservations")}
            >
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {plantingIdFilter ? "Filtered" : "Active"} Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {filteredReservations.filter(r => r.status === "active").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Reserved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {filteredReservations.filter(r => r.status === "active").reduce((sum, r) => sum + r.quantity_reserved, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">seedlings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {filteredReservations.filter(r => r.status === "active" && r.payment_status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReservation ? "Edit" : "New"} Reservation</DialogTitle>
            <DialogDescription>
              {editingReservation ? "Update the reservation details." : "Create a new customer reservation."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveReservation} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="plantingId">Planting Batch *</Label>
              <Select 
                name="plantingId" 
                required 
                value={selectedPlantingId} 
                onValueChange={setSelectedPlantingId}
                defaultValue={editingReservation?.planting_id}
              >
                <SelectTrigger><SelectValue placeholder="Select a planting batch" /></SelectTrigger>
                <SelectContent>
                  {activePlantings.map(p => {
                    const details = getPlantingDetails(p.id);
                    const available = getAvailableQuantity(p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {details?.plantType?.name} ({p.variety}) - Available: {available}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedPlantingId && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Available: <strong>{getAvailableQuantity(selectedPlantingId)}</strong> seedlings
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input 
                    id="customerName" 
                    name="customerName" 
                    defaultValue={editingReservation?.customer_name} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input 
                    id="customerPhone" 
                    name="customerPhone" 
                    type="tel"
                    defaultValue={editingReservation?.customer_phone} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <Input 
                  id="customerEmail" 
                  name="customerEmail" 
                  type="email"
                  defaultValue={editingReservation?.customer_email || ""} 
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Reservation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantityReserved">Quantity Reserved *</Label>
                  <Input 
                    id="quantityReserved" 
                    name="quantityReserved" 
                    type="number" 
                    min="1"
                    defaultValue={editingReservation?.quantity_reserved} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservationDate">Reservation Date *</Label>
                  <Input 
                    id="reservationDate" 
                    name="reservationDate" 
                    type="date" 
                    defaultValue={editingReservation?.reservation_date || new Date().toISOString().split("T")[0]} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status *</Label>
                  <Select name="paymentStatus" defaultValue={editingReservation?.payment_status || "pending"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input 
                    id="totalAmount" 
                    name="totalAmount" 
                    type="number" 
                    step="0.01"
                    defaultValue={editingReservation?.total_amount || ""} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Amount Paid</Label>
                  <Input 
                    id="amountPaid" 
                    name="amountPaid" 
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
                placeholder="Additional information about this reservation..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false);
                setSelectedPlantingId("");
              }}>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plant Type</TableHead>
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
                    {plantingIdFilter ? "No reservations for this planting." : "No reservations yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map(r => {
                  const details = getPlantingDetails(r.planting_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.customer_name}</div>
                        <div className="text-xs text-gray-500">{r.customer_phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{details?.plantType?.name || "N/A"}</div>
                        <div className="text-xs text-gray-500">{details?.planting.variety}</div>
                      </TableCell>
                      <TableCell>{r.quantity_reserved}</TableCell>
                      <TableCell>{new Date(r.reservation_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={r.payment_status === "paid" ? "default" : r.payment_status === "partial" ? "secondary" : "outline"}
                          className={
                            r.payment_status === "paid" ? "bg-green-100 text-green-800" : 
                            r.payment_status === "partial" ? "bg-yellow-100 text-yellow-800" : 
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {r.payment_status}
                        </Badge>
                        {r.total_amount && (
                          <div className="text-xs text-gray-500 mt-1">
                            {r.amount_paid || 0} / {r.total_amount}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={r.status === "active" ? "default" : r.status === "completed" ? "secondary" : "outline"}
                          className={
                            r.status === "active" ? "bg-blue-100 text-blue-800" : 
                            r.status === "completed" ? "bg-green-100 text-green-800" : 
                            "bg-red-100 text-red-800"
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
                                className="text-green-600"
                                onClick={() => handleCompleteReservation(r.id)}
                                title="Complete"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600"
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
