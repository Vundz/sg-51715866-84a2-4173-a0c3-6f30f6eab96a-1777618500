import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Sprout, Calendar } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { reservationService } from "@/services/reservationService";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";

type PlantingData = Awaited<ReturnType<typeof plantingService.getPlantingsWithDetails>>[0];
type ReservationData = Awaited<ReturnType<typeof reservationService.getReservations>>[0];

const CustomerAvailabilityReport: React.FC = () => {
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [daysThreshold, setDaysThreshold] = useState("30");
  const [selectedPlantType, setSelectedPlantType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [plantingsData, reservationsData] = await Promise.all([
          plantingService.getPlantingsWithDetails(),
          reservationService.getReservations(),
        ]);
        setPlantings(plantingsData);
        setReservations(reservationsData);
      } catch (error) {
        console.error("Error fetching report data:", error);
        toast({
          title: "Error",
          description: "Failed to load report data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // Get unique plant type names
  const uniquePlantTypeNames = useMemo(() => {
    const names = new Set(plantings.map(p => p.plant_types?.name).filter(Boolean));
    return Array.from(names).sort();
  }, [plantings]);

  // Process available seedlings
  const availableSeedlings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = parseInt(daysThreshold);
    
    return plantings
      .filter(p => {
        // Must be active and have expected harvest date
        if (p.status !== "active" || !p.expected_harvest_date) {
          return false;
        }

        // Filter by plant type
        if (selectedPlantType !== "all" && p.plant_types?.name !== selectedPlantType) {
          return false;
        }

        // Calculate days until ready
        const readyDate = new Date(p.expected_harvest_date);
        readyDate.setHours(0, 0, 0, 0);
        const daysUntilReady = Math.ceil((readyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Show seedlings that are ready now or will be ready within threshold
        return daysUntilReady >= 0 && daysUntilReady <= threshold;
      })
      .map(p => {
        const readyDate = new Date(p.expected_harvest_date);
        readyDate.setHours(0, 0, 0, 0);
        const daysUntilReady = Math.ceil((readyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate reserved quantity
        const plantingReservations = reservations.filter(r => r.planting_id === p.id && r.status === "pending");
        const reservedQty = plantingReservations.reduce((sum, r) => sum + (r.quantity_reserved || 0), 0);
        const availableQty = (p.remaining_quantity ?? p.quantity) - reservedQty;
        
        return {
          id: p.id,
          plantType: p.plant_types?.name || "N/A",
          variety: p.variety || "Standard",
          availableQuantity: availableQty,
          readyDate,
          daysUntilReady,
          isReadyNow: daysUntilReady === 0,
        };
      })
      .filter(s => s.availableQuantity > 0) // Only show items with available stock
      .sort((a, b) => {
        // Sort by: 1) Plant type, 2) Variety, 3) Ready date
        if (a.plantType !== b.plantType) {
          return a.plantType.localeCompare(b.plantType);
        }
        if (a.variety !== b.variety) {
          return a.variety.localeCompare(b.variety);
        }
        return a.daysUntilReady - b.daysUntilReady;
      });
  }, [plantings, reservations, daysThreshold, selectedPlantType]);

  // Group by plant type for better presentation
  const groupedByPlantType = useMemo(() => {
    const groups = new Map<string, typeof availableSeedlings>();
    
    availableSeedlings.forEach(seedling => {
      if (!groups.has(seedling.plantType)) {
        groups.set(seedling.plantType, []);
      }
      groups.get(seedling.plantType)!.push(seedling);
    });
    
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [availableSeedlings]);

  // Calculate total available
  const totalAvailable = useMemo(() => {
    return availableSeedlings.reduce((sum, s) => sum + s.availableQuantity, 0);
  }, [availableSeedlings]);

  const exportToCSV = () => {
    const headers = ["Plant Type", "Variety", "Available Quantity", "Ready Date"];
    const rows = availableSeedlings.map(s => [
      s.plantType,
      s.variety,
      s.availableQuantity,
      s.readyDate.toLocaleDateString(),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seedlings-availability-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Excel export using CSV format with .xlsx extension for better compatibility
    const headers = ["Plant Type", "Variety", "Available Quantity", "Ready Date"];
    const rows = availableSeedlings.map(s => [
      s.plantType,
      s.variety,
      s.availableQuantity.toString(),
      s.readyDate.toLocaleDateString(),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seedlings-availability-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Excel Export",
      description: "File downloaded successfully. Open in Excel or Google Sheets.",
    });
  };

  const exportToPDF = () => {
    // Create a downloadable HTML file styled for PDF printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Seedlings Availability Report - ${new Date().toLocaleDateString()}</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          h1 {
            color: #16a34a;
            border-bottom: 3px solid #16a34a;
            padding-bottom: 10px;
          }
          .summary {
            background: #f0fdf4;
            padding: 20px;
            border-left: 4px solid #16a34a;
            margin: 20px 0;
          }
          .summary h2 {
            margin: 0 0 10px 0;
            color: #16a34a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #16a34a;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          .plant-type-header {
            background: #f0fdf4;
            font-weight: bold;
            font-size: 1.1em;
            color: #16a34a;
            padding: 15px 12px !important;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <h1>Seedlings Availability Report</h1>
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString("en-US", { 
          weekday: "long", 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })}</p>
        
        <div class="summary">
          <h2>Total Available: ${formatNumber(totalAvailable)} Seedlings</h2>
          <p>${availableSeedlings.length} variety option${availableSeedlings.length !== 1 ? "s" : ""} available for reservation</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Plant Type</th>
              <th>Variety</th>
              <th style="text-align: right;">Available Quantity</th>
              <th style="text-align: right;">Ready Date</th>
            </tr>
          </thead>
          <tbody>
            ${groupedByPlantType.map(([plantType, seedlings]) => `
              <tr>
                <td colspan="4" class="plant-type-header">${plantType}</td>
              </tr>
              ${seedlings.map(s => `
                <tr>
                  <td></td>
                  <td>${s.variety}</td>
                  <td style="text-align: right; font-weight: bold; color: #16a34a;">
                    ${formatNumber(s.availableQuantity)} seedlings
                  </td>
                  <td style="text-align: right;">
                    ${s.readyDate.toLocaleDateString("en-US", { 
                      weekday: "short", 
                      month: "short", 
                      day: "numeric" 
                    })}
                    ${s.isReadyNow ? " <strong style='color: #16a34a;'>(Available Now!)</strong>" : ""}
                  </td>
                </tr>
              `).join("")}
            `).join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>Please contact us to place your order and reserve your seedlings.</p>
          <p>Report generated by Khulisapp Seedlings Management System</p>
        </div>
        
        <script>
          // Auto-print when opened
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seedlings-availability-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "PDF Export",
      description: "HTML file downloaded. Open it and use your browser's 'Print to PDF' option.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Reports
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Sprout className="w-8 h-8 text-green-600" />
            Seedlings Availability
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Current availability for customer orders
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            CSV
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-green-600" />
            Total Available Seedlings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">{formatNumber(totalAvailable)}</div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {availableSeedlings.length} variety option{availableSeedlings.length !== 1 ? "s" : ""} available for reservation
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize the availability view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Show seedlings ready within</Label>
              <Select value={daysThreshold} onValueChange={setDaysThreshold}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="14">Next 14 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plant Type</Label>
              <Select value={selectedPlantType} onValueChange={setSelectedPlantType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plant Types</SelectItem>
                  {uniquePlantTypeNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {availableSeedlings.length} available variety option{availableSeedlings.length !== 1 ? "s" : ""}
            </p>
            {selectedPlantType !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlantType("all")}
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Availability Table - Grouped by Plant Type */}
      {groupedByPlantType.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                No seedlings available in the selected timeframe
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Try adjusting your filters or check back later
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        groupedByPlantType.map(([plantType, seedlings]) => (
          <Card key={plantType}>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sprout className="w-5 h-5 text-green-600" />
                {plantType}
              </CardTitle>
              <CardDescription>
                {seedlings.length} variety option{seedlings.length !== 1 ? "s" : ""} available • {formatNumber(seedlings.reduce((sum, s) => sum + s.availableQuantity, 0))} total seedlings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variety</TableHead>
                      <TableHead className="text-right">Available Quantity</TableHead>
                      <TableHead className="text-right">Ready Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seedlings.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.variety}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-600">
                            {formatNumber(s.availableQuantity)}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">seedlings</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">
                              {s.readyDate.toLocaleDateString("en-US", { 
                                weekday: "short", 
                                month: "short", 
                                day: "numeric" 
                              })}
                            </span>
                            {s.isReadyNow ? (
                              <span className="text-xs text-green-600 font-semibold">Available Now!</span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {s.daysUntilReady === 1 ? "Tomorrow" : `in ${s.daysUntilReady} days`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Footer Note */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> Quantities shown are currently available for reservation. 
            Please contact us to place your order and reserve your seedlings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAvailabilityReport;