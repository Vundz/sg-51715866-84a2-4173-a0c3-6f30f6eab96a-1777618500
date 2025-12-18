import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { bomService } from "@/services/bomService";
import { plantTypeService } from "@/services/plantTypeService";

export default function NewBOMTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [plantTypes, setPlantTypes] = useState<{name: string, variety: string, id: string}[]>([]);
  const [selectedPlantType, setSelectedPlantType] = useState<string>("");

  useEffect(() => {
    loadPlantTypes();
  }, []);

  const loadPlantTypes = async () => {
    try {
      const types = await plantTypeService.getPlantTypes();
      setPlantTypes(types);
    } catch (error) {
      console.error("Error loading plant types:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const plantType = plantTypes.find(pt => pt.id === selectedPlantType);

    try {
      const template = await bomService.createTemplate({
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        base_batch_size: parseInt(formData.get("base_batch_size") as string),
        plant_type_id: plantType?.id || null,
        variety: plantType?.variety || null,
        status: "draft",
        created_by: user?.id || null,
        target_selling_price: parseFloat(formData.get("target_selling_price") as string) || 0,
        estimated_success_rate: parseFloat(formData.get("estimated_success_rate") as string) || 95,
      });

      toast({ title: "Success", description: "Template created successfully" });
      router.push(`/production/bom/${template.id}`);
    } catch (error) {
      console.error("Error creating template:", error);
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link href="/production/bom">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </Button>
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New BOM Template</CardTitle>
          <CardDescription>Start a new production cost calculation template</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input id="name" name="name" required placeholder="e.g. Tomato Cherry Red - 5000 Batch" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_batch_size">Base Batch Size *</Label>
                <Input 
                  id="base_batch_size" 
                  name="base_batch_size" 
                  type="number" 
                  required 
                  defaultValue="1000"
                  min="1"
                />
                <p className="text-xs text-gray-500">Default quantity for calculations</p>
              </div>

              <div className="space-y-2">
                <Label>Plant Type (Optional)</Label>
                <Select value={selectedPlantType} onValueChange={setSelectedPlantType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plant type" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantTypes.map(pt => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name} - {pt.variety}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_selling_price">Target Selling Price (ZMW)</Label>
                <Input 
                  id="target_selling_price" 
                  name="target_selling_price" 
                  type="number" 
                  step="0.01" 
                  defaultValue="0.00"
                  min="0"
                />
                <p className="text-xs text-gray-500">Expected price per seedling</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_success_rate">Success Rate (%)</Label>
                <Input 
                  id="estimated_success_rate" 
                  name="estimated_success_rate" 
                  type="number" 
                  step="0.1" 
                  defaultValue="95"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500">Estimated survival rate</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Notes about this production method..." 
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/production/bom">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-lime-600 hover:bg-lime-700">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create & Continue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}