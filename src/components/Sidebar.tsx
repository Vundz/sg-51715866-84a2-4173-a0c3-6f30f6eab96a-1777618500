import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Leaf, 
  MapPin, 
  Sprout, 
  PackageOpen, 
  Package, 
  TestTube2, 
  Box,
  Calendar, 
  FileText, 
  Settings, 
  Users, 
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Briefcase,
  Tag,
  Ruler,
  Building2,
  Calculator,
  Beaker,
  Search,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSwitch } from "./ThemeSwitch";

interface MenuSection {
  id: string;
  label: string;
  icon: any;
  href?: string;
  items?: {
    label: string;
    href: string;
    icon: any;
  }[];
  requiresAdmin?: boolean;
}

export function Sidebar() {
  const router = useRouter();
  const { user, profile, isAdmin, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>(["plant-management", "production-management", "settings"]);
  const [isOpen, setIsOpen] = useState(false);

  const menuSections: MenuSection[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      href: "/dashboard",
    },
    {
      id: "plant-management",
      label: "Plant Management",
      icon: Leaf,
      items: [
        { label: "Locations", href: "/locations", icon: MapPin },
        { label: "Plant Types", href: "/plant-types", icon: Sprout },
        { label: "Plantings", href: "/plantings", icon: PackageOpen },
        { label: "Harvests", href: "/harvests", icon: Package },
      ],
    },
    {
      id: "production-management",
      label: "Production Management",
      icon: Briefcase,
      items: [
        { label: "Treatments", href: "/treatments", icon: TestTube2 },
        { label: "Scouting", href: "/scouting", icon: Search },
        { label: "Inventory", href: "/inventory", icon: Box },
        { label: "Production Calculator", href: "/production/bom", icon: Calculator },
        { label: "Chemical Calculator", href: "/production/calculator", icon: Beaker },
      ],
    },
    {
      id: "reservations",
      label: "Reservations",
      icon: Calendar,
      href: "/reservations",
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      href: "/reports",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      requiresAdmin: true,
      items: [
        { label: "User Management", href: "/admin/user-management", icon: Users },
        { label: "Roles & Permissions", href: "/admin/roles-permissions", icon: Shield },
        { label: "Inventory Settings", href: "/settings/inventory", icon: Box },
        { label: "Scouting Settings", href: "/settings/scouting", icon: Search },
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isActive = (href: string) => router.pathname === href;
  const isSectionActive = (section: MenuSection) => {
    if (section.href) return isActive(section.href);
    if (section.items) {
      return section.items.some((item) => isActive(item.href));
    }
    return false;
  };

  const filteredSections = menuSections.filter(
    (section) => !section.requiresAdmin || isAdmin
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Logo/Brand */}
      <div className="p-6 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Leaf className="h-8 w-8 text-green-600 dark:text-green-400" />
          <span className="text-2xl font-bold">Khulisapp</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.includes(section.id);
            const isCurrentActive = isSectionActive(section);

            // Single menu item (no sub-items)
            if (section.href) {
              return (
                <Link key={section.id} href={section.href}>
                  <Button
                    variant={isActive(section.href) ? "secondary" : "ghost"}
                    className={`w-full justify-start ${
                      isActive(section.href)
                        ? "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
                        : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {section.label}
                  </Button>
                </Link>
              );
            }

            // Section with sub-items
            return (
              <div key={section.id}>
                <Button
                  variant="ghost"
                  className={`w-full justify-between ${
                    isCurrentActive ? "bg-muted" : ""
                  }`}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="flex items-center">
                    <Icon className="h-5 w-5 mr-3" />
                    {section.label}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                {isExpanded && section.items && (
                  <div className="ml-4 mt-1 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive(item.href) ? "secondary" : "ghost"}
                            size="sm"
                            className={`w-full justify-start ${
                              isActive(item.href)
                                ? "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
                                : ""
                            }`}
                          >
                            <ItemIcon className="h-4 w-4 mr-3" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Profile & Actions */}
      <div className="p-4 border-t space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {profile?.full_name?.[0] || user?.email?.[0] || "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || user?.email || "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile?.role || "viewer"}
              </p>
            </div>
          </div>
          <ThemeSwitch />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="w-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-screen fixed left-0 top-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-screen w-64 z-50 md:hidden">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}