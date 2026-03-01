import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { scoutingService, CreateScoutingReportData } from "@/services/scoutingService";
import { plantingService } from "@/services/plantingService";
import { Bug, Leaf, Thermometer, AlertTriangle, ArrowLeft, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

// Define initial empty state structure
const INITIAL_PESTS = [
  "Aphids", "Whiteflies", "Thrips", "Cutworms", "Fungus Gnats", "Leaf Miners"
].map(pest => ({
  pest_type: pest,
  present: false,
  severity: 1,
  trays_affected_percent: 0,
  location_pattern: "Random",
  action_required: ""
}));

const INITIAL_DISEASES = [
  "Damping Off", "Powdery Mildew", "Downy Mildew", "Botrytis", "Root Rot"
].map(disease => ({
  disease_type: disease,
  present: false,
  severity: 1,
  trays_affected_percent: 0,
  notes: "",
  recommended_action: ""
}));

const SYMPTOMS = [
  "Yellow older leaves",
  "Interveinal yellowing",
  "Purple leaves",
  "Burnt leaf edges",
  "Deformed new leaves",
  "Stunted growth",
  "Uneven growth"
];

export default function NewScoutingReport() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [plantings, setPlantings] = useState<any[]>([]);
  
  // Form State
  const [formData, setFormData] = useState<CreateScoutingReportData>({
    planting_id: "",
    scouting_date: new Date().toISOString().split('T')[0],
    greenhouse: "",
    crop_type: "",
    variety: "",
    seedling_age_days: 0,
    scout_name: "",
    weather_conditions: "",
    recent_spray: false,
    spray_chemical_name: "",
    spray_application_date: "",
    overall_health_rating: 3,
    general_notes: "",
    pests: INITIAL_PESTS,
    diseases: INITIAL_DISEASES,
    nutrients: []
  });

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  useEffect(() => {
    loadPlantings();
  }, []);

  const loadPlantings = async () => {
    try {
      const data = await plantingService.getPlantings();
      // Filter only active plantings
      setPlantings(data.filter(p => p.current_status === 'germination' || p.current_status === 'growth'));
    } catch (error) {
      console.error("Error loading plantings:", error);
    }
  };

  const handlePlantingChange = (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (planting) {
      // Calculate age
      const plantedDate = new Date(planting.planting_date);
      const today = new Date();
      const ageInDays = Math.floor((today.getTime() - plantedDate.getTime()) / (1000 * 3600 * 24));

      setFormData(prev => ({
        ...prev,
        planting_id: plantingId,
        greenhouse: planting.locations?.name || "",
        crop_type: planting.plant_types?.name || "",
        variety: planting.plant_types?.variety || "",
        seedling_age_days: ageInDays > 0 ? ageInDays : 0
      }));
    }
  };

  const updatePest = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newPests = [...prev.pests];
      newPests[index] = { ...newPests[index], [field]: value };
      return { ...prev, pests: newPests };
    });
  };

  const updateDisease = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newDiseases = [...prev.diseases];
      newDiseases[index] = { ...newDiseases[index], [field]: value };
      return { ...prev, diseases: newDiseases };
    });
  };

  const handleSymptomToggle = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
      setFormData(prev => ({
        ...prev,
        nutrients: prev.nutrients.filter(n => n.symptom !== symptom)
      }));
    } else {
      setSelectedSymptoms(prev => [...prev, symptom]);
      setFormData(prev => ({
        ...prev,
        nutrients: [
          ...prev.nutrients,
          {
            symptom,
            severity: 1,
            suspected_deficiency: scoutingService.getNutrientSuggestion(symptom),
            notes: ""
          }
        ]
      }));
    }
  };

  const updateNutrient = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newNutrients = [...prev.nutrients];
      newNutrients[index] = { ...newNutrients[index], [field]: value };
      return { ...prev, nutrients: newNutrients };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await scoutingService.createReport(formData);
      toast({
        title: "Success",
        description: "Scouting report submitted successfully",
      });
      router.push("/scouting");
    } catch (error) {
      console.error("Error creating report:", error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Scouting Report</h1>
          <p className="text-gray-500">Record crop observations and issues</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION A: Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-blue-500" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Select Planting (Batch)</Label>
              <Select onValueChange={handlePlantingChange} value={formData.planting_id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select active batch..." />
                </SelectTrigger>
                <SelectContent>
                  {plantings.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.batch_number} - {p.plant_types?.name} ({p.locations?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scouting Date</Label>
              <Input 
                type="date" 
                required
                value={formData.scouting_date}
                onChange={e => setFormData({...formData, scouting_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Greenhouse Location</Label>
              <Select 
                value={formData.greenhouse} 
                onValueChange={v => setFormData({...formData, greenhouse: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GH1">GH1</SelectItem>
                  <SelectItem value="GH2">GH2</SelectItem>
                  <SelectItem value="GH3">GH3</SelectItem>
                  <SelectItem value="GH4">GH4</SelectItem>
                  <SelectItem value="ShadeNet">ShadeNet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Crop Type</Label>
              <Select 
                value={formData.crop_type} 
                onValueChange={v => setFormData({...formData, crop_type: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tomato">Tomato</SelectItem>
                  <SelectItem value="Cabbage">Cabbage</SelectItem>
                  <SelectItem value="Rape">Rape</SelectItem>
                  <SelectItem value="Onion">Onion</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variety</Label>
              <Input 
                value={formData.variety}
                onChange={e => setFormData({...formData, variety: e.target.value})}
                placeholder="e.g. Rodade"
              />
            </div>

            <div className="space-y-2">
              <Label>Seedling Age (Days)</Label>
              <Input 
                type="number"
                value={formData.seedling_age_days}
                onChange={e => setFormData({...formData, seedling_age_days: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Scout Name</Label>
              <Input 
                required
                value={formData.scout_name}
                onChange={e => setFormData({...formData, scout_name: e.target.value})}
                placeholder="Name of inspector"
              />
            </div>

            <div className="space-y-2">
              <Label>Weather Conditions</Label>
              <Select 
                value={formData.weather_conditions} 
                onValueChange={v => setFormData({...formData, weather_conditions: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select weather" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Humid">Humid</SelectItem>
                  <SelectItem value="Cool">Cool</SelectItem>
                  <SelectItem value="Cloudy">Cloudy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Recent Spray Applied (Last 7 Days)?</Label>
                <Switch 
                  checked={formData.recent_spray}
                  onCheckedChange={c => setFormData({...formData, recent_spray: c})}
                />
              </div>

              {formData.recent_spray && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
                  <div className="space-y-2">
                    <Label>Chemical Name</Label>
                    <Input 
                      value={formData.spray_chemical_name}
                      onChange={e => setFormData({...formData, spray_chemical_name: e.target.value})}
                      placeholder="Product used"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Application Date</Label>
                    <Input 
                      type="date"
                      value={formData.spray_application_date}
                      onChange={e => setFormData({...formData, spray_application_date: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION B: Pest Scouting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-500" />
              Pest Scouting
            </CardTitle>
            <CardDescription>Record pest observations for each category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.pests.map((pest, index) => (
              <div key={pest.pest_type} className="border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg">{pest.pest_type}</h3>
                  <div className="flex items-center gap-2">
                    <Label>Present?</Label>
                    <Switch 
                      checked={pest.present}
                      onCheckedChange={(c) => updatePest(index, "present", c)}
                    />
                  </div>
                </div>

                {pest.present && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Severity (1-3)</Label>
                      <Select 
                        value={pest.severity.toString()} 
                        onValueChange={v => updatePest(index, "severity", parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Low (1)</SelectItem>
                          <SelectItem value="2">Medium (2)</SelectItem>
                          <SelectItem value="3">High (3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Est. % Trays Affected</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min="0" 
                          max="100"
                          value={pest.trays_affected_percent}
                          onChange={e => updatePest(index, "trays_affected_percent", parseInt(e.target.value) || 0)}
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                      {pest.trays_affected_percent > 10 && (
                        <p className="text-red-500 text-xs font-semibold">⚠️ Action Required (>10%)</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Location Pattern</Label>
                      <Select 
                        value={pest.location_pattern} 
                        onValueChange={v => updatePest(index, "location_pattern", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Edge">Edge</SelectItem>
                          <SelectItem value="Center">Center</SelectItem>
                          <SelectItem value="Uniform">Uniform</SelectItem>
                          <SelectItem value="Random">Random</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Action Required</Label>
                      <Input 
                        value={pest.action_required}
                        onChange={e => updatePest(index, "action_required", e.target.value)}
                        placeholder="Recommended treatment..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SECTION C: Disease Scouting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-orange-500" />
              Disease Scouting
            </CardTitle>
            <CardDescription>Check for common fungal and bacterial diseases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.diseases.map((disease, index) => (
              <div key={disease.disease_type} className="border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg">{disease.disease_type}</h3>
                  <div className="flex items-center gap-2">
                    <Label>Present?</Label>
                    <Switch 
                      checked={disease.present}
                      onCheckedChange={(c) => updateDisease(index, "present", c)}
                    />
                  </div>
                </div>

                {disease.present && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Severity (1-3)</Label>
                      <Select 
                        value={disease.severity.toString()} 
                        onValueChange={v => updateDisease(index, "severity", parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Low (1)</SelectItem>
                          <SelectItem value="2">Medium (2)</SelectItem>
                          <SelectItem value="3">High (3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>% Trays Affected</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min="0" 
                          max="100"
                          value={disease.trays_affected_percent}
                          onChange={e => updateDisease(index, "trays_affected_percent", parseInt(e.target.value) || 0)}
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>

                    {/* Logic-based alerts */}
                    {disease.disease_type === "Damping Off" && disease.trays_affected_percent > 5 && (
                      <div className="col-span-full">
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Critical Alert</AlertTitle>
                          <AlertDescription>
                            Damping Off {'>'} 5% - Immediate Intervention Required!
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {disease.disease_type === "Root Rot" && (
                      <div className="col-span-full">
                         <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
                          <AlertDescription className="text-orange-800 dark:text-orange-200">
                            ⚠️ Root Rot detected. Please inspect drainage system immediately.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    <div className="space-y-2 col-span-full">
                      <Label>Notes / Recommended Action</Label>
                      <Textarea 
                        value={disease.notes}
                        onChange={e => updateDisease(index, "notes", e.target.value)}
                        placeholder="Describe symptoms and treatment..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SECTION D: Nutrient Deficiencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Nutrient Deficiencies
            </CardTitle>
            <CardDescription>Select observed symptoms to identify deficiencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Observed Symptoms (Select all that apply)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {SYMPTOMS.map(symptom => (
                  <div key={symptom} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer" onClick={() => handleSymptomToggle(symptom)}>
                    <Checkbox 
                      id={`symptom-${symptom}`} 
                      checked={selectedSymptoms.includes(symptom)}
                      onCheckedChange={() => handleSymptomToggle(symptom)}
                    />
                    <label 
                      htmlFor={`symptom-${symptom}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {symptom}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {formData.nutrients.length > 0 && (
              <div className="space-y-4 mt-6 border-t pt-6">
                <h3 className="font-semibold text-lg">Deficiency Analysis</h3>
                {formData.nutrients.map((nutrient, index) => (
                  <div key={nutrient.symptom} className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-200">{nutrient.symptom}</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Suspected Deficiency: <span className="font-bold">{nutrient.suspected_deficiency}</span>
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleSymptomToggle(nutrient.symptom)}>
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <Select 
                          value={nutrient.severity.toString()} 
                          onValueChange={v => updateNutrient(index, "severity", parseInt(v))}
                        >
                          <SelectTrigger className="bg-white dark:bg-black">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Low (1)</SelectItem>
                            <SelectItem value="2">Medium (2)</SelectItem>
                            <SelectItem value="3">High (3)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input 
                          value={nutrient.notes}
                          onChange={e => updateNutrient(index, "notes", e.target.value)}
                          placeholder="Corrective action..."
                          className="bg-white dark:bg-black"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overall Health Rating */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Overall Health Rating (1-5)</Label>
                <span className="font-bold text-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">
                  {formData.overall_health_rating}/5
                </span>
              </div>
              <Slider 
                min={1} 
                max={5} 
                step={1} 
                value={[formData.overall_health_rating]} 
                onValueChange={v => setFormData({...formData, overall_health_rating: v[0]})}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Critical</span>
                <span>Poor</span>
                <span>Fair</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>General Notes</Label>
              <Textarea 
                value={formData.general_notes}
                onChange={e => setFormData({...formData, general_notes: e.target.value})}
                placeholder="Any other observations or recommendations..."
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4 sticky bottom-4 bg-white/90 dark:bg-slate-950/90 p-4 border rounded-lg shadow-lg backdrop-blur-sm z-10">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 min-w-[150px]">
            {loading ? "Saving..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}