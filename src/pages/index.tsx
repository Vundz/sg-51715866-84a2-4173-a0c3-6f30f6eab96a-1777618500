
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, MapPin, Package, Droplets, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Sprout className="w-12 h-12 text-green-600 mr-3" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-green-700 to-blue-700 bg-clip-text text-transparent">
                Khulisapp
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Complete Seedlings Nursery Management System
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
                <div className="text-3xl font-bold text-green-600">0</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Plantings</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Total Varieties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">0</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plant Varieties</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Harvests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">0</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
