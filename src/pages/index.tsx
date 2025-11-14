import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, LineChart, PieChart, Users, DollarSign, Package, TrendingUp, Sprout, ShoppingCart, Calendar, MapPin, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { harvestService } from "@/services/harvestService";
import { plantingService } from "@/services/plantingService";
import { reservationService } from "@/services/reservationService";
import { locationService } from "@/services/locationService";
import { treatmentService } from "@/services/treatmentService";
import { plantTypeService } from "@/services/plantTypeService";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Helper to format numbers
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return num.toString();
  }
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activePlantings: 0,
    totalHarvests: 0,
    locations: 0,
    treatments: 0,
    upcomingHarvests: 0,
    plantTypes: 0,
    activeReservations: 0,
    trayUtilization: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          plantingsData,
          harvestsData,
          locationsData,
          treatmentsData,
          plantTypesData,
          reservationsData,
        ] = await Promise.all([
          plantingService.getPlantings(),
          harvestService.getHarvests(),
          locationService.getLocations(),
          treatmentService.getTreatments(),
          plantTypeService.getPlantTypes(),
          reservationService.getReservations(),
        ]);

        const upcoming = plantingsData.filter(p => {
          if (p.status !== "active" || !p.expected_harvest_date) return false;
          const expected = new Date(p.expected_harvest_date);
          const daysUntil = Math.ceil((expected.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          return daysUntil >= 0 && daysUntil <= 7;
        }).length;

        const totalTrays = plantingsData
          .filter(p => p.status === 'active')
          .reduce((sum, p) => sum + ((p.remaining_quantity ?? p.quantity) / 220), 0);
        
        setStats({
          activePlantings: plantingsData.filter(p => p.status === 'active').length,
          totalHarvests: harvestsData.length,
          locations: locationsData.length,
          treatments: treatmentsData.length,
          upcomingHarvests: upcoming,
          plantTypes: plantTypesData.length,
          activeReservations: reservationsData.filter(r => r.status === 'active').length,
          trayUtilization: Math.round(totalTrays),
        });

      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const statCards = [
    { title: "Active Plantings", value: stats.activePlantings, icon: Sprout, href:"/plantings" },
    { title: "Tray Utilization", value: `${stats.trayUtilization}`, icon: Package, href: "/plantings", subtitle: "trays in use" },
    { title: "Active Reservations", value: stats.activeReservations, icon: ShoppingCart, href: "/reservations" },
    { title: "Upcoming Harvests", value: stats.upcomingHarvests, icon: Calendar, href: "/reports/upcoming-harvests" },
    { title: "Total Harvests", value: stats.totalHarvests, icon: Package, href:"/harvests" },
    { title: "Locations", value: stats.locations, icon: MapPin, href:"/locations" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Welcome to Khulisapp</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Your central dashboard for nursery management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              )}
              <Link href={card.href} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary mt-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/plantings"><Button className="w-full">New Planting</Button></Link>
            <Link href="/reservations"><Button className="w-full">New Reservation</Button></Link>
            <Link href="/treatments"><Button className="w-full">Log Treatment</Button></Link>
            <Link href="/reports"><Button className="w-full" variant="outline">View Reports</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nursery Overview</CardTitle>
            <CardDescription>At-a-glance summary of your operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Utilization</span>
              <Badge>Coming Soon</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Harvest Success Rate</span>
              <Badge>Coming Soon</Badge>
            </div>
             <div className="flex justify-between items-center">
              <span className="text-sm">Most Active Location</span>
              <Badge>Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
