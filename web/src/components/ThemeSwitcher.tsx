import { useAtom } from "jotai";
import { Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { themeAtom, type UiThemeId } from "@/atoms/theme";
import { useAuth } from "@/providers/AuthProvider";

const OPTIONS: { id: UiThemeId; label: string }[] = [
  { id: "default", label: "Orange" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "violet", label: "Violet" },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useAtom(themeAtom);
  const { updatePreferences, isAuthenticated } = useAuth();

  const apply = async (id: UiThemeId) => {
    setTheme(id);
    if (isAuthenticated) {
      await updatePreferences({ theme: id });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Palette className="text-muted-foreground size-4" aria-hidden />
      {OPTIONS.map((o) => (
        <Button
          key={o.id}
          type="button"
          size="sm"
          variant={theme === o.id ? "default" : "ghost"}
          className="h-8 px-2 text-xs"
          onClick={() => void apply(o.id)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
