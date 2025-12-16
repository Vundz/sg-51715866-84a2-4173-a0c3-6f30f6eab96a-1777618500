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
import { Plus, Edit, Trash2, Settings, Tag, Ruler, Building2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: string; // 'volume', 'weight', 'count'
}

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export default function InventorySettingsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [isAdmin, router]);

  const loadData = () => {
    // Load from localStorage
    const savedCategories = localStorage.getItem("inventory_categories");
    const savedUnits = localStorage.getItem("inventory_units");
    const savedSuppliers = localStorage.getItem("inventory_suppliers");

    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      // Default categories
      const defaultCategories: Category[] = [
        { id: "1", name: "Fungicide", color: "#9333ea", description: "Fungal disease treatment" },
        { id: "2", name: "Insecticide", color: "#dc2626", description: "Insect pest control" },
        { id: "3", name: "Fertilizer", color: "#16a34a", description: "Plant nutrition" },
        { id: "4", name: "Other", color: "#6b7280", description: "Miscellaneous items" },
      ];
      setCategories(defaultCategories);
      localStorage.setItem("inventory_categories", JSON.stringify(defaultCategories));
    }

    if (savedUnits) {
      setUnits(JSON.parse(savedUnits));
    } else {
      // Default units
      const defaultUnits: Unit[] = [
        { id: "1", name: "Liters", abbreviation: "L", type: "volume" },
        { id: "2", name: "Milliliters", abbreviation: "ml", type: "volume" },
        { id: "3", name: "Kilograms", abbreviation: "kg", type: "weight" },
        { id: "4", name: "Grams", abbreviation: "g", type: "weight" },
        { id: "5", name: "Bags", abbreviation: "bags", type: "count" },
        { id: "6", name: "Bottles", abbreviation: "bottles", type: "count" },
        { id: "7", name: "Sachets", abbreviation: "sachets", type: "count" },
        { id: "8", name: "Packets", abbreviation: "packets", type: "count" },
      ];
      setUnits(defaultUnits);
      localStorage.setItem("inventory_units", JSON.stringify(defaultUnits));
    }

    if (savedSuppliers) {
      setSuppliers(JSON.parse(savedSuppliers));
    }
  };

  const handleSaveCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const category: Category = {
      id: editingCategory?.id || Date.now().toString(),
      name: formData.get("name") as string,
      color: formData.get("color") as string,
      description: formData.get("description") as string || undefined,
    };

    let updatedCategories;
    if (editingCategory) {
      updatedCategories = categories.map((c) => (c.id === editingCategory.id ? category : c));
    } else {
      updatedCategories = [...categories, category];
    }

    setCategories(updatedCategories);
    localStorage.setItem("inventory_categories", JSON.stringify(updatedCategories));
    
    toast({
      title: "Success",
      description: `Category ${editingCategory ? "updated" : "created"} successfully.`,
    });
    
    setIsCategoryDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    
    const updatedCategories = categories.filter((c) => c.id !== id);
    setCategories(updatedCategories);
    localStorage.setItem("inventory_categories", JSON.stringify(updatedCategories));
    
    toast({ title: "Success", description: "Category deleted successfully." });
  };

  const handleSaveUnit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const unit: Unit = {
      id: editingUnit?.id || Date.now().toString(),
      name: formData.get("name") as string,
      abbreviation: formData.get("abbreviation") as string,
      type: formData.get("type") as string,
    };

    let updatedUnits;
    if (editingUnit) {
      updatedUnits = units.map((u) => (u.id === editingUnit.id ? unit : u));
    } else {
      updatedUnits = [...units, unit];
    }

    setUnits(updatedUnits);
    localStorage.setItem("inventory_units", JSON.stringify(updatedUnits));
    
    toast({
      title: "Success",
      description: `Unit ${editingUnit ? "updated" : "created"} successfully.`,
    });
    
    setIsUnitDialogOpen(false);
    setEditingUnit(null);
  };

  const handleDeleteUnit = (id: string, name: string) => {
    if (!confirm(`Delete unit "${name}"? This cannot be undone.`)) return;
    
    const updatedUnits = units.filter((u) => u.id !== id);
    setUnits(updatedUnits);
    localStorage.setItem("inventory_units", JSON.stringify(updatedUnits));
    
    toast({ title: "Success", description: "Unit deleted successfully." });
  };

  const handleSaveSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const supplier: Supplier = {
      id: editingSupplier?.id || Date.now().toString(),
      name: formData.get("name") as string,
      contact_person: formData.get("contact_person") as string || undefined,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      address: formData.get("address") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    };

    let updatedSuppliers;
    if (editingSupplier) {
      updatedSuppliers = suppliers.map((s) => (s.id === editingSupplier.id ? supplier : s));
    } else {
      updatedSuppliers = [...suppliers, supplier];
    }

    setSuppliers(updatedSuppliers);
    localStorage.setItem("inventory_suppliers", JSON.stringify(updatedSuppliers));
    
    toast({
      title: "Success",
      description: `Supplier ${editingSupplier ? "updated" : "created"} successfully.`,
    });
    
    setIsSupplierDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    
    const updatedSuppliers = suppliers.filter((s) => s.id !== id);
    setSuppliers(updatedSuppliers);
    localStorage.setItem("inventory_suppliers", JSON.stringify(updatedSuppliers));
    
    toast({ title: "Success", description: "Supplier deleted successfully." });
  };

  if (!isAdmin) return null;

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
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="w-4 h-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="units" className="gap-2">
            <Ruler className="w-4 h-4" />
            Units
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Building2 className="w-4 h-4" />
            Suppliers
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
                defaultValue={editingCategory?.description}
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
                  defaultValue={editingSupplier?.contact_person}
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
                  defaultValue={editingSupplier?.email}
                  placeholder="contact@supplier.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_phone">Phone</Label>
                <Input
                  id="supplier_phone"
                  name="phone"
                  defaultValue={editingSupplier?.phone}
                  placeholder="+260 XXX XXXXXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_address">Address</Label>
              <Input
                id="supplier_address"
                name="address"
                defaultValue={editingSupplier?.address}
                placeholder="Street address, city, country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_notes">Notes</Label>
              <Input
                id="supplier_notes"
                name="notes"
                defaultValue={editingSupplier?.notes}
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