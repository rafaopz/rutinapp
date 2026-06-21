// Distribución de músculos (radar) + KPIs comparando periodo actual vs anterior.
import { useEffect, useState } from "react";

import { AppLayout } from "../components/AppLayout";
import { Alert, Icon, Spinner } from "../components/ui";
import { ApiError, statsApi } from "../lib/api";
import type { MacroMuscle, MuscleDistribution } from "../lib/types";

const RANGES = [
  { key: 30, label: "Últimos 30 días" },
  { key: 90, label: "Últimos 90 días" },
  { key: 365, label: "Último año" },
];

function Radar({ muscles }: { muscles: MacroMuscle[] }) {
  const size = 300;
  const cx = 150;
  const cy = 150;
  const R = 95;
  const n = muscles.length;
  const max = Math.max(...muscles.flatMap((m) => [m.current, m.previous]), 1);
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (val: number, i: number): [number, number] => {
    const r = (val / max) * R;
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  };
  const poly = (vals: number[]) =>
    vals.map((v, i) => pt(v, i).join(",")).join(" ");
  const levels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[20rem]">
      {/* Rejilla */}
      {levels.map((lv, li) => (
        <polygon
          key={li}
          points={muscles
            .map((_, i) => {
              const r = lv * R;
              return `${cx + r * Math.cos(ang(i))},${cy + r * Math.sin(ang(i))}`;
            })
            .join(" ")}
          fill="none"
          stroke="#222a3d"
          strokeWidth={1}
        />
      ))}
      {/* Ejes */}
      {muscles.map((_, i) => {
        const [x, y] = pt(max, i);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#222a3d" strokeWidth={1} />
        );
      })}
      {/* Periodo anterior */}
      <polygon
        points={poly(muscles.map((m) => m.previous))}
        fill="#64748b33"
        stroke="#64748b"
        strokeWidth={2}
      />
      {/* Periodo actual */}
      <polygon
        points={poly(muscles.map((m) => m.current))}
        fill="#14b8a633"
        stroke="#14b8a6"
        strokeWidth={2}
      />
      {/* Etiquetas */}
      {muscles.map((m, i) => {
        const r = R + 16;
        const x = cx + r * Math.cos(ang(i));
        const y = cy + r * Math.sin(ang(i));
        const anchor = Math.abs(x - cx) < 12 ? "middle" : x > cx ? "start" : "end";
        return (
          <text
            key={i}
            x={x}
            y={y + 3}
            fontSize={11}
            fill="#cbd5e1"
            textAnchor={anchor}
          >
            {m.name}
          </text>
        );
      })}
    </svg>
  );
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

function Kpi({
  label,
  value,
  delta,
  fmt,
}: {
  label: string;
  value: number;
  delta: number;
  fmt: (n: number) => string;
}) {
  return (
    <div className="glass-card flex flex-col gap-xs rounded-xl p-md">
      <span className="text-body-md text-on-surface-variant">{label}</span>
      <span className="text-stat-value text-on-surface">{fmt(value)}</span>
      {delta !== 0 && (
        <span
          className={`flex items-center gap-1 text-label-caps ${delta > 0 ? "text-secondary" : "text-tertiary"}`}
        >
          <Icon
            name={delta > 0 ? "arrow_upward" : "arrow_downward"}
            className="!text-[14px]"
          />
          {fmt(Math.abs(delta))}
        </span>
      )}
    </div>
  );
}

export function MuscleDistributionPage() {
  const [data, setData] = useState<MuscleDistribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setData(null);
    statsApi
      .muscleDistribution(days)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, [days]);

  const hasData = data && data.current.sets > 0;

  return (
    <AppLayout title="Distribución de los músculos">
      {/* Rango */}
      <div className="mb-md">
        <div className="relative">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full appearance-none rounded-lg bg-surface-container-high px-4 py-3 text-center
              text-body-lg text-on-surface outline-none"
          >
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-on-surface-variant">
            <Icon name="expand_more" />
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {data === null && !error && <Spinner />}

      {data && (
        <>
          <Radar muscles={data.muscles} />

          {/* Leyenda */}
          <div className="mb-lg mt-sm flex items-center justify-center gap-md">
            <span className="flex items-center gap-1 text-body-md text-on-surface-variant">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Actual
            </span>
            <span className="flex items-center gap-1 text-body-md text-on-surface-variant">
              <span className="h-2.5 w-2.5 rounded-full bg-[#64748b]" /> Anterior
            </span>
          </div>

          {!hasData && (
            <p className="mb-lg text-center text-body-md text-on-surface-variant">
              Sin entrenamientos en este periodo.
            </p>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-md">
            <Kpi
              label="Entrenamientos"
              value={data.current.workouts}
              delta={data.current.workouts - data.previous.workouts}
              fmt={(n) => String(Math.round(n))}
            />
            <Kpi
              label="Duración"
              value={data.current.duration_seconds}
              delta={data.current.duration_seconds - data.previous.duration_seconds}
              fmt={fmtDuration}
            />
            <Kpi
              label="Volumen"
              value={data.current.volume}
              delta={data.current.volume - data.previous.volume}
              fmt={fmtVolume}
            />
            <Kpi
              label="Series"
              value={data.current.sets}
              delta={data.current.sets - data.previous.sets}
              fmt={(n) => String(Math.round(n))}
            />
          </div>
        </>
      )}
    </AppLayout>
  );
}
