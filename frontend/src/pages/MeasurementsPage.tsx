import { useEffect, useState, type FormEvent } from "react";

import { AppLayout } from "../components/AppLayout";
import { LineChart, type ChartPoint } from "../components/LineChart";
import { Alert, Button, Icon, Spinner } from "../components/ui";
import { ApiError, measurementsApi } from "../lib/api";
import type { BodyMeasurement } from "../lib/types";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

type MetricKey =
  | "weight"
  | "body_fat_pct"
  | "waist_cm"
  | "chest_cm"
  | "arm_cm"
  | "neck_cm";

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "body_fat_pct", label: "Grasa", unit: "%" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "chest_cm", label: "Pecho", unit: "cm" },
  { key: "arm_cm", label: "Brazo", unit: "cm" },
  { key: "neck_cm", label: "Cuello", unit: "cm" },
];

function dayChip(iso: string) {
  const d = new Date(iso);
  return { day: d.getDate(), month: MONTHS[d.getMonth()] ?? "" };
}

export function MeasurementsPage() {
  const [items, setItems] = useState<BodyMeasurement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [neck, setNeck] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [arm, setArm] = useState("");
  const [busy, setBusy] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("weight");

  async function reload() {
    try {
      setItems(await measurementsApi.list());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar");
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await measurementsApi.create({
        weight: weight ? Number(weight) : null,
        body_fat_pct: bodyFat ? Number(bodyFat) : null,
        neck_cm: neck ? Number(neck) : null,
        chest_cm: chest ? Number(chest) : null,
        waist_cm: waist ? Number(waist) : null,
        arm_cm: arm ? Number(arm) : null,
      });
      setWeight("");
      setBodyFat("");
      setNeck("");
      setChest("");
      setWaist("");
      setArm("");
      setAdding(false);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta medida?")) return;
    await measurementsApi.remove(id);
    await reload();
  }

  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const withMetric = items?.filter((m) => m[metric] != null) ?? [];
  const metricChart: ChartPoint[] = [...withMetric]
    .reverse()
    .map((m) => ({ x: m.measured_at.slice(0, 10), y: m[metric] as number }));

  const current = (withMetric[0]?.[metric] as number | undefined) ?? null;
  const previous = (withMetric[1]?.[metric] as number | undefined) ?? null;
  const delta = current != null && previous != null ? current - previous : null;

  const circInput =
    "h-12 w-full rounded-lg border border-surface-container-high/50 bg-surface-container-low text-center " +
    "text-stat-value text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <AppLayout title="RutinApp">
      <section className="mb-md">
        <h2 className="text-headline-lg-mobile text-primary">Medidas</h2>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Rastrea tu evolución física.
        </p>
      </section>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {items === null && !error && <Spinner />}

      {items && (
        <>
          {/* Medida actual + gráfica */}
          <div className="glass-panel mb-lg rounded-xl p-md">
            <div className="mb-md flex items-end justify-between">
              <div>
                <span className="mb-xs block text-label-caps uppercase text-on-surface-variant">
                  {activeMetric.label} actual
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-display-hero text-on-surface">
                    {current ?? "—"}
                  </span>
                  <span className="text-body-md text-on-surface-variant">
                    {activeMetric.unit}
                  </span>
                </div>
              </div>
              {delta != null && delta !== 0 && (
                <div
                  className={`flex items-center gap-1 rounded-full px-3 py-1 ${delta < 0 ? "bg-secondary-container/20 text-secondary" : "bg-tertiary-container/20 text-tertiary"}`}
                >
                  <Icon
                    name={delta < 0 ? "arrow_downward" : "arrow_upward"}
                    className="!text-[16px]"
                  />
                  <span className="text-label-caps">
                    {Math.abs(delta).toFixed(1)}
                    {activeMetric.unit}
                  </span>
                </div>
              )}
            </div>

            {/* Selector de medida */}
            <div className="no-scrollbar mb-md flex gap-2 overflow-x-auto">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={
                    "shrink-0 rounded-full px-3 py-1.5 text-label-caps uppercase transition-colors " +
                    (metric === m.key
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-on-surface-variant")
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>

            {metricChart.length > 0 ? (
              <LineChart data={metricChart} unit={activeMetric.unit} />
            ) : (
              <p className="py-6 text-center text-sm text-on-surface-variant">
                Registra {activeMetric.label.toLowerCase()} para ver la evolución.
              </p>
            )}
          </div>

          {/* Formulario */}
          {!adding ? (
            <Button onClick={() => setAdding(true)}>
              <Icon name="add" />
              Nueva medida
            </Button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-md">
              <div className="grid grid-cols-2 gap-sm">
                <div className="glass-panel flex flex-col rounded-xl p-md">
                  <label className="mb-sm text-label-caps text-on-surface-variant">
                    PESO (KG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={circInput}
                  />
                </div>
                <div className="glass-panel flex flex-col rounded-xl p-md">
                  <label className="mb-sm text-label-caps text-on-surface-variant">
                    GRASA (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className={circInput}
                  />
                </div>
              </div>

              <div className="glass-panel rounded-xl p-md">
                <h3 className="mb-md text-label-caps text-on-surface-variant">
                  CIRCUNFERENCIAS (CM)
                </h3>
                <div className="grid grid-cols-2 gap-sm">
                  {[
                    { label: "CUELLO", value: neck, set: setNeck },
                    { label: "PECHO", value: chest, set: setChest },
                    { label: "CINTURA", value: waist, set: setWaist },
                    { label: "BRAZO", value: arm, set: setArm },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="mb-1 block text-[10px] font-medium tracking-wider text-outline">
                        {f.label}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.0"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className={circInput}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Guardando…" : "Guardar medidas"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAdding(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Historial */}
          <div className="mt-lg">
            <h3 className="mb-md text-body-lg text-on-surface">Historial</h3>
            <div className="space-y-sm">
              {items.length === 0 && (
                <p className="py-8 text-center text-on-surface-variant">
                  Sin medidas todavía.
                </p>
              )}
              {items.map((m) => {
                const chip = dayChip(m.measured_at);
                return (
                  <div
                    key={m.id}
                    className="glass-panel flex items-center justify-between rounded-xl p-md"
                  >
                    <div className="flex items-center gap-md">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-surface-bright leading-none">
                        <span className="text-sm font-semibold text-on-surface">
                          {chip.day}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {chip.month}
                        </span>
                      </div>
                      <div>
                        <div className="text-stat-value text-on-surface">
                          {m.weight != null ? `${m.weight} kg` : "—"}
                        </div>
                        <div className="text-label-caps text-on-surface-variant">
                          {[
                            m.body_fat_pct != null
                              ? `${m.body_fat_pct}% grasa`
                              : null,
                            m.waist_cm != null ? `cintura ${m.waist_cm}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-outline hover:text-error"
                      aria-label="Eliminar"
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
