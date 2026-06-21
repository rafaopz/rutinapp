// Informe mensual: resumen de entrenamientos agregados por mes.
import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "../components/AppLayout";
import { Alert, Icon, Spinner } from "../components/ui";
import { ApiError, statsApi } from "../lib/api";
import type { SessionStat } from "../lib/types";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface MonthReport {
  key: string;
  label: string;
  workouts: number;
  volume: number;
  sets: number;
  duration: number;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}min`;
}

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

export function MonthlyReportPage() {
  const [stats, setStats] = useState<SessionStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statsApi
      .sessions()
      .then(setStats)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, []);

  const months = useMemo(() => {
    const map = new Map<string, MonthReport>();
    for (const s of stats ?? []) {
      const d = new Date(s.performed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let r = map.get(key);
      if (!r) {
        r = {
          key,
          label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
          workouts: 0,
          volume: 0,
          sets: 0,
          duration: 0,
        };
        map.set(key, r);
      }
      r.workouts += 1;
      r.volume += s.volume;
      r.sets += s.sets;
      r.duration += s.duration_seconds ?? 0;
    }
    // Más reciente primero.
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [stats]);

  return (
    <AppLayout title="Informe mensual">
      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {stats === null && !error && <Spinner />}

      {stats && months.length === 0 && (
        <p className="py-10 text-center text-on-surface-variant">
          Aún no hay entrenamientos para resumir.
        </p>
      )}

      {months.length > 0 && (
        <div className="flex flex-col gap-md">
          {months.map((m) => (
            <div key={m.key} className="glass-card rounded-xl p-md">
              <h3 className="mb-md text-headline-md text-on-surface">
                {m.label}
              </h3>
              <div className="grid grid-cols-2 gap-md">
                <Cell icon="exercise" label="Entrenamientos" value={String(m.workouts)} />
                <Cell icon="timer" label="Duración" value={fmtDuration(m.duration)} />
                <Cell icon="monitoring" label="Volumen" value={fmtVolume(m.volume)} />
                <Cell icon="format_list_numbered" label="Series" value={String(m.sets)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function Cell({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-bright text-on-surface-variant">
        <Icon name={icon} className="!text-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-stat-value text-on-surface">{value}</p>
        <p className="text-label-caps uppercase text-on-surface-variant">
          {label}
        </p>
      </div>
    </div>
  );
}
