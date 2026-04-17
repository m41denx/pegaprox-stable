import { useAtomValue } from "jotai";
import { useEffect } from "react";

import { themeAtom, type UiThemeId } from "@/atoms/theme";

function mapServerThemeToUi(server?: string): UiThemeId | null {
  if (!server) return null;
  const s = server.toLowerCase();
  if (s.includes("blue")) return "blue";
  if (s.includes("green")) return "green";
  if (s.includes("violet") || s.includes("purple")) return "violet";
  if (s.includes("corporate")) return "default";
  return "default";
}

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const theme = useAtomValue(themeAtom);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return <>{children}</>;
}

export { mapServerThemeToUi };
