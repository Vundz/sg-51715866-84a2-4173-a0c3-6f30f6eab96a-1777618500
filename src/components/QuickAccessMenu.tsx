
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Home, Sprout, Package, BarChart3, MapPin, Droplets, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";

export function QuickAccessMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Plant Types", href: "/plant-types", icon: Sprout },
    { name: "Locations", href: "/locations", icon: MapPin },
    { name: "Plantings", href: "/plantings", icon: Package },
    { name: "Treatments", href: "/treatments", icon: Droplets },
    { name: "Harvests", href: "/harvests", icon: BarChart3 },
    { name: "Reports", href: "/reports", icon: FileText },
  ];

  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(false);
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px]">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle>
             <Link href="/" className="flex items-center space-x-2">
                <Sprout className="w-6 h-6 text-green-600" />
                <span className="text-xl font-bold">Khulisapp</span>
              </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 py-2">
          <nav className="flex flex-col space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/" ? router.pathname === item.href : router.pathname.startsWith(item.href);

              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start flex items-center space-x-2 text-md py-6",
                      isActive && "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
