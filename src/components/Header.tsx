import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeSwitch } from "./ThemeSwitch";
import { Menu, Leaf, Home, MapPin, Sprout, PackageOpen, Package, FileText, Shield, LogOut, LogIn, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const router = useRouter();
  const { user, profile, isAdmin, loading, logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
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
    { href: "/reservations", label: "Reservations", icon: Calendar },
    { href: "/reports", label: "Reports", icon: FileText },
  ];

  if (isAdmin) {
    navItems.push(
      { href: "/admin/user-management", label: "User Management", icon: Shield },
      { href: "/admin/roles-permissions", label: "Roles & Permissions", icon: Shield }
    );
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
            <span className="text-xl font-bold">Khulisapp</span>
          </Link>

          {/* Desktop Navigation */}
          {user && <nav className="hidden md:flex items-center space-x-6">
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
          </nav>}

          <div className="flex items-center space-x-4">
            <ThemeSwitch />
            
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : user ? (
              <div className="hidden md:flex items-center space-x-3">
                <span className="text-sm text-muted-foreground">{profile?.full_name || user.email}</span>
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
            {user && <Sheet>
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
                    {loading ? (
                       <div className="flex justify-center">
                         <Loader2 className="h-5 w-5 animate-spin" />
                       </div>
                    ) : user ? (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground truncate">{profile?.full_name || user.email}</p>
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
            </Sheet>}
          </div>
        </div>
      </div>
    </header>
  );
}
