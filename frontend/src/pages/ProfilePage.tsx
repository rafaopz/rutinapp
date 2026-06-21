// Perfil = centro de estadísticas: stats, gráfico de actividad y accesos.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { Alert, Button, Icon, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError, statsApi } from "../lib/api";
import type { SessionStat } from "../lib/types";

// --- Filtros del gráfico ------------------------------------------------
type Metric = "duration" | "volume" | "reps";

const METRICS: { key: Metric; label: string; color: string }[] = [
  { key: "duration", label: "Duración", color: "bg-primary" },
  { key: "volume", label: "Volumen", color: "bg-secondary" },
  { key: "reps", label: "Repeticiones", color: "bg-tertiary" },
];

type Unit = "week" | "month";
const RANGES: { key: string; label: string; unit: Unit; count: number }[] = [
  { key: "4w", label: "Últimas 4 semanas", unit: "week", count: 4 },
  { key: "3m", label: "Últimos 3 meses", unit: "week", count: 13 },
  { key: "6m", label: "Últimos 6 meses", unit: "month", count: 6 },
  { key: "1y", label: "Último año", unit: "month", count: 12 },
];

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

interface Bucket {
  label: string;
  volume: number;
  duration: number; // minutos
  reps: number;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - dow);
  return x;
}

const DAY_MS = 86_400_000;

function buildBuckets(
  sessions: SessionStat[],
  unit: Unit,
  count: number,
): Bucket[] {
  const now = new Date();
  const buckets: Bucket[] = [];

  for (let ago = count - 1; ago >= 0; ago--) {
    let label: string;
    if (unit === "week") {
      const start = new Date(startOfWeek(now).getTime() - ago * 7 * DAY_MS);
      label = `${start.getDate()} ${MONTHS_ES[start.getMonth()]}`;
    } else {
      const m = new Date(now.getFullYear(), now.getMonth() - ago, 1);
      label = MONTHS_ES[m.getMonth()];
    }
    buckets.push({ label, volume: 0, duration: 0, reps: 0 });
  }

  for (const s of sessions) {
    const d = new Date(s.performed_at);
    let idx: number;
    if (unit === "week") {
      const ago = Math.round(
        (startOfWeek(now).getTime() - startOfWeek(d).getTime()) /
          (7 * DAY_MS),
      );
      idx = count - 1 - ago;
    } else {
      const ago =
        (now.getFullYear() - d.getFullYear()) * 12 +
        (now.getMonth() - d.getMonth());
      idx = count - 1 - ago;
    }
    if (idx < 0 || idx >= count) continue;
    buckets[idx].volume += s.volume;
    buckets[idx].duration += (s.duration_seconds ?? 0) / 60;
    buckets[idx].reps += s.reps;
  }

  return buckets;
}

// --- Formateadores ------------------------------------------------------
function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
  return String(Math.round(kg));
}

