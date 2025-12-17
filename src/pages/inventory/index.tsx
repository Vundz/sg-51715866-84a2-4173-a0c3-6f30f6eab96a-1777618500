import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Package, AlertCircle, TrendingUp, TrendingDown, DollarSign, History, ShoppingCart, Settings } from "lucide-react";
import { inventoryService, InventoryItemWithLowStock, StockTransactionWithItem } from "@/services/inventoryService";
import { inventorySettingsService } from "@/services/inventorySettingsService";
import type { InventoryCategory, InventoryUnit } from "@/services/inventorySettingsService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { formatNumber } from "@/lib/format";
import Link from "next/link";

const TRANSACTION_TYPES = [
  { value: "purchase", label: "Purchase", icon: ShoppingCart, color: "text-green-600" },
  { value: "usage", label: "Usage", icon: TrendingDown, color: "text-blue-600" },
  { value: "adjustment", label: "Adjustment", icon: TrendingUp, color: "text-orange-600" },
  { value: "waste", label: "Waste", icon: AlertCircle, color: "text-red-600" },
];

export default function InventoryPage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions("inventory");
  const [items, setItems] = useState<InventoryItemWithLowStock[]>([]);
  const [transactions, setTransactions] = useState<StockTransactionWithItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemWithLowStock | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithLowStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("items");
  const { toast } = useToast();

  const isViewer = profile?.role === "viewer";

  // Add state for transaction form
  const [transactionFormData, setTransactionFormData] = useState({
    item_id: "",
    transaction_type: "purchase" as "purchase" | "usage" | "adjustment" | "waste",
    quantity: "",
    unit_price: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
    adjustment_direction: "add" as "add" | "subtract", // For adjustment type
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, transactionsData, categoriesData, unitsData] = await Promise.all([
        inventoryService.getInventoryItems(),
        inventoryService.getStockTransactions(),
        inventorySettingsService.getCategories(),
        inventorySettingsService.getUnits(),
      ]);
      setItems(itemsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
      setUnits(unitsData);
    } catch (error) {
      console.error("Error loading inventory data:", error);
      toast({ title: "Error", description: "Failed to load inventory data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => 
    items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }), [items, searchQuery, categoryFilter]);

  const lowStockItems = useMemo(() => items.filter(item => item.isLowStock), [items]);

  const totalInventoryValue = useMemo(() => 
    items.reduce((sum, item) => sum + (Number(item.current_stock) * Number(item.unit_price)), 0),
    [items]
  );

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const itemData = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      unit_of_measure: formData.get("unit_of_measure") as string,
      unit_price: parseFloat(formData.get("unit_price") as string),
      minimum_stock: parseFloat(formData.get("minimum_stock") as string) || 0,
      description: formData.get("description") as string || null,
    };

    try {
      if (editingItem) {
        await inventoryService.updateInventoryItem(editingItem.id, itemData);
        toast({ title: "Success", description: "Item updated successfully." });
      } else {
        await inventoryService.createInventoryItem(itemData);
        toast({ title: "Success", description: "Item created successfully." });
      }
      
      await loadData();
      handleCloseItemDialog();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({ title: "Error", description: "Failed to save item.", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all related transactions.`)) return;
    
    try {
      await inventoryService.deleteInventoryItem(id);
      await loadData();
      toast({ title: "Success", description: "Item deleted successfully." });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    }
  };

  const handleSaveTransaction = async () => {
    console.log("Form submitted", transactionFormData);
    
    // Validation: Ensure item is selected
    if (!transactionFormData.item_id) {
      toast({ 
        title: "Error", 
        description: "Please select an inventory item.", 
        variant: "destructive" 
      });
      return;
    }
    
    const quantity = parseFloat(transactionFormData.quantity);
    const unitPrice = transactionFormData.unit_price ? parseFloat(transactionFormData.unit_price) : undefined;
    
    if (isNaN(quantity) || quantity <= 0) {
      toast({ 
        title: "Error", 
        description: "Please enter a valid quantity.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Determine quantity adjustment based on transaction type and direction
    let adjustedQuantity = quantity;
    
    if (transactionFormData.transaction_type === "usage" || transactionFormData.transaction_type === "waste") {
      // Usage and waste always reduce stock
      adjustedQuantity = -Math.abs(quantity);
    } else if (transactionFormData.transaction_type === "adjustment") {
      // Adjustment can add or subtract based on direction
      adjustedQuantity = transactionFormData.adjustment_direction === "subtract" 
        ? -Math.abs(quantity) 
        : Math.abs(quantity);
    } else {
      // Purchase always adds stock
      adjustedQuantity = Math.abs(quantity);
    }
    
    const transactionData = {
      item_id: transactionFormData.item_id,
      transaction_type: transactionFormData.transaction_type,
      quantity: adjustedQuantity,
      unit_price: unitPrice,
      total_cost: unitPrice ? unitPrice * Math.abs(quantity) : undefined,
      notes: transactionFormData.notes || undefined,
      transaction_date: transactionFormData.transaction_date,
    };

    try {
      console.log("Saving transaction:", transactionData);
      
      await inventoryService.createStockTransaction(transactionData);
      
      toast({ 
        title: "Success", 
        description: `Stock ${transactionFormData.transaction_type} recorded successfully.` 
      });
      
      await loadData();
      handleCloseTransactionDialog();
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({ title: "Error", description: "Failed to save transaction.", variant: "destructive" });
    }
  };

  const handleOpenItemDialog = (item: InventoryItemWithLowStock | null = null) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleCloseItemDialog = () => {
    setIsItemDialogOpen(false);
    setEditingItem(null);
  };

  const handleOpenTransactionDialog = (item: InventoryItemWithLowStock | null = null) => {
    setSelectedItem(item);
    setTransactionFormData({
      item_id: item?.id || "",
      transaction_type: "purchase",
      quantity: "",
      unit_price: "",
      transaction_date: new Date().toISOString().split("T")[0],
      notes: "",
      adjustment_direction: "add",
    });
    setIsTransactionDialogOpen(true);
  };

  const handleCloseTransactionDialog = () => {
    setIsTransactionDialogOpen(false);
    setSelectedItem(null);
    setTransactionFormData({
      item_id: "",
      transaction_type: "purchase",
      quantity: "",
      unit_price: "",
      transaction_date: new Date().toISOString().split("T")[0],
      notes: "",
      adjustment_direction: "add",
    });
  };

  const getCategoryBadgeColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    
    return `text-white dark:text-white`;
  };

  const getTransactionIcon = (type: string) => {
    const config = TRANSACTION_TYPES.find(t => t.value === type);
    return config ? config.icon : History;
  };

  const getTransactionColor = (type: string) => {
    const config = TRANSACTION_TYPES.find(t => t.value === type);
    return config ? config.color : "text-gray-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Package className="w-10 h-10 text-blue-600" />
            Inventory Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track chemicals, fertilizers, and supplies
          </p>
        </div>
        
        <div className="flex gap-2">
          {permissions.canCreate && (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleOpenTransactionDialog()}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                Record Transaction
              </Button>
              <Button onClick={() => handleOpenItemDialog()} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </>
          )}
          <Link href="/settings/inventory">
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{items.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              K{formatNumber(totalInventoryValue)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {transactions.filter(t => {
                const txDate = new Date(t.transaction_date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return txDate >= weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{lowStockItems.length} item(s)</strong> are running low on stock. 
            Consider restocking: {lowStockItems.slice(0, 3).map(i => i.name).join(", ")}
            {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        {/* Inventory Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Items</CardTitle>
                  <CardDescription>Manage your inventory items and stock levels</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input 
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm mt-2"
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Unit Price (ZMW)</TableHead>
                    <TableHead className="text-right">Total Value (ZMW)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                        No items found. Add your first inventory item to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(item => {
                      const category = categories.find(c => c.name === item.category);
                      return (
                        <TableRow key={item.id} className={item.isLowStock ? "bg-red-50 dark:bg-red-950/20" : ""}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{item.name}</span>
                              {item.description && (
                                <span className="text-xs text-gray-500">{item.description}</span>
                              )}
                              {item.isLowStock && (
                                <Badge variant="destructive" className="mt-1 w-fit text-xs">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={getCategoryBadgeColor(item.category)}
                              style={{ backgroundColor: category?.color }}
                            >
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className={`font-semibold ${item.isLowStock ? "text-red-600" : "text-blue-600"}`}>
                                {formatNumber(Number(item.current_stock))}
                              </span>
                              <span className="text-xs text-gray-500">{item.unit_of_measure}</span>
                              {item.minimum_stock > 0 && (
                                <span className="text-xs text-gray-400">
                                  Min: {formatNumber(Number(item.minimum_stock))}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            K{formatNumber(Number(item.unit_price))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-600">
                            K{formatNumber(Number(item.current_stock) * Number(item.unit_price))}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenTransactionDialog(item)}
                                title="Record transaction"
                                className="text-blue-600"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              {permissions.canUpdate && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenItemDialog(item)}
                                  title="Edit item"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {permissions.canDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  title="Delete item"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Complete log of all stock movements</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost (ZMW)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map(tx => {
                      const Icon = getTransactionIcon(tx.transaction_type);
                      const colorClass = getTransactionColor(tx.transaction_type);
                      
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${colorClass}`} />
                              <span className="capitalize">{tx.transaction_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{tx.inventory_items?.name}</span>
                              <span className="text-xs text-gray-500">
                                {tx.inventory_items?.unit_of_measure}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${Number(tx.quantity) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {Number(tx.quantity) >= 0 ? "+" : ""}{formatNumber(Number(tx.quantity))}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {tx.total_cost ? `K${formatNumber(Number(tx.total_cost))}` : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {tx.notes || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update item details" : "Add a new item to your inventory"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingItem?.name}
                  placeholder="e.g., Mancozeb 80% WP"
                  required
                  disabled={isViewer}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select name="category" defaultValue={editingItem?.category} required disabled={isViewer || categories.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={categories.length === 0 ? "No categories available" : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs text-red-600">
                    Please add categories in <Link href="/settings/inventory" className="underline">Inventory Settings</Link> first
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
                <Select name="unit_of_measure" defaultValue={editingItem?.unit_of_measure} required disabled={isViewer || units.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={units.length === 0 ? "No units available" : "Select unit"} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <SelectItem key={unit.id} value={unit.abbreviation}>
                        {unit.name} ({unit.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {units.length === 0 && (
                  <p className="text-xs text-red-600">
                    Please add units in <Link href="/settings/inventory" className="underline">Inventory Settings</Link> first
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (ZMW) *</Label>
                <Input
                  id="unit_price"
                  name="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingItem?.unit_price}
                  placeholder="0.00"
                  required
                  disabled={isViewer}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Minimum Stock Level (Alert Threshold)</Label>
              <Input
                id="minimum_stock"
                name="minimum_stock"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editingItem?.minimum_stock || 0}
                placeholder="0"
                disabled={isViewer}
              />
              <p className="text-xs text-gray-500">
                You'll be alerted when stock falls below this level
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingItem?.description || ""}
                placeholder="Additional details about this item..."
                rows={3}
                disabled={isViewer}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseItemDialog}>
                Cancel
              </Button>
              {!isViewer && (
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={categories.length === 0 || units.length === 0}>
                  {editingItem ? "Update Item" : "Create Item"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Stock Transaction</DialogTitle>
            <DialogDescription>
              Add, use, adjust, or record waste of inventory items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item_id">Select Item *</Label>
              <Select 
                value={transactionFormData.item_id}
                onValueChange={(value) => setTransactionFormData(prev => ({ ...prev, item_id: value }))}
                disabled={isViewer || !!selectedItem}
              >
                <SelectTrigger id="item_id">
                  <SelectValue placeholder="Choose an item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Current: {formatNumber(Number(item.current_stock))} {item.unit_of_measure})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <Select 
                value={transactionFormData.transaction_type}
                onValueChange={(value) => setTransactionFormData(prev => ({ ...prev, transaction_type: value as any }))}
                disabled={isViewer}
              >
                <SelectTrigger id="transaction_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {transactionFormData.transaction_type === "adjustment" && (
                <p className="text-xs text-muted-foreground">
                  Use adjustments to correct stock errors or account for discrepancies
                </p>
              )}
            </div>

            {/* Show adjustment direction selector only for adjustment type */}
            {transactionFormData.transaction_type === "adjustment" && (
              <div className="space-y-2">
                <Label>Adjustment Direction *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={transactionFormData.adjustment_direction === "add" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTransactionFormData(prev => ({ ...prev, adjustment_direction: "add" }))}
                    disabled={isViewer}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Add Stock
                  </Button>
                  <Button
                    type="button"
                    variant={transactionFormData.adjustment_direction === "subtract" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTransactionFormData(prev => ({ ...prev, adjustment_direction: "subtract" }))}
                    disabled={isViewer}
                  >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Subtract Stock
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={transactionFormData.quantity}
                  onChange={(e) => setTransactionFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  disabled={isViewer}
                  required
                />
                <p className="text-xs text-gray-500">
                  {transactionFormData.transaction_type === "adjustment" 
                    ? `Will ${transactionFormData.adjustment_direction === "add" ? "increase" : "decrease"} stock by this amount`
                    : transactionFormData.transaction_type === "purchase"
                    ? "Amount to add to stock"
                    : "Amount to reduce from stock"
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (ZMW) - Optional</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionFormData.unit_price}
                  onChange={(e) => setTransactionFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                  disabled={isViewer}
                />
                <p className="text-xs text-gray-500">
                  For purchases/adjustments only
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Transaction Date *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={transactionFormData.transaction_date}
                onChange={(e) => setTransactionFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                disabled={isViewer}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this transaction..."
                rows={3}
                value={transactionFormData.notes}
                onChange={(e) => setTransactionFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={isViewer}
              />
              {transactionFormData.transaction_type === "adjustment" && (
                <p className="text-xs text-amber-600">
                  💡 Tip: Explain the reason for this adjustment in the notes
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseTransactionDialog}>
                Cancel
              </Button>
              {!isViewer && (
                <Button 
                  onClick={handleSaveTransaction}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Record Transaction
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}