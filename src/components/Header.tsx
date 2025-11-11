import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Mountain, Shield } from "lucide-react";
import { ThemeSwitch } from "./ThemeSwitch";
import { useState, useEffect } from "react";
import { adminService } from "@/services/adminService";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/plant-types", label: "Plant Types" },
  { href: "/locations", label: "Locations" },
  { href: "/plantings", label: "Plantings" },
  { href: "/harvests", label: "Harvests" },
  { href: "/treatments", label: "Treatments" },
  { href: "/reservations", label: "Reservations" },
  { href: "/reports", label: "Reports" },
];

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await adminService.isAdmin();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Mountain className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">Khulisapp</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/users"
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <Link href="/" className="mr-6 flex items-center space-x-2">
                <Mountain className="h-6 w-6" />
                <span className="font-bold">Khulisapp</span>
            </Link>
            <div className="grid gap-2 py-6">
                {navLinks.map(({ href, label }) => (
                    <Link
                        key={label}
                        href={href}
                        className="flex w-full items-center py-2 text-lg font-semibold"
                    >
                        {label}
                    </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className="flex w-full items-center py-2 text-lg font-semibold gap-2"
                  >
                    <Shield className="h-5 w-5" />
                    Admin
                  </Link>
                )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Future search bar can go here */}
          </div>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}
