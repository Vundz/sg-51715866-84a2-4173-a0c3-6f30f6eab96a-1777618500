
import { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Sprout, Package, BarChart3, MapPin, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeSwitch } from "@/components/ThemeSwitch";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Plant Types", href: "/plant-types", icon: Sprout },
    { name: "Plantings", href: "/plantings", icon: Package },
    { name: "Harvests", href: "/harvests", icon: BarChart3 },
    { name: "Locations", href: "/locations", icon: MapPin },
    { name: "Treatments", href: "/treatments", icon: Droplets }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <Sprout className="w-6 h-6 text-green-600" />
                <span className="text-xl font-bold">Khulisapp</span>
              </Link>
              
              <div className="hidden md:flex space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex items-center space-x-2",
                          isActive && "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
            
            <ThemeSwitch />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
