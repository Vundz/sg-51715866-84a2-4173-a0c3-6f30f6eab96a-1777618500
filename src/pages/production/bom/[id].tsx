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
import { ArrowLeft, Plus, Save, Trash2, Edit, Calculator, Loader2, Info, TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { bomService, BOMTemplateWithDetails, BOMItemWithDetails, BOMCategory, FormulaTemplate, ProfitAnalysis } from "@/services/bomService";
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
  const [currentSellingPrice, setCurrentSellingPrice] = useState<number>(0);
  const [currentSuccessRate, setCurrentSuccessRate] = useState<number>(95);
  
  // Error state for formula validation
  const [formulaErrors, setFormulaErrors] = useState<Record<string, string>>({});
  
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
    if (user && id && typeof id === "string") {
      loadData(id);
    } else if (!user) {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (template) {
      try {
        const results = bomService.calculateTemplateCost(template, currentBatchSize);
        
        // Check for any items with zero calculated quantity (potential formula errors)
        const errors: Record<string, string> = {};
        results.items.forEach(item => {
          if (item.quantity_type === "formula" && item.calculatedQuantity === 0 && item.quantity_formula) {
            errors[item.id] = `Formula error: "${item.quantity_formula}" - Check for invalid characters or variables`;
          }
        });
        
        setFormulaErrors(errors);
        setItems(results.items);
        setCalculatedCosts({
          totalCost: results.totalCost,
          costPerSeedling: results.costPerSeedling,
          costPerTray: results.costPerTray,
          categoryTotals: results.categoryTotals
        });
      } catch (error) {
        console.error("Error calculating costs:", error);
        toast({
          title: "Calculation Error",
          description: "There was an error calculating costs. Please check your formulas.",
          variant: "destructive"
        });
      }
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
      setCurrentSellingPrice(tmpl.target_selling_price || 0);
      setCurrentSuccessRate(tmpl.estimated_success_rate || 95);
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

  const handleUpdateTemplate = async (updates: Partial<BOMTemplateWithDetails>) => {
    if (!template) return;
    try {
      await bomService.updateTemplate(template.id, updates);
      setTemplate({ ...template, ...updates });
      toast({ title: "Saved", description: "Template updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    }
  };

  const profitAnalysis = useMemo<ProfitAnalysis | null>(() => {
    if (!template || currentSellingPrice <= 0) return null;
    return bomService.calculateProfitAnalysis(template, currentBatchSize, currentSellingPrice);
  }, [template, currentBatchSize, currentSellingPrice, calculatedCosts]);

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!template) return;

    const formData = new FormData(e.currentTarget);
    const itemType = activeTab === "inventory" ? "inventory" : "adhoc";
    
    let categoryId = formData.get("category_id") as string;
    
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
      category_id: categoryId || null,
      quantity_type: formData.get("quantity_type") as "fixed" | "formula",
      notes: formData.get("notes") as string,
    };

    if (itemData.quantity_type === "fixed") {
      itemData.quantity_value = parseFloat(formData.get("quantity_value") as string);
      itemData.quantity_formula = null;
    } else {
      itemData.quantity_value = null;
      const presetFormulaId = formData.get("formula_preset") as string;
      if (presetFormulaId && presetFormulaId !== "custom") {
        const preset = formulas.find(f => f.id === presetFormulaId);
        itemData.quantity_formula = preset?.formula;
      } else {
        itemData.quantity_formula = formData.get("quantity_formula") as string;
      }
    }

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

  const getProfitColor = (margin: number) => {
    if (margin < 0) return "text-red-600 dark:text-red-400";
    if (margin < 20) return "text-yellow-600 dark:text-yellow-400";
    if (margin < 40) return "text-green-600 dark:text-green-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getProfitBgColor = (margin: number) => {
    if (margin < 0) return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    if (margin < 20) return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
    if (margin < 40) return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
    return "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800";
  };

  if (loading || !template) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-lime-600" /></div>;
  }

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
              <Badge variant={template.status === "active" ? "default" : "secondary"}>
                {template.status}
              </Badge>
            </h1>
            <p className="text-gray-500">{template.description || "No description provided"}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingItem(null); setSelectedInventoryId(""); setIsAddItemOpen(true); }} className="bg-lime-600 hover:bg-lime-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Cost Item
        </Button>
      </div>

      {/* Formula Error Alert */}
      {Object.keys(formulaErrors).length > 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Formula Errors Detected
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                {Object.keys(formulaErrors).length} item(s) have invalid formulas. Cost calculations may be incomplete.
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                <li>• Only use: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">batch_size</code>, <code className="bg-red-100 dark:bg-red-900 px-1 rounded">tray_count</code>, numbers, and operators (+, -, *, /, parentheses)</li>
                <li>• Example: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">batch_size * 0.02</code> or <code className="bg-red-100 dark:bg-red-900 px-1 rounded">tray_count * 5</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Batch Configuration Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="batchSize" className="text-sm font-medium">Batch Size</Label>
              <div className="flex gap-2">
                <Input 
                  id="batchSize"
                  type="number" 
                  value={currentBatchSize}
                  onChange={(e) => setCurrentBatchSize(parseInt(e.target.value) || 0)}
                  className="font-mono"
                />
                <Button size="sm" variant="ghost" onClick={() => handleUpdateTemplate({ base_batch_size: currentBatchSize })} title="Save as default">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">{Math.ceil(currentBatchSize / 220)} trays needed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="text-sm font-medium">Selling Price (ZMW)</Label>
              <div className="flex gap-2">
                <Input 
                  id="sellingPrice"
                  type="number" 
                  step="0.01"
                  value={currentSellingPrice}
                  onChange={(e) => setCurrentSellingPrice(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
                <Button size="sm" variant="ghost" onClick={() => handleUpdateTemplate({ target_selling_price: currentSellingPrice })} title="Save as default">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">Per seedling</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="successRate" className="text-sm font-medium">Success Rate (%)</Label>
              <div className="flex gap-2">
                <Input 
                  id="successRate"
                  type="number" 
                  step="0.1"
                  min="0"
                  max="100"
                  value={currentSuccessRate}
                  onChange={(e) => setCurrentSuccessRate(parseFloat(e.target.value) || 95)}
                  className="font-mono"
                />
                <Button size="sm" variant="ghost" onClick={() => handleUpdateTemplate({ estimated_success_rate: currentSuccessRate })} title="Save as default">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">Estimated survival rate</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Saleable Units</Label>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatNumber(Math.floor(currentBatchSize * (currentSuccessRate / 100)))}
              </div>
              <p className="text-xs text-gray-500">After losses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Inventory items and their calculated costs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Formula</TableHead>
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
                              {item.item_type === "inventory" ? item.inventory_items?.name : item.custom_name}
                            </span>
                            {item.notes && (
                              <span className="text-xs text-gray-400">{item.notes}</span>
                            )}
                            {formulaErrors[item.id] && (
                              <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3" />
                                {formulaErrors[item.id]}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          K{formatNumber(item.item_type === "inventory" ? Number(item.inventory_items?.unit_price) : Number(item.custom_unit_price))}
                          <span className="text-xs text-gray-400 ml-1">
                             / {item.item_type === "inventory" ? item.inventory_items?.unit_of_measure : item.custom_unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-gray-500">
                          {item.quantity_type === "fixed" 
                            ? item.quantity_value 
                            : <span title={item.quantity_formula || ""}>Formula</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formulaErrors[item.id] ? (
                            <span className="text-red-600 dark:text-red-400">Error</span>
                          ) : (
                            formatNumber(item.calculatedQuantity)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900 dark:text-gray-100">
                          {formulaErrors[item.id] ? (
                            <span className="text-red-600 dark:text-red-400">K0.00</span>
                          ) : (
                            `K${formatNumber(item.subtotal)}`
                          )}
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
          {/* Cost Summary */}
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

          {/* Profit Analysis */}
          {profitAnalysis && (
            <Card className={`${getProfitBgColor(profitAnalysis.profitMargin)}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Profit Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Profit Per Seedling</span>
                    <span className={`text-2xl font-bold ${getProfitColor(profitAnalysis.profitMargin)}`}>
                      K{profitAnalysis.profitPerSeedling.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Profit Margin</span>
                    <span className={`text-2xl font-bold ${getProfitColor(profitAnalysis.profitMargin)}`}>
                      {profitAnalysis.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Expected Revenue</span>
                      <span className="font-mono">K{formatNumber(profitAnalysis.expectedRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Gross Profit</span>
                      <span className={`font-mono ${getProfitColor(profitAnalysis.profitMargin)}`}>
                        K{formatNumber(profitAnalysis.grossProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Break-Even Analysis */}
          {profitAnalysis && (
            <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <Target className="w-5 h-5" />
                  Break-Even Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-700 dark:text-orange-300">Break-Even Price</span>
                  <span className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    K{profitAnalysis.breakEvenPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-700 dark:text-orange-300">Break-Even Quantity</span>
                  <span className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    {formatNumber(Math.ceil(profitAnalysis.breakEvenQuantity))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-orange-200 dark:border-orange-800">
                  <span className="text-sm text-orange-700 dark:text-orange-300">Safety Margin</span>
                  <span className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    {profitAnalysis.safetyMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-300">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      You need to sell at least <strong>K{profitAnalysis.breakEvenPrice.toFixed(2)}</strong> per seedling 
                      or <strong>{formatNumber(Math.ceil(profitAnalysis.breakEvenQuantity))}</strong> seedlings to break even.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">By Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(calculatedCosts.categoryTotals).map(([cat, total]) => {
                 const catObj = categories.find(c => c.name === cat);
                 const percentage = calculatedCosts.totalCost > 0 ? (total / calculatedCosts.totalCost) * 100 : 0;
                 return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catObj?.color || "#ccc" }} />
                          <span>{cat}</span>
                        </div>
                        <span className="font-medium">K{formatNumber(total)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="h-1.5 rounded-full" 
                          style={{ width: `${percentage}%`, backgroundColor: catObj?.color || "#ccc" }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-right">{percentage.toFixed(1)}% of total</p>
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
              <TabsTrigger value="inventory" disabled={!!editingItem && editingItem.item_type !== "inventory"}>
                Inventory Item
              </TabsTrigger>
              <TabsTrigger value="adhoc" disabled={!!editingItem && editingItem.item_type !== "adhoc"}>
                Ad-hoc (Manual)
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSaveItem} className="space-y-4">
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

              <TabsContent value="inventory" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Select Item from Inventory</Label>
                  <Select 
                    value={selectedInventoryId} 
                    onValueChange={setSelectedInventoryId} 
                    disabled={!!editingItem}
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

              <TabsContent value="adhoc" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input name="custom_name" defaultValue={editingItem?.custom_name || ""} required={activeTab === "adhoc"} placeholder="e.g. Contract Labor" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Price (K)</Label>
                    <Input name="custom_unit_price" type="number" step="0.01" defaultValue={editingItem?.custom_unit_price || ""} required={activeTab === "adhoc"} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input name="custom_unit" defaultValue={editingItem?.custom_unit || ""} required={activeTab === "adhoc"} placeholder="e.g. hr, day, trip" />
                  </div>
                </div>
              </TabsContent>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4 border">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Quantity Calculation
                </h4>
                
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