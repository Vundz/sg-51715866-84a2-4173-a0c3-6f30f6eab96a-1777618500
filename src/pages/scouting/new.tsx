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
import { locationService } from "@/services/locationService";
import { treatmentService } from "@/services/treatmentService";
import { Bug, Leaf, Thermometer, AlertTriangle, ArrowLeft, Save, Trash2, Search } from "lucide-react";
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
  const [locations, setLocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  
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
    overall_health_rating: 3,
    general_notes: "",
    pests: INITIAL_PESTS,
    diseases: INITIAL_DISEASES,
    nutrients: []
  });

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plantingsData, locationsData] = await Promise.all([
        plantingService.getPlantingsWithDetails(),
        locationService.getLocations()
      ]);
      
      // Filter only active plantings (status = 'active')
      setPlantings(plantingsData.filter(p => p.status === 'active'));
      setLocations(locationsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  // Filter plantings based on search query
  const filteredPlantings = plantings.filter(p => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const cropType = p.plant_types?.name?.toLowerCase() || "";
    const variety = p.plant_types?.variety?.toLowerCase() || "";
    const batchNumber = p.batch_number?.toLowerCase() || "";
    
    return cropType.includes(query) || 
           variety.includes(query) || 
           batchNumber.includes(query);
  });

  const handlePlantingChange = async (plantingId: string) => {
    const planting = plantings.find(p => p.id === plantingId);
    if (planting) {
      // Calculate age
      const plantedDate = new Date(planting.date_planted);
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

      // Load recent treatments for this planting
      try {
        const treatments = await treatmentService.getRecentTreatmentsForPlanting(plantingId, 7);
        setRecentTreatments(treatments);
      } catch (error) {
        console.error("Error loading recent treatments:", error);
        setRecentTreatments([]);
      }
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
            <div className="space-y-2 col-span-full">
              <Label>Search Planting (by Crop, Variety, or Batch)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search for a batch..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 col-span-full">
              <Label>Select Planting (Batch) *</Label>
              <Select onValueChange={handlePlantingChange} value={formData.planting_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select active batch..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredPlantings.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      {searchQuery ? "No batches match your search" : "No active batches available"}
                    </div>
                  ) : (
                    filteredPlantings.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.batch_number}</span>
                          <span className="text-xs text-gray-500">
                            {p.plant_types?.name} {p.plant_types?.variety ? `- ${p.plant_types?.variety}` : ""} 
                            {" "}({p.locations?.name})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {searchQuery && filteredPlantings.length > 0 && (
                <p className="text-xs text-gray-500">
                  Showing {filteredPlantings.length} of {plantings.length} batches
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Scouting Date *</Label>
              <Input 
                type="date" 
                required
                value={formData.scouting_date}
                onChange={e => setFormData({...formData, scouting_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Greenhouse Location *</Label>
              <Select 
                value={formData.greenhouse} 
                onValueChange={v => setFormData({...formData, greenhouse: v})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Crop Type</Label>
              <Input 
                value={formData.crop_type}
                onChange={e => setFormData({...formData, crop_type: e.target.value})}
                placeholder="Auto-filled from batch"
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Variety</Label>
              <Input 
                value={formData.variety}
                onChange={e => setFormData({...formData, variety: e.target.value})}
                placeholder="Auto-filled from batch"
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Seedling Age (Days)</Label>
              <Input 
                type="number"
                value={formData.seedling_age_days}
                onChange={e => setFormData({...formData, seedling_age_days: parseInt(e.target.value) || 0})}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Scout Name *</Label>
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
                  <SelectItem value="Rainy">Rainy</SelectItem>
                  <SelectItem value="Windy">Windy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Recent Treatment History (Last 7 Days)</Label>
                  <p className="text-sm text-gray-500 mt-1">Automatic history from Treatments module</p>
                </div>
                {recentTreatments.length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                    {recentTreatments.length} treatment{recentTreatments.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {!formData.planting_id ? (
                <Alert>
                  <AlertDescription>
                    Select a batch above to view recent treatment history
                  </AlertDescription>
                </Alert>
              ) : recentTreatments.length === 0 ? (
                <Alert>
                  <AlertDescription className="text-center py-4">
                    <div className="text-gray-500">No treatments applied in the last 7 days</div>
                    <div className="text-sm text-gray-400 mt-2">
                      ℹ️ All observations should be under normal conditions
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Chemical
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Target
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Applied By
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Days Ago
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                        {recentTreatments.map((treatment, index) => {
                          const treatmentDate = new Date(treatment.treatment_date);
                          const today = new Date();
                          const daysAgo = Math.floor((today.getTime() - treatmentDate.getTime()) / (1000 * 3600 * 24));
                          const dateFormatted = treatmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          
                          // Color coding based on recency
                          const rowClass = daysAgo <= 1 
                            ? 'bg-red-50 dark:bg-red-950/20' 
                            : daysAgo <= 4 
                            ? 'bg-yellow-50 dark:bg-yellow-950/20' 
                            : 'bg-green-50 dark:bg-green-950/20';

                          return (
                            <tr key={treatment.id || index} className={rowClass}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {treatment.chemical_name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {dateFormatted}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {treatment.target_pest_disease || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {treatment.applied_by || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  daysAgo <= 1 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                    : daysAgo <= 4 
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day' : `${daysAgo} days`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {recentTreatments.some(t => {
                    const treatmentDate = new Date(t.treatment_date);
                    const daysAgo = Math.floor((new Date().getTime() - treatmentDate.getTime()) / (1000 * 3600 * 24));
                    return daysAgo <= 1;
                  }) && (
                    <div className="bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <strong>Warning:</strong> Treatment applied within 24 hours. Spray residue may affect observation accuracy. 
                          Document any phytotoxicity symptoms in Disease or Nutrient sections.
                        </p>
                      </div>
                    </div>
                  )}
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
                        <p className="text-red-500 text-xs font-semibold">⚠️ Action Required (over 10%)</p>
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
                            Damping Off exceeds 5 percent - Immediate Intervention Required!
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {disease.disease_type === "Root Rot" && disease.present && (
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