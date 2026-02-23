"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Login failed");
      } else {
        router.push("/notes");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Atmospheric background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 68% 12%, oklch(0.22 0.06 63 / 0.45) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 12% 88%, oklch(0.18 0.04 152 / 0.25) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm space-y-8 px-4">
        {/* Wordmark */}
        <div className="space-y-2 text-center">
          <h1
            className="text-6xl text-foreground"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 700,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
            }}
          >
            Nexus
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your knowledge base
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/50 bg-card/60 p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="border-border/60 bg-background/50 focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-border/60 bg-background/50 focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
