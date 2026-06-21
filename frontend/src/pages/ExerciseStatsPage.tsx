// Estadísticas personales de un ejercicio: resumen, historia e indicaciones.
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { ExerciseThumb } from "../components/ExerciseGuide";
import { LineChart, type ChartPoint } from "../components/LineChart";
import { Alert, Icon, Spinner } from "../components/ui";
import { ApiError, catalogApi, statsApi } from "../lib/api";
import type { Exercise, ExerciseHistoryPoint } from "../lib/types";

type Tab = "resumen" | "historia" | "indicaciones";
type EMetric = "weight" | "orm" | "volume";

const METRICS: { key: EMetric; label: string }[] = [
  { key: "weight", label: "Mayor Peso" },
  { key: "orm", label: "One Rep Max" },
  { key: "volume", label: "Mejor Volumen" },
];

const RANGES: { key: string; label: string; days: number | null }[] = [
  { key: "3m", label: "Últimos 3 meses", days: 90 },
  { key: "6m", label: "Últimos 6 meses", days: 180 },
  { key: "1y", label: "Último año", days: 365 },
  { key: "all", label: "Todo", days: null },
];

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function metricVal(p: ExerciseHistoryPoint, m: EMetric): number {
  return m === "weight" ? p.max_weight : m === "orm" ? p.best_1rm : p.best_volume;
}

function shortDate(iso: string): string {
  const [, mo, da] = iso.split("-").map(Number);
  return `${da} ${MONTHS[mo - 1]}`;
}

export function ExerciseStatsPage() {
  const { id } = useParams();
  const exerciseId = Number(id);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("resumen");
  const [metric, setMetric] = useState<EMetric>("weight");
  const [rangeKey, setRangeKey] = useState("3m");

  useEffect(() => {
    catalogApi
      .exercises()
      .then((all) => setExercise(all.find((e) => e.id === exerciseId) ?? null))
      .catch(() => {});
    statsApi
      .exerciseHistory(exerciseId)
      .then(setHistory)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, [exerciseId]);

  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0];
  const ranged = useMemo(() => {
    const h = history ?? [];
    if (range.days === null) return h;
    const cutoff = Date.now() - range.days * 86_400_000;
    return h.filter((p) => new Date(p.performed_date).getTime() >= cutoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, range.days]);

  const chartData: ChartPoint[] = ranged.map((p) => ({
    x: p.performed_date,
    y: metricVal(p, metric),
  }));

  // Récords personales (sobre todo el historial).
  const records = useMemo(() => {
    const h = history ?? [];
    if (h.length === 0) return null;
    return {
      weight: Math.max(...h.map((p) => p.max_weight)),
      orm: Math.max(...h.map((p) => p.best_1rm)),
      volume: Math.max(...h.map((p) => p.best_volume)),
    };
  }, [history]);

  const last = ranged[ranged.length - 1];

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "historia", label: "Historia" },
    { key: "indicaciones", label: "Indicaciones" },
  ];

  return (
    <AppLayout title={exercise?.name ?? "Ejercicio"}>
      {/* Pestañas */}
      <div className="mb-md flex border-b border-surface-container-high">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "flex-1 border-b-2 py-2 text-body-md transition-colors " +
              (tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {history === null && !error && <Spinner />}

      {history && (
        <>
          {tab === "resumen" && (
            <div className="flex flex-col gap-md">
              {exercise && (
                <div className="overflow-hidden rounded-xl bg-white">
                  <ExerciseThumb exercise={exercise} fill />
                </div>
              )}
              <div>
                <h2 className="text-headline-md text-on-surface">
                  {exercise?.name}
                </h2>
                {exercise?.primary_muscle && (
                  <p className="text-body-md text-on-surface-variant">
                    Primario: {exercise.primary_muscle.name}
                  </p>
                )}
              </div>

              {history.length === 0 ? (
                <p className="glass-card rounded-xl p-lg text-center text-on-surface-variant">
                  Aún no has registrado este ejercicio.
                </p>
              ) : (
                <>
                  {/* Cabecera del gráfico */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-headline-md text-on-surface">
                        {last ? metricVal(last, metric) : 0} kg
                      </p>
                      {last && (
                        <p className="text-body-md text-on-surface-variant">
                          {shortDate(last.performed_date)}
                        </p>
                      )}
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

                  <div className="rounded-lg border border-surface-container-high bg-surface-container-lowest p-2">
                    <LineChart data={chartData} unit="kg" />
                  </div>

                  {/* Pills de métrica */}
                  <div className="no-scrollbar flex gap-2 overflow-x-auto">
                    {METRICS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMetric(m.key)}
                        className={
                          "shrink-0 rounded-full px-4 py-2 text-body-md transition-colors " +
                          (metric === m.key
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface")
                        }
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Récords personales */}
                  {records && (
                    <section className="mt-sm">
                      <h3 className="mb-sm flex items-center gap-2 text-headline-md text-on-surface">
                        <span>🏅</span> Récords Personales
                      </h3>
                      <div className="grid grid-cols-3 gap-md">
                        <div className="glass-card flex flex-col gap-xs rounded-xl p-md">
                          <span className="text-label-caps uppercase text-on-surface-variant">
                            Mayor peso
                          </span>
                          <span className="text-stat-value text-on-surface">
                            {records.weight} kg
                          </span>
                        </div>
                        <div className="glass-card flex flex-col gap-xs rounded-xl p-md">
                          <span className="text-label-caps uppercase text-on-surface-variant">
                            1RM est.
                          </span>
                          <span className="text-stat-value text-on-surface">
                            {records.orm} kg
                          </span>
                        </div>
                        <div className="glass-card flex flex-col gap-xs rounded-xl p-md">
                          <span className="text-label-caps uppercase text-on-surface-variant">
                            Mejor vol.
                          </span>
                          <span className="text-stat-value text-on-surface">
                            {records.volume} kg
                          </span>
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "historia" && (
            <div className="flex flex-col">
              {history.length === 0 && (
                <p className="py-10 text-center text-on-surface-variant">
                  Sin historial todavía.
                </p>
              )}
              {[...history].reverse().map((p) => (
                <div
                  key={p.performed_date}
                  className="flex items-center justify-between gap-2 border-b border-surface-container-high/50 py-md"
                >
                  <span className="text-body-lg text-on-surface">
                    {shortDate(p.performed_date)}
                  </span>
                  <span className="flex gap-md text-body-md text-on-surface-variant">
                    <span>{p.max_weight} kg</span>
                    <span>1RM {p.best_1rm}</span>
                    <span>vol {p.best_volume}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "indicaciones" && (
            <div className="glass-card rounded-xl p-md">
              {exercise?.instructions ? (
                <p className="whitespace-pre-line text-body-md text-on-surface">
                  {exercise.instructions}
                </p>
              ) : (
                <p className="text-center text-on-surface-variant">
                  Este ejercicio no tiene indicaciones registradas.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
