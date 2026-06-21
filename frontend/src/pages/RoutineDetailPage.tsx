import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { ExerciseGuide, ExerciseThumb } from "../components/ExerciseGuide";
import { ExercisePicker } from "../components/ExercisePicker";
import { Alert, Button, Field, Icon, Spinner } from "../components/ui";
import { ApiError, catalogApi, routinesApi } from "../lib/api";
import type { Exercise, Routine } from "../lib/types";

export function RoutineDetailPage() {
  const { id } = useParams();
  const routineId = Number(id);
  const navigate = useNavigate();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);

  const [addingDay, setAddingDay] = useState(false);
  const [dayName, setDayName] = useState("");

  // Edición de la rutina (nombre + días/semana + indicaciones)
  const [editingRoutine, setEditingRoutine] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDpw, setEditDpw] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // Edición de un ejercicio prescrito (por fila)
  const [editingRdeId, setEditingRdeId] = useState<number | null>(null);
  const [eSets, setESets] = useState("");
  const [eRepsMin, setERepsMin] = useState("");
  const [eRepsMax, setERepsMax] = useState("");
  const [eWeight, setEWeight] = useState("");

  const [addingExercise, setAddingExercise] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null);
  const [sets, setSets] = useState("");
  const [repsMin, setRepsMin] = useState("");
  const [repsMax, setRepsMax] = useState("");
  const [weight, setWeight] = useState("");

  const reload = useCallback(async () => {
    try {
      const r = await routinesApi.get(routineId);
      setRoutine(r);
      setSelectedDayId((cur) =>
        cur && r.days.some((d) => d.id === cur)
          ? cur
          : (r.days[0]?.id ?? null),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar la rutina");
    }
  }, [routineId]);

  useEffect(() => {
    reload();
    catalogApi.exercises().then(setExercises).catch(() => {});
  }, [reload]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  }

  async function handleAddDay(e: FormEvent) {
    e.preventDefault();
    const nextOrder =
      (routine?.days.reduce((m, d) => Math.max(m, d.day_order), 0) ?? 0) + 1;
    await run(() =>
      routinesApi.addDay(routineId, {
        day_order: nextOrder,
        name: dayName || null,
      }),
    );
    setDayName("");
    setAddingDay(false);
  }

  function openRoutineEdit() {
    if (!routine) return;
    setEditName(routine.name);
    setEditDpw(routine.days_per_week ? String(routine.days_per_week) : "");
    setEditNotes(routine.notes ?? "");
    setEditingRoutine(true);
  }

  function submitRoutineEdit(e: FormEvent) {
    e.preventDefault();
    const name = editName.trim();
    if (!name) return;
    run(async () => {
      await routinesApi.update(routineId, {
        name,
        days_per_week: editDpw ? Number(editDpw) : null,
        notes: editNotes.trim() || null,
      });
      setEditingRoutine(false);
    });
  }

  function openExerciseEdit(rde: Routine["days"][number]["exercises"][number]) {
    setEditingRdeId(rde.id);
    setESets(rde.target_sets != null ? String(rde.target_sets) : "");
    setERepsMin(rde.target_reps_min != null ? String(rde.target_reps_min) : "");
    setERepsMax(rde.target_reps_max != null ? String(rde.target_reps_max) : "");
    setEWeight(rde.target_weight != null ? String(rde.target_weight) : "");
  }

  function submitExerciseEdit(e: FormEvent, rdeId: number) {
    e.preventDefault();
    run(async () => {
      await routinesApi.updateDayExercise(rdeId, {
        target_sets: eSets ? Number(eSets) : null,
        target_reps_min: eRepsMin ? Number(eRepsMin) : null,
        target_reps_max: eRepsMax ? Number(eRepsMax) : null,
        target_weight: eWeight ? Number(eWeight) : null,
      });
      setEditingRdeId(null);
    });
  }

  function submitExercise(e: FormEvent) {
    e.preventDefault();
    if (!selectedEx || !selectedDay) return;
    run(async () => {
      await routinesApi.addDayExercise(selectedDay.id, {
        exercise_id: selectedEx.id,
        target_sets: sets ? Number(sets) : null,
        target_reps_min: repsMin ? Number(repsMin) : null,
        target_reps_max: repsMax ? Number(repsMax) : null,
        target_weight: weight ? Number(weight) : null,
      });
      setSelectedEx(null);
      setSets("");
      setRepsMin("");
      setRepsMax("");
      setWeight("");
      setAddingExercise(false);
    });
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta rutina y todos sus días?")) return;
    await routinesApi.remove(routineId);
    navigate("/routines");
  }

  if (error && !routine) {
    return (
      <AppLayout title="Rutina">
        <Alert message={error} />
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate("/routines")}
        >
          Volver
        </Button>
      </AppLayout>
    );
  }

  if (!routine)
    return (
      <AppLayout title="Rutina">
        <Spinner />
      </AppLayout>
    );

  const selectedDay = routine.days.find((d) => d.id === selectedDayId);

  return (
    <AppLayout title="RutinApp">
      {/* Cabecera de rutina */}
      <section className="mb-lg flex flex-col gap-sm">
        {editingRoutine ? (
          <form
            onSubmit={submitRoutineEdit}
            className="glass-card space-y-3 rounded-xl p-md"
          >
            <Field
              label="Nombre de la rutina"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Field
              label="Días por semana (opcional)"
              type="number"
              min={1}
              max={7}
              placeholder="ej. 4"
              value={editDpw}
              onChange={(e) => setEditDpw(e.target.value)}
            />
            <label className="block">
              <span className="mb-xs ml-1 block text-label-caps uppercase tracking-wider text-on-surface-variant">
                Indicaciones (calentamiento, progresión…)
              </span>
              <textarea
                rows={6}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Cómo calentar, cómo progresar, notas del plan…"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3
                  text-on-surface placeholder-outline-variant/60 outline-none transition-colors
                  focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingRoutine(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-headline-lg-mobile text-on-surface">
                {routine.name}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {routine.is_active && (
                  <span className="flex items-center gap-1 rounded-full bg-secondary-container px-sm py-xs text-label-caps text-on-secondary-container">
                    <Icon name="check_circle" className="!text-[14px]" />
                    Activa
                  </span>
                )}
                <button
                  onClick={openRoutineEdit}
                  aria-label="Editar rutina"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                >
                  <Icon name="edit" />
                </button>
              </div>
            </div>
            <p className="text-body-md text-on-surface-variant">
              {routine.days_per_week
                ? `${routine.days_per_week} días/semana`
                : "Plan personalizado"}
            </p>
          </>
        )}
      </section>

      {/* Indicaciones del plan (colapsable) */}
      {!editingRoutine && routine.notes && (
        <section className="mb-md">
          <button
            onClick={() => setShowNotes((v) => !v)}
            className="glass-card flex w-full items-center gap-md rounded-xl p-md text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container/30 text-primary">
              <Icon name="menu_book" />
            </span>
            <span className="flex-1 text-body-lg text-on-surface">
              Indicaciones del plan
            </span>
            <Icon
              name={showNotes ? "expand_less" : "expand_more"}
              className="text-outline"
            />
          </button>
          {showNotes && (
            <div className="glass-card mt-sm rounded-xl p-md">
              <p className="whitespace-pre-line text-body-md text-on-surface">
                {routine.notes}
              </p>
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {/* Chips de día */}
      <nav className="no-scrollbar mb-md flex gap-sm overflow-x-auto pb-sm">
        {routine.days.map((d) => {
          const active = d.id === selectedDayId;
          return (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDayId(d.id);
                setAddingExercise(false);
              }}
              className={
                "flex h-touch-target-min shrink-0 items-center justify-center rounded-full px-md text-label-caps uppercase transition-transform active:scale-95 " +
                (active
                  ? "bg-primary-container text-on-primary-container"
                  : "border border-outline/30 bg-surface-container-high text-on-surface-variant hover:bg-surface-bright/50")
              }
            >
              Día {d.day_order}
              {d.name ? ` · ${d.name}` : ""}
            </button>
          );
        })}
        <button
          onClick={() => setAddingDay((v) => !v)}
          className="flex h-touch-target-min w-touch-target-min shrink-0 items-center justify-center rounded-full
            border border-dashed border-outline/40 text-primary transition-transform active:scale-95"
          aria-label="Agregar día"
        >
          <Icon name="add" />
        </button>
      </nav>

      {addingDay && (
        <form
          onSubmit={handleAddDay}
          className="glass-card mb-md space-y-3 rounded-xl p-md"
        >
          <Field
            label="Nombre del día"
            placeholder="Push A, Pierna…"
            value={dayName}
            onChange={(e) => setDayName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit">Agregar día</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddingDay(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {routine.days.length === 0 && !addingDay && (
        <p className="py-10 text-center text-on-surface-variant">
          Sin días todavía. Agrega el primero con el botón +.
        </p>
      )}

      {selectedDay && (
        <>
          {/* Acciones a nivel de día */}
          <div className="mb-md flex w-full gap-md">
            <button
              onClick={() => setAddingExercise((v) => !v)}
              className="flex h-touch-target-min flex-1 items-center justify-center gap-sm rounded-lg
                border border-surface-container-high bg-surface-container-high text-body-md text-primary
                transition-transform hover:border-primary/50 active:scale-95"
            >
              <Icon name="add" />
              Añadir Ejercicio
            </button>
            <button
              onClick={() => run(() => routinesApi.removeDay(selectedDay.id))}
              aria-label="Eliminar día"
              className="flex h-touch-target-min w-touch-target-min items-center justify-center rounded-lg
                border border-error/30 bg-error-container/20 text-error transition-transform hover:bg-error-container/40 active:scale-95"
            >
              <Icon name="delete" />
            </button>
          </div>

          {/* Formulario de añadir ejercicio (selector visual) */}
          {addingExercise && (
            <form
              onSubmit={submitExercise}
              className="glass-card mb-md space-y-2 rounded-xl p-md"
            >
              {selectedEx ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-2 text-left"
                >
                  <ExerciseThumb exercise={selectedEx} size={48} />
                  <span className="flex-1">
                    <span className="block text-body-md font-medium text-on-surface">
                      {selectedEx.name}
                    </span>
                    <span className="text-label-caps text-primary">Cambiar</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="w-full rounded-xl border border-dashed border-outline/40 bg-surface-container-low
                    px-4 py-3 text-body-md font-medium text-primary hover:border-primary"
                >
                  🔍 Elegir ejercicio
                </button>
              )}
              {pickerOpen && (
                <ExercisePicker
                  exercises={exercises}
                  onSelect={(ex) => {
                    setSelectedEx(ex);
                    setPickerOpen(false);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              )}
              <div className="grid grid-cols-3 gap-2">
                <Field
                  label="Series"
                  type="number"
                  min={1}
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                />
                <Field
                  label="Reps mín"
                  type="number"
                  min={1}
                  value={repsMin}
                  onChange={(e) => setRepsMin(e.target.value)}
                />
                <Field
                  label="Reps máx"
                  type="number"
                  min={1}
                  value={repsMax}
                  onChange={(e) => setRepsMax(e.target.value)}
                />
              </div>
              <Field
                label="Peso objetivo (kg, opcional)"
                type="number"
                step="0.5"
                min={0}
                placeholder="ej. 40"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={!selectedEx}>
                  Añadir
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAddingExercise(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Lista de ejercicios del día */}
          <section className="flex flex-col gap-md">
            {selectedDay.exercises.length === 0 && (
              <p className="py-6 text-center text-on-surface-variant">
                Sin ejercicios en este día.
              </p>
            )}
            {selectedDay.exercises.map((rde) =>
              editingRdeId === rde.id ? (
                <form
                  key={rde.id}
                  onSubmit={(e) => submitExerciseEdit(e, rde.id)}
                  className="glass-card space-y-2 rounded-xl p-md"
                >
                  <div className="flex items-center gap-3">
                    <ExerciseThumb exercise={rde.exercise} size={40} />
                    <h3 className="text-body-lg text-on-surface">
                      {rde.exercise.name}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field
                      label="Series"
                      type="number"
                      min={1}
                      value={eSets}
                      onChange={(e) => setESets(e.target.value)}
                    />
                    <Field
                      label="Reps mín"
                      type="number"
                      min={1}
                      value={eRepsMin}
                      onChange={(e) => setERepsMin(e.target.value)}
                    />
                    <Field
                      label="Reps máx"
                      type="number"
                      min={1}
                      value={eRepsMax}
                      onChange={(e) => setERepsMax(e.target.value)}
                    />
                  </div>
                  <Field
                    label="Peso objetivo (kg, opcional)"
                    type="number"
                    step="0.5"
                    min={0}
                    placeholder="ej. 40"
                    value={eWeight}
                    onChange={(e) => setEWeight(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="submit">Guardar</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingRdeId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div
                  key={rde.id}
                  className="flex items-center gap-md rounded-xl border border-surface-container-highest
                    bg-surface-container-high/60 p-md backdrop-blur-md"
                >
                  <ExerciseGuide exercise={rde.exercise} />
                  <div className="flex flex-1 flex-col gap-xs">
                    <h3 className="text-body-lg text-on-surface">
                      {rde.exercise.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-sm text-body-md text-on-surface-variant">
                      {rde.target_sets != null && (
                        <span>{rde.target_sets} Sets</span>
                      )}
                      {rde.target_reps_min && rde.target_reps_max && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-outline" />
                          <span>
                            {rde.target_reps_min}-{rde.target_reps_max} Reps
                          </span>
                        </>
                      )}
                      {rde.target_weight != null && (
                        <span className="rounded-md bg-primary-container/25 px-2 py-0.5 text-sm text-primary">
                          {rde.target_weight} kg
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openExerciseEdit(rde)}
                    aria-label="Editar ejercicio"
                    className="flex h-10 w-10 items-center justify-center text-on-surface-variant hover:text-primary"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    onClick={() =>
                      run(() => routinesApi.removeDayExercise(rde.id))
                    }
                    aria-label="Eliminar ejercicio"
                    className="flex h-10 w-10 items-center justify-center text-on-surface-variant hover:text-error"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ),
            )}
          </section>
        </>
      )}

      {/* Acciones a nivel de rutina */}
      <div className="mt-lg flex flex-col gap-md">
        {!routine.is_active && (
          <Button
            onClick={() => run(() => routinesApi.activate(routineId))}
            className="h-12"
          >
            <Icon name="check_circle" fill />
            Activar Rutina
          </Button>
        )}
        <Button variant="danger" onClick={handleDelete}>
          <Icon name="delete" />
          Eliminar rutina
        </Button>
      </div>
    </AppLayout>
  );
}
