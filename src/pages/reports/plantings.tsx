
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Sprout } from "lucide-react";
import { Planting, PlantType, Location } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

export default function PlantingsReportPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plantTypeFilter, setPlantTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    setLocations(getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || []);
  }, []);

  const getPlantTypeDetails = (plantTypeId: string) => plantTypes.find(pt => pt.id === plantTypeId);
  const getLocationName = (locationId: string) => locations.find(l => l.id === locationId)?.name || "N/A";

  const filteredPlantings = useMemo(() => {
    return plantings.filter(p => {
      const pDate = new Date(p.datePlanted);
      const matchesDate = (!startDate || pDate >= new Date(startDate)) && (!endDate || pDate <= new Date(endDate));
      const matchesPlantType = plantTypeFilter === "all" || p.plantTypeId === plantTypeFilter;
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesDate && matchesPlantType && matchesStatus;
    });
  }, [plantings, startDate, endDate, plantTypeFilter, statusFilter]);

  const getExpectedHarvestDate = (planting: Planting) => {
    const plantType = getPlantTypeDetails(planting.plantTypeId);
    if (!plantType?.growthDuration) return "N/A";
    const date = new Date(planting.datePlanted);
    date.setDate(date.getDate() + plantType.growthDuration);
    return date.toLocaleDateString();
  };

  const exportToCSV = () => console.log("Exporting to CSV...");
  const exportToExcel = () => console.log("Exporting to Excel...");
  const exportToPDF = () => window.print();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="w-4 h-4" />Back to Reports</Button></Link>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3"><Sprout className="w-8 h-8 text-green-600" />Plantings Report</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}/></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}/></div>
            <div className="space-y-2">
              <Label>Plant Type</Label>
              <Select value={plantTypeFilter} onValueChange={setPlantTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plant Types</SelectItem>
                  {plantTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name} ({pt.variety})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="harvested">Harvested</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Showing {filteredPlantings.length} planting(s)</p>
            <Button variant="outline" size="sm" onClick={() => {setStartDate(""); setEndDate(""); setPlantTypeFilter("all"); setStatusFilter("all");}}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlantings.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{getPlantTypeDetails(p.plantTypeId)?.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">{p.variety}</CardDescription>
                </div>
                <Badge className={
                  p.status === "active" ? "bg-green-100 text-green-800" :
                  p.status === "closed" ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"
                }>{p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Location:</span><span className="font-medium">{getLocationName(p.locationId)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Planted:</span><span className="font-medium">{p.quantity}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Remaining:</span><span className={`font-medium ${p.remainingQuantity === 0 ? "text-gray-400" : ""}`}>{p.remainingQuantity ?? p.quantity}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><span className="text-gray-600">Planted Date:</span><span className="font-medium">{new Date(p.datePlanted).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Expected Harvest:</span><span className="font-medium">{getExpectedHarvestDate(p)}</span></div>
            </CardContent>
          </Card>
        ))}
        {filteredPlantings.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No plantings found matching filters</div>}
      </div>
    </div>
  );
}
