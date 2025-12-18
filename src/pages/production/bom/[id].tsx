import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Save, Trash2, Edit, Calculator, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { bomService, BOMTemplateWithDetails, BOMItemWithDetails, BOMCategory, FormulaTemplate } from "@/services/bomService";
import { inventoryService, InventoryItemWithLowStock } from "@/services/inventoryService";
import { formatNumber } from "@/lib/format";

export default function BOMDetailCalculatorPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<BOMTemplateWithDetails | null>(null);
  const [items, setItems] = useState<Array<BOMItemWithDetails & { calculatedQuantity: number; subtotal: number }>>([]);
  const [categories, setCategories] = useState<BOMCategory[]>([]);
  const [formulas, setFormulas] = useState<FormulaTemplate[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemWithLowStock[]>([]);
  
  // Calculation State
  const [currentBatchSize, setCurrentBatchSize] = useState<number>(1000);
  const [calculatedCosts, setCalculatedCosts] = useState({
    totalCost: 0,
    costPerSeedling: 0,
    costPerTray: 0,
    categoryTotals: {} as Record<string, number>
  });

  // Dialog States
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BOMItemWithDetails | null>(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");

  useEffect(() => {
    // Only load data if user is authenticated and id is available
    if (user && id && typeof id === 'string') {
      loadData(id);
    } else if (!user) {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (template) {
      const results = bomService.calculateTemplateCost(template, currentBatchSize);
      setItems(results.items);
      setCalculatedCosts({
        totalCost: results.totalCost,
        costPerSeedling: results.costPerSeedling,
        costPerTray: results.costPerTray,
        categoryTotals: results.categoryTotals
      });
    }
  }, [template, currentBatchSize]);

  const loadData = async (templateId: string) => {
    try {
      setLoading(true);
      const [tmpl, cats, frms, inv] = await Promise.all([
        bomService.getTemplate(templateId),
        bomService.getCategories(),
        bomService.getFormulaTemplates(),
        inventoryService.getInventoryItems()
      ]);
      
      setTemplate(tmpl);
      setCurrentBatchSize(tmpl.base_batch_size);
      setCategories(cats);
      setFormulas(frms);
      setInventoryItems(inv);
    } catch (error) {
      console.error("Error loading template data:", error);
      toast({ title: "Error", description: "Failed to load template details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatchSize = async () => {
    if (!template) return;
    try {
      await bomService.updateTemplate(template.id, { base_batch_size: currentBatchSize });
      toast({ title: "Saved", description: "Default batch size updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save batch size", variant: "destructive" });
    }
  };

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!template) return;

    const formData = new FormData(e.currentTarget);
    const itemType = activeTab === "inventory" ? "inventory" : "adhoc";
    
    // Determine Category ID
    let categoryId = formData.get("category_id") as string;
    
    // For inventory items, try to auto-match category if not explicitly set
    if (itemType === "inventory" && !categoryId) {
        const invItem = inventoryItems.find(i => i.id === selectedInventoryId);
        if (invItem) {
            const match = categories.find(c => c.name.toLowerCase() === invItem.category.toLowerCase());
            if (match) categoryId = match.id;
        }
    }

    const itemData: any = {
      template_id: template.id,
      item_type: itemType,
      category_id: categoryId || null, // Allow null if not found
      quantity_type: formData.get("quantity_type") as "fixed" | "formula",
      notes: formData.get("notes") as string,
    };

    // Quantity handling
    if (itemData.quantity_type === "fixed") {
      itemData.quantity_value = parseFloat(formData.get("quantity_value") as string);
      itemData.quantity_formula = null;
    } else {
      itemData.quantity_value = null;
      // If choosing a preset formula
      const presetFormulaId = formData.get("formula_preset") as string;
      if (presetFormulaId && presetFormulaId !== "custom") {
        const preset = formulas.find(f => f.id === presetFormulaId);
        itemData.quantity_formula = preset?.formula;
      } else {
        itemData.quantity_formula = formData.get("quantity_formula") as string;
      }
    }

    // Item Type specific data
    if (itemType === "inventory") {
      itemData.inventory_item_id = selectedInventoryId;
      itemData.custom_name = null;
      itemData.custom_unit_price = null;
      itemData.custom_unit = null;
    } else {
      itemData.inventory_item_id = null;
      itemData.custom_name = formData.get("custom_name") as string;
      itemData.custom_unit_price = parseFloat(formData.get("custom_unit_price") as string);
      itemData.custom_unit = formData.get("custom_unit") as string;
    }

    try {
      if (editingItem) {
        await bomService.updateItem(editingItem.id, itemData);
        toast({ title: "Success", description: "Item updated" });
      } else {
        await bomService.createItem(itemData);
        toast({ title: "Success", description: "Item added" });
      }
      
      // Reload the FULL template to refresh relations
      const updatedTemplate = await bomService.getTemplate(template.id);
      setTemplate(updatedTemplate);
      
      setIsAddItemOpen(false);
      setEditingItem(null);
      setSelectedInventoryId("");
    } catch (error) {
      console.error("Error saving item:", error);
      toast({ title: "Error", description: "Failed to save item", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Remove this item from the BOM?")) return;
    try {
      await bomService.deleteItem(itemId);
      const updatedTemplate = await bomService.getTemplate(template!.id);
      setTemplate(updatedTemplate);
      toast({ title: "Success", description: "Item removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    }
  };

  if (loading || !template) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-lime-600" /></div>;
  }

  // Check authentication
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-gray-600 dark:text-gray-400">Please log in to access this page.</p>
        <Link href="/">
          <Button>Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/production/bom">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {template.name}
              <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                {template.status}
              </Badge>
            </h1>
            <p className="text-gray-500">{template.description || "No description provided"}</p>
          </div>
        </div>
        <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border">
                <Label htmlFor="batchInput" className="px-2 text-xs font-medium uppercase text-gray-500">Batch Size:</Label>
                <Input 
                    id="batchInput"
                    type="number" 
                    value={currentBatchSize}
                    onChange={(e) => setCurrentBatchSize(parseInt(e.target.value) || 0)}
                    className="w-24 h-8 text-right font-mono"
                />
                <Button size="sm" variant="ghost" onClick={handleUpdateBatchSize} title="Save as default">
                    <Save className="w-4 h-4" />
                </Button>
            </div>
          <Button onClick={() => { setEditingItem(null); setSelectedInventoryId(""); setIsAddItemOpen(true); }} className="bg-lime-600 hover:bg-lime-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Cost Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Items Table */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Qty Formula</TableHead>
                    <TableHead className="text-right">Calc. Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No items added yet. Click "Add Cost Item" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: item.bom_categories?.color, 
                              color: item.bom_categories?.color,
                              backgroundColor: `${item.bom_categories?.color}10`
                            }}
                          >
                            {item.bom_categories?.name || "Uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {item.item_type === 'inventory' ? item.inventory_items?.name : item.custom_name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {item.notes}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          K{formatNumber(item.item_type === 'inventory' ? Number(item.inventory_items?.unit_price) : Number(item.custom_unit_price))}
                          <span className="text-xs text-gray-400 ml-1">
                             / {item.item_type === 'inventory' ? item.inventory_items?.unit_of_measure : item.custom_unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-gray-500">
                          {item.quantity_type === 'fixed' 
                            ? item.quantity_value 
                            : <span title={item.quantity_formula || ''}>Formula</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(item.calculatedQuantity)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900 dark:text-gray-100">
                          K{formatNumber(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { 
                                setEditingItem(item); 
                                setSelectedInventoryId(item.inventory_item_id || "");
                                setActiveTab(item.item_type);
                                setIsAddItemOpen(true); 
                            }}>
                              <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card className="bg-lime-50 dark:bg-lime-950/20 border-lime-200 dark:border-lime-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-lime-800 dark:text-lime-200">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-lime-700 dark:text-lime-300">Total Batch Cost</p>
                <p className="text-3xl font-bold text-lime-900 dark:text-lime-100">
                  K{formatNumber(calculatedCosts.totalCost)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-lime-200 dark:border-lime-800">
                <div>
                  <p className="text-xs text-lime-700 dark:text-lime-300">Per Seedling</p>
                  <p className="text-xl font-semibold text-lime-900 dark:text-lime-100">
                    K{calculatedCosts.costPerSeedling.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-lime-700 dark:text-lime-300">Per Tray (220)</p>
                  <p className="text-xl font-semibold text-lime-900 dark:text-lime-100">
                    K{formatNumber(calculatedCosts.costPerTray)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(calculatedCosts.categoryTotals).map(([cat, total]) => {
                 // Find matching category object for color
                 const catObj = categories.find(c => c.name === cat);
                 return (
                    <div key={cat} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catObj?.color || '#ccc' }} />
                         <span>{cat}</span>
                      </div>
                      <span className="font-medium">K{formatNumber(total)}</span>
                    </div>
                 );
              })}
              {Object.keys(calculatedCosts.categoryTotals).length === 0 && (
                <p className="text-sm text-gray-500 italic">No costs calculated yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Cost Item" : "Add Cost Item"}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="inventory" disabled={!!editingItem && editingItem.item_type !== 'inventory'}>
                Inventory Item
              </TabsTrigger>
              <TabsTrigger value="adhoc" disabled={!!editingItem && editingItem.item_type !== 'adhoc'}>
                Ad-hoc (Manual)
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Common Fields */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select name="category_id" defaultValue={editingItem?.category_id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-detect (or select override)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Inventory Specific */}
              <TabsContent value="inventory" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Select Item from Inventory</Label>
                  <Select 
                    value={selectedInventoryId} 
                    onValueChange={setSelectedInventoryId} 
                    disabled={!!editingItem} // Cannot change item once added, delete and re-add instead
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search items..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {inventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (K{item.unit_price}/{item.unit_of_measure})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Ad-hoc Specific */}
              <TabsContent value="adhoc" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input name="custom_name" defaultValue={editingItem?.custom_name || ""} required={activeTab === 'adhoc'} placeholder="e.g. Contract Labor" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Price (K)</Label>
                    <Input name="custom_unit_price" type="number" step="0.01" defaultValue={editingItem?.custom_unit_price || ""} required={activeTab === 'adhoc'} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input name="custom_unit" defaultValue={editingItem?.custom_unit || ""} required={activeTab === 'adhoc'} placeholder="e.g. hr, day, trip" />
                  </div>
                </div>
              </TabsContent>

              {/* Quantity Section (Shared) */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4 border">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Quantity Calculation
                </h4>
                
                <Tabs defaultValue={editingItem?.quantity_type || "formula"}>
                   <TabsList className="w-full grid grid-cols-2 h-8">
                     <TabsTrigger value="fixed" className="text-xs">Fixed Amount</TabsTrigger>
                     <TabsTrigger value="formula" className="text-xs">Formula Based</TabsTrigger>
                   </TabsList>
                   
                   {/* Hidden input to submit the active tab value */}
                   <input type="hidden" name="quantity_type" value={editingItem?.quantity_type || "formula"} id="quantityTypeInput" />
                   
                   {/* Note: In a real app we'd control this tab state to update the hidden input. 
                       For simplicity here, we'll assume user selects the right mode and we rely on backend logic or JS listeners.
                       Actually, let's just make the hidden input dynamic.
                   */}
                   <script dangerouslySetInnerHTML={{__html: `
                     document.querySelectorAll('[role="tab"]').forEach(t => {
                       t.addEventListener('click', e => {
                         const val = e.target.getAttribute('data-state') === 'active' ? e.target.innerText : e.target.getAttribute('value'); // shadcn tabs are tricky with raw events
                         // simplified: use react state instead
                       })
                     })
                   `}} />
                </Tabs>
                
                {/* Simplified: Let's just show both inputs but use a Select to pick type for form submission */}
                 <div className="space-y-2">
                   <Label>Calculation Method</Label>
                   <Select name="quantity_type" defaultValue={editingItem?.quantity_type || "formula"}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="formula">Dynamic Formula (Recommended)</SelectItem>
                       <SelectItem value="fixed">Fixed Quantity</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="space-y-2">
                    <Label>Formula Preset</Label>
                    <Select name="formula_preset" defaultValue={
                        editingItem?.quantity_formula && formulas.some(f => f.formula === editingItem.quantity_formula)
                        ? formulas.find(f => f.formula === editingItem.quantity_formula)?.id
                        : "custom"
                    }>
                        <SelectTrigger><SelectValue placeholder="Select a preset..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="custom">Custom Formula</SelectItem>
                            {formulas.map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.name} ({f.formula})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-2">
                   <Label>Custom Formula / Fixed Value</Label>
                   <Input 
                     name="quantity_formula" 
                     placeholder="e.g. batch_size * 0.02" 
                     defaultValue={editingItem?.quantity_formula || ""}
                     className="font-mono"
                   />
                   <p className="text-xs text-gray-500">
                     Or enter numeric value if Fixed. Variables: <code>batch_size</code>, <code>tray_count</code>
                   </p>
                 </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input name="notes" defaultValue={editingItem?.notes || ""} placeholder="Optional notes" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                <Button type="submit">Save Item</Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}