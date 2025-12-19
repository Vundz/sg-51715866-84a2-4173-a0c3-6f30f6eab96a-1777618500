import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Sprout, Calendar, Loader2 } from "lucide-react";
import { plantingService } from "@/services/plantingService";
import { reservationService } from "@/services/reservationService";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";

type PlantingData = Awaited<ReturnType<typeof plantingService.getPlantingsWithDetails>>[0];
type ReservationData = Awaited<ReturnType<typeof reservationService.getReservations>>[0];

interface ColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
}

const CustomerAvailabilityReport: React.FC = () => {
  const [plantings, setPlantings] = useState<PlantingData[]>([]);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters - Changed to arrays for multi-select
  const [daysThreshold, setDaysThreshold] = useState("30");
  const [selectedPlantTypes, setSelectedPlantTypes] = useState<string[]>([]);
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  
  // Column selection
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: "plantType", label: "Plant Type", enabled: true },
    { id: "variety", label: "Variety", enabled: true },
    { id: "location", label: "Location", enabled: false },
    { id: "batchNumber", label: "Batch Number", enabled: false },
    { id: "quantity", label: "Available Quantity", enabled: true },
    { id: "readyDate", label: "Ready Date", enabled: true },
    { id: "sellingPrice", label: "Price per Seedling (ZMW)", enabled: true },
  ]);
  
  const { toast } = useToast();

  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, enabled: !col.enabled } : col
    ));
  };

  const togglePlantType = (plantType: string) => {
    setSelectedPlantTypes(prev => {
      if (prev.includes(plantType)) {
        return prev.filter(pt => pt !== plantType);
      } else {
        return [...prev, plantType];
      }
    });
    // Clear variety selections when plant type changes
    setSelectedVarieties([]);
  };

  const toggleVariety = (variety: string) => {
    setSelectedVarieties(prev => {
      if (prev.includes(variety)) {
        return prev.filter(v => v !== variety);
      } else {
        return [...prev, variety];
      }
    });
  };

  const selectAllPlantTypes = () => {
    if (selectedPlantTypes.length === uniquePlantTypeNames.length) {
      setSelectedPlantTypes([]);
    } else {
      setSelectedPlantTypes([...uniquePlantTypeNames]);
    }
    setSelectedVarieties([]);
  };

  const selectAllVarieties = () => {
    if (selectedVarieties.length === availableVarieties.length) {
      setSelectedVarieties([]);
    } else {
      setSelectedVarieties([...availableVarieties]);
    }
  };

  const enabledColumns = useMemo(() => columns.filter(c => c.enabled), [columns]);

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

  // Get unique varieties for the selected plant types (multi-select)
  const availableVarieties = useMemo(() => {
    if (selectedPlantTypes.length === 0) {
      // Show all varieties when no plant type selected
      return Array.from(new Set(plantings.map(p => p.variety).filter(Boolean)));
    }
    // Show varieties only from selected plant types
    return Array.from(
      new Set(
        plantings
          .filter(p => p.plant_types?.name && selectedPlantTypes.includes(p.plant_types.name))
          .map(p => p.variety)
          .filter(Boolean)
      )
    );
  }, [plantings, selectedPlantTypes]);

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

        // Filter by plant types (multi-select)
        if (selectedPlantTypes.length > 0 && !selectedPlantTypes.includes(p.plant_types?.name || "")) {
          return false;
        }

        // Filter by varieties (multi-select)
        if (selectedVarieties.length > 0 && !selectedVarieties.includes(p.variety || "")) {
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
          location: p.locations?.name || "N/A",
          batchNumber: p.batch_number || "N/A",
          availableQuantity: availableQty,
          readyDate,
          daysUntilReady,
          isReadyNow: daysUntilReady === 0,
          sellingPrice: p.selling_price || 0,
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
  }, [plantings, reservations, daysThreshold, selectedPlantTypes, selectedVarieties]);

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
    const headers = enabledColumns.map(c => c.label);
    const rows = availableSeedlings.map(s => {
      const row: string[] = [];
      enabledColumns.forEach(col => {
        if (col.id === "plantType") row.push(s.plantType);
        if (col.id === "variety") row.push(s.variety);
        if (col.id === "location") row.push(s.location);
        if (col.id === "batchNumber") row.push(s.batchNumber);
        if (col.id === "quantity") row.push(s.availableQuantity.toString());
        if (col.id === "readyDate") row.push(s.readyDate.toLocaleDateString());
        if (col.id === "sellingPrice") row.push(s.sellingPrice.toFixed(2));
      });
      return row;
    });
    
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
    const headers = enabledColumns.map(c => c.label);
    const rows = availableSeedlings.map(s => {
      const row: string[] = [];
      enabledColumns.forEach(col => {
        if (col.id === "plantType") row.push(s.plantType);
        if (col.id === "variety") row.push(s.variety);
        if (col.id === "location") row.push(s.location);
        if (col.id === "batchNumber") row.push(s.batchNumber);
        if (col.id === "quantity") row.push(s.availableQuantity.toString());
        if (col.id === "readyDate") row.push(s.readyDate.toLocaleDateString());
        if (col.id === "sellingPrice") row.push(s.sellingPrice.toFixed(2));
      });
      return row;
    });
    
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

  const exportToPDF = async () => {
    try {
      setExporting(true);
      
      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      container.style.padding = '20px';
      container.style.backgroundColor = '#ffffff';
      container.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(container);

      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const shortDate = today.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\//g, '-');

      // Build the HTML content with inline styles
      let htmlContent = `
        <div style="max-width: 1000px; margin: 0 auto;">
          <h1 style="color: #16a34a; border-bottom: 3px solid #16a34a; padding-bottom: 10px; margin-bottom: 20px;">
            Seedlings Availability Report
          </h1>
          <p style="margin-bottom: 20px;"><strong>Report Date:</strong> ${formattedDate}</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; color: #16a34a; font-size: 1.5em;">
              Total Available: ${formatNumber(totalAvailable)} Seedlings
            </h2>
            <p style="margin: 0;">${availableSeedlings.length} variety options available for reservation</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr>
                ${enabledColumns.find(c => c.id === "plantType") ? '<th style="background: #16a34a; color: white; padding: 12px; text-align: left; font-weight: bold;">Plant Type</th>' : ''}
                ${enabledColumns.find(c => c.id === "variety") ? '<th style="background: #16a34a; color: white; padding: 12px; text-align: left; font-weight: bold;">Variety</th>' : ''}
                ${enabledColumns.find(c => c.id === "location") ? '<th style="background: #16a34a; color: white; padding: 12px; text-align: left; font-weight: bold;">Location</th>' : ''}
                ${enabledColumns.find(c => c.id === "batchNumber") ? '<th style="background: #16a34a; color: white; padding: 12px; text-align: left; font-weight: bold;">Batch Number</th>' : ''}
                ${enabledColumns.find(c => c.id === "quantity") ? '<th style="background: #16a34a; color: white; padding: 12px; text-align: right; font-weight: bold;">Available Quantity</th>' : ''}
                ${enabledColumns.find(c => c.id === "sellingPrice") ? '<th style="background: #16a34a; color: white; padding: 12px; text-align: right; font-weight: bold;">Price (ZMW)</th>' : ''}
                ${enabledColumns.find(c => c.id === "readyDate") ? '<th style="background: #16a34a; color: white; padding: 12px; text-align: right; font-weight: bold;">Ready Date</th>' : ''}
              </tr>
            </thead>
            <tbody>
      `;

      // Group by plant type and build rows
      const groupedByPlantType: Record<string, typeof availableSeedlings> = {};
      availableSeedlings.forEach(p => {
        const typeName = p.plantType;
        if (!groupedByPlantType[typeName]) {
          groupedByPlantType[typeName] = [];
        }
        groupedByPlantType[typeName].push(p);
      });

      const sortedPlantTypes = Object.keys(groupedByPlantType).sort();
      let rowIndex = 0;

      const showPlantType = enabledColumns.find(c => c.id === "plantType");
      const showVariety = enabledColumns.find(c => c.id === "variety");
      const showLocation = enabledColumns.find(c => c.id === "location");
      const showBatchNumber = enabledColumns.find(c => c.id === "batchNumber");
      const showQuantity = enabledColumns.find(c => c.id === "quantity");
      const showSellingPrice = enabledColumns.find(c => c.id === "sellingPrice");
      const showReadyDate = enabledColumns.find(c => c.id === "readyDate");
      const colSpan = enabledColumns.length;

      sortedPlantTypes.forEach(plantType => {
        const plantings = groupedByPlantType[plantType];
        
        // Plant type header row (only if plant type column is enabled)
        if (showPlantType) {
          htmlContent += `
          <tr>
            <td colspan="${colSpan}" style="background: #f0fdf4; font-weight: bold; font-size: 1.1em; color: #16a34a; padding: 15px 12px;">
              ${plantType}
            </td>
          </tr>`;
        }
        
        // Variety rows
        plantings.forEach(p => {
          const readyDate = new Date(p.readyDate);
          const isAvailableNow = readyDate <= today;
          const formattedReadyDate = readyDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          });
          
          const bgColor = rowIndex % 2 === 0 ? '#f9fafb' : '#ffffff';
          rowIndex++;
          
          htmlContent += `<tr>`;
          
          if (showPlantType) {
            htmlContent += `<td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: ${bgColor};"></td>`;
          }
          
          if (showVariety) {
            htmlContent += `<td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: ${bgColor};">${p.variety || 'N/A'}</td>`;
          }
          
          if (showLocation) {
            htmlContent += `<td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: ${bgColor}; color: #6b7280;">${p.location}</td>`;
          }
          
          if (showBatchNumber) {
            htmlContent += `<td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: ${bgColor}; color: #6b7280; font-family: monospace; font-size: 0.9em;">${p.batchNumber}</td>`;
          }
          
          if (showQuantity) {
            htmlContent += `
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: ${bgColor}; text-align: right; font-weight: bold; color: #16a34a;">
                ${formatNumber(p.availableQuantity)} seedlings
              </td>`;
          }
          
          if (showSellingPrice) {
            htmlContent += `
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: ${bgColor}; text-align: right; font-family: monospace; color: #1f2937;">
                K${p.sellingPrice.toFixed(2)}
              </td>`;
          }
          
          if (showReadyDate) {
            htmlContent += `
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: ${bgColor}; text-align: right;">
                ${formattedReadyDate}
                ${isAvailableNow ? " <strong style='color: #16a34a;'>(Available Now!)</strong>" : ""}
              </td>`;
          }
          
          htmlContent += `</tr>`;
        });
      });

      htmlContent += `
            </tbody>
          </table>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9em;">
            <p>Please contact us to place your order and reserve your seedlings.</p>
            <p>Report generated by Khulisapp Seedlings Management System</p>
          </div>
        </div>
      `;

      container.innerHTML = htmlContent;

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Convert to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`seedlings-availability-${shortDate}.pdf`);

      toast({
        title: "Success",
        description: "PDF report generated successfully!",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
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
          <Button onClick={exportToPDF} disabled={exporting} className="gap-2">
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                PDF
              </>
            )}
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

      {/* Wrap the main report content with id for PDF generation */}
      <div id="seedlings-report-content" className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Display Options</CardTitle>
            <CardDescription>Customize the availability view and select columns to display</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="flex items-center justify-between">
                  <Label>Plant Type</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllPlantTypes}
                    className="h-6 text-xs"
                  >
                    {selectedPlantTypes.length === uniquePlantTypeNames.length ? "Clear All" : "Select All"}
                  </Button>
                </div>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-background">
                  {uniquePlantTypeNames.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No plant types available</p>
                  ) : (
                    <div className="space-y-2">
                      {uniquePlantTypeNames.map(name => (
                        <div key={name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`plant-type-${name}`}
                            checked={selectedPlantTypes.includes(name)}
                            onCheckedChange={() => togglePlantType(name)}
                          />
                          <label
                            htmlFor={`plant-type-${name}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPlantTypes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPlantTypes.length} selected
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Variety</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllVarieties}
                    className="h-6 text-xs"
                    disabled={availableVarieties.length === 0}
                  >
                    {selectedVarieties.length === availableVarieties.length ? "Clear All" : "Select All"}
                  </Button>
                </div>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-background">
                  {availableVarieties.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      {selectedPlantTypes.length === 0 ? "Select plant types first" : "No varieties available"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableVarieties.map(variety => (
                        <div key={variety} className="flex items-center space-x-2">
                          <Checkbox
                            id={`variety-${variety}`}
                            checked={selectedVarieties.includes(variety)}
                            onCheckedChange={() => toggleVariety(variety)}
                          />
                          <label
                            htmlFor={`variety-${variety}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {variety}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedVarieties.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedVarieties.length} selected
                  </p>
                )}
              </div>
            </div>

            {/* Column Selection */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Display Columns</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {columns.map(col => (
                  <div key={col.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`col-${col.id}`}
                      checked={col.enabled}
                      onChange={() => toggleColumn(col.id)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label
                      htmlFor={`col-${col.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {availableSeedlings.length} available variety option{availableSeedlings.length !== 1 ? "s" : ""}
              </p>
              {(selectedPlantTypes.length > 0 || selectedVarieties.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPlantTypes([]);
                    setSelectedVarieties([]);
                  }}
                >
                  Clear Filters
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
                        {enabledColumns.find(c => c.id === "variety") && <TableHead>Variety</TableHead>}
                        {enabledColumns.find(c => c.id === "location") && <TableHead>Location</TableHead>}
                        {enabledColumns.find(c => c.id === "batchNumber") && <TableHead>Batch Number</TableHead>}
                        {enabledColumns.find(c => c.id === "quantity") && <TableHead className="text-right">Available Quantity</TableHead>}
                        {enabledColumns.find(c => c.id === "sellingPrice") && <TableHead className="text-right">Price per Seedling</TableHead>}
                        {enabledColumns.find(c => c.id === "readyDate") && <TableHead className="text-right">Ready Date</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seedlings.map(s => (
                        <TableRow key={s.id}>
                          {enabledColumns.find(c => c.id === "variety") && (
                            <TableCell className="font-medium">{s.variety}</TableCell>
                          )}
                          {enabledColumns.find(c => c.id === "location") && (
                            <TableCell className="text-gray-600">{s.location}</TableCell>
                          )}
                          {enabledColumns.find(c => c.id === "batchNumber") && (
                            <TableCell className="text-gray-600 font-mono text-sm">{s.batchNumber}</TableCell>
                          )}
                          {enabledColumns.find(c => c.id === "quantity") && (
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600">
                                {formatNumber(s.availableQuantity)}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">seedlings</span>
                            </TableCell>
                          )}
                          {enabledColumns.find(c => c.id === "sellingPrice") && (
                            <TableCell className="text-right">
                              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                K{s.sellingPrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">each</span>
                            </TableCell>
                          )}
                          {enabledColumns.find(c => c.id === "readyDate") && (
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
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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