function fmtDurationMin(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function metricValue(b: Bucket, m: Metric): number {
  return m === "volume" ? b.volume : m === "duration" ? b.duration : b.reps;
}

function axisLabel(v: number, m: Metric): string {
  if (m === "volume") return `${fmtVolume(v)} kg`;
  if (m === "duration") return fmtDurationMin(v);
  return `${Math.round(v)} reps`;
}

// --- Componentes locales ------------------------------------------------
/** Gráfico de barras verticales sobre eje temporal. */
function BarChart({
  buckets,
  metric,
  color,
}: {
  buckets: Bucket[];
  metric: Metric;
  color: string;
}) {
  const max = Math.max(...buckets.map((b) => metricValue(b, metric)), 1);
  // Etiquetas de eje X espaciadas para no amontonar (≈6 visibles).
  const step = Math.ceil(buckets.length / 6);

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex">
        {/* Eje Y */}
        <div className="mr-2 flex h-40 w-10 flex-col justify-between py-1 text-right text-[10px] text-on-surface-variant">
          <span>{axisLabel(max, metric)}</span>
          <span>0</span>
        </div>
        {/* Barras */}
        <div className="flex h-40 flex-1 items-end gap-[3px] border-l border-b border-surface-container-high pl-1">
          {buckets.map((b, i) => {
            const v = metricValue(b, metric);
            const h = v > 0 ? Math.max((v / max) * 100, 2) : 0;
            return (
              <div
                key={i}
                className="flex h-full flex-1 items-end"
                title={`${b.label}: ${axisLabel(v, metric)}`}
              >
                <div
                  className={`w-full rounded-t-sm ${color} transition-all`}
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* Etiquetas de eje X */}
      <div className="flex pl-12">
        <div className="flex flex-1 gap-[3px] pl-1">
          {buckets.map((b, i) => (
            <span
              key={i}
              className="flex-1 text-center text-[10px] text-on-surface-variant"
            >
              {i % step === 0 ? b.label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pills({
  value,
  onChange,
}: {
  value: Metric;
  onChange: (v: Metric) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {METRICS.map((m) => {
        const active = m.key === value;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={
              "shrink-0 rounded-full px-4 py-2 text-body-md transition-colors " +
              (active
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface")
            }
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-label-caps uppercase text-on-surface-variant">
        {label}
      </span>
      <span className="text-headline-md text-on-surface">{value}</span>
    </div>
  );
}

const LINKS = [
  { to: "/statistics", icon: "insights", label: "Estadísticas" },
  { to: "/exercise-stats", icon: "fitness_center", label: "Ejercicios" },
  { to: "/measurements", icon: "straighten", label: "Medidas" },
  { to: "/calendar", icon: "calendar_month", label: "Calendario" },
];

// --- Página -------------------------------------------------------------
export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = user?.display_name || user?.username || "Atleta";
  const initial = name.charAt(0).toUpperCase();

  const [stats, setStats] = useState<SessionStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("volume");
  const [rangeKey, setRangeKey] = useState("3m");

  useEffect(() => {
    statsApi
      .sessions()
      .then(setStats)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, []);

  const totals = useMemo(() => {
    const s = stats ?? [];
    return {
      workouts: s.length,
      volume: s.reduce((a, x) => a + x.volume, 0),
      sets: s.reduce((a, x) => a + x.sets, 0),
      duration: s.reduce((a, x) => a + (x.duration_seconds ?? 0), 0),
    };
  }, [stats]);

  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];
  const buckets = useMemo(
    () => buildBuckets(stats ?? [], range.unit, range.count),
    [stats, range.unit, range.count],
  );
  const periodTotal = buckets.reduce((a, b) => a + metricValue(b, metric), 0);
  const barColor =
    METRICS.find((m) => m.key === metric)?.color ?? "bg-primary";

  const periodSummary =
    metric === "duration"
      ? fmtTotalDuration(Math.round(periodTotal) * 60)
      : metric === "volume"
        ? `${fmtVolume(periodTotal)} kg`
        : `${Math.round(periodTotal)} reps`;

  return (
    <AppLayout title="Perfil" showBack={false}>
      {/* Cabecera con stats en línea */}
      <section className="mt-sm flex items-center gap-md py-sm">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
          <span className="text-display-hero">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="mb-xs truncate text-headline-lg-mobile text-on-surface">
            {name}
          </h2>
          <div className="flex gap-lg">
            <Stat label="Entrenos" value={String(totals.workouts)} />
            <Stat label="Volumen" value={`${fmtVolume(totals.volume)} kg`} />
            <Stat label="Series" value={String(totals.sets)} />
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {stats === null && !error && <Spinner />}

      {stats && (
        <>
          {/* Gráfico de actividad */}
          <section className="mt-sm flex flex-col gap-md">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-headline-md text-on-surface">
                  {periodSummary}
                </p>
                <p className="text-body-md text-on-surface-variant">
                  {METRICS.find((m) => m.key === metric)?.label} ·{" "}
                  {range.label.toLowerCase()}
                </p>
              </div>
              <div className="relative shrink-0">
                <select
                  value={rangeKey}
                  onChange={(e) => setRangeKey(e.target.value)}
                  className="appearance-none rounded-lg bg-transparent py-1 pl-2 pr-7 text-body-md text-primary outline-none"
                >
                  {RANGES.map((r) => (
                    <option key={r.key} value={r.key} className="text-on-surface">
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-primary">
                  <Icon name="expand_more" className="!text-[18px]" />
                </span>
              </div>
            </div>

            {totals.workouts === 0 ? (
              <div className="glass-card flex flex-col items-center gap-sm rounded-xl py-8 text-center">
                <Icon
                  name="bar_chart"
                  className="!text-[40px] text-on-surface-variant"
                />
                <p className="text-body-md text-on-surface">
                  Aún no hay entrenamientos registrados.
                </p>
                <Button onClick={() => navigate("/workout")} full={false}>
                  Registrar entrenamiento
                </Button>
              </div>
            ) : (
              <BarChart buckets={buckets} metric={metric} color={barColor} />
            )}

            <Pills value={metric} onChange={setMetric} />
          </section>

          {/* Información */}
          <section className="mt-lg flex flex-col gap-md">
            <h3 className="text-headline-md text-on-surface">Información</h3>
            <div className="grid grid-cols-2 gap-md">
              {LINKS.map((l) => (
                <button
                  key={l.to}
                  onClick={() => navigate(l.to)}
                  className="glass-card flex items-center gap-sm rounded-xl p-md text-left
                    transition-transform duration-200 active:scale-[0.98]"
                >
                  <Icon name={l.icon} className="text-on-surface-variant" />
                  <span className="text-body-lg text-on-surface">{l.label}</span>
                </button>
              ))}
            </div>
          </section>

          <Button variant="danger" onClick={logout} className="mt-lg">
            <Icon name="logout" />
            Cerrar sesión
          </Button>
        </>
      )}
    </AppLayout>
  );
}
