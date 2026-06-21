import { useEffect, useState, type FormEvent } from "react";

import { AppLayout } from "../components/AppLayout";
import { Alert, Button, Field, Icon, SelectField, Spinner } from "../components/ui";
import {
  ApiError,
  catalogApi,
  goalsApi,
  measurementsApi,
  statsApi,
} from "../lib/api";
import type {
  BodyMeasurement,
  Exercise,
  Goal,
  GoalType,
  PersonalRecord,
} from "../lib/types";

const TYPE_LABELS: Record<GoalType, string> = {
  bodyweight: "Peso corporal",
  body_fat: "Grasa corporal",
  one_rm: "1RM",
};
const TYPE_UNITS: Record<GoalType, string> = {
  bodyweight: "kg",
  body_fat: "%",
  one_rm: "kg",
};
const TYPE_STYLE: Record<
  GoalType,
  { icon: string; chip: string; bar: string; value: string }
> = {
  bodyweight: {
    icon: "scale",
    chip: "bg-primary-container/20 text-primary",
    bar: "bg-primary",
    value: "text-primary",
  },
  body_fat: {
    icon: "monitor_weight",
    chip: "bg-secondary-container/20 text-secondary",
    bar: "bg-secondary",
    value: "text-secondary",
  },
  one_rm: {
    icon: "fitness_center",
    chip: "bg-tertiary-container/20 text-tertiary",
    bar: "bg-tertiary",
    value: "text-tertiary",
  },
};

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [latest, setLatest] = useState<BodyMeasurement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("bodyweight");
  const [targetValue, setTargetValue] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      setGoals(await goalsApi.list());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar");
    }
  }

  useEffect(() => {
    reload();
    catalogApi.exercises().then(setExercises).catch(() => {});
    statsApi.personalRecords().then(setRecords).catch(() => {});
    measurementsApi
      .list()
      .then((m) => setLatest(m[0] ?? null))
      .catch(() => {});
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await goalsApi.create({
        goal_type: goalType,
        target_value: Number(targetValue),
        exercise_id: goalType === "one_rm" ? Number(exerciseId) : null,
        target_date: targetDate || null,
      });
      setTargetValue("");
      setExerciseId("");
      setTargetDate("");
      setAdding(false);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este objetivo?")) return;
    await goalsApi.remove(id);
    await reload();
  }

  function exerciseName(id: number | null): string {
    if (id == null) return "";
    return exercises.find((e) => e.id === id)?.name ?? `#${id}`;
  }

  // Valor actual del objetivo según datos reales (medidas / récords).
  function currentValue(g: Goal): number | null {
    if (g.goal_type === "bodyweight") return latest?.weight ?? null;
    if (g.goal_type === "body_fat") return latest?.body_fat_pct ?? null;
    if (g.goal_type === "one_rm" && g.exercise_id != null)
      return records.find((r) => r.exercise_id === g.exercise_id)?.est_1rm ?? null;
    return null;
  }

  return (
    <AppLayout title="RutinApp">
      <header className="mb-md">
        <h2 className="mb-xs text-headline-md text-on-surface">Tus Metas</h2>
        <p className="text-body-md text-on-surface-variant">
          Mantén el enfoque. Registra y supera tus objetivos.
        </p>
      </header>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="glass-card mb-md space-y-3 rounded-xl p-md">
          <SelectField
            label="Tipo"
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
          >
            <option value="bodyweight">Peso corporal</option>
            <option value="body_fat">% grasa</option>
            <option value="one_rm">1RM de un ejercicio</option>
          </SelectField>

          {goalType === "one_rm" && (
            <SelectField
              label="Ejercicio"
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
              required
            >
              <option value="">Selecciona…</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </SelectField>
          )}

          <Field
            label={`Meta (${TYPE_UNITS[goalType]})`}
            type="number"
            step="0.1"
            required
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
          <Field
            label="Fecha límite (opcional)"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
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

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        {goals === null && !error && <Spinner />}
        {goals?.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-12 text-center text-on-surface-variant">
            <Icon name="track_changes" className="!text-[40px] opacity-40" />
            <p>Sin objetivos todavía.</p>
          </div>
        )}
        {goals?.map((g) => {
          const st = TYPE_STYLE[g.goal_type];
          const unit = TYPE_UNITS[g.goal_type];
          const current = currentValue(g);
          // Proximidad a la meta (0-100), independiente de la dirección.
          const pct =
            current != null && g.target_value
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    (1 - Math.abs(current - g.target_value) / g.target_value) *
                      100,
                  ),
                )
              : null;
          return (
            <article
              key={g.id}
              className="glass-card group relative flex flex-col gap-md rounded-xl p-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-sm">
                  <span
                    className={`flex items-center justify-center rounded-lg p-sm ${st.chip}`}
                  >
                    <Icon name={st.icon} className="!text-xl" />
                  </span>
                  <div>
                    <h3 className="text-body-lg text-on-surface">
                      {TYPE_LABELS[g.goal_type]}
                      {g.goal_type === "one_rm" && g.exercise_id != null && (
                        <span className="block text-label-caps font-normal text-on-surface-variant">
                          {exerciseName(g.exercise_id)}
                        </span>
                      )}
                    </h3>
                    {g.target_date && (
                      <p className="text-label-caps uppercase tracking-wider text-on-surface-variant">
                        Límite: {g.target_date}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className={`text-stat-value ${st.value}`}>
                    {g.target_value} {unit}
                  </span>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-outline hover:text-error"
                    aria-label="Eliminar objetivo"
                  >
                    <Icon name="close" className="!text-[18px]" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-sm">
                <div className="flex justify-between text-label-caps text-on-surface-variant">
                  <span>
                    {current != null ? `Actual: ${current} ${unit}` : "Sin dato actual"}
                  </span>
                  {current != null && (
                    <span>
                      Faltan:{" "}
                      {Math.abs(g.target_value - current).toFixed(1)} {unit}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className={`h-full rounded-full ${st.bar}`}
                    style={{ width: `${pct ?? 5}%` }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!adding && (
        <div className="mt-lg">
          <Button onClick={() => setAdding(true)}>
            <Icon name="add" />
            Nueva Meta
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
