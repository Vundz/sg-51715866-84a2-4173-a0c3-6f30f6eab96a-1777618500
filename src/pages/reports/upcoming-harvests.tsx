import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Calendar, AlertCircle } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { formatNumber } from "@/lib/format";

type PlantingData = Awaited<ReturnType<typeof plantingService.getPlantingsWithDetails>>[0];

const UpcomingHarvestsReport: React.FC = () => {
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState("7");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const plantingsData = await plantingService.getPlantingsWithDetails();
        setPlantings(plantingsData);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingHarvests = useMemo(() => {
    const today = new Date();
    const threshold = parseInt(daysThreshold);
    return plantings
      .filter(p => p.status === "active" && p.expected_harvest_date)
      .map(p => {
        const expectedHarvestDate = new Date(p.expected_harvest_date);
        const daysUntilHarvest = Math.ceil((expectedHarvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...p,
          plantTypeName: p.plant_types?.name || "N/A",
          locationName: p.locations?.name || "N/A",
          expectedHarvestDate,
          daysUntilHarvest,
        };
      })
      .filter(p => p.daysUntilHarvest >= 0 && p.daysUntilHarvest <= threshold)
      .sort((a, b) => a.daysUntilHarvest - b.daysUntilHarvest);
  }, [plantings, daysThreshold]);

  const exportToCSV = () => console.log("Exporting CSV...");
  const exportToExcel = () => console.log("Exporting Excel...");
  const exportToPDF = () => window.print();

  if (loading) return <div>Loading report...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="w-4 h-4" />Back to Reports</Button></Link>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3"><Calendar className="w-8 h-8 text-orange-600" />Upcoming Harvests</h1>
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
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Label>Show harvests within:</Label>
              <Select value={daysThreshold} onValueChange={setDaysThreshold}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Next 3 days</SelectItem>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="14">Next 14 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-600">Showing {upcomingHarvests.length} upcoming harvest(s)</p>
          </div>
        </CardContent>
      </Card>
      
      {upcomingHarvests.length > 0 && <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><div className="flex items-center gap-2 text-orange-800"><AlertCircle className="w-5 h-5" /><span className="font-medium">{upcomingHarvests.length} planting(s) ready for harvest soon</span></div></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingHarvests.map(h => (
          <Card key={h.id} className={`hover:shadow-md transition-shadow border-l-4 ${h.daysUntilHarvest <= 3 ? "border-red-500" : "border-orange-500"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1"><CardTitle className="text-base">{h.plantTypeName}</CardTitle><CardDescription className="text-sm mt-1">{h.variety}</CardDescription></div>
                <Badge variant="outline" className={h.daysUntilHarvest <= 3 ? "text-red-600" : "text-orange-600"}>{h.daysUntilHarvest === 0 ? "Today" : `${h.daysUntilHarvest}d`}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Location:</span><span className="font-medium">{h.locationName}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Quantity:</span><span className="font-medium">{formatNumber(h.quantity)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Remaining:</span><span className="font-medium">{formatNumber(h.remaining_quantity ?? h.quantity)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><span className="text-gray-600">Planted:</span><span className="font-medium">{new Date(h.date_planted).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Expected:</span><span className="font-medium">{h.expectedHarvestDate.toLocaleDateString()}</span></div>
            </CardContent>
          </Card>
        ))}
        {upcomingHarvests.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No upcoming harvests in the selected timeframe</div>}
      </div>
    </div>
  );
}