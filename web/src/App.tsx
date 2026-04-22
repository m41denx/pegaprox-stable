import { Provider as JotaiProvider } from "jotai";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";

import { DashboardShell } from "@/components/DashboardShell";
import { LoginScreen } from "@/components/LoginScreen";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeRoot } from "@/providers/ThemeRoot";

function Gate() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <DashboardShell />;
}

export function App() {
  return (
    <JotaiProvider>
      <ThemeRoot>
        <AuthProvider>
          <div className="fixed right-3 top-3 z-50 rounded-lg border bg-card/95 p-2 shadow-sm backdrop-blur">
            <ThemeSwitcher />
          </div>
          <Gate />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </ThemeRoot>
    </JotaiProvider>
  );
}
