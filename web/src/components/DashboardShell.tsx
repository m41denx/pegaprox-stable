import { useAtom } from "jotai";
import { LogOut, Loader2, Server } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { selectedClusterIdAtom } from "@/atoms/cluster";

type ClusterRow = { id: string; name?: string; display_name?: string };

export function DashboardShell() {
  const { user, logout } = useAuth();
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useAtom(selectedClusterIdAtom);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingList(true);
      setListError(null);
      try {
        const { data } = await api.get<ClusterRow[]>("/clusters");
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setClusters(list);
        if (list.length) {
          setSelectedId((current) => {
            if (current && list.some((c) => c.id === current)) return current;
            return list[0].id;
          });
        }
      } catch {
        if (!cancelled) setListError("Could not load clusters.");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSelectedId]);

  const selected = clusters.find((c) => c.id === selectedId);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/pegaprox.png" alt="" className="size-9 rounded-md" />
            <div>
              <p className="text-sm font-semibold">PegaProx</p>
              <p className="text-muted-foreground text-xs">
                {user?.username as string}
                {user?.role ? ` · ${String(user.role)}` : ""}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-5" />
              Clusters
            </CardTitle>
            <CardDescription>Select a cluster. Additional dashboards and modals will be ported here incrementally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingList ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading clusters…
              </div>
            ) : listError ? (
              <p className="text-destructive text-sm">{listError}</p>
            ) : clusters.length === 0 ? (
              <p className="text-muted-foreground text-sm">No clusters configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {clusters.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    variant={c.id === selectedId ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedId(c.id)}
                  >
                    {c.display_name || c.name || c.id}
                  </Button>
                ))}
              </div>
            )}
            {selected ? (
              <p className="text-muted-foreground text-xs">
                Active cluster id: <span className="text-foreground font-mono">{selected.id}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>
              Legacy UI sources are preserved under <code className="text-xs">web/legacy/</code> for reference while
              features are migrated module by module.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
