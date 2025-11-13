import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sprout, Package, MapPin, TestTube2, Calendar, TrendingUp, ShoppingCart } from "lucide-react";
import { Planting, Harvest, Location, Treatment, PlantType, Reservation } from "@/types";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";

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

  useEffect(() => {
    const plantings = getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || [];
    const harvests = getStorageData<Harvest[]>(STORAGE_KEYS.HARVESTS) || [];
    const locations = getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || [];
    const treatments = getStorageData<Treatment[]>(STORAGE_KEYS.TREATMENTS) || [];
    const plantTypes = getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || [];
    const reservations = getStorageData<Reservation[]>(STORAGE_KEYS.RESERVATIONS) || [];

    const upcoming = plantings.filter(p => {
      if (p.status !== "active") return false;
      const pt = plantTypes.find(plt => plt.id === p.plantTypeId);
      if (!pt?.growthDuration) return false;
      const expected = new Date(p.datePlanted);
      expected.setDate(expected.getDate() + pt.growthDuration);
      const daysUntil = Math.ceil((expected.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    }).length;

    // Calculate total tray utilization (quantity / 220 for each active planting)
    const totalTrays = plantings
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + (p.quantity / 220), 0);

    setStats({
      activePlantings: plantings.filter(p => p.status === 'active').length,
      totalHarvests: harvests.length,
      locations: locations.length,
      treatments: treatments.length,
      upcomingHarvests: upcoming,
      plantTypes: plantTypes.length,
      activeReservations: reservations.filter(r => r.status === 'active').length,
      trayUtilization: Math.round(totalTrays * 100) / 100, // Round to 2 decimal places
    });
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
