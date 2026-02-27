import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [role, setRole] = React.useState<"investor" | "rancher">("investor");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Placeholder API call - adapt to your backend
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Sign up failed");
      }
      navigate("/login");
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Register a new CattleCoin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Password</label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Confirm Password</label>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                required
                placeholder="••••••••"
              />
            </div>

            <div className="mt-2 space-y-2">
                <span className="text-sm text-muted-foreground">Sign up as</span>
                <div className="flex gap-3">
                    <button
                    type="button"
                    onClick={() => setRole("investor")}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium transition
                        ${role === "investor"
                        ? "bg-gray-300 border-gray-400 text-black"
                        : "bg-background border-input hover:bg-muted"}`}
                    >
                    Investor
                    </button>

                    <button
                    type="button"
                    onClick={() => setRole("rancher")}
                    className={`flex-1 py-2 rounded-md border text-sm font-medium transition
                        ${role === "rancher"
                        ? "bg-gray-300 border-gray-400 text-black"
                        : "bg-background border-input hover:bg-muted"}`}
                    >
                    Rancher
                    </button>
                </div>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex items-center justify-between">
              <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
              <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">Already have an account?</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default SignUp;
