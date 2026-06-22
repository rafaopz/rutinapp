// Detalle de una sesión: totales, división muscular y series por ejercicio.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { ExerciseThumb } from "../components/ExerciseGuide";
import { Alert, Icon, Spinner } from "../components/ui";
import { ApiError, workoutsApi } from "../lib/api";
import type { SetLog, WorkoutSession } from "../lib/types";

const WEEKDAYS = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h}:${m}${ampm}`;
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}min`;
}

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

// Colores rotativos para las barras de división muscular.
const MUSCLE_COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-tertiary",
  "bg-primary-fixed-dim",
];

interface ExerciseGroup {
  key: number;
  exercise: SetLog["exercise"];
  sets: SetLog[];
}

export function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionId = Number(id);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    workoutsApi
      .get(sessionId)
      .then(setSession)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar la sesión"),
      );
  }, [sessionId]);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await workoutsApi.remove(sessionId);
      navigate("/calendar", { replace: true });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo eliminar el entrenamiento",
      );
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // Series efectivas (sin calentamiento) para totales y división.
  const working = useMemo(
    () => (session?.set_logs ?? []).filter((s) => !s.is_warmup),
    [session],
  );

  const totals = useMemo(
    () => ({
      volume: working.reduce((a, s) => a + s.weight * s.reps, 0),
      sets: working.length,
    }),
    [working],
  );

  // División muscular: % de series por grupo muscular primario.
  const division = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of working) {
      const name = s.exercise.primary_muscle?.name ?? "Otros";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const total = working.length || 1;
    return [...counts.entries()]
      .map(([name, n]) => ({ name, pct: Math.round((n / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [working]);

  // Agrupar todas las series por ejercicio, en orden de aparición.
  const groups = useMemo(() => {
    const map = new Map<number, ExerciseGroup>();
    for (const s of session?.set_logs ?? []) {
      const g = map.get(s.exercise.id);
      if (g) g.sets.push(s);
      else map.set(s.exercise.id, { key: s.exercise.id, exercise: s.exercise, sets: [s] });
    }
    return [...map.values()];
  }, [session]);

  if (error) {
    return (
      <AppLayout title="Entrenamiento">
        <Alert message={error} />
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout title="Entrenamiento">
        <Spinner />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Detalle de Entrenamiento">
      {/* Cabecera */}
      <section className="mb-lg">
        <p className="text-body-md text-on-surface-variant">
          {formatDate(session.performed_at)}
        </p>
        <h2 className="mt-xs text-headline-md text-on-surface">
          {session.notes?.trim() || "Entrenamiento"}
        </h2>
        <div className="mt-md grid grid-cols-3 gap-md">
          <div className="flex flex-col">
            <span className="text-label-caps uppercase text-on-surface-variant">
              Tiempo
            </span>
            <span className="text-stat-value text-on-surface">
              {fmtDuration(session.duration_seconds)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-caps uppercase text-on-surface-variant">
              Volumen
            </span>
            <span className="text-stat-value text-on-surface">
              {fmtVolume(totals.volume)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-caps uppercase text-on-surface-variant">
              Series
            </span>
            <span className="text-stat-value text-on-surface">
              {totals.sets}
            </span>
          </div>
        </div>
      </section>

      {/* División muscular */}
      {division.length > 0 && (
        <section className="mb-lg flex flex-col gap-md">
          <h3 className="text-headline-md text-on-surface">División Muscular</h3>
          {division.map((d, i) => (
            <div key={d.name} className="flex flex-col gap-xs">
              <div className="flex items-baseline justify-between">
                <span className="text-body-md text-on-surface">{d.name}</span>
                <span className="text-body-md text-on-surface-variant">
                  {d.pct}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={`h-full rounded-full ${MUSCLE_COLORS[i % MUSCLE_COLORS.length]}`}
                  style={{ width: `${d.pct}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Ejercicios */}
      <section className="flex flex-col gap-md">
        <h3 className="text-headline-md text-on-surface">Entrenamiento</h3>
        {groups.map((g) => (
          <div
            key={g.key}
            className="glass-card flex flex-col gap-sm rounded-xl p-md"
          >
            <div className="flex items-center gap-sm">
              <ExerciseThumb exercise={g.exercise} size={44} />
              <h4 className="text-body-lg text-primary">{g.exercise.name}</h4>
            </div>
            <div className="grid grid-cols-[3rem_1fr] gap-x-2 text-label-caps uppercase text-on-surface-variant">
              <span>Serie</span>
              <span>Peso y reps</span>
            </div>
            <div className="flex flex-col">
              {g.sets.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[3rem_1fr] items-center gap-x-2 border-t border-surface-container-high/50 py-2 first:border-0"
                >
                  <span className="text-body-md text-on-surface">
                    {s.is_warmup ? "C" : s.set_number}
                  </span>
                  <span className="text-body-md text-on-surface">
                    {s.weight} kg × {s.reps}
                    {s.is_warmup && (
                      <span className="ml-2 text-label-caps uppercase text-tertiary">
                        Calent.
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Eliminar entrenamiento */}
      <div className="mt-lg">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-error/40
            text-body-md text-error transition-colors hover:bg-error/10 active:scale-[0.99]"
        >
          <Icon name="delete" />
          Eliminar entrenamiento
        </button>
      </div>

      {/* Confirmación de eliminación */}
      {confirmDelete &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-container-margin backdrop-blur-sm">
            <div className="w-full max-w-[24rem] rounded-2xl border border-surface-container-high bg-surface-container p-lg shadow-2xl">
              <div className="mb-md flex flex-col items-center gap-sm text-center">
                <Icon name="delete" className="!text-[40px] text-error" />
                <h3 className="text-headline-lg-mobile text-on-surface">
                  ¿Eliminar entrenamiento?
                </h3>
                <p className="text-body-md text-on-surface-variant">
                  Se borrarán todas sus series de forma permanente. Esta acción no
                  se puede deshacer.
                </p>
              </div>
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="h-12 flex-1 rounded-xl bg-surface-container-high text-body-md text-on-surface active:scale-[0.99] disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-12 flex-1 rounded-xl bg-error text-body-md text-on-error active:scale-[0.99] disabled:opacity-50"
                >
                  {deleting ? "Eliminando…" : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </AppLayout>
  );
}
