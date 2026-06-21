import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { AppLayout } from "../components/AppLayout";
import { ExerciseGuide, ExerciseThumb } from "../components/ExerciseGuide";
import { Alert, Button, Field, Icon, Spinner } from "../components/ui";
import { ApiError, catalogApi } from "../lib/api";
import { exerciseVideoUrl } from "../lib/media";
import type { Exercise } from "../lib/types";

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [muscleId, setMuscleId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);

  async function reload() {
    try {
      setExercises(await catalogApi.exercises());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar");
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const muscles = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of exercises ?? []) {
      if (e.primary_muscle) map.set(e.primary_muscle.id, e.primary_muscle.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const byMuscle = muscleId === null || e.primary_muscle?.id === muscleId;
      const byText = !q || e.name.toLowerCase().includes(q);
      return byMuscle && byText;
    });
  }, [exercises, search, muscleId]);

  return (
    <AppLayout title="RutinApp">
      <h2 className="mb-md text-headline-md text-on-surface">
        Catálogo de Ejercicios
      </h2>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-md">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-md text-outline">
          <Icon name="search" />
        </span>
        <input
          placeholder="Buscar ejercicio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-14 w-full rounded-xl border border-surface-container-high bg-surface-container/60 pl-[52px] pr-md
            text-on-surface outline-none backdrop-blur-xl transition-colors placeholder:text-on-surface-variant
            focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Chips de grupo muscular */}
      <div className="no-scrollbar mb-md flex gap-sm overflow-x-auto pb-xs">
        <Chip
          label="Todos"
          active={muscleId === null}
          onClick={() => setMuscleId(null)}
        />
        {muscles.map((m) => (
          <Chip
            key={m.id}
            label={m.name}
            active={muscleId === m.id}
            onClick={() => setMuscleId(m.id)}
          />
        ))}
      </div>

      {exercises === null && !error && <Spinner />}

      {/* Lista */}
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center gap-md rounded-xl border border-surface-container-high bg-surface-container/60 p-md backdrop-blur-xl"
          >
            <ExerciseGuide exercise={ex} size={80} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-body-lg text-on-surface">{ex.name}</h3>
              <p className="truncate text-body-md text-on-surface-variant">
                {[ex.primary_muscle?.name, ex.equipment]
                  .filter(Boolean)
                  .join(" • ") || "—"}
              </p>
              {ex.is_custom && (
                <span className="text-label-caps text-primary">personalizado</span>
              )}
            </div>
            <a
              href={exerciseVideoUrl(ex)}
              target="_blank"
              rel="noreferrer"
              aria-label="Ver video"
              className="flex h-10 w-10 items-center justify-center rounded-full text-tertiary hover:bg-surface-bright/20"
            >
              <Icon name="play_circle" />
            </a>
            {ex.is_custom && (
              <button
                onClick={() => setEditing(ex)}
                aria-label="Editar"
                className="flex h-10 w-10 items-center justify-center rounded-full text-outline hover:text-primary"
              >
                <Icon name="edit" />
              </button>
            )}
          </div>
        ))}
        {exercises && filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-on-surface-variant">
            Sin resultados.
          </p>
        )}
      </div>

      {editing && (
        <EditMediaModal
          exercise={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </AppLayout>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex h-touch-target-min shrink-0 items-center justify-center rounded-full px-md text-body-md transition-colors " +
        (active
          ? "border border-primary/20 bg-primary-container/30 text-primary"
          : "border border-surface-container-high bg-surface-container/60 text-on-surface-variant hover:bg-surface-variant/40")
      }
    >
      {label}
    </button>
  );
}

function EditMediaModal({
  exercise,
  onClose,
  onSaved,
}: {
  exercise: Exercise;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [imageUrl, setImageUrl] = useState(exercise.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(exercise.video_url ?? "");
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await catalogApi.updateExercise(exercise.id, {
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        instructions: instructions || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[24rem] space-y-3 overflow-y-auto rounded-t-3xl border
          border-surface-container-high bg-surface-container p-5 sm:rounded-3xl"
      >
        <div className="mb-2 flex items-center gap-3">
          <ExerciseThumb exercise={exercise} size={48} />
          <h2 className="text-headline-md text-on-surface">{exercise.name}</h2>
        </div>
        <p className="text-label-caps text-on-surface-variant">
          Pega una URL de imagen/GIF y un enlace de video. Vacío = búsqueda
          automática en YouTube.
        </p>
        {error && <Alert message={error} />}
        <Field
          label="URL de imagen o GIF"
          placeholder="https://…/demo.gif"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <Field
          label="URL de video"
          placeholder="https://youtube.com/watch?v=…"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <label className="block">
          <span className="mb-xs ml-1 block text-label-caps uppercase tracking-wider text-on-surface-variant">
            Instrucciones / técnica
          </span>
          <textarea
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3
              text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
