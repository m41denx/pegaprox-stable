import { useAtom } from "jotai";
import {
  AlertTriangle,
  Clock3,
  Cpu,
  Database,
  HardDrive,
  Loader2,
  LogOut,
  Network,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { selectedClusterIdAtom } from "@/atoms/cluster";

type ClusterRow = { id: string; name?: string; display_name?: string };
type ResourceRow = {
  id?: string;
  vmid?: string | number;
  name?: string;
  type?: string;
  node?: string;
  status?: string;
  cpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
};
type TaskRow = {
  upid?: string;
  starttime?: number;
  endtime?: number;
  user?: string;
  node?: string;
  type?: string;
  status?: string;
};
type AlertRow = {
  id?: string | number;
  severity?: string;
  message?: string;
  timestamp?: number;
};
type MetricsPayload = {
  cpu?: number;
  memory?: number;
  storage?: number;
  network_rx?: number;
  network_tx?: number;
  [key: string]: unknown;
};

const POLL_MS = 10_000;

function metricPct(v: unknown): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  if (v <= 1) return Math.max(0, Math.min(100, v * 100));
  return Math.max(0, Math.min(100, v));
}

function humanBytes(value?: number): string {
  if (!value || value <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export function DashboardShell() {
  const { user, logout } = useAuth();
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useAtom(selectedClusterIdAtom);
  const [activeTab, setActiveTab] = useState<"overview" | "resources" | "tasks" | "alerts">(
    "overview",
  );
  const [metrics, setMetrics] = useState<MetricsPayload>({});
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

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
  const resourceSummary = useMemo(() => {
    const qemu = resources.filter((r) => r.type === "qemu").length;
    const lxc = resources.filter((r) => r.type === "lxc").length;
    const nodes = resources.filter((r) => r.type === "node").length;
    const onlineNodes = resources.filter((r) => r.type === "node" && r.status === "online").length;
    return { qemu, lxc, nodes, onlineNodes };
  }, [resources]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    let timer: number | undefined;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [metricsRes, resourcesRes, tasksRes, alertsRes] = await Promise.all([
          api.get<MetricsPayload>(`/clusters/${selectedId}/metrics`, { validateStatus: () => true }),
          api.get<ResourceRow[]>(`/clusters/${selectedId}/resources`, { validateStatus: () => true }),
          api.get<TaskRow[]>(`/clusters/${selectedId}/tasks`, { validateStatus: () => true }),
          api.get<AlertRow[]>(`/clusters/${selectedId}/alerts`, { validateStatus: () => true }),
        ]);
        if (cancelled) return;
        setMetrics(metricsRes.status === 200 && metricsRes.data ? metricsRes.data : {});
        setResources(Array.isArray(resourcesRes.data) ? resourcesRes.data : []);
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
        setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      } catch {
        if (!cancelled) {
          toast.error("Failed to refresh cluster data");
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    void fetchData();
    timer = window.setInterval(fetchData, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [selectedId, refreshNonce]);

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

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-5" />
              Clusters
            </CardTitle>
            <CardDescription>
              Select a cluster. This TS stack now includes live overview/resources/tasks/alerts slices from the legacy dashboard.
            </CardDescription>
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
            <div className="flex items-center justify-between">
              {selected ? (
                <p className="text-muted-foreground text-xs">
                  Active cluster id: <span className="text-foreground font-mono">{selected.id}</span>
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRefreshNonce((v) => v + 1)}
                disabled={!selectedId}
              >
                <RefreshCw className={`size-4 ${loadingData ? "animate-spin" : ""}`} />
                Live polling every {POLL_MS / 1000}s
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedId ? (
          <>
            <div className="flex flex-wrap gap-2">
              {(["overview", "resources", "tasks", "alerts"] as const).map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  variant={activeTab === tab ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Cpu} label="CPU usage" value={`${metricPct(metrics.cpu).toFixed(1)}%`} />
                <MetricCard
                  icon={HardDrive}
                  label="Memory usage"
                  value={`${metricPct(metrics.memory).toFixed(1)}%`}
                />
                <MetricCard
                  icon={Database}
                  label="Storage usage"
                  value={`${metricPct(metrics.storage).toFixed(1)}%`}
                />
                <MetricCard
                  icon={Network}
                  label="Network"
                  value={`${humanBytes(Number(metrics.network_rx || 0))}/s ↓  ${humanBytes(
                    Number(metrics.network_tx || 0),
                  )}/s ↑`}
                />
                <MetricCard icon={Server} label="Nodes online" value={`${resourceSummary.onlineNodes}/${resourceSummary.nodes}`} />
                <MetricCard icon={Server} label="QEMU VMs" value={String(resourceSummary.qemu)} />
                <MetricCard icon={Server} label="LXC containers" value={String(resourceSummary.lxc)} />
                <MetricCard
                  icon={AlertTriangle}
                  label="Open alerts"
                  value={String(alerts.filter((a) => (a.severity || "").toLowerCase() !== "info").length)}
                />
              </div>
            ) : null}

            {activeTab === "resources" ? <ResourcesTable resources={resources} /> : null}
            {activeTab === "tasks" ? <TasksTable tasks={tasks} /> : null}
            {activeTab === "alerts" ? <AlertsList alerts={alerts} /> : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4" />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ResourcesTable({ resources }: { resources: ResourceRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resources</CardTitle>
        <CardDescription>Live cluster resources migrated from legacy resources grid.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-muted-foreground border-b">
            <tr>
              <th className="py-2 text-left">Name</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Node</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-right">CPU</th>
              <th className="py-2 text-right">Memory</th>
              <th className="py-2 text-right">Disk</th>
            </tr>
          </thead>
          <tbody>
            {resources.slice(0, 500).map((r, idx) => (
              <tr key={`${r.id || r.vmid || r.name || "row"}-${idx}`} className="border-b last:border-0">
                <td className="py-2">{r.name || r.id || r.vmid || "-"}</td>
                <td className="py-2">{r.type || "-"}</td>
                <td className="py-2">{r.node || "-"}</td>
                <td className="py-2">{r.status || "-"}</td>
                <td className="py-2 text-right">{`${metricPct(r.cpu).toFixed(1)}%`}</td>
                <td className="py-2 text-right">
                  {r.maxmem ? `${metricPct(((r.mem || 0) / r.maxmem) * 100).toFixed(1)}%` : "-"}
                </td>
                <td className="py-2 text-right">
                  {r.maxdisk ? `${metricPct(((r.disk || 0) / r.maxdisk) * 100).toFixed(1)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function TasksTable({ tasks }: { tasks: TaskRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent tasks</CardTitle>
        <CardDescription>Task list migrated from legacy cluster task feed.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-muted-foreground border-b">
            <tr>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Node</th>
              <th className="py-2 text-left">User</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Started</th>
              <th className="py-2 text-left">Finished</th>
            </tr>
          </thead>
          <tbody>
            {tasks.slice(0, 200).map((t, idx) => (
              <tr key={`${t.upid || "task"}-${idx}`} className="border-b last:border-0">
                <td className="py-2">{t.type || "-"}</td>
                <td className="py-2">{t.node || "-"}</td>
                <td className="py-2">{t.user || "-"}</td>
                <td className="py-2">{t.status || "-"}</td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {t.starttime ? new Date(t.starttime * 1000).toLocaleString() : "-"}
                  </span>
                </td>
                <td className="py-2">{t.endtime ? new Date(t.endtime * 1000).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AlertsList({ alerts }: { alerts: AlertRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
        <CardDescription>Live alert stream migrated from legacy alerts panel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No alerts.</p>
        ) : (
          alerts.slice(0, 200).map((a, idx) => (
            <div key={`${a.id || "alert"}-${idx}`} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert className="size-4" />
                  {(a.severity || "info").toUpperCase()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {a.timestamp ? new Date(a.timestamp * 1000).toLocaleString() : ""}
                </p>
              </div>
              <p className="text-sm">{a.message || "-"}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
