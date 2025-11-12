
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Leaf, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();
  const [email, setEmail] = useState("admin@khulisapp.com");
  const [password, setPassword] = useState("Spawniad8!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initializingAdmin, setInitializingAdmin] = useState(false);
  const [initMessage, setInitMessage] = useState<string | null>(null);
  
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitAdmin = async () => {
    setInitializingAdmin(true);
    setInitMessage(null);
    setError("");

    try {
      const response = await fetch("/api/init-admin", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        let message = data.message;
        if (data.user?.credentials) {
          message += `\n\nCredentials:\nEmail: ${data.user.credentials.email}\nPassword: ${data.user.credentials.password}`;
        }
        setInitMessage(message);
        // Maybe auto-fill credentials if they were created
        if (data.user?.credentials?.email) setEmail(data.user.credentials.email);
        if (data.user?.credentials?.password) setPassword(data.user.credentials.password);

      } else {
        setError(data.error || "Failed to initialize admin user");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize admin user");
    } finally {
      setInitializingAdmin(false);
    }
  };

  if (authLoading || (!authLoading && user)) {
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
            {(error || initMessage) && (
              <Alert variant={error ? "destructive" : "default"} className={initMessage ? "whitespace-pre-wrap" : ""}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || initMessage}</AlertDescription>
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
              disabled={initializingAdmin}
            >
              {initializingAdmin ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Initializing...</>) : "Initialize Admin Account"}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <p className="mb-1">Click above to create a default admin account if one doesn't exist.</p>
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
