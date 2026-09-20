"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

// The choice is stored per browser (localStorage), so a new device or
// domain starts on the default from app/layout.tsx.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known on the client; render nothing until mounted so
  // the server and first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-foreground/60 hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="mr-2 h-3.5 w-3.5" />
      ) : (
        <Moon className="mr-2 h-3.5 w-3.5" />
      )}
      {isDark ? "Light mode" : "Dark mode"}
    </Button>
  );
}
