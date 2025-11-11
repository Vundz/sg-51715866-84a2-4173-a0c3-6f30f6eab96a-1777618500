import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeSwitch } from "./ThemeSwitch";
import { Menu, Leaf, Home, MapPin, Sprout, PackageOpen, Package, FileText, Shield, LogOut, LogIn } from "lucide-react";
import { adminService } from "@/services/adminService";
import { authService } from "@/services/authService";

export function Header() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    checkAdminStatus();
    checkAuthStatus();
  }, []);

  const checkAdminStatus = async () => {
    const adminStatus = await adminService.isAdmin();
    setIsAdmin(adminStatus);
  };

  const checkAuthStatus = async () => {
    const user = await authService.getCurrentUser();
    setIsAuthenticated(!!user);
    if (user) {
      setUserEmail(user.email || "");
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserEmail("");
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/locations", label: "Locations", icon: MapPin },
    { href: "/plant-types", label: "Plant Types", icon: Sprout },
    { href: "/plantings", label: "Plantings", icon: PackageOpen },
    { href: "/harvests", label: "Harvests", icon: Package },
    { href: "/treatments", label: "Treatments", icon: Sprout },
    { href: "/reports", label: "Reports", icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin/users", label: "Admin", icon: Shield });
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
            <span className="text-xl font-bold">Khulisapp</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-green-600 dark:hover:text-green-400 ${
                    router.pathname === item.href ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeSwitch />
            
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-3">
                <span className="text-sm text-muted-foreground">{userEmail}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => router.push("/login")} className="hidden md:flex">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-green-600 dark:hover:text-green-400 ${
                          router.pathname === item.href ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  
                  <div className="pt-4 border-t">
                    {isAuthenticated ? (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                        <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <Button variant="default" size="sm" onClick={() => router.push("/login")} className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </Button>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
