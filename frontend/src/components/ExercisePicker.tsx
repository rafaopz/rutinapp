// Selector visual de ejercicios: bottom-sheet con búsqueda y miniaturas.
// Pensado para principiantes: se reconoce el ejercicio por su imagen/GIF.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { ExerciseThumb } from "./ExerciseGuide";
import type { Exercise } from "../lib/types";

interface ExercisePickerProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({
  exercises,
  onSelect,
  onClose,
}: ExercisePickerProps) {
  const [search, setSearch] = useState("");
  const [muscleId, setMuscleId] = useState<number | null>(null);

  // Grupos musculares presentes en el catálogo (derivados, sin llamada extra).
  const muscles = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of exercises) {
      if (e.primary_muscle) map.set(e.primary_muscle.id, e.primary_muscle.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const byMuscle = muscleId === null || e.primary_muscle?.id === muscleId;
      const byText =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.primary_muscle?.name.toLowerCase().includes(q);
      return byMuscle && byText;
    });
  }, [exercises, search, muscleId]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-[28rem] flex-col rounded-t-3xl border border-outline-variant
          bg-surface-container sm:h-[80vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="text-lg font-semibold text-on-surface">Elegir ejercicio</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pb-2">
          <input
            autoFocus
            placeholder="Buscar (sentadilla, pecho…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3
              text-on-surface placeholder-on-surface-variant outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Chips de grupo muscular */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
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

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onSelect(ex)}
                className="flex flex-col items-center gap-2 rounded-2xl border border-outline-variant
                  bg-surface-container-high/50 p-2 text-center transition hover:border-primary/60 active:scale-[0.98]"
              >
                <ExerciseThumb exercise={ex} fill />
                <span className="line-clamp-2 text-xs font-medium leading-tight text-on-surface">
                  {ex.name}
                </span>
                {ex.primary_muscle && (
                  <span className="text-[10px] text-on-surface-variant">
                    {ex.primary_muscle.name}
                  </span>
                )}
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-10 text-center text-on-surface-variant">Sin resultados.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition " +
        (active
          ? "bg-primary text-on-primary"
          : "border border-outline-variant bg-surface-container-high text-on-surface-variant hover:border-outline")
      }
    >
      {label}
    </button>
  );
}
