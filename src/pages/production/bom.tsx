import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calculator, Plus, Settings, Edit, Trash2, Eye, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { bomService, BOMTemplateWithDetails } from "@/services/bomService";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";
import { useRouter } from "next/router";

export default function BOMCalculatorPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<BOMTemplateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Preview dialog state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<BOMTemplateWithDetails | null>(null);
  const [previewBatchSize, setPreviewBatchSize] = useState(0);
  const [previewCalculation, setPreviewCalculation] = useState({
    items: [] as any[],
    totalCost: 0,
    costPerSeedling: 0,
    costPerTray: 0,
    categoryTotals: {} as Record<string, number>
  });

  // Clone dialog state
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [cloneTemplate, setCloneTemplate] = useState<BOMTemplateWithDetails | null>(null);
  const [cloneName, setCloneName] = useState("");

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await bomService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({ title: "Error", description: "Failed to load BOM templates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      await bomService.deleteTemplate(id);
      loadTemplates();
      toast({ title: "Success", description: "Template deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleOpenCloneDialog = (template: BOMTemplateWithDetails) => {
    setCloneTemplate(template);
    setCloneName(`${template.name} (Copy)`);
    setIsCloneDialogOpen(true);
  };

  const handleCloneTemplate = async () => {
    if (!cloneTemplate || !cloneName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the cloned template", variant: "destructive" });
      return;
    }

    try {
      const newTemplate = await bomService.duplicateTemplate(cloneTemplate.id, cloneName.trim());
      await loadTemplates();
      setIsCloneDialogOpen(false);
      setCloneTemplate(null);
      setCloneName("");
      toast({ 
        title: "Success", 
        description: `Template "${cloneName}" created successfully`,
        action: {
          label: "Edit Now",
          onClick: () => router.push(`/production/bom/${newTemplate.id}`)
        }
      });
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({ title: "Error", description: "Failed to clone template", variant: "destructive" });
    }
  };

  const handlePreview = async (template: BOMTemplateWithDetails) => {
    try {
      const fullTemplate = await bomService.getTemplate(template.id);
      setPreviewTemplate(fullTemplate);
      setPreviewBatchSize(fullTemplate.base_batch_size);
      
      const results = bomService.calculateTemplateCost(fullTemplate, fullTemplate.base_batch_size);
      setPreviewCalculation(results);
      setIsPreviewOpen(true);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load template details", variant: "destructive" });
    }
  };

  const handleRecalculate = () => {
    if (previewTemplate) {
      const results = bomService.calculateTemplateCost(previewTemplate, previewBatchSize);
      setPreviewCalculation(results);
    }
  };

  const handleEditFromPreview = () => {
    if (previewTemplate) {
      router.push(`/production/bom/${previewTemplate.id}`);
      setIsPreviewOpen(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading templates...</div>;
  }

  const activeTemplates = templates.filter(t => t.status === "active");
  const draftTemplates = templates.filter(t => t.status === "draft");
  const archivedTemplates = templates.filter(t => t.status === "archived");

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-4 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Calculator className="w-10 h-10 text-lime-600" />
            Production Cost Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Calculate estimated costs for seedling production batches using Bill of Materials (BOM).
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href="/settings/production">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
          )}
          <Link href="/production/bom/new">
            <Button className="gap-2 bg-lime-600 hover:bg-lime-700">
              <Plus className="w-4 h-4" />
              New BOM Template
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Active Templates</CardTitle>
            <CardDescription>Ready-to-use production cost templates</CardDescription>
          </CardHeader>
          <CardContent>
            <TemplatesTable 
              templates={activeTemplates} 
              onDelete={handleDelete}
              onPreview={handlePreview}
              onClone={handleOpenCloneDialog}
              emptyMessage="No active templates. Create one or activate a draft."
            />
          </CardContent>
        </Card>

        {draftTemplates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Drafts</CardTitle>
              <CardDescription>Templates currently being worked on</CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatesTable 
                templates={draftTemplates} 
                onDelete={handleDelete}
                onPreview={handlePreview}
                onClone={handleOpenCloneDialog}
                emptyMessage="No draft templates."
              />
            </CardContent>
          </Card>
        )}

        {archivedTemplates.length > 0 && (
          <Card className="opacity-75">
            <CardHeader>
              <CardTitle>Archived</CardTitle>
              <CardDescription>Old or unused templates</CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatesTable 
                templates={archivedTemplates} 
                onDelete={handleDelete}
                onPreview={handlePreview}
                onClone={handleOpenCloneDialog}
                emptyMessage="No archived templates."
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Clone Template Dialog */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
            <DialogDescription>
              Create a copy of "{cloneTemplate?.name}" with all its items and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cloneName">New Template Name *</Label>
              <Input
                id="cloneName"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for cloned template"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloneTemplate} className="gap-2 bg-lime-600 hover:bg-lime-700">
              <Copy className="w-4 h-4" />
              Clone Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">{previewTemplate?.name}</DialogTitle>
                <DialogDescription>{previewTemplate?.description || "No description"}</DialogDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={previewTemplate?.status === "active" ? "default" : "secondary"}>
                  {previewTemplate?.status}
                </Badge>
                <Button onClick={handleEditFromPreview} variant="outline" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Template
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Label htmlFor="previewBatchSize" className="text-sm font-medium">Batch Size:</Label>
              <Input
                id="previewBatchSize"
                type="number"
                value={previewBatchSize}
                onChange={(e) => setPreviewBatchSize(parseInt(e.target.value) || 0)}
                className="w-32 text-right font-mono"
              />
              <Button onClick={handleRecalculate} variant="outline" size="sm">
                Recalculate
              </Button>
              <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                Trays Needed: <span className="font-semibold">{Math.ceil(previewBatchSize / 220)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950 dark:to-green-950 border-lime-200 dark:border-lime-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-lime-700 dark:text-lime-300">Total Batch Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-lime-900 dark:text-lime-100">
                    K{formatNumber(previewCalculation.totalCost)}
                  </div>
                  <p className="text-xs text-lime-600 dark:text-lime-400 mt-1">
                    K{previewCalculation.costPerSeedling.toFixed(2)} per seedling
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-blue-700 dark:text-blue-300">Per Seedling</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    K{previewCalculation.costPerSeedling.toFixed(2)}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Unit cost
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-purple-700 dark:text-purple-300">Per Tray (220)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    K{formatNumber(previewCalculation.costPerTray)}
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Tray cost
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewCalculation.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No items in this template
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewCalculation.items.map((item) => (
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
                                {item.item_type === "inventory" 
                                  ? item.inventory_items?.name 
                                  : item.custom_name}
                              </span>
                              {item.notes && (
                                <span className="text-xs text-gray-500">{item.notes}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(item.calculatedQuantity)}
                            <span className="text-xs text-gray-500 ml-1">
                              {item.item_type === "inventory" 
                                ? item.inventory_items?.unit_of_measure 
                                : item.custom_unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            K{formatNumber(
                              item.item_type === "inventory" 
                                ? Number(item.inventory_items?.unit_price) 
                                : Number(item.custom_unit_price)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            K{formatNumber(item.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(previewCalculation.categoryTotals).map(([category, total]) => {
                    const percentage = previewCalculation.totalCost > 0 ? (total / previewCalculation.totalCost) * 100 : 0;
                    return (
                      <div key={category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{category}</span>
                            <span className="text-sm font-semibold">K{formatNumber(total)}</span>
                          </div>
                          <div className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(previewCalculation.categoryTotals).length === 0 && (
                    <p className="text-center text-gray-500 py-4">No categories</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplatesTable({ 
  templates, 
  onDelete,
  onPreview,
  onClone,
  emptyMessage
}: { 
  templates: BOMTemplateWithDetails[], 
  onDelete: (id: string, name: string) => void,
  onPreview: (template: BOMTemplateWithDetails) => void,
  onClone: (template: BOMTemplateWithDetails) => void,
  emptyMessage: string 
}) {
  if (templates.length === 0) {
    return <div className="text-center py-8 text-gray-500 italic">{emptyMessage}</div>;
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Template Name</TableHead>
            <TableHead>Plant Type</TableHead>
            <TableHead>Base Batch Size</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map(template => (
            <TableRow key={template.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{template.name}</span>
                  {template.description && (
                    <span className="text-xs text-gray-500 truncate max-w-[280px]">
                      {template.description}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {template.plant_types ? (
                  <div className="flex flex-col">
                    <span>{template.plant_types.name}</span>
                    <Badge variant="outline" className="w-fit text-xs mt-1">
                      {template.plant_types.variety}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>{formatNumber(template.base_batch_size)}</TableCell>
              <TableCell>{template.profiles?.full_name || "Unknown"}</TableCell>
              <TableCell>{new Date(template.updated_at || "").toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
                    onClick={() => onPreview(template)}
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </Button>
                  <Link href={`/production/bom/${template.id}`}>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="gap-2 text-purple-600 border-purple-600 hover:bg-purple-50"
                    onClick={() => onClone(template)}
                    title="Clone this template"
                  >
                    <Copy className="w-3 h-3" />
                    Clone
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(template.id, template.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}