import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, TestTube2 } from "lucide-react";
import { treatmentService, TreatmentWithDetails } from "@/services/treatmentService";
import { plantingService } from "@/services/plantingService";
import { plantTypeService } from "@/services/plantTypeService";
import { useToast } from "@/hooks/use-toast";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import type { Database } from "@/integrations/supabase/types";

type PlantingData = Database["public"]["Tables"]["plantings"]["Row"];
type PlantTypeData = Database["public"]["Tables"]["plant_types"]["Row"];

export default function TreatmentsReportPage() {
  const [treatments, setTreatments] = useState<TreatmentWithDetails[]>([]);
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [treatmentsData, plantingsData, plantTypesData] = await Promise.all([
          treatmentService.getTreatments(),
          plantingService.getPlantings(),
          plantTypeService.getPlantTypes(),
        ]);
        setTreatments(treatmentsData);
        setPlantings(plantingsData as PlantingData[]);
        setPlantTypes(plantTypesData);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const treatmentsReport = useMemo(() => {
    return treatments
      .filter(t => {
        const tDate = new Date(t.application_date);
        const matchesDate = (!startDate || tDate >= new Date(startDate)) && (!endDate || tDate <= new Date(endDate));
        const matchesType = typeFilter === "all" || t.type === typeFilter;
        return matchesDate && matchesType;
      })
      .flatMap(treatment => 
        (treatment.plantings || []).map(tp => {
          const planting = plantings.find(p => p.id === tp.id);
          const plantType = plantTypes.find(pt => pt.id === planting?.plant_type_id);
          return {
            ...treatment,
            plantingId: tp.id,
            plantTypeName: plantType?.name || 'N/A',
            variety: planting?.variety || 'N/A',
          };
        })
      )
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime());
  }, [treatments, plantings, plantTypes, startDate, endDate, typeFilter]);

  const exportToCSV = () => console.log("Exporting CSV...");
  const exportToExcel = () => console.log("Exporting Excel...");
  const exportToPDF = () => window.print();
  
  if (loading) return <div>Loading report...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="w-4 h-4" />Back to Reports</Button></Link>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3"><TestTube2 className="w-8 h-8 text-red-600" />Treatment Report</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2"><FileText className="w-4 h-4" />CSV</Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2"><FileSpreadsheet className="w-4 h-4" />Excel</Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle><CardDescription>Customize your report view</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}/></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}/></div>
            <div className="space-y-2">
              <Label>Treatment Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fungicide">Fungicide</SelectItem>
                  <SelectItem value="pesticide">Pesticide</SelectItem>
                  <SelectItem value="fertilizer">Fertilizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">Showing {treatmentsReport.length} treatment application(s)</p>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setTypeFilter("all"); }}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {treatmentsReport.map((t, index) => (
          <Card key={`${t.id}-${index}`} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1"><CardTitle className="text-base">{t.plantTypeName}</CardTitle><CardDescription className="text-sm mt-1">{t.variety}</CardDescription></div>
                <Badge className={
                  t.type === "fungicide" ? "bg-purple-100 text-purple-800" :
                  t.type === "pesticide" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                }>{t.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Chemical:</span><span className="font-medium">{t.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Date:</span><span className="font-medium">{new Date(t.application_date).toLocaleDateString()}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><span className="text-gray-600">Dosage:</span><span className="font-medium">{t.dosage}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Method:</span><span className="font-medium capitalize">{t.application_method}</span></div>
              {t.notes && <><Separator className="my-2" /><div className="text-xs text-gray-600"><span className="font-medium">Notes: </span>{t.notes}</div></>}
            </CardContent>
          </Card>
        ))}
        {treatmentsReport.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No treatments found matching filters</div>}
      </div>
    </div>
  );
}