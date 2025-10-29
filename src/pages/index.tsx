import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, MapPin, Package, Droplets, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStorageData, STORAGE_KEYS } from "@/lib/storage";
import type { PlantType, Planting, Harvest } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/router";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    activePlantings: 0,
    plantVarieties: 0,
    recentHarvests: 0
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    } else {
      const plantTypes = getStorageData<PlantType[]>(STORAGE_KEYS.PLANT_TYPES) || [];
      const plantings = getStorageData<Planting[]>(STORAGE_KEYS.PLANTINGS) || [];
      const harvests = getStorageData<Harvest[]>(STORAGE_KEYS.HARVESTS) || [];

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const recentHarvestsCount = harvests.filter(h => {
        const harvestDate = new Date(h.harvestDate);
        return harvestDate >= firstDayOfMonth;
      }).length;

      setStats({
        activePlantings: plantings.filter(p => p.status === "active").length,
        plantVarieties: plantTypes.length,
        recentHarvests: recentHarvestsCount
      });
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const modules = [
    {
      title: "Plant Types",
      description: "Manage plant types and varieties",
      icon: Sprout,
      href: "/plant-types",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Plantings",
      description: "Track planting activities",
      icon: Package,
      href: "/plantings",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      title: "Harvests",
      description: "Record harvest data",
      icon: BarChart3,
      href: "/harvests",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950"
    },
    {
      title: "Locations",
      description: "Manage greenhouse locations",
      icon: MapPin,
      href: "/locations",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    },
    {
      title: "Treatments",
      description: "Track chemical applications",
      icon: Droplets,
      href: "/treatments",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
              Welcome to Khulisapp
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Seedling Nursery Management System
            </p>
            <p className="text-sm text-muted-foreground">
              Logged in as: <strong>{user?.name}</strong> ({user?.role})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.href} href={module.href}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-green-500">
                    <CardHeader>
                      <div className={`w-16 h-16 rounded-xl ${module.bgColor} flex items-center justify-center mb-4`}>
                        <Icon className={`w-8 h-8 ${module.color}`} />
                      </div>
                      <CardTitle className="text-2xl">{module.title}</CardTitle>
                      <CardDescription className="text-base">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="w-full group">
                        Open Module
                        <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.activePlantings}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Plantings</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Total Varieties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.plantVarieties}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plant Varieties</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Harvests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{stats.recentHarvests}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
