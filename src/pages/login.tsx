import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { Leaf, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, checkAuthStatus } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initLoading, setInitLoading] = useState(false);
  const [initSuccess, setInitSuccess] = useState("");
  
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.signIn(email, password);
      await checkAuthStatus();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitAdmin = async () => {
    setInitLoading(true);
    setError("");
    setInitSuccess("");

    try {
      const response = await fetch("/api/init-admin", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setInitSuccess(data.message || "Admin user initialized successfully! You can now sign in.");
        setEmail("admin@khulisapp.com");
        setPassword("Spawniad8!");
      } else {
        setError(data.error || "Failed to initialize admin user");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize admin user");
    } finally {
      setInitLoading(false);
    }
  };

  if (authLoading || (!authLoading && isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Leaf className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Khulisapp account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {initSuccess && (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {initSuccess}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@khulisapp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  First time setup
                </span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleInitAdmin}
              disabled={initLoading}
            >
              {initLoading ? "Initializing..." : "Initialize Admin Account"}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <p className="mb-1">Click above to create default admin account</p>
              <p className="font-mono">
                admin@khulisapp.com / Spawniad8!
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-sm">
            <Link href="/" className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
