import { ReactNode } from "react";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "./ui/sidebar";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { QuickAccessMenu } from "./QuickAccessMenu";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background border-b">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <QuickAccessMenu />
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold">Khulisapp</h1>
          </header>
          <main className="flex-1 p-4">{children}</main>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex items-center h-16 px-6 bg-background border-b">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-4">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <QuickAccessMenu />
              </SheetContent>
            </Sheet>
            <h1 className="text-2xl font-bold">Khulisapp</h1>
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
