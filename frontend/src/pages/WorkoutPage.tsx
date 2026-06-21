import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { ExerciseGuide } from "../components/ExerciseGuide";
import { ExercisePicker } from "../components/ExercisePicker";
import { Alert, Button, Icon, Spinner } from "../components/ui";
import { ApiError, catalogApi, routinesApi, workoutsApi } from "../lib/api";
import type {
  Exercise,
  Routine,
  RoutineDay,
  RoutineSummary,
  SetLogCreatePayload,
} from "../lib/types";

interface DraftSet extends SetLogCreatePayload {
  exerciseName: string;
}

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { seconds, label: `${mm}:${ss}` };
}

// mm:ss a partir de segundos
function fmt(total: number): string {
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const REST_DEFAULT = 90; // segundos de descanso por defecto

export function WorkoutPage() {
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [noActive, setNoActive] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [draftSets, setDraftSets] = useState<DraftSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rest, setRest] = useState(0); // segundos restantes de descanso
  const { seconds: elapsed, label: timer } = useElapsed(draftSets.length > 0);

  // Cuenta atrás del descanso entre series.
  useEffect(() => {
    if (rest <= 0) return;
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [rest > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        const list: RoutineSummary[] = await routinesApi.list();
        const active = list.find((r) => r.is_active);
        if (!active) {
          setNoActive(true);
          return;
        }
        const full = await routinesApi.get(active.id);
        setRoutine(full);
        if (full.days.length > 0) setSelectedDayId(full.days[0].id);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Error al cargar");
      }
      catalogApi.exercises().then(setExercises).catch(() => {});
    })();
  }, []);

  const selectedDay: RoutineDay | undefined = useMemo(
    () => routine?.days.find((d) => d.id === selectedDayId),
    [routine, selectedDayId],
  );

  const targetTotal = useMemo(
    () =>
      selectedDay?.exercises.reduce((sum, e) => sum + (e.target_sets ?? 0), 0) ??
      0,
    [selectedDay],
  );

  // Volumen total = Σ peso×reps (excluye calentamiento).
  const volume = useMemo(
    () =>
      draftSets.reduce(
        (sum, s) => sum + (s.is_warmup ? 0 : s.weight * s.reps),
        0,
      ),
    [draftSets],
  );

  function addSet(set: DraftSet) {
    setDraftSets((prev) => [...prev, set]);
    setSaved(false);
    if (!set.is_warmup) setRest(REST_DEFAULT); // inicia descanso tras serie efectiva
  }

  function removeSet(idx: number) {
    setDraftSets((prev) => prev.filter((_, i) => i !== idx));
  }

  // Series ya registradas de un ejercicio, con su índice global (para borrar).
  function setsOf(exerciseId: number) {
    return draftSets
      .map((s, index) => ({ s, index }))
      .filter((x) => x.s.exercise_id === exerciseId);
  }

  async function handleSave() {
    if (draftSets.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await workoutsApi.create({
        routine_day_id: selectedDayId,
        bodyweight: null,
        notes: null,
        duration_seconds: elapsed || null,
        sets: draftSets.map(({ exerciseName: _n, ...s }) => s),
      });
      setDraftSets([]);
      setRest(0);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  if (noActive) {
    return (
      <AppLayout title="Entrenar hoy">
        <div className="glass-card mt-lg flex flex-col items-center gap-md rounded-xl p-lg text-center">
          <Icon name="event_busy" className="!text-[40px] text-on-surface-variant" />
          <p className="text-on-surface">No tienes una rutina activa.</p>
          <Button onClick={() => navigate("/routines")} full={false}>
            Ir a Mis rutinas
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!routine && !error)
    return (
      <AppLayout title="Entrenar hoy">
        <Spinner />
      </AppLayout>
    );

  return (
    <AppLayout title="RutinApp">
      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {/* Selección de día */}
      <section className="mb-lg">
        <h2 className="mb-md text-headline-lg-mobile text-on-surface">
          Entrenar hoy
        </h2>
        {routine && routine.days.length > 0 && (
          <div className="no-scrollbar flex gap-sm overflow-x-auto pb-sm">
            {routine.days.map((d) => {
              const active = d.id === selectedDayId;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDayId(d.id)}
                  className={
                    "whitespace-nowrap rounded-full px-md py-sm text-label-caps uppercase transition-transform active:scale-95 " +
                    (active
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                      : "bg-surface-container-high text-on-surface-variant")
                  }
                >
                  Día {d.day_order}
                  {d.name ? ` · ${d.name}` : ""}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cabecera de sesión: KPIs */}
      <section className="mb-lg grid grid-cols-3 gap-sm">
        <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-md text-center">
          <p className="mb-xs text-label-caps text-on-surface-variant">SERIES</p>
          <p className="text-stat-value text-primary">
            {draftSets.length}
            {targetTotal ? (
              <span className="text-sm font-normal text-on-surface-variant">
                /{targetTotal}
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-md text-center">
          <p className="mb-xs text-label-caps text-on-surface-variant">VOLUMEN</p>
          <p className="text-stat-value text-secondary">
            {Math.round(volume)}
            <span className="text-sm font-normal text-on-surface-variant"> kg</span>
          </p>
        </div>
        <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-md text-center">
          <p className="mb-xs text-label-caps text-on-surface-variant">DURACIÓN</p>
          <p className="flex items-center justify-center gap-1 text-stat-value text-tertiary">
            <Icon name="timer" className="!text-[16px]" />
            {timer}
          </p>
        </div>
      </section>

      {/* Ejercicios prescritos del día */}
      {selectedDay && selectedDay.exercises.length > 0 && (
        <div className="mb-lg space-y-md">
          {selectedDay.exercises.map((rde) => (
            <ExerciseLogger
              key={rde.id}
              exercise={rde.exercise}
              exerciseName={rde.exercise.name}
              hint={
                rde.target_sets || rde.target_reps_min
                  ? `${rde.target_sets ?? "?"} x ${rde.target_reps_min ?? "?"}-${rde.target_reps_max ?? "?"}`
                  : undefined
              }
              targetWeight={rde.target_weight}
              loggedSets={setsOf(rde.exercise.id)}
              onAdd={addSet}
              onRemove={removeSet}
            />
          ))}
        </div>
      )}

      {/* Ejercicio libre */}
      <FreeExercisePicker
        exercises={exercises}
        setsOf={setsOf}
        onAdd={addSet}
        onRemove={removeSet}
      />

      {saved && (
        <p className="mt-md flex items-center gap-1 text-body-md font-medium text-primary">
          <Icon name="check_circle" fill /> ¡Entrenamiento guardado. Buen trabajo!
        </p>
      )}

      {/* Finalizar */}
      <div className="mt-lg">
        <Button
          onClick={handleSave}
          disabled={busy || draftSets.length === 0}
          className="h-14 text-body-lg"
        >
          <Icon name="check_circle" fill />
          {busy ? "Guardando…" : "Finalizar entrenamiento"}
        </Button>
      </div>

      {/* Timer de descanso */}
      {rest > 0 && (
        <RestTimer
          rest={rest}
          onAdjust={(delta) => setRest((r) => Math.max(0, r + delta))}
          onSkip={() => setRest(0)}
        />
      )}
    </AppLayout>
  );
}

// --- Tarjeta de ejercicio con registro de series -----------------------
interface ExerciseLoggerProps {
  exercise?: Exercise;
  exerciseName: string;
  hint?: string;
  targetWeight?: number | null;
  loggedSets: { s: DraftSet; index: number }[];
  onAdd: (set: DraftSet) => void;
  onRemove: (index: number) => void;
}

function ExerciseLogger({
  exercise,
  exerciseName,
  hint,
  targetWeight,
  loggedSets,
  onAdd,
  onRemove,
}: ExerciseLoggerProps) {
  // El peso se prellena con el peso objetivo (editable por la persona).
  const [weight, setWeight] = useState(
    targetWeight != null ? String(targetWeight) : "",
  );
  const [reps, setReps] = useState("");
  const [warmup, setWarmup] = useState(false);

  const workingCount = loggedSets.filter((x) => !x.s.is_warmup).length;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!weight || !reps || !exercise) return;
    onAdd({
      exercise_id: exercise.id,
      exerciseName,
      set_number: workingCount + 1,
      weight: Number(weight),
      reps: Number(reps),
      is_warmup: warmup,
    });
    // Conserva el peso para las siguientes series; solo limpia las reps.
    setReps("");
  }

  const inputCls =
    "h-10 w-full min-w-0 rounded-lg border border-surface-container-high bg-surface-container text-center " +
    "text-sm font-normal text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <article className="glass-panel rounded-xl border border-surface-container-high/50 p-md">
      <div className="mb-md flex items-start gap-md">
        {exercise && <ExerciseGuide exercise={exercise} />}
        <div className="flex-1">
          <h3 className="mb-xs text-body-lg text-on-surface">{exerciseName}</h3>
          {(hint || targetWeight != null) && (
            <p className="flex flex-wrap items-center gap-1 text-label-caps text-on-surface-variant">
              <Icon name="target" className="!text-[14px]" />
              {hint && <span>Objetivo: {hint}</span>}
              {targetWeight != null && (
                <span className="rounded-md bg-primary-container/25 px-1.5 py-0.5 normal-case text-primary">
                  {targetWeight} kg
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-sm">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem] gap-sm px-sm text-center text-label-caps text-on-surface-variant">
          <span className="text-left">SET</span>
          <span>KG</span>
          <span>REPS</span>
          <span className="text-right">✓</span>
        </div>

        {/* Series ya registradas */}
        {loggedSets.map(({ s, index }, i) => (
          <div
            key={index}
            className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-sm rounded-lg border border-surface-container-high/30 bg-surface-container-low p-sm"
          >
            <div className="flex w-8 justify-center">
              {s.is_warmup ? (
                <Icon
                  name="local_fire_department"
                  className="!text-[16px] text-tertiary"
                />
              ) : (
                <span className="text-sm text-primary">
                  {loggedSets.slice(0, i + 1).filter((x) => !x.s.is_warmup).length}
                </span>
              )}
            </div>
            <span className="text-center text-sm text-on-surface">{s.weight}</span>
            <span className="text-center text-sm text-on-surface">{s.reps}</span>
            <button
              onClick={() => onRemove(index)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:text-error"
              aria-label="Eliminar serie"
            >
              <Icon name="close" />
            </button>
          </div>
        ))}

        {/* Fila de entrada */}
        <form
          onSubmit={submit}
          className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-sm rounded-lg bg-surface-container/40 p-sm"
        >
          <div className="flex w-8 justify-center text-on-surface-variant">
            <button
              type="button"
              onClick={() => setWarmup((v) => !v)}
              aria-label="Marcar calentamiento"
              title="Calentamiento"
            >
              <Icon
                name="local_fire_department"
                fill={warmup}
                className={`!text-[18px] ${warmup ? "text-tertiary" : "text-outline"}`}
              />
            </button>
          </div>
          <input
            type="number"
            step="0.5"
            inputMode="decimal"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputCls}
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={inputCls}
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary
              text-on-primary active:scale-95"
            aria-label="Añadir serie"
          >
            <Icon name="check" fill />
          </button>
        </form>
      </div>
    </article>
  );
}

// --- Selector de ejercicio libre ---------------------------------------
function FreeExercisePicker({
  exercises,
  setsOf,
  onAdd,
  onRemove,
}: {
  exercises: Exercise[];
  setsOf: (id: number) => { s: DraftSet; index: number }[];
  onAdd: (set: DraftSet) => void;
  onRemove: (index: number) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);

  return (
    <div className="mt-md">
      {selected ? (
        <ExerciseLogger
          exercise={selected}
          exerciseName={selected.name}
          loggedSets={setsOf(selected.id)}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ) : null}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-md flex w-full items-center justify-center gap-2 rounded-xl border border-dashed
          border-primary/30 py-3 text-label-caps text-primary transition-colors hover:bg-primary-container/10"
      >
        <Icon name="add" />
        AÑADIR OTRO EJERCICIO
      </button>
      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          onSelect={(ex) => {
            setSelected(ex);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// --- Timer de descanso entre series ------------------------------------
function RestTimer({
  rest,
  onAdjust,
  onSkip,
}: {
  rest: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-container-margin pb-2 md:bottom-2">
      <div className="mx-auto flex max-w-[28rem] items-center gap-3 rounded-xl border border-primary/40 bg-surface-container-high/95 p-3 shadow-lg backdrop-blur-xl">
        <Icon name="hourglass_top" className="text-primary" />
        <div className="flex-1">
          <p className="text-label-caps text-on-surface-variant">DESCANSO</p>
          <p className="text-stat-value text-primary">{fmt(rest)}</p>
        </div>
        <button
          onClick={() => onAdjust(-15)}
          className="rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface active:scale-95"
        >
          −15
        </button>
        <button
          onClick={() => onAdjust(15)}
          className="rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface active:scale-95"
        >
          +15
        </button>
        <button
          onClick={onSkip}
          className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary active:scale-95"
        >
          Omitir
        </button>
      </div>
    </div>
  );
}
