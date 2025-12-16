import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "./ThemeSwitch";
import { Leaf, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  // Only show header on login page
  if (user) return null;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
            <span className="text-xl font-bold">Khulisapp</span>
          </Link>

          <div className="flex items-center space-x-4">
            <ThemeSwitch />
            
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : !user ? (
              <Button variant="default" size="sm" onClick={() => router.push("/")} className="hidden md:flex">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}