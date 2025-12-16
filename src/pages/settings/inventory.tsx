import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Settings, Tag, Ruler, Building2, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { inventorySettingsService } from "@/services/inventorySettingsService";
import type { InventoryCategory, InventoryUnit, InventorySupplier } from "@/services/inventorySettingsService";
import Link from "next/link";

export default function InventorySettingsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [editingUnit, setEditingUnit] = useState<InventoryUnit | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<InventorySupplier | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [isAdmin, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, unitsData, suppliersData] = await Promise.all([
        inventorySettingsService.getCategories(),
        inventorySettingsService.getUnits(),
        inventorySettingsService.getSuppliers(),
      ]);

      setCategories(categoriesData);
      setUnits(unitsData);
      setSuppliers(suppliersData);

      // Auto-initialize defaults if tables are empty
      if (categoriesData.length === 0 && unitsData.length === 0) {
        await handleInitializeDefaults();
      }
    } catch (error) {
      console.error("Error loading inventory settings:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setInitializing(true);
      await inventorySettingsService.initializeDefaults();
      await loadData();
      toast({
        title: "Success",
        description: "Default categories and units initialized successfully.",
      });
    } catch (error) {
      console.error("Error initializing defaults:", error);
      toast({
        title: "Error",
        description: "Failed to initialize default settings.",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const categoryData = {
      name: formData.get("name") as string,
      color: formData.get("color") as string,
      description: formData.get("description") as string || null,
    };

    try {
      if (editingCategory) {
        await inventorySettingsService.updateCategory(editingCategory.id, categoryData);
        toast({ title: "Success", description: "Category updated successfully." });
      } else {
        await inventorySettingsService.createCategory(categoryData);
        toast({ title: "Success", description: "Category created successfully." });
      }
      
      await loadData();
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error("Error saving category:", error);
      toast({ title: "Error", description: "Failed to save category.", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    
    try {
      await inventorySettingsService.deleteCategory(id);
      await loadData();
      toast({ title: "Success", description: "Category deleted successfully." });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
    }
  };

  const handleSaveUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const unitData = {
      name: formData.get("name") as string,
      abbreviation: formData.get("abbreviation") as string,
      type: formData.get("type") as string,
    };

    try {
      if (editingUnit) {
        await inventorySettingsService.updateUnit(editingUnit.id, unitData);
        toast({ title: "Success", description: "Unit updated successfully." });
      } else {
        await inventorySettingsService.createUnit(unitData);
        toast({ title: "Success", description: "Unit created successfully." });
      }
      
      await loadData();
      setIsUnitDialogOpen(false);
      setEditingUnit(null);
    } catch (error) {
      console.error("Error saving unit:", error);
      toast({ title: "Error", description: "Failed to save unit.", variant: "destructive" });
    }
  };

  const handleDeleteUnit = async (id: string, name: string) => {
    if (!confirm(`Delete unit "${name}"? This cannot be undone.`)) return;
    
    try {
      await inventorySettingsService.deleteUnit(id);
      await loadData();
      toast({ title: "Success", description: "Unit deleted successfully." });
    } catch (error) {
      console.error("Error deleting unit:", error);
      toast({ title: "Error", description: "Failed to delete unit.", variant: "destructive" });
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const supplierData = {
      name: formData.get("name") as string,
      contact_person: formData.get("contact_person") as string || null,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string || null,
      address: formData.get("address") as string || null,
      notes: formData.get("notes") as string || null,
    };

    try {
      if (editingSupplier) {
        await inventorySettingsService.updateSupplier(editingSupplier.id, supplierData);
        toast({ title: "Success", description: "Supplier updated successfully." });
      } else {
        await inventorySettingsService.createSupplier(supplierData);
        toast({ title: "Success", description: "Supplier created successfully." });
      }
      
      await loadData();
      setIsSupplierDialogOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({ title: "Error", description: "Failed to save supplier.", variant: "destructive" });
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    
    try {
      await inventorySettingsService.deleteSupplier(id);
      await loadData();
      toast({ title: "Success", description: "Supplier deleted successfully." });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({ title: "Error", description: "Failed to delete supplier.", variant: "destructive" });
    }
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inventory">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Inventory
            </Button>
          </Link>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Settings className="w-10 h-10 text-blue-600" />
            Inventory Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage categories, units of measure, and suppliers
          </p>
        </div>
        {(categories.length === 0 || units.length === 0) && (
          <Button
            onClick={handleInitializeDefaults}
            disabled={initializing}
            className="gap-2"
          >
            {initializing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Initialize Defaults
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="w-4 h-4" />
            Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="units" className="gap-2">
            <Ruler className="w-4 h-4" />
            Units ({units.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Building2 className="w-4 h-4" />
            Suppliers ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Item Categories</CardTitle>
                  <CardDescription>
                    Organize inventory items by category
                  </CardDescription>
                </div>
                <Button onClick={() => { setEditingCategory(null); setIsCategoryDialogOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No categories created yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => { setEditingCategory(null); setIsCategoryDialogOpen(true); }}
                  >
                    Add Your First Category
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm text-muted-foreground">{category.color}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {category.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingCategory(category); setIsCategoryDialogOpen(true); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Units of Measure</CardTitle>
                  <CardDescription>
                    Define how inventory quantities are measured
                  </CardDescription>
                </div>
                <Button onClick={() => { setEditingUnit(null); setIsUnitDialogOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {units.length === 0 ? (
                <div className="text-center py-12">
                  <Ruler className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No units created yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => { setEditingUnit(null); setIsUnitDialogOpen(true); }}
                  >
                    Add Your First Unit
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Abbreviation</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{unit.abbreviation}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{unit.type}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingUnit(unit); setIsUnitDialogOpen(true); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleDeleteUnit(unit.id, unit.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Suppliers</CardTitle>
                  <CardDescription>
                    Manage supplier contacts and information
                  </CardDescription>
                </div>
                <Button onClick={() => { setEditingSupplier(null); setIsSupplierDialogOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No suppliers added yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => { setEditingSupplier(null); setIsSupplierDialogOpen(true); }}
                  >
                    Add Your First Supplier
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.contact_person || "-"}</TableCell>
                        <TableCell>{supplier.email || "-"}</TableCell>
                        <TableCell>{supplier.phone || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingSupplier(supplier); setIsSupplierDialogOpen(true); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category details" : "Create a new inventory category"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingCategory?.name}
                placeholder="e.g., Herbicide"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color *</Label>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={editingCategory?.color || "#3b82f6"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={editingCategory?.description || ""}
                placeholder="Brief description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Add Unit"}</DialogTitle>
            <DialogDescription>
              {editingUnit ? "Update unit details" : "Create a new unit of measure"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit_name">Unit Name *</Label>
              <Input
                id="unit_name"
                name="name"
                defaultValue={editingUnit?.name}
                placeholder="e.g., Gallons"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abbreviation *</Label>
              <Input
                id="abbreviation"
                name="abbreviation"
                defaultValue={editingUnit?.abbreviation}
                placeholder="e.g., gal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_type">Type *</Label>
              <select
                id="unit_type"
                name="type"
                defaultValue={editingUnit?.type || "count"}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="volume">Volume</option>
                <option value="weight">Weight</option>
                <option value="count">Count</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUnit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? "Update supplier information" : "Add a new supplier to your contacts"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSupplier} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Company Name *</Label>
                <Input
                  id="supplier_name"
                  name="name"
                  defaultValue={editingSupplier?.name}
                  placeholder="e.g., AgriChem Ltd"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  defaultValue={editingSupplier?.contact_person || ""}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_email">Email</Label>
                <Input
                  id="supplier_email"
                  name="email"
                  type="email"
                  defaultValue={editingSupplier?.email || ""}
                  placeholder="contact@supplier.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_phone">Phone</Label>
                <Input
                  id="supplier_phone"
                  name="phone"
                  defaultValue={editingSupplier?.phone || ""}
                  placeholder="+260 XXX XXXXXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_address">Address</Label>
              <Input
                id="supplier_address"
                name="address"
                defaultValue={editingSupplier?.address || ""}
                placeholder="Street address, city, country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_notes">Notes</Label>
              <Input
                id="supplier_notes"
                name="notes"
                defaultValue={editingSupplier?.notes || ""}
                placeholder="Additional information"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSupplier ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}