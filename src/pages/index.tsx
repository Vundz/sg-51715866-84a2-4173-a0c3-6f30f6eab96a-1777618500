import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";
import { Planting, Harvest, PlantType, Location } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    activePlantings: 0,
    totalHarvested: 0,
    locationsAtCapacity: 0,
    upcomingHarvests: 0,
  });

  const [recentPlantings, setRecentPlantings] = useState<Planting[]>([]);
  const [recentHarvests, setRecentHarvests] = useState<Harvest[]>([]);
  const [lowStockPlantings, setLowStockPlantings] = useState<Planting[]>([]);

  useEffect(() => {
    const plantings = getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || [];
    const harvests = getStorageData<Harvest[]>(STORAGE_KEYS.HARVESTS) || [];
    const locations = getStorageData<Location[]>(STORAGE_KEYS.LOCATIONS) || [];
    const plantTypes = getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || [];

    const activePlantings = plantings.filter(p => p.status === 'active');
    const totalHarvested = harvests.reduce((acc, h) => acc + h.quantityHarvested, 0);

    const locationOccupancy = plantings.reduce<Record<string, number>>((acc, p) => {
      acc[p.locationId] = (acc[p.locationId] || 0) + p.quantity;
      return acc;
    }, {});

    const locationsAtCapacity = locations.filter(loc => (locationOccupancy[loc.id] || 0) >= loc.capacity).length;

    const upcoming = plantings.filter(p => {
      const plantType = plantTypes.find(pt => pt.id === p.plantTypeId);
      if (!plantType) return false;
      const plantedDate = new Date(p.datePlanted);
      const expectedHarvestDate = new Date(plantedDate.setDate(plantedDate.getDate() + plantType.growthDuration));
      const daysRemaining = (expectedHarvestDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return daysRemaining > 0 && daysRemaining <= 14; // Within 2 weeks
    });
    
    setStats({
      activePlantings: activePlantings.length,
      totalHarvested,
      locationsAtCapacity,
      upcomingHarvests: upcoming.length,
    });
    
    const sortedPlantings = [...plantings].sort((a, b) => new Date(b.datePlanted).getTime() - new Date(a.datePlanted).getTime());
    setRecentPlantings(sortedPlantings.slice(0, 5));
    
    const sortedHarvests = [...harvests].sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime());
    setRecentHarvests(sortedHarvests.slice(0, 5));

    // Example: low stock is less than 20% of original quantity
    const lowStock = plantings.map(p => {
        const harvestedQty = harvests.filter(h => h.plantingId === p.id).reduce((sum, h) => sum + h.quantityHarvested, 0);
        const remaining = p.quantity - harvestedQty;
        return { ...p, remainingQuantity: remaining };
    }).filter(p => p.status === 'active' && p.remainingQuantity < p.quantity * 0.2);

    setLowStockPlantings(lowStock.slice(0,5));

  }, []);

  const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.name || "User"}!</h1>
            <p className="text-muted-foreground">Here is a summary of your nursery's operations.</p>
        </div>
        <Link href="/reports">
            <Button className="mt-4 sm:mt-0">View All Reports</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Plantings" value={stats.activePlantings} icon={<Package className="h-4 w-4 text-muted-foreground" />} description="Total number of active batches." />
        <StatCard title="Total Harvested" value={stats.totalHarvested.toLocaleString()} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} description="Total seedlings harvested to date." />
        <StatCard title="Upcoming Harvests" value={stats.upcomingHarvests} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} description="Batches ready for harvest in 14 days." />
        <StatCard title="Locations at Capacity" value={stats.locationsAtCapacity} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} description="Greenhouses that are fully occupied." />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Plantings</CardTitle>
            <CardDescription>The five most recent planting batches.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variety</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPlantings.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.variety}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{new Date(p.datePlanted).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Recent Harvests</CardTitle>
            <CardDescription>The five most recent harvests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Planting Variety</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentHarvests.map(h => {
                    const planting = getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS)?.find(p => p.id === h.plantingId);
                    return (
                        <TableRow key={h.id}>
                            <TableCell>{planting?.variety || 'N/A'}</TableCell>
                            <TableCell>{h.quantityHarvested}</TableCell>
                            <TableCell>{new Date(h.harvestDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Low Stock Alert</CardTitle>
            <CardDescription>These active plantings have less than 20% of their stock remaining.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variety</TableHead>
                  <TableHead>Original Qty</TableHead>
                  <TableHead>Remaining Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>% Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockPlantings.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.variety}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{(p as any).remainingQuantity}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                        <Progress value={((p as any).remainingQuantity / p.quantity) * 100} className="w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
