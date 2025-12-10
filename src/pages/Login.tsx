import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/auth/AuthContext";

const Login = () => {
  const { signInWithEmailPassword, sendMagicLink, signInWithProvider } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname || "/";

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signInWithEmailPassword(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleMagicLink = async () => {
    setError(null);
    setLoading(true);
    const { error } = await sendMagicLink(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      alert("Magic link sent! Check your email.");
    }
  };

  const handleProvider = async (provider: "google" | "apple") => {
    setError(null);
    setLoading(true);
    const { error } = await signInWithProvider(provider);
    setLoading(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/70 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Welcome back to Fluxa</CardTitle>
          <CardDescription>Sign in to continue your vibe.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={handleMagicLink}
            disabled={loading || !email}
          >
            Send magic link
          </Button>

          <div className="my-6 flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or continue with</span>
            <Separator className="flex-1" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => handleProvider("google")} disabled={loading}>
              Continue with Google
            </Button>
            <Button variant="secondary" onClick={() => handleProvider("apple")} disabled={loading}>
              Continue with Apple
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Create a Fluxa account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;

