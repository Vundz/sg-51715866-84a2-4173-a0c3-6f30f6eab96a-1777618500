import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calculator, 
  Droplet, 
  Beaker, 
  Zap, 
  AlertTriangle, 
  Info, 
  Plus, 
  Save, 
  Trash2, 
  Edit,
  ArrowLeft,
  History,
  CheckCircle2,
  Package
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { chemicalCalculatorService, ChemicalProductWithInventory, SavedMixWithDetails, CalculationResult } from "@/services/chemicalCalculatorService";
import { formatNumber } from "@/lib/format";

export default function ChemicalCalculatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<ChemicalProductWithInventory[]>([]);
  const [savedMixes, setSavedMixes] = useState<SavedMixWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<ChemicalProductWithInventory | null>(null);
  
  // Calculation mode
  const [mode, setMode] = useState<"water_to_chemical" | "chemical_to_water" | "ec_based">("water_to_chemical");
  
  // Inputs
  const [waterVolume, setWaterVolume] = useState<string>("");
  const [chemicalAmount, setChemicalAmount] = useState<string>("");
  const [concentration, setConcentration] = useState<string>("");
  const [targetEC, setTargetEC] = useState<string>("");
  
  // Results
  const [results, setResults] = useState<CalculationResult | null>(null);
  
  // Product management dialog
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ChemicalProductWithInventory | null>(null);
  
  // Save mix dialog
  const [isSaveMixDialogOpen, setIsSaveMixDialogOpen] = useState(false);
  const [mixNotes, setMixNotes] = useState("");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      setSelectedProduct(product || null);
      
      // Set recommended concentration as default
      if (product) {
        setConcentration(product.recommended_concentration.toString());
      }
    } else {
      setSelectedProduct(null);
    }
  }, [selectedProductId, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, mixesData] = await Promise.all([
        chemicalCalculatorService.getProducts(),
        chemicalCalculatorService.getSavedMixes(),
      ]);
      setProducts(productsData);
      setSavedMixes(mixesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load calculator data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    if (!selectedProduct) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }

    try {
      const result = chemicalCalculatorService.calculate({
        mode,
        product: selectedProduct,
        waterVolume: waterVolume ? parseFloat(waterVolume) : undefined,
        chemicalAmount: chemicalAmount ? parseFloat(chemicalAmount) : undefined,
        concentration: concentration ? parseFloat(concentration) : undefined,
        targetEC: targetEC ? parseFloat(targetEC) : undefined,
      });

      setResults(result);
    } catch (error) {
      console.error("Calculation error:", error);
      toast({ title: "Error", description: "Calculation failed. Please check your inputs.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setWaterVolume("");
    setChemicalAmount("");
    setConcentration(selectedProduct?.recommended_concentration.toString() || "");
    setTargetEC("");
    setResults(null);
  };

  const handleSaveMix = async () => {
    if (!selectedProduct || !results) {
      toast({ title: "Error", description: "No calculation to save", variant: "destructive" });
      return;
    }

    try {
      const mixData = {
        product_id: selectedProduct.id,
        water_volume: mode === "water_to_chemical" || mode === "ec_based" 
          ? parseFloat(waterVolume) 
          : results.waterRequired!,
        chemical_amount: results.chemicalRequired || parseFloat(chemicalAmount),
        concentration: results.concentration,
        target_ec: mode === "ec_based" ? parseFloat(targetEC) : null,
        calculated_ec: results.calculatedEC,
        notes: mixNotes,
      };

      await chemicalCalculatorService.saveMix(mixData);
      await loadData();
      
      setIsSaveMixDialogOpen(false);
      setMixNotes("");
      
      toast({ title: "Success", description: "Mix saved successfully" });
    } catch (error) {
      console.error("Error saving mix:", error);
      toast({ title: "Error", description: "Failed to save mix", variant: "destructive" });
    }
  };

  const handleDeleteMix = async (id: string) => {
    if (!confirm("Delete this saved mix?")) return;
    
    try {
      await chemicalCalculatorService.deleteMix(id);
      await loadData();
      toast({ title: "Success", description: "Mix deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete mix", variant: "destructive" });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData = {
      name: formData.get("name") as string,
      type: formData.get("type") as "fertilizer" | "pesticide" | "fungicide" | "herbicide",
      form: formData.get("form") as "solid" | "liquid",
      npk_n: formData.get("npk_n") ? parseFloat(formData.get("npk_n") as string) : null,
      npk_p: formData.get("npk_p") ? parseFloat(formData.get("npk_p") as string) : null,
      npk_k: formData.get("npk_k") ? parseFloat(formData.get("npk_k") as string) : null,
      ec_factor: formData.get("ec_factor") ? parseFloat(formData.get("ec_factor") as string) : null,
      recommended_concentration: parseFloat(formData.get("recommended_concentration") as string),
      min_concentration: parseFloat(formData.get("min_concentration") as string),
      max_concentration: parseFloat(formData.get("max_concentration") as string),
      safety_notes: formData.get("safety_notes") as string || null,
      application_method: formData.get("application_method") as string || null,
      manufacturer: formData.get("manufacturer") as string || null,
      inventory_item_id: null,
    };

    try {
      if (editingProduct) {
        await chemicalCalculatorService.updateProduct(editingProduct.id, productData);
        toast({ title: "Success", description: "Product updated" });
      } else {
        await chemicalCalculatorService.createProduct(productData);
        toast({ title: "Success", description: "Product created" });
      }
      
      await loadData();
      setIsProductDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete product "${name}"?`)) return;
    
    try {
      await chemicalCalculatorService.deleteProduct(id);
      await loadData();
      toast({ title: "Success", description: "Product deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  const getModeIcon = (m: typeof mode) => {
    switch (m) {
      case "water_to_chemical": return Droplet;
      case "chemical_to_water": return Beaker;
      case "ec_based": return Zap;
    }
  };

  const getModeLabel = (m: typeof mode) => {
    switch (m) {
      case "water_to_chemical": return "I have WATER, need CHEMICAL";
      case "chemical_to_water": return "I have CHEMICAL, need WATER";
      case "ec_based": return "I want to reach TARGET EC";
    }
  };

  const getUnitLabel = () => {
    if (!selectedProduct) return "g or ml";
    return selectedProduct.form === "solid" ? "grams" : "ml";
  };

  if (loading) {
    return <div className="p-8 text-center">Loading calculator...</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 px-4 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Calculator className="w-10 h-10 text-lime-600" />
            Fertilizer & Chemical Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Precision mixing for fertilizers, pesticides, and fungicides
          </p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setIsProductDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Calculator */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculator</CardTitle>
              <CardDescription>Select a product and calculation mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product">Select Product *</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Choose a chemical or fertilizer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <SelectItem value="none" disabled>No products available - Add one first</SelectItem>
                    ) : (
                      products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Info */}
              {selectedProduct && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{selectedProduct.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="capitalize">{selectedProduct.type}</Badge>
                      <Badge variant="outline" className="capitalize">{selectedProduct.form}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Recommended: </span>
                      <span className="font-medium">{selectedProduct.recommended_concentration} {selectedProduct.form === "solid" ? "g" : "ml"}/L</span>
                    </div>
                    {selectedProduct.ec_factor && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">EC Factor: </span>
                        <span className="font-medium">{selectedProduct.ec_factor} mS/cm per {selectedProduct.form === "solid" ? "g" : "ml"}/L</span>
                      </div>
                    )}
                    {selectedProduct.type === "fertilizer" && selectedProduct.npk_n !== null && (
                      <div className="col-span-2">
                        <span className="text-gray-600 dark:text-gray-400">NPK: </span>
                        <span className="font-medium">{selectedProduct.npk_n}-{selectedProduct.npk_p}-{selectedProduct.npk_k}</span>
                      </div>
                    )}
                  </div>
                  {selectedProduct.inventory_items && (
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">In stock: </span>
                      <span className="font-medium">
                        {formatNumber(selectedProduct.inventory_items.current_stock)} {selectedProduct.inventory_items.unit_of_measure}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Calculation Mode */}
              <div className="space-y-3">
                <Label>Calculation Mode</Label>
                <div className="grid grid-cols-1 gap-2">
                  {(["water_to_chemical", "chemical_to_water", "ec_based"] as const).map(m => {
                    const Icon = getModeIcon(m);
                    const isDisabled = m === "ec_based" && (!selectedProduct || !selectedProduct.ec_factor);
                    
                    return (
                      <button
                        key={m}
                        onClick={() => !isDisabled && setMode(m)}
                        disabled={isDisabled}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          mode === m
                            ? "border-lime-600 bg-lime-50 dark:bg-lime-950"
                            : "border-gray-200 dark:border-gray-700 hover:border-lime-300"
                        } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <Icon className={`w-5 h-5 ${mode === m ? "text-lime-600" : "text-gray-400"}`} />
                        <span className={`font-medium ${mode === m ? "text-lime-900 dark:text-lime-100" : ""}`}>
                          {getModeLabel(m)}
                        </span>
                        {isDisabled && (
                          <Badge variant="outline" className="ml-auto">EC factor required</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Fields Based on Mode */}
              {selectedProduct && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  {mode === "water_to_chemical" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="water_wtc">💧 Water Available (liters) *</Label>
                        <Input
                          id="water_wtc"
                          type="number"
                          step="0.01"
                          value={waterVolume}
                          onChange={(e) => setWaterVolume(e.target.value)}
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conc_wtc">📊 Desired Concentration ({selectedProduct.form === "solid" ? "g" : "ml"}/L) *</Label>
                        <Input
                          id="conc_wtc"
                          type="number"
                          step="0.01"
                          value={concentration}
                          onChange={(e) => setConcentration(e.target.value)}
                          placeholder="e.g., 2"
                        />
                      </div>
                    </>
                  )}

                  {mode === "chemical_to_water" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="chem_ctw">⚗️ Chemical Available ({getUnitLabel()}) *</Label>
                        <Input
                          id="chem_ctw"
                          type="number"
                          step="0.01"
                          value={chemicalAmount}
                          onChange={(e) => setChemicalAmount(e.target.value)}
                          placeholder="e.g., 500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conc_ctw">📊 Desired Concentration ({selectedProduct.form === "solid" ? "g" : "ml"}/L) *</Label>
                        <Input
                          id="conc_ctw"
                          type="number"
                          step="0.01"
                          value={concentration}
                          onChange={(e) => setConcentration(e.target.value)}
                          placeholder="e.g., 2"
                        />
                      </div>
                    </>
                  )}

                  {mode === "ec_based" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="water_ec">💧 Water Available (liters) *</Label>
                        <Input
                          id="water_ec"
                          type="number"
                          step="0.01"
                          value={waterVolume}
                          onChange={(e) => setWaterVolume(e.target.value)}
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="target_ec">⚡ Target EC (mS/cm) *</Label>
                        <Input
                          id="target_ec"
                          type="number"
                          step="0.01"
                          value={targetEC}
                          onChange={(e) => setTargetEC(e.target.value)}
                          placeholder="e.g., 2.0"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleCalculate} className="flex-1 bg-lime-600 hover:bg-lime-700">
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate
                    </Button>
                    <Button onClick={handleReset} variant="outline">
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Results */}
              {results && (
                <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-900 dark:text-green-100">
                    <CheckCircle2 className="w-6 h-6" />
                    <h3 className="text-xl font-bold">Results</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.waterRequired !== null && (
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">💧 Water Required</p>
                        <p className="text-3xl font-bold text-blue-600">{formatNumber(results.waterRequired)} L</p>
                      </div>
                    )}

                    {results.chemicalRequired !== null && (
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">⚗️ Chemical Required</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {formatNumber(results.chemicalRequired)} {getUnitLabel()}
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">📊 Concentration</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {results.concentration.toFixed(2)} {selectedProduct?.form === "solid" ? "g" : "ml"}/L
                      </p>
                    </div>

                    {results.calculatedEC !== null && (
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">⚡ Expected EC</p>
                        <p className="text-3xl font-bold text-yellow-600">
                          {results.calculatedEC.toFixed(2)} mS/cm
                        </p>
                      </div>
                    )}
                  </div>

                  {/* NPK Breakdown */}
                  {results.npk && (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        🧪 NPK Content in Solution
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Nitrogen (N)</p>
                          <p className="text-2xl font-bold text-green-600">{formatNumber(results.npk.n)} g</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Phosphorus (P)</p>
                          <p className="text-2xl font-bold text-blue-600">{formatNumber(results.npk.p)} g</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Potassium (K)</p>
                          <p className="text-2xl font-bold text-orange-600">{formatNumber(results.npk.k)} g</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {results.warnings.length > 0 && (
                    <div className="space-y-2">
                      {results.warnings.map((warning, idx) => (
                        <Alert key={idx} variant={warning.startsWith("⚠️") ? "destructive" : "default"}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  <Button onClick={() => setIsSaveMixDialogOpen(true)} variant="outline" className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save This Mix
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Library */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Library</CardTitle>
              <CardDescription>Your saved chemicals and fertilizers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {products.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No products yet. Add one to get started.</p>
              ) : (
                products.slice(0, 5).map(product => (
                  <div key={product.id} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{product.type}</Badge>
                          {product.type === "fertilizer" && product.npk_n !== null && (
                            <Badge variant="outline" className="text-xs">
                              NPK {product.npk_n}-{product.npk_p}-{product.npk_k}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingProduct(product); setIsProductDialogOpen(true); }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteProduct(product.id, product.name)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Mix History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Mixes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {savedMixes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No saved mixes yet</p>
              ) : (
                savedMixes.slice(0, 5).map(mix => (
                  <div key={mix.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{mix.chemical_products?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(mix.created_at || "").toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteMix(mix.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Chemical:</span>
                        <span className="font-medium">{formatNumber(mix.chemical_amount)} {mix.chemical_products?.form === "solid" ? "g" : "ml"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Water:</span>
                        <span className="font-medium">{formatNumber(mix.water_volume)} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Concentration:</span>
                        <span className="font-medium">{mix.concentration.toFixed(2)} {mix.chemical_products?.form === "solid" ? "g" : "ml"}/L</span>
                      </div>
                      {mix.calculated_ec && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">EC:</span>
                          <span className="font-medium">{mix.calculated_ec.toFixed(2)} mS/cm</span>
                        </div>
                      )}
                    </div>
                    {mix.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">{mix.notes}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5" />
                Quick Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Concentration Units</p>
                <p className="text-gray-600 dark:text-gray-400">
                  • Solids: grams per liter (g/L)<br />
                  • Liquids: milliliters per liter (ml/L)
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">EC (Electrical Conductivity)</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Measured in mS/cm (millisiemens per centimeter). Indicates nutrient strength.
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">NPK Values</p>
                <p className="text-gray-600 dark:text-gray-400">
                  N (Nitrogen), P (Phosphorus), K (Potassium) - Essential macronutrients
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>Configure chemical or fertilizer details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" name="name" defaultValue={editingProduct?.name} required placeholder="e.g., NPK 20-20-20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select name="type" defaultValue={editingProduct?.type || "fertilizer"} required>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fertilizer">Fertilizer</SelectItem>
                    <SelectItem value="pesticide">Pesticide</SelectItem>
                    <SelectItem value="fungicide">Fungicide</SelectItem>
                    <SelectItem value="herbicide">Herbicide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form">Form *</Label>
                <Select name="form" defaultValue={editingProduct?.form || "solid"} required>
                  <SelectTrigger id="form">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid (grams)</SelectItem>
                    <SelectItem value="liquid">Liquid (ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input id="manufacturer" name="manufacturer" defaultValue={editingProduct?.manufacturer || ""} placeholder="Optional" />
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border space-y-4">
              <h4 className="font-medium">NPK Values (for fertilizers only)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="npk_n">Nitrogen (N) %</Label>
                  <Input id="npk_n" name="npk_n" type="number" step="0.1" defaultValue={editingProduct?.npk_n || ""} placeholder="e.g., 20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="npk_p">Phosphorus (P) %</Label>
                  <Input id="npk_p" name="npk_p" type="number" step="0.1" defaultValue={editingProduct?.npk_p || ""} placeholder="e.g., 20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="npk_k">Potassium (K) %</Label>
                  <Input id="npk_k" name="npk_k" type="number" step="0.1" defaultValue={editingProduct?.npk_k || ""} placeholder="e.g., 20" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border space-y-4">
              <h4 className="font-medium">Concentration Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_concentration">Minimum *</Label>
                  <Input id="min_concentration" name="min_concentration" type="number" step="0.01" defaultValue={editingProduct?.min_concentration} required placeholder="0.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommended_concentration">Recommended *</Label>
                  <Input id="recommended_concentration" name="recommended_concentration" type="number" step="0.01" defaultValue={editingProduct?.recommended_concentration} required placeholder="2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_concentration">Maximum *</Label>
                  <Input id="max_concentration" name="max_concentration" type="number" step="0.01" defaultValue={editingProduct?.max_concentration} required placeholder="5" />
                </div>
              </div>
              <p className="text-xs text-gray-600">Units: g/L for solids, ml/L for liquids</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ec_factor">EC Factor (mS/cm per unit concentration)</Label>
              <Input id="ec_factor" name="ec_factor" type="number" step="0.001" defaultValue={editingProduct?.ec_factor || ""} placeholder="e.g., 0.75" />
              <p className="text-xs text-gray-600">Required for EC-based calculations. Leave empty if unknown.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_method">Application Method</Label>
              <Input id="application_method" name="application_method" defaultValue={editingProduct?.application_method || ""} placeholder="e.g., Foliar spray, Drench" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="safety_notes">Safety Notes</Label>
              <Textarea id="safety_notes" name="safety_notes" defaultValue={editingProduct?.safety_notes || ""} placeholder="Important safety information..." rows={3} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-lime-600 hover:bg-lime-700">
                {editingProduct ? "Update Product" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Mix Dialog */}
      <Dialog open={isSaveMixDialogOpen} onOpenChange={setIsSaveMixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Mix</DialogTitle>
            <DialogDescription>Add notes to remember this calculation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mix_notes">Notes (Optional)</Label>
              <Textarea
                id="mix_notes"
                value={mixNotes}
                onChange={(e) => setMixNotes(e.target.value)}
                placeholder="e.g., Applied to Tomato Batch TB250625, Used for foliar spray on lettuce..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveMixDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMix} className="bg-lime-600 hover:bg-lime-700">
              <Save className="w-4 h-4 mr-2" />
              Save Mix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}