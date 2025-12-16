import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, CheckCircle2, Archive } from "lucide-react";
import { bomService, BOMWithItems } from "@/services/bomService";
import { inventoryService } from "@/services/inventoryService";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type BOMItem = Database["public"]["Tables"]["bom_items"]["Row"];

export default function BOMPage() {
  const { user } = useAuth();
  const [boms, setBoms] = useState<BOMWithItems[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BOMWithItems | null>(null);
  const [selectedBOMForItems, setSelectedBOMForItems] = useState<BOMWithItems | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    product_name: "",
    version: "1.0",
    status: "draft" as "draft" | "active" | "archived",
    notes: ""
  });

  const [itemFormData, setItemFormData] = useState({
    item_name: "",
    inventory_item_id: "",
    quantity: "",
    unit: "",
    unit_cost: "",
    formula: "",
    notes: ""
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bomsData, inventoryData] = await Promise.all([
        bomService.getBOMHeaders(),
        inventoryService.getInventoryItems()
      ]);
      setBoms(bomsData);
      setInventoryItems(inventoryData);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (selectedBOM) {
        await bomService.updateBOMHeader(selectedBOM.id, formData);
      } else {
        await bomService.createBOMHeader({
          ...formData,
          created_by: user.id
        });
      }
      await loadData();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving BOM:", error);
      alert("Failed to save BOM!");
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBOMForItems) return;

    try {
      const itemData = {
        bom_header_id: selectedBOMForItems.id,
        item_name: itemFormData.item_name,
        inventory_item_id: itemFormData.inventory_item_id || null,
        quantity: parseFloat(itemFormData.quantity),
        unit: itemFormData.unit,
        unit_cost: parseFloat(itemFormData.unit_cost || "0"),
        formula: itemFormData.formula || null,
        notes: itemFormData.notes || null
      };

      await bomService.createBOMItem(itemData);
      await loadData();
      setItemDialogOpen(false);
      resetItemForm();
    } catch (error) {
      console.error("Error adding BOM item:", error);
      alert("Failed to add item!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this BOM?")) return;

    try {
      await bomService.deleteBOMHeader(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting BOM:", error);
      alert("Failed to delete BOM!");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await bomService.deleteBOMItem(itemId);
      await loadData();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item!");
    }
  };

  const handleInventoryItemSelect = (value: string) => {
    const item = inventoryItems.find(i => i.id === value);
    if (item) {
      setItemFormData({
        ...itemFormData,
        inventory_item_id: value,
        item_name: item.name,
        unit: item.unit_of_measure,
        unit_cost: item.unit_price?.toString() || "0"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      product_name: "",
      version: "1.0",
      status: "draft",
      notes: ""
    });
    setSelectedBOM(null);
  };

  const resetItemForm = () => {
    setItemFormData({
      item_name: "",
      inventory_item_id: "",
      quantity: "",
      unit: "",
      unit_cost: "",
      formula: "",
      notes: ""
    });
  };

  const openEditDialog = (bom: BOMWithItems) => {
    setSelectedBOM(bom);
    setFormData({
      name: bom.name,
      product_name: bom.product_name,
      version: bom.version || "1.0",
      status: bom.status as "draft" | "active" | "archived",
      notes: bom.notes || ""
    });
    setDialogOpen(true);
  };

  const openItemDialog = (bom: BOMWithItems) => {
    setSelectedBOMForItems(bom);
    resetItemForm();
    setItemDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      active: "default",
      archived: "outline"
    };
    const icons = {
      draft: <FileText className="w-3 h-3 mr-1" />,
      active: <CheckCircle2 className="w-3 h-3 mr-1" />,
      archived: <Archive className="w-3 h-3 mr-1" />
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTotalCost = (items: BOMItem[]) => {
    return items.reduce((sum, item) => {
      const cost = Number(item.unit_cost || 0) * Number(item.quantity || 0);
      return sum + cost;
    }, 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading BOMs...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bill of Materials</h1>
            <p className="text-muted-foreground">Manage product recipes and material requirements</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                New BOM
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedBOM ? "Edit BOM" : "Create New BOM"}</DialogTitle>
                <DialogDescription>
                  Define the materials and quantities needed for production
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">BOM Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_name">Product Name *</Label>
                    <Input
                      id="product_name"
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "draft" | "active" | "archived") => 
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {selectedBOM ? "Update" : "Create"} BOM
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {boms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No BOMs yet. Create your first one above!</p>
              </CardContent>
            </Card>
          ) : (
            boms.map((bom) => (
              <Card key={bom.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {bom.name}
                        {getStatusBadge(bom.status)}
                      </CardTitle>
                      <CardDescription>
                        Product: {bom.product_name} | Version: {bom.version}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openItemDialog(bom)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(bom)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(bom.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {bom.bom_items && bom.bom_items.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bom.bom_items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.item_name}</TableCell>
                              <TableCell>{Number(item.quantity).toFixed(2)}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>${Number(item.unit_cost || 0).toFixed(2)}</TableCell>
                              <TableCell className="font-semibold">
                                ${(Number(item.unit_cost || 0) * Number(item.quantity)).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-right">
                              Total BOM Cost:
                            </TableCell>
                            <TableCell className="font-bold text-lg">
                              ${getTotalCost(bom.bom_items).toFixed(2)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      {bom.notes && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Notes: </span>
                            {bom.notes}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No items added yet. Click "Add Item" to start building this BOM.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add BOM Item</DialogTitle>
              <DialogDescription>
                Add a material or component to {selectedBOMForItems?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inventory_item">Link to Inventory Item (Optional)</Label>
                <Select
                  value={itemFormData.inventory_item_id}
                  onValueChange={handleInventoryItemSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit_of_measure})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Item Name *</Label>
                  <Input
                    id="item_name"
                    value={itemFormData.item_name}
                    onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.0001"
                    value={itemFormData.quantity}
                    onChange={(e) => setItemFormData({ ...itemFormData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    value={itemFormData.unit}
                    onChange={(e) => setItemFormData({ ...itemFormData, unit: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Unit Cost</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    value={itemFormData.unit_cost}
                    onChange={(e) => setItemFormData({ ...itemFormData, unit_cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formula">Formula/Calculation (Optional)</Label>
                <Input
                  id="formula"
                  value={itemFormData.formula}
                  onChange={(e) => setItemFormData({ ...itemFormData, formula: e.target.value })}
                  placeholder="e.g., quantity * 1.1 for 10% waste factor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_notes">Notes</Label>
                <Textarea
                  id="item_notes"
                  value={itemFormData.notes}
                  onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Item</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}