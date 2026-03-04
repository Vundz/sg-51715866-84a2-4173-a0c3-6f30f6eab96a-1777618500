import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { scoutingSettingsService } from "@/services/scoutingSettingsService";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Edit, Trash2, Download, Archive, ArchiveRestore, GripVertical, Bug, Biohazard, Leaf, Zap, Search } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type PestType = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

type DiseaseType = PestType;
type NutrientType = PestType;
type ActionType = PestType & { category: string };

type ItemType = "pest" | "disease" | "nutrient" | "action";

// Sortable Row Component
function SortableRow({ 
  item, 
  type, 
  onEdit, 
  onArchive, 
  onDelete 
}: { 
  item: any; 
  type: ItemType; 
  onEdit: () => void; 
  onArchive: () => void; 
  onDelete: () => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {item.description || "—"}
      </TableCell>
      {type === "action" && (
        <TableCell>
          <Badge variant="outline">
            {item.category}
          </Badge>
        </TableCell>
      )}
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ScoutingSettings() {
  const router = useRouter();
  const { toast } = useToast();

  // State for each category
  const [pestTypes, setPestTypes] = useState<PestType[]>([]);
  const [diseaseTypes, setDiseaseTypes] = useState<DiseaseType[]>([]);
  const [nutrientTypes, setNutrientTypes] = useState<NutrientType[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Permission state
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [currentType, setCurrentType] = useState<ItemType>("pest");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "all",
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState("pests");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check admin permissions
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
      loadAllData();
    } catch (error) {
      console.error("Permission check error:", error);
      router.push("/");
    }
  };

  // Load all category data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [pests, diseases, nutrients, actions] = await Promise.all([
        scoutingSettingsService.getAllPestTypes(),
        scoutingSettingsService.getAllDiseaseTypes(),
        scoutingSettingsService.getAllNutrientTypes(),
        scoutingSettingsService.getAllActions(),
      ]);

      setPestTypes(pests || []);
      setDiseaseTypes(diseases || []);
      setNutrientTypes(nutrients || []);
      setActionTypes(actions || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load scouting settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent, type: ItemType) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    let items: any[];
    let setItems: (items: any[]) => void;

    switch (type) {
      case "pest":
        items = getActiveItems(pestTypes);
        setItems = (newItems) => setPestTypes([...newItems, ...getArchivedItems(pestTypes)]);
        break;
      case "disease":
        items = getActiveItems(diseaseTypes);
        setItems = (newItems) => setDiseaseTypes([...newItems, ...getArchivedItems(diseaseTypes)]);
        break;
      case "nutrient":
        items = getActiveItems(nutrientTypes);
        setItems = (newItems) => setNutrientTypes([...newItems, ...getArchivedItems(nutrientTypes)]);
        break;
      case "action":
        items = getActiveItems(actionTypes);
        setItems = (newItems) => setActionTypes([...newItems, ...getArchivedItems(actionTypes)]);
        break;
      default:
        return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    // Save new order to database
    try {
      const orderedIds = newItems.map((item) => item.id);
      
      switch (type) {
        case "pest":
          await scoutingSettingsService.reorderPestTypes(orderedIds);
          break;
        case "disease":
          await scoutingSettingsService.reorderDiseaseTypes(orderedIds);
          break;
        case "nutrient":
          await scoutingSettingsService.reorderNutrientTypes(orderedIds);
          break;
        case "action":
          await scoutingSettingsService.reorderActions(orderedIds);
          break;
      }

      toast({
        title: "Order Updated",
        description: `${capitalize(type)} types reordered successfully.`,
      });
    } catch (error) {
      console.error("Reorder error:", error);
      toast({
        title: "Error",
        description: `Failed to save new order.`,
        variant: "destructive",
      });
      // Reload to restore correct order
      loadAllData();
    }
  };

  // Open Add Modal
  const openAddModal = (type: ItemType) => {
    setCurrentType(type);
    setFormData({ name: "", description: "", category: "all" });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (type: ItemType, item: any) => {
    setCurrentType(type);
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category || "all",
    });
    setShowEditModal(true);
  };

  // Open Delete Modal
  const openDeleteModal = (type: ItemType, item: any) => {
    setCurrentType(type);
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  // Handle Create
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let result;
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        ...(currentType === "action" && { category: formData.category }),
      };

      switch (currentType) {
        case "pest":
          result = await scoutingSettingsService.createPestType(data);
          break;
        case "disease":
          result = await scoutingSettingsService.createDiseaseType(data);
          break;
        case "nutrient":
          result = await scoutingSettingsService.createNutrientType(data);
          break;
        case "action":
          result = await scoutingSettingsService.createAction(data);
          break;
      }

      if (result) {
        toast({
          title: "Success",
          description: `${capitalize(currentType)} type created successfully.`,
        });
        setShowAddModal(false);
        loadAllData();
      }
    } catch (error) {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: `Failed to create ${currentType} type.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Update
  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        ...(currentType === "action" && { category: formData.category }),
      };

      let result;
      switch (currentType) {
        case "pest":
          result = await scoutingSettingsService.updatePestType(editingItem.id, data);
          break;
        case "disease":
          result = await scoutingSettingsService.updateDiseaseType(editingItem.id, data);
          break;
        case "nutrient":
          result = await scoutingSettingsService.updateNutrientType(editingItem.id, data);
          break;
        case "action":
          result = await scoutingSettingsService.updateAction(editingItem.id, data);
          break;
      }

      if (result) {
        toast({
          title: "Success",
          description: `${capitalize(currentType)} type updated successfully.`,
        });
        setShowEditModal(false);
        setEditingItem(null);
        loadAllData();
      }
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: `Failed to update ${currentType} type.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Archive/Restore
  const handleArchiveToggle = async (type: ItemType, item: any) => {
    setSaving(true);
    try {
      let result;
      const action = item.is_active ? "archive" : "restore";

      switch (type) {
        case "pest":
          result = item.is_active
            ? await scoutingSettingsService.archivePestType(item.id)
            : await scoutingSettingsService.restorePestType(item.id);
          break;
        case "disease":
          result = item.is_active
            ? await scoutingSettingsService.archiveDiseaseType(item.id)
            : await scoutingSettingsService.restoreDiseaseType(item.id);
          break;
        case "nutrient":
          result = item.is_active
            ? await scoutingSettingsService.archiveNutrientType(item.id)
            : await scoutingSettingsService.restoreNutrientType(item.id);
          break;
        case "action":
          result = item.is_active
            ? await scoutingSettingsService.archiveAction(item.id)
            : await scoutingSettingsService.restoreAction(item.id);
          break;
      }

      if (result) {
        toast({
          title: "Success",
          description: `${capitalize(type)} type ${action}d successfully.`,
        });
        loadAllData();
      }
    } catch (error) {
      console.error("Archive/Restore error:", error);
      toast({
        title: "Error",
        description: `Failed to ${item.is_active ? "archive" : "restore"} ${type} type.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Permanent Delete
  const handleDelete = async () => {
    setSaving(true);
    try {
      let result;
      switch (currentType) {
        case "pest":
          result = await scoutingSettingsService.deletePestType(deletingItem.id);
          break;
        case "disease":
          result = await scoutingSettingsService.deleteDiseaseType(deletingItem.id);
          break;
        case "nutrient":
          result = await scoutingSettingsService.deleteNutrientType(deletingItem.id);
          break;
        case "action":
          result = await scoutingSettingsService.deleteAction(deletingItem.id);
          break;
      }

      if (result) {
        toast({
          title: "Success",
          description: `${capitalize(currentType)} type deleted permanently.`,
        });
        setShowDeleteModal(false);
        setDeletingItem(null);
        loadAllData();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: `Failed to delete ${currentType} type.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Export
  const handleExport = async (type: ItemType, format: "json" | "csv") => {
    try {
      let data;
      let filename;

      switch (type) {
        case "pest":
          data = format === "json"
            ? await scoutingSettingsService.exportPestTypesJSON()
            : await scoutingSettingsService.exportPestTypesCSV();
          filename = `pest-types.${format}`;
          break;
        case "disease":
          data = format === "json"
            ? await scoutingSettingsService.exportDiseaseTypesJSON()
            : await scoutingSettingsService.exportDiseaseTypesCSV();
          filename = `disease-types.${format}`;
          break;
        case "nutrient":
          data = format === "json"
            ? await scoutingSettingsService.exportNutrientTypesJSON()
            : await scoutingSettingsService.exportNutrientTypesCSV();
          filename = `nutrient-types.${format}`;
          break;
        case "action":
          data = format === "json"
            ? await scoutingSettingsService.exportActionsJSON()
            : await scoutingSettingsService.exportActionsCSV();
          filename = `actions.${format}`;
          break;
      }

      // Create download
      const blob = new Blob([data], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `${capitalize(type)} types exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: `Failed to export ${type} types.`,
        variant: "destructive",
      });
    }
  };

  // Filter items by search
  const filterItems = (items: any[]) => {
    if (!searchQuery.trim()) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  // Utility functions
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const getActiveItems = (items: any[]) => items.filter(item => item.is_active);
  const getArchivedItems = (items: any[]) => items.filter(item => !item.is_active);

  // Render category table
  const renderCategoryTable = (type: ItemType, items: any[], icon: React.ReactNode) => {
    const activeItems = filterItems(getActiveItems(items));
    const archivedItems = filterItems(getArchivedItems(items));

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-lg font-semibold">
              {capitalize(type)} Types
            </h3>
            <Badge variant="secondary">{items.length} total</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport(type, "csv")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport(type, "json")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => openAddModal(type)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${type}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Active Items with Drag and Drop */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Active {capitalize(type)}s ({activeItems.length})
            </CardTitle>
            <CardDescription>
              Drag items to reorder. These items appear in the scouting form dropdowns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active {type}s found
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, type)}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      {type === "action" && <TableHead>Category</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={activeItems.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {activeItems.map((item) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          type={type}
                          onEdit={() => openEditModal(type, item)}
                          onArchive={() => handleArchiveToggle(type, item)}
                          onDelete={() => openDeleteModal(type, item)}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Archived Items */}
        {archivedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Archived {capitalize(type)}s ({archivedItems.length})
              </CardTitle>
              <CardDescription>
                These items are hidden from forms but still visible in old reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    {type === "action" && <TableHead>Category</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedItems.map((item) => (
                    <TableRow key={item.id} className="opacity-60">
                      <TableCell className="font-medium">
                        {item.name}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Archived
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.description || "—"}
                      </TableCell>
                      {type === "action" && (
                        <TableCell>
                          <Badge variant="outline">
                            {item.category}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(type, item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveToggle(type, item)}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(type, item)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Scouting Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Manage pest types, disease types, nutrient deficiencies, and recommended actions
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pests">
              <Bug className="h-4 w-4 mr-2" />
              Pest Types
            </TabsTrigger>
            <TabsTrigger value="diseases">
              <Biohazard className="h-4 w-4 mr-2" />
              Disease Types
            </TabsTrigger>
            <TabsTrigger value="nutrients">
              <Leaf className="h-4 w-4 mr-2" />
              Nutrient Types
            </TabsTrigger>
            <TabsTrigger value="actions">
              <Zap className="h-4 w-4 mr-2" />
              Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pests">
            {renderCategoryTable("pest", pestTypes, <Bug className="h-5 w-5 text-primary" />)}
          </TabsContent>

          <TabsContent value="diseases">
            {renderCategoryTable("disease", diseaseTypes, <Biohazard className="h-5 w-5 text-primary" />)}
          </TabsContent>

          <TabsContent value="nutrients">
            {renderCategoryTable("nutrient", nutrientTypes, <Leaf className="h-5 w-5 text-primary" />)}
          </TabsContent>

          <TabsContent value="actions">
            {renderCategoryTable("action", actionTypes, <Zap className="h-5 w-5 text-primary" />)}
          </TabsContent>
        </Tabs>

        {/* Add Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New {capitalize(currentType)} Type</DialogTitle>
              <DialogDescription>
                Create a new {currentType} type that will appear in the scouting form
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`Enter ${currentType} name`}
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={`Enter ${currentType} description`}
                  rows={3}
                />
              </div>

              {currentType === "action" && (
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="pest">Pest</SelectItem>
                      <SelectItem value="disease">Disease</SelectItem>
                      <SelectItem value="nutrient">Nutrient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create {capitalize(currentType)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {capitalize(currentType)} Type</DialogTitle>
              <DialogDescription>
                Update the {currentType} type information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`Enter ${currentType} name`}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={`Enter ${currentType} description`}
                  rows={3}
                />
              </div>

              {currentType === "action" && (
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="pest">Pest</SelectItem>
                      <SelectItem value="disease">Disease</SelectItem>
                      <SelectItem value="nutrient">Nutrient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update {capitalize(currentType)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {capitalize(currentType)} Type</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete "{deletingItem?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">⚠️ Warning</p>
              <p className="text-sm text-muted-foreground mt-1">
                This will permanently delete the {currentType} type from the database. 
                Consider archiving instead to preserve historical data.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}