import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Plus, Settings, Edit, Trash2, ArrowRight, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { bomService, BOMTemplateWithDetails } from "@/services/bomService";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";

export default function BOMCalculatorPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<BOMTemplateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading templates...</div>;
  }

  // Group templates by status
  const activeTemplates = templates.filter(t => t.status === 'active');
  const draftTemplates = templates.filter(t => t.status === 'draft');
  const archivedTemplates = templates.filter(t => t.status === 'archived');

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
        {/* Active Templates Section */}
        <Card>
          <CardHeader>
            <CardTitle>Active Templates</CardTitle>
            <CardDescription>Ready-to-use production cost templates</CardDescription>
          </CardHeader>
          <CardContent>
            <TemplatesTable 
              templates={activeTemplates} 
              onDelete={handleDelete}
              emptyMessage="No active templates. Create one or activate a draft."
            />
          </CardContent>
        </Card>

        {/* Draft Templates Section */}
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
                emptyMessage="No draft templates."
              />
            </CardContent>
          </Card>
        )}

        {/* Archived Templates Section */}
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
                emptyMessage="No archived templates."
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TemplatesTable({ 
  templates, 
  onDelete,
  emptyMessage
}: { 
  templates: BOMTemplateWithDetails[], 
  onDelete: (id: string, name: string) => void,
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
                  <Link href={`/production/bom/${template.id}`}>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                  </Link>
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