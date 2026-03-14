import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Anchor,
  Banknote,
  CheckCircle2,
  Fuel,
  Gauge,
  Loader2,
  Navigation,
  Ship,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type {
  BankEntry,
  PoolRecord,
  Route,
  backendInterface,
} from "./backend.d";
import { useActor } from "./hooks/useActor";

// ── Constants ────────────────────────────────────────────────────────────────
const TARGET_INTENSITY = 89.3368;
const ENERGY_FACTOR = 41000;

const energyInScope = (r: Route) => r.fuelConsumption * ENERGY_FACTOR;
const cbCalc = (r: Route) =>
  (TARGET_INTENSITY - r.ghgIntensity) * energyInScope(r);
const isCompliant = (r: Route) => r.ghgIntensity <= TARGET_INTENSITY;
const percentDiff = (comparison: number, baseline: number) =>
  (comparison / baseline - 1) * 100;

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  unit,
  variant = "neutral",
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  unit?: string;
  variant?: "neutral" | "success" | "danger" | "accent";
  icon?: React.ReactNode;
  subtitle?: string;
}) {
  const variantClass = {
    neutral: "border-border",
    success:
      "border-l-4 border-l-[oklch(var(--success))] bg-success compliance-glow-success",
    danger:
      "border-l-4 border-l-[oklch(var(--danger))] bg-danger compliance-glow-danger",
    accent: "border-l-4 border-l-accent",
  }[variant];

  const valueClass = {
    neutral: "text-foreground",
    success: "text-success",
    danger: "text-danger",
    accent: "text-accent",
  }[variant];

  return (
    <Card className={`shadow-card ${variantClass}`}>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-display font-bold leading-tight ${valueClass}`}
              >
                {value}
              </span>
              {unit && (
                <span className="text-xs text-muted-foreground font-medium">
                  {unit}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="ml-3 p-2 rounded-lg bg-muted/60 text-muted-foreground flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function TableSkeleton({
  rows = 5,
  cols = 8,
}: { rows?: number; cols?: number }) {
  const rowKeys = Array.from({ length: rows }, (_, i) => String(i));
  const colKeys = Array.from({ length: cols }, (_, j) => String(j));
  return (
    <div className="space-y-2">
      {rowKeys.map((rk) => (
        <div key={rk} className="flex gap-3">
          {colKeys.map((ck) => (
            <Skeleton key={ck} className="h-9 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Tab 1: Routes ─────────────────────────────────────────────────────────────
function RoutesTab({ actor }: { actor: backendInterface }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingBaseline, setSettingBaseline] = useState<string | null>(null);
  const [filterVessel, setFilterVessel] = useState<string>("all");
  const [filterFuel, setFilterFuel] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const loadRoutes = useCallback(async () => {
    try {
      const data = await actor.getRoutes();
      setRoutes(data);
    } catch (_e) {
      toast.error("Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const handleSetBaseline = async (routeId: string) => {
    setSettingBaseline(routeId);
    try {
      await actor.setBaseline(routeId);
      await loadRoutes();
      toast.success(`Route ${routeId} set as baseline`);
    } catch (_e) {
      toast.error("Failed to set baseline");
    } finally {
      setSettingBaseline(null);
    }
  };

  const vesselTypes = [...new Set(routes.map((r) => r.vesselType))];
  const fuelTypes = [...new Set(routes.map((r) => r.fuelType))];
  const years = [...new Set(routes.map((r) => Number(r.year)))];

  const filtered = routes.filter((r) => {
    if (filterVessel !== "all" && r.vesselType !== filterVessel) return false;
    if (filterFuel !== "all" && r.fuelType !== filterFuel) return false;
    if (filterYear !== "all" && Number(r.year) !== Number(filterYear))
      return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Filter:
        </span>
        <Select value={filterVessel} onValueChange={setFilterVessel}>
          <SelectTrigger className="w-40" data-ocid="routes.vessel_type.select">
            <SelectValue placeholder="Vessel Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vessels</SelectItem>
            {vesselTypes.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterFuel} onValueChange={setFilterFuel}>
          <SelectTrigger className="w-36" data-ocid="routes.fuel_type.select">
            <SelectValue placeholder="Fuel Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fuels</SelectItem>
            {fuelTypes.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-28" data-ocid="routes.year.select">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterVessel !== "all" ||
          filterFuel !== "all" ||
          filterYear !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterVessel("all");
              setFilterFuel("all");
              setFilterYear("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : (
            <Table data-ocid="routes.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-display font-semibold">
                    Route ID
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Vessel Type
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Fuel
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Year
                  </TableHead>
                  <TableHead className="font-display font-semibold text-right">
                    GHG Intensity
                    <span className="block text-xs font-normal text-muted-foreground">
                      gCO₂e/MJ
                    </span>
                  </TableHead>
                  <TableHead className="font-display font-semibold text-right">
                    Fuel Cons.
                    <span className="block text-xs font-normal text-muted-foreground">
                      t
                    </span>
                  </TableHead>
                  <TableHead className="font-display font-semibold text-right">
                    Distance
                    <span className="block text-xs font-normal text-muted-foreground">
                      km
                    </span>
                  </TableHead>
                  <TableHead className="font-display font-semibold text-right">
                    Emissions
                    <span className="block text-xs font-normal text-muted-foreground">
                      t
                    </span>
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-12 text-muted-foreground"
                      data-ocid="routes.empty_state"
                    >
                      <Navigation className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      <p className="font-medium">
                        No routes match your filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((route, idx) => (
                    <TableRow
                      key={route.routeId}
                      className={
                        route.isBaseline ? "bg-accent/5 hover:bg-accent/10" : ""
                      }
                      data-ocid={`routes.row.${idx + 1}`}
                    >
                      <TableCell className="font-mono font-semibold text-sm">
                        {route.routeId}
                        {route.isBaseline && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-xs py-0"
                          >
                            Baseline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{route.vesselType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {route.fuelType}
                        </Badge>
                      </TableCell>
                      <TableCell>{Number(route.year)}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={`font-semibold ${
                            isCompliant(route) ? "text-success" : "text-danger"
                          }`}
                        >
                          {fmt(route.ghgIntensity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {route.fuelConsumption.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {route.distance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {route.totalEmissions.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {isCompliant(route) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Compliant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                            <AlertCircle className="h-3.5 w-3.5" />{" "}
                            Non-Compliant
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={route.isBaseline ? "secondary" : "outline"}
                          disabled={
                            route.isBaseline ||
                            settingBaseline === route.routeId
                          }
                          onClick={() => handleSetBaseline(route.routeId)}
                          data-ocid={`routes.set_baseline_button.${idx + 1}`}
                        >
                          {settingBaseline === route.routeId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : route.isBaseline ? (
                            "Baseline"
                          ) : (
                            "Set Baseline"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Target GHG Intensity: {TARGET_INTENSITY} gCO₂e/MJ (FuelEU Maritime 2025)
      </p>
    </div>
  );
}

// ── Tab 2: Compare ───────────────────────────────────────────────────────────
function CompareTab({ actor }: { actor: backendInterface }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [baseline, setBaseline] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [allRoutes, base] = await Promise.all([
          actor.getRoutes(),
          actor.getBaseline(),
        ]);
        setRoutes(allRoutes);
        setBaseline(base);
      } catch (_e) {
        toast.error("Failed to load comparison data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [actor]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={`kpi-${i}`} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (!baseline) {
    return (
      <Card className="p-12 text-center shadow-card">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-display font-semibold text-lg">No baseline set</p>
        <p className="text-muted-foreground text-sm mt-1">
          Go to Routes tab and set a baseline route to enable comparison.
        </p>
      </Card>
    );
  }

  const chartData = routes.map((r) => ({
    routeId: r.routeId,
    ghgIntensity: r.ghgIntensity,
    compliant: isCompliant(r),
    isBaseline: r.isBaseline,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Baseline Route"
          value={baseline.routeId}
          icon={<Anchor className="h-5 w-5" />}
          variant="accent"
          subtitle={`${baseline.vesselType} · ${baseline.fuelType} · ${Number(baseline.year)}`}
        />
        <KpiCard
          title="Baseline GHG Intensity"
          value={fmt(baseline.ghgIntensity)}
          unit="gCO₂e/MJ"
          variant={isCompliant(baseline) ? "success" : "danger"}
          icon={<Gauge className="h-5 w-5" />}
        />
        <KpiCard
          title="Target Intensity (2025)"
          value={fmt(TARGET_INTENSITY)}
          unit="gCO₂e/MJ"
          variant="neutral"
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle="FuelEU Maritime Regulation"
        />
      </div>

      {/* Bar Chart */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold">
            GHG Intensity Comparison
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            All routes vs. FuelEU 2025 target ({TARGET_INTENSITY} gCO₂e/MJ)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer
            width="100%"
            height={280}
            data-ocid="compare.chart_point"
          >
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.87 0.015 240)"
              />
              <XAxis
                dataKey="routeId"
                tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }}
              />
              <YAxis
                domain={[85, 96]}
                tick={{ fontSize: 11 }}
                label={{
                  value: "gCO₂e/MJ",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11 },
                }}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${fmt(value)} gCO₂e/MJ`,
                  "GHG Intensity",
                ]}
                contentStyle={{
                  fontFamily: "Plus Jakarta Sans",
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid oklch(0.87 0.015 240)",
                }}
              />
              <ReferenceLine
                y={TARGET_INTENSITY}
                stroke="oklch(0.55 0.2 65)"
                strokeDasharray="5 3"
                strokeWidth={2}
                label={{
                  value: "Target 89.3368",
                  position: "insideTopRight",
                  style: {
                    fontSize: 11,
                    fill: "oklch(0.42 0.12 55)",
                    fontWeight: 600,
                  },
                }}
              />
              <Bar dataKey="ghgIntensity" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.routeId}
                    fill={
                      entry.compliant
                        ? "oklch(0.55 0.15 145)"
                        : "oklch(0.55 0.2 25)"
                    }
                    opacity={entry.isBaseline ? 1 : 0.78}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-[oklch(0.55_0.15_145)]" />
              Compliant (≤ 89.3368)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-[oklch(0.55_0.2_25)]" />
              Non-Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-8 border-t-2 border-dashed border-[oklch(0.55_0.2_65)]" />
              Target line
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold">
            Route Comparison vs. Baseline ({baseline.routeId})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table data-ocid="compare.table">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-display font-semibold">
                  Route ID
                </TableHead>
                <TableHead className="font-display font-semibold">
                  Vessel Type
                </TableHead>
                <TableHead className="font-display font-semibold">
                  Fuel
                </TableHead>
                <TableHead className="font-display font-semibold text-right">
                  GHG Intensity
                </TableHead>
                <TableHead className="font-display font-semibold text-right">
                  % vs. Baseline
                </TableHead>
                <TableHead className="font-display font-semibold text-center">
                  Compliant
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route, idx) => {
                const pct = percentDiff(
                  route.ghgIntensity,
                  baseline.ghgIntensity,
                );
                const compliant = isCompliant(route);
                return (
                  <TableRow
                    key={route.routeId}
                    className={route.isBaseline ? "bg-accent/5" : ""}
                    data-ocid={`compare.row.${idx + 1}`}
                  >
                    <TableCell className="font-mono font-semibold">
                      {route.routeId}
                      {route.isBaseline && (
                        <Badge
                          variant="secondary"
                          className="ml-2 text-xs py-0"
                        >
                          Baseline
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{route.vesselType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {route.fuelType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={`font-semibold ${
                          compliant ? "text-success" : "text-danger"
                        }`}
                      >
                        {fmt(route.ghgIntensity)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {route.isBaseline ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            pct <= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {pct > 0 ? "+" : ""}
                          {fmt(pct)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {compliant ? (
                        <span className="text-xl">✅</span>
                      ) : (
                        <span className="text-xl">❌</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ── Tab 3: Banking ───────────────────────────────────────────────────────────
function BankingTab({ actor }: { actor: backendInterface }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [bankEntry, setBankEntry] = useState<BankEntry | null>(null);
  const [complianceResult, setComplianceResult] = useState<{
    energyInScope: number;
    complianceBalance: number;
    isCompliant: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankingLoading, setBankingLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyAmount, setApplyAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const data = await actor.getRoutes();
        setRoutes(data);
        const baselineRoute = data.find((r) => r.isBaseline);
        if (baselineRoute) setSelectedRouteId(baselineRoute.routeId);
      } catch (_e) {
        toast.error("Failed to load routes");
      } finally {
        setLoading(false);
      }
    };
    loadRoutes();
  }, [actor]);

  const loadRouteData = useCallback(
    async (routeId: string) => {
      if (!routeId) return;
      try {
        const [entry, result] = await Promise.all([
          actor.getBankEntry(routeId),
          actor.getComplianceBalance(routeId),
        ]);
        setBankEntry(entry);
        setComplianceResult(result);
      } catch (_e) {
        toast.error("Failed to load banking data");
      }
    },
    [actor],
  );

  useEffect(() => {
    if (selectedRouteId) {
      setError("");
      setSuccess("");
      loadRouteData(selectedRouteId);
    }
  }, [selectedRouteId, loadRouteData]);

  const handleBankSurplus = async () => {
    setBankingLoading(true);
    setError("");
    setSuccess("");
    try {
      await actor.bankSurplus(selectedRouteId);
      await loadRouteData(selectedRouteId);
      setSuccess("Surplus banked successfully!");
      toast.success("Surplus banked");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to bank surplus";
      setError(msg);
      toast.error(msg);
    } finally {
      setBankingLoading(false);
    }
  };

  const handleApply = async () => {
    const amt = Number.parseFloat(applyAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    const available = bankEntry
      ? Math.max(0, bankEntry.bankedAmount - bankEntry.usedAmount)
      : 0;
    if (amt > available) {
      setError(`Cannot apply ${fmt(amt)} — only ${fmt(available)} available`);
      return;
    }
    setApplyLoading(true);
    setError("");
    setSuccess("");
    try {
      await actor.applyBankedSurplus(selectedRouteId, amt);
      await loadRouteData(selectedRouteId);
      setApplyAmount("");
      setSuccess(`Applied ${fmt(amt)} surplus successfully!`);
      toast.success("Banked surplus applied");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to apply surplus";
      setError(msg);
      toast.error(msg);
    } finally {
      setApplyLoading(false);
    }
  };

  const selectedRoute = routes.find((r) => r.routeId === selectedRouteId);
  const cbValue =
    complianceResult?.complianceBalance ??
    (selectedRoute ? cbCalc(selectedRoute) : null);
  const available = bankEntry
    ? Math.max(0, bankEntry.bankedAmount - bankEntry.usedAmount)
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={`kpi-${i}`} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Route Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Select Route:
        </span>
        <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
          <SelectTrigger className="w-64" data-ocid="banking.route_select">
            <SelectValue placeholder="Choose a route..." />
          </SelectTrigger>
          <SelectContent>
            {routes.map((r) => (
              <SelectItem key={r.routeId} value={r.routeId}>
                {r.routeId} — {r.vesselType} ({r.fuelType}, {Number(r.year)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRouteId && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="Compliance Balance (CB)"
              value={cbValue !== null ? fmt(cbValue) : "—"}
              unit="MJ·gCO₂e"
              variant={
                cbValue === null
                  ? "neutral"
                  : cbValue >= 0
                    ? "success"
                    : "danger"
              }
              icon={<Gauge className="h-5 w-5" />}
              subtitle={
                cbValue !== null && cbValue >= 0 ? "Surplus" : "Deficit"
              }
            />
            <KpiCard
              title="Total Banked"
              value={bankEntry ? fmt(bankEntry.bankedAmount) : "0.00"}
              unit="MJ·gCO₂e"
              variant="accent"
              icon={<Banknote className="h-5 w-5" />}
              subtitle={
                bankEntry ? `Used: ${fmt(bankEntry.usedAmount)}` : "No entries"
              }
            />
            <KpiCard
              title="Available to Apply"
              value={fmt(available)}
              unit="MJ·gCO₂e"
              variant={available > 0 ? "success" : "neutral"}
              icon={<TrendingUp className="h-5 w-5" />}
              subtitle="Banked minus used"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bank Surplus */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-accent" />
                  Bank Surplus (Article 20)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Bank a positive compliance balance to use in future periods.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 text-sm">
                  <span className="text-muted-foreground">Current CB: </span>
                  <span
                    className={`font-mono font-semibold ${
                      cbValue !== null && cbValue >= 0
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {cbValue !== null ? fmt(cbValue) : "—"} MJ·gCO₂e
                  </span>
                </div>
                <Button
                  onClick={handleBankSurplus}
                  disabled={bankingLoading || cbValue === null || cbValue <= 0}
                  className="w-full"
                  data-ocid="banking.bank_surplus_button"
                >
                  {bankingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Banking...
                    </>
                  ) : (
                    "Bank Surplus"
                  )}
                </Button>
                {cbValue !== null && cbValue <= 0 && (
                  <p className="text-xs text-muted-foreground">
                    Banking disabled — no surplus available (CB ≤ 0)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Apply Banked Surplus */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Apply Banked Surplus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Apply previously banked surplus to offset a current deficit.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 text-sm">
                  <span className="text-muted-foreground">Available: </span>
                  <span className="font-mono font-semibold text-success">
                    {fmt(available)} MJ·gCO₂e
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount to apply"
                    value={applyAmount}
                    onChange={(e) => setApplyAmount(e.target.value)}
                    disabled={available <= 0 || applyLoading}
                    min="0"
                    step="0.01"
                    data-ocid="banking.apply_amount_input"
                  />
                  <Button
                    onClick={handleApply}
                    disabled={available <= 0 || applyLoading || !applyAmount}
                    data-ocid="banking.apply_button"
                  >
                    {applyLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {available <= 0 && (
                  <p className="text-xs text-muted-foreground">
                    No banked surplus available to apply.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Feedback */}
          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg bg-danger border border-danger text-danger text-sm"
              data-ocid="banking.error_state"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg bg-success border border-success text-success text-sm"
              data-ocid="banking.success_state"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Greedy allocation ─────────────────────────────────────────────────────────
function greedyAllocate(
  members: { routeId: string; cb_before: number }[],
): { routeId: string; cb_before: number; cb_after: number }[] {
  const sorted = [...members].sort((a, b) => b.cb_before - a.cb_before);
  const result = sorted.map((m) => ({ ...m, cb_after: m.cb_before }));

  for (let i = 0; i < result.length; i++) {
    if (result[i].cb_after <= 0) break;
    for (let j = result.length - 1; j > i; j--) {
      if (result[j].cb_after >= 0) break;
      const transfer = Math.min(result[i].cb_after, -result[j].cb_after);
      result[i].cb_after -= transfer;
      result[j].cb_after += transfer;
    }
  }

  return result;
}

// ── Tab 4: Pooling ───────────────────────────────────────────────────────────
function PoolingTab({ actor }: { actor: backendInterface }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [pools, setPools] = useState<PoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [allRoutes, entries, allPools] = await Promise.all([
        actor.getRoutes(),
        actor.getAllBankEntries(),
        actor.getPools(),
      ]);
      setRoutes(allRoutes);
      setBankEntries(entries);
      setPools(allPools);
    } catch (_e) {
      toast.error("Failed to load pooling data");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const getCbAfterBanking = (route: Route): number => {
    const entry = bankEntries.find((e) => e.routeId === route.routeId);
    const baseCb = cbCalc(route);
    if (!entry) return baseCb;
    return baseCb + (entry.bankedAmount - entry.usedAmount);
  };

  const membersForPool = routes
    .filter((r) => selected.has(r.routeId))
    .map((r) => ({ routeId: r.routeId, cb_before: getCbAfterBanking(r) }));

  const allocation = greedyAllocate(membersForPool);
  const poolSum = membersForPool.reduce((s, m) => s + m.cb_before, 0);

  const isValid = selected.size >= 2 && poolSum >= 0;

  const toggleSelect = (routeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const handleCreatePool = async () => {
    if (!isValid) return;
    setCreating(true);
    setError("");
    try {
      await actor.createPool([...selected]);
      await loadAll();
      setSelected(new Set());
      toast.success("Pool created successfully!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create pool";
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pool Sum Indicator */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-semibold text-lg">Pool Builder</h3>
          <p className="text-sm text-muted-foreground">
            Select 2+ routes to form a compliance pool (Article 21)
          </p>
        </div>
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-xl font-display font-bold text-lg border-2 ${
            selected.size < 2
              ? "border-border bg-muted/30 text-muted-foreground"
              : poolSum >= 0
                ? "border-[oklch(var(--success))] bg-success text-success compliance-glow-success"
                : "border-[oklch(var(--danger))] bg-danger text-danger compliance-glow-danger"
          }`}
          data-ocid="pooling.pool_sum_card"
        >
          <span className="text-xs uppercase tracking-widest font-semibold">
            Pool Sum:
          </span>
          <span className="font-mono">
            {selected.size === 0 ? "—" : fmt(poolSum)}
          </span>
          {selected.size >= 2 && (
            <span className="text-xs">
              {poolSum >= 0 ? "✅ Valid" : "❌ Invalid"}
            </span>
          )}
        </div>
      </div>

      {/* Route Selection Table */}
      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="pooling.table">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">Select</TableHead>
                <TableHead className="font-display font-semibold">
                  Route ID
                </TableHead>
                <TableHead className="font-display font-semibold">
                  Vessel
                </TableHead>
                <TableHead className="font-display font-semibold">
                  Fuel
                </TableHead>
                <TableHead className="font-display font-semibold text-right">
                  CB (after banking)
                </TableHead>
                <TableHead className="font-display font-semibold text-right">
                  CB After Pool
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route, idx) => {
                const cbBefore = getCbAfterBanking(route);
                const alloc = allocation.find(
                  (a) => a.routeId === route.routeId,
                );
                const cbAfter = alloc?.cb_after ?? null;
                const isSelected = selected.has(route.routeId);

                return (
                  <TableRow
                    key={route.routeId}
                    className={isSelected ? "bg-accent/5" : ""}
                    data-ocid={`pooling.row.${idx + 1}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(route.routeId)}
                        data-ocid={`pooling.checkbox.${idx + 1}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {route.routeId}
                    </TableCell>
                    <TableCell>{route.vesselType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {route.fuelType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={`font-semibold ${
                          cbBefore >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {fmt(cbBefore)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {cbAfter !== null ? (
                        <span
                          className={`font-semibold ${
                            cbAfter >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {fmt(cbAfter)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Pool Button + Validation */}
      <div className="space-y-3">
        {selected.size < 2 && selected.size > 0 && (
          <p className="text-xs text-muted-foreground">
            Select at least 2 routes to create a pool.
          </p>
        )}
        {selected.size >= 2 && poolSum < 0 && (
          <p className="text-xs text-danger">
            Pool sum is negative — the pool is invalid. Remove deficit routes or
            add more surplus routes.
          </p>
        )}

        <Button
          onClick={handleCreatePool}
          disabled={!isValid || creating}
          size="lg"
          data-ocid="pooling.create_pool_button"
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Pool...
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Create Pool ({selected.size} routes)
            </>
          )}
        </Button>

        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg bg-danger border border-danger text-danger text-sm"
            data-ocid="pooling.error_state"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Past Pools */}
      {pools.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-base border-t border-border pt-4">
            Past Pools
          </h3>
          <div className="space-y-3">
            {pools.map((pool, poolIdx) => (
              <Card key={pool.poolId} className="shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-sm font-semibold">
                      {pool.poolId}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          pool.valid
                            ? "border-[oklch(var(--success))] text-success"
                            : "border-[oklch(var(--danger))] text-danger"
                        }`}
                      >
                        {pool.valid ? "Valid" : "Invalid"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Sum: {fmt(pool.poolSum)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {pool.members.map((member, mIdx) => (
                      <div
                        key={member.routeId}
                        className="p-2 rounded-lg bg-muted/40 text-xs"
                        data-ocid={`pooling.item.${poolIdx * 10 + mIdx + 1}`}
                      >
                        <p className="font-mono font-semibold">
                          {member.routeId}
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          Before:{" "}
                          <span
                            className={`font-medium ${
                              member.cb_before >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {fmt(member.cb_before)}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          After:{" "}
                          <span
                            className={`font-medium ${
                              member.cb_after >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {fmt(member.cb_after)}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("routes");
  const { actor, isFetching } = useActor();

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Header */}
      <header className="bg-primary text-primary-foreground border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Ship className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl leading-tight tracking-tight">
                  FuelEU Maritime
                </h1>
                <p className="text-xs text-primary-foreground/60 font-medium tracking-wide">
                  Compliance Dashboard
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-primary-foreground/50">
              <Fuel className="h-3.5 w-3.5" />
              <span>Target: {TARGET_INTENSITY} gCO₂e/MJ</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isFetching || !actor ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
              <p className="text-sm text-muted-foreground">
                Connecting to backend...
              </p>
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-5"
          >
            <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex h-auto bg-muted/60 p-1 gap-1">
              <TabsTrigger
                value="routes"
                className="font-display font-semibold text-sm px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
                data-ocid="routes.tab"
              >
                <Navigation className="mr-1.5 h-4 w-4" />
                Routes
              </TabsTrigger>
              <TabsTrigger
                value="compare"
                className="font-display font-semibold text-sm px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
                data-ocid="compare.tab"
              >
                <TrendingUp className="mr-1.5 h-4 w-4" />
                Compare
              </TabsTrigger>
              <TabsTrigger
                value="banking"
                className="font-display font-semibold text-sm px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
                data-ocid="banking.tab"
              >
                <Banknote className="mr-1.5 h-4 w-4" />
                Banking
              </TabsTrigger>
              <TabsTrigger
                value="pooling"
                className="font-display font-semibold text-sm px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
                data-ocid="pooling.tab"
              >
                <Users className="mr-1.5 h-4 w-4" />
                Pooling
              </TabsTrigger>
            </TabsList>

            <TabsContent value="routes">
              <RoutesTab actor={actor} />
            </TabsContent>
            <TabsContent value="compare">
              <CompareTab actor={actor} />
            </TabsContent>
            <TabsContent value="banking">
              <BankingTab actor={actor} />
            </TabsContent>
            <TabsContent value="pooling">
              <PoolingTab actor={actor} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            FuelEU Maritime Regulation — Article 20 (Banking) &amp; 21 (Pooling)
          </span>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            © {new Date().getFullYear()}. Built with ♥ using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
