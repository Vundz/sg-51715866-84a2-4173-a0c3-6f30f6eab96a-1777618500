import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Calendar, Package, MapPin, Sprout, TrendingUp, FileText as ReportIcon, ArrowRight } from "lucide-react";
import { Planting, Harvest, PlantType, Location, Treatment } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

export default function ReportsPage() {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  useEffect(() => {
    setPlantings(getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || []);
    setHarvests(getStorageData<Harvest[]>(STORAGE_KEYS.HARVESTS) || []);
    setPlantTypes(getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || []);
    setLocations(getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || []);
    setTreatments(getStorageData<Treatment[]>(STORAGE_KEYS.TREATMENTS) || []);
  }, []);

  const upcomingHarvestsCount = plantings.filter(p => {
    if (p.status !== "active") return false;
    const plantType = plantTypes.find(pt => pt.id === p.plantTypeId);
    if (!plantType?.growthDuration) return false;
    
    const plantingDate = new Date(p.datePlanted);
    const expectedDate = new Date(plantingDate);
    expectedDate.setDate(expectedDate.getDate() + plantType.growthDuration);
    
    const today = new Date();
    const daysUntil = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntil >= 0 && daysUntil <= 7;
  }).length;

  const activePlantingsCount = plantings.filter(p => p.status === "active").length;
  const harvestsCount = harvests.length;
  const treatmentsCount = treatments.length;
  const activeLocationsCount = locations.filter(loc => 
    plantings.some(p => p.locationId === loc.id && p.status === "active")
  ).length;

  const reports = [
    {
      id: "plantings",
      title: "Plantings Report",
      description: "View all plantings with filtering options",
      icon: Sprout,
      iconBg: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-400",
      borderColor: "border-l-green-500",
      count: activePlantingsCount,
      countLabel: "Active Plantings",
      href: "/reports/plantings"
    },
    {
      id: "upcoming",
      title: "Upcoming Harvests",
      description: "Seedlings ready for harvest soon",
      icon: Calendar,
      iconBg: "bg-orange-100 dark:bg-orange-900",
      iconColor: "text-orange-600 dark:text-orange-400",
      borderColor: "border-l-orange-500",
      count: upcomingHarvestsCount,
      countLabel: "Next 7 Days",
      href: "/reports/upcoming-harvests"
    },
    {
      id: "harvests",
      title: "Harvest Analysis",
      description: "Performance metrics and variance analysis",
      icon: Package,
      iconBg: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-l-blue-500",
      count: harvestsCount,
      countLabel: "Total Harvests",
      href: "/reports/harvests"
    },
    {
      id: "location-summary",
      title: "Location Summary",
      description: "Capacity overview and utilization",
      icon: MapPin,
      iconBg: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-l-purple-500",
      count: locations.length,
      countLabel: "Total Locations",
      href: "/reports/location-summary"
    },
    {
      id: "location-detail",
      title: "Location Details",
      description: "Varieties planted per location",
      icon: TrendingUp,
      iconBg: "bg-teal-100 dark:bg-teal-900",
      iconColor: "text-teal-600 dark:text-teal-400",
      borderColor: "border-l-teal-500",
      count: activeLocationsCount,
      countLabel: "Active Locations",
      href: "/reports/location-detail"
    },
    {
      id: "treatments",
      title: "Treatment Report",
      description: "Application history and tracking",
      icon: ReportIcon,
      iconBg: "bg-red-100 dark:bg-red-900",
      iconColor: "text-red-600 dark:text-red-400",
      borderColor: "border-l-red-500",
      count: treatmentsCount,
      countLabel: "Total Treatments",
      href: "/reports/treatments"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <BarChart className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
          Reports & Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive insights for your nursery operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.id} href={report.href}>
              <Card className={`cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4 ${report.borderColor} h-full`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-3 ${report.iconBg} rounded-lg shrink-0`}>
                        <Icon className={`w-6 h-6 ${report.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg mb-1">{report.title}</CardTitle>
                        <CardDescription className="text-sm line-clamp-2">
                          {report.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className={`text-3xl font-bold ${report.iconColor}`}>
                      {report.count}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {report.countLabel}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}