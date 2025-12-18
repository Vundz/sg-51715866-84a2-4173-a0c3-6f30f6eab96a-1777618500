import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit, Trash2, Settings, Calculator, Tag, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { bomService, BOMCategory, FormulaTemplate } from "@/services/bomService";

export default function ProductionSettingsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<BOMCategory[]>([]);
  const [formulas, setFormulas] = useState<FormulaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Category Dialog State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BOMCategory | null>(null);

  // Formula Dialog State
  const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<FormulaTemplate | null>(null);

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
      const [categoriesData, formulasData] = await Promise.all([
        bomService.getCategories(),
        bomService.getFormulaTemplates(),
      ]);
      setCategories(categoriesData);
      setFormulas(formulasData);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Category Handlers
  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      color: formData.get("color") as string,
      description: formData.get("description") as string,
      sort_order: parseInt(formData.get("sort_order") as string) || 0,
    };

    try {
      if (editingCategory) {
        await bomService.updateCategory(editingCategory.id, data);
        toast({ title: "Success", description: "Category updated" });
      } else {
        await bomService.createCategory(data);
        toast({ title: "Success", description: "Category created" });
      }
      loadData();
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error("Error saving category:", error);
      toast({ title: "Error", description: "Failed to save category", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Items using it will become uncategorized.")) return;
    try {
      await bomService.deleteCategory(id);
      loadData();
      toast({ title: "Success", description: "Category deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    }
  };

  // Formula Handlers
  const handleSaveFormula = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formulaStr = formData.get("formula") as string;
    
    // Extract variables (simple regex to find words)
    const variables = Array.from(new Set(formulaStr.match(/[a-zA-Z_]\w*/g) || [])).filter(v => 
      !['Math', 'round', 'ceil', 'floor', 'min', 'max'].includes(v)
    );

    const data = {
      name: formData.get("name") as string,
      formula: formulaStr,
      description: formData.get("description") as string,
      variables: variables,
    };

    try {
      if (editingFormula) {
        await bomService.updateFormulaTemplate(editingFormula.id, data);
        toast({ title: "Success", description: "Formula updated" });
      } else {
        await bomService.createFormulaTemplate(data);
        toast({ title: "Success", description: "Formula created" });
      }
      loadData();
      setIsFormulaDialogOpen(false);
      setEditingFormula(null);
    } catch (error) {
      console.error("Error saving formula:", error);
      toast({ title: "Error", description: "Failed to save formula", variant: "destructive" });
    }
  };

  const handleDeleteFormula = async (id: string) => {
    if (!confirm("Delete this formula template?")) return;
    try {
      await bomService.deleteFormulaTemplate(id);
      loadData();
      toast({ title: "Success", description: "Formula deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete formula", variant: "destructive" });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/production/bom">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Calculator
            </Button>
          </Link>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Settings className="w-10 h-10 text-blue-600" />
            Production Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure categories and formulas for cost calculations
          </p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="w-4 h-4" />
            Cost Categories
          </TabsTrigger>
          <TabsTrigger value="formulas" className="gap-2">
            <Calculator className="w-4 h-4" />
            Formula Templates
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>BOM Categories</CardTitle>
                  <CardDescription>Group production costs (e.g., Seeds, Labor, Overheads)</CardDescription>
                </div>
                <Button onClick={() => { setEditingCategory(null); setIsCategoryDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sort</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: category.color }} />
                          <span className="text-xs text-gray-500">{category.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingCategory(category); setIsCategoryDialogOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteCategory(category.id)}>
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

        {/* Formulas Tab */}
        <TabsContent value="formulas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Formula Templates</CardTitle>
                  <CardDescription>Reusable formulas for quantity calculations</CardDescription>
                </div>
                <Button onClick={() => { setEditingFormula(null); setIsFormulaDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Formula
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Formula</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formulas.map((formula) => (
                    <TableRow key={formula.id}>
                      <TableCell className="font-medium">{formula.name}</TableCell>
                      <TableCell>
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                          {formula.formula}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {formula.variables?.map(v => (
                            <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formula.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingFormula(formula); setIsFormulaDialogOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteFormula(formula.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-6 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4" />
                  Available Variables
                </h4>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <li><code>batch_size</code> - The total number of seedlings to produce</li>
                  <li><code>tray_count</code> - Calculated as <code>batch_size / 220</code></li>
                  <li>Standard math operators: <code>+ - * / ( )</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" defaultValue={editingCategory?.name} required placeholder="e.g. Labor" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input name="color" type="color" defaultValue={editingCategory?.color || "#3b82f6"} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input name="description" defaultValue={editingCategory?.description || ""} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input name="sort_order" type="number" defaultValue={editingCategory?.sort_order || 0} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Formula Dialog */}
      <Dialog open={isFormulaDialogOpen} onOpenChange={setIsFormulaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFormula ? "Edit Formula" : "Add Formula"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFormula} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" defaultValue={editingFormula?.name} required placeholder="e.g. Per Tray" />
            </div>
            <div className="space-y-2">
              <Label>Formula Expression</Label>
              <Input name="formula" defaultValue={editingFormula?.formula} required placeholder="e.g. tray_count * 50" className="font-mono" />
              <p className="text-xs text-gray-500">Supported: batch_size, tray_count, numbers, operators (+ - * /)</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editingFormula?.description || ""} placeholder="Explain what this calculates" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormulaDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}