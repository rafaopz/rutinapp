import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { LineChart, type ChartPoint } from "../components/LineChart";
import { Alert, Button, Icon, SelectField, Spinner } from "../components/ui";
import { ApiError, catalogApi, statsApi } from "../lib/api";
import type { Exercise, PersonalRecord, ProgressionPoint } from "../lib/types";

export function ProgressPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PersonalRecord[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [progression, setProgression] = useState<ProgressionPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statsApi
      .personalRecords()
      .then((recs) => {
        setRecords(recs);
        if (recs.length > 0) setSelectedId(String(recs[0].exercise_id));
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
    catalogApi.exercises().then(setExercises).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setProgression([]);
      return;
    }
    statsApi
      .progression(Number(selectedId))
      .then(setProgression)
      .catch(() => setProgression([]));
  }, [selectedId]);

  const chartData: ChartPoint[] = progression.map((p) => ({
    x: p.performed_date,
    y: p.est_1rm,
  }));

  const exerciseName =
    exercises.find((e) => e.id === Number(selectedId))?.name ??
    records?.find((r) => r.exercise_id === Number(selectedId))?.exercise_name ??
    "";

  // Tendencia: diferencia entre primer y último 1RM estimado.
  const trend =
    progression.length >= 2
      ? progression[progression.length - 1].est_1rm - progression[0].est_1rm
      : 0;

  return (
    <AppLayout title="RutinApp">
      <section className="mb-lg flex flex-col gap-sm">
        <h2 className="text-headline-md text-on-surface">Progreso</h2>
        <p className="text-body-md text-on-surface-variant">
          Estás rompiendo tus propios límites. ¡Sigue así!
        </p>
      </section>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {records === null && !error && <Spinner />}

      {records && records.length === 0 && (
        <div className="glass-card flex flex-col items-center gap-md rounded-xl p-lg text-center">
          <Icon name="monitoring" className="!text-[40px] text-on-surface-variant" />
          <p className="text-on-surface">Todavía no hay datos de entrenamiento.</p>
          <Button onClick={() => navigate("/workout")} full={false}>
            Registrar un entrenamiento
          </Button>
        </div>
      )}

      {records && records.length > 0 && (
        <>
          {/* Gráfica de 1RM estimado */}
          <section className="glass-card flex flex-col gap-md rounded-xl p-md">
            <SelectField
              label="Ejercicio"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {records.map((r) => (
                <option key={r.exercise_id} value={r.exercise_id}>
                  {r.exercise_name}
                </option>
              ))}
            </SelectField>

            <div className="mt-sm flex items-end justify-between">
              <h3 className="text-label-caps text-on-surface-variant">
                ESTIMADO 1RM (KG)
              </h3>
              {trend !== 0 && (
                <div
                  className={`flex items-center gap-xs ${trend > 0 ? "text-secondary" : "text-tertiary"}`}
                >
                  <Icon
                    name={trend > 0 ? "trending_up" : "trending_down"}
                    className="!text-[16px]"
                  />
                  <span className="text-stat-value">
                    {trend > 0 ? "+" : ""}
                    {trend.toFixed(1)}kg
                  </span>
                </div>
              )}
            </div>
            <p className="text-label-caps text-on-surface-variant">
              {exerciseName} · Epley
            </p>
            <div className="rounded-lg border border-surface-container-high bg-surface-container-lowest p-2">
              <LineChart data={chartData} unit="kg" />
            </div>
          </section>

          {/* Récords personales */}
          <section className="mt-lg flex flex-col gap-sm">
            <h3 className="px-xs text-headline-md text-on-surface">
              Récords Personales
            </h3>
            <div className="glass-card overflow-hidden rounded-xl">
              <div className="grid grid-cols-4 gap-2 border-b border-surface-container-high bg-surface-container-high/80 p-sm">
                <div className="col-span-2 text-label-caps text-on-surface-variant">
                  EJERCICIO
                </div>
                <div className="text-right text-label-caps text-on-surface-variant">
                  PESO
                </div>
                <div className="text-right text-label-caps text-on-surface-variant">
                  e1RM
                </div>
              </div>
              {records.map((r) => (
                <div
                  key={r.exercise_id}
                  className="grid grid-cols-4 items-center gap-2 border-b border-surface-container-high/50 p-md last:border-0"
                >
                  <div className="col-span-2 truncate text-body-md text-on-surface">
                    {r.exercise_name}
                  </div>
                  <div className="text-right text-body-md text-on-surface-variant">
                    {r.weight}
                    <span className="ml-0.5 text-[11px]">kg×{r.reps}</span>
                  </div>
                  <div className="text-right text-stat-value text-primary">
                    {r.est_1rm}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppLayout>
  );
}
