"use client";

import { useState } from "react";
import { registerAction } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await registerAction(formData);

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setSuccess(true);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 font-sans">
      {/* Top Header with Back to Home Link */}
      <div className="max-w-md w-full mx-auto pt-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-semibold gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-primary" /> Back to Home
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Shield className="h-4 w-4" /> Secure Vault
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-8">
        <Card className="w-full max-w-md shadow-xl border-primary/20 bg-card/80 backdrop-blur-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold font-heading">Create an Account</CardTitle>
            <CardDescription>
              Get started with your personal zero-knowledge vault
            </CardDescription>
          </CardHeader>

          {success ? (
            <CardContent className="space-y-4 text-center">
              <div className="rounded-md bg-green-500/15 p-4 text-sm text-green-500">
                Registration successful! Please check your email to verify your account before logging in.
              </div>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go to Login
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="user@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Account Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button type="submit" disabled={loading} className="w-full font-bold shadow-md">
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
