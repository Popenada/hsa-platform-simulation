"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockUsers } from "@/lib/mock-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const match = mockUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (!match) {
      setError("Invalid username or password");
      return;
    }

    setError(null);
    localStorage.setItem("hsa_user", username);
    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button type="submit" className="w-full">
            Log in
          </Button>
          <p className="text-xs text-muted-foreground">
            Mock credentials: jdoe / password123
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
