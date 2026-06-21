// Selector visual de ejercicios para ver estadísticas personales.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { ExerciseThumb } from "../components/ExerciseGuide";
import { Icon, Spinner } from "../components/ui";
import { catalogApi, statsApi } from "../lib/api";
import type { Exercise } from "../lib/types";

function Row({
  ex,
  onClick,
}: {
  ex: Exercise;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-md border-b border-surface-container-high/50 py-sm text-left
        transition-colors hover:bg-surface-container-high/30"
    >
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
        <ExerciseThumb exercise={ex} fill />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-lg text-on-surface">
          {ex.name}
        </span>
        {ex.primary_muscle && (
          <span className="block text-body-md text-on-surface-variant">
            {ex.primary_muscle.name}
          </span>
        )}
      </span>
      <Icon name="chevron_right" className="text-outline" />
    </button>
  );
}

export function ExerciseStatsListPage() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [trainedIds, setTrainedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [muscleId, setMuscleId] = useState<number | null>(null);

  useEffect(() => {
    catalogApi.exercises().then(setExercises).catch(() => setExercises([]));
    statsApi
      .personalRecords()
      .then((recs) => setTrainedIds(new Set(recs.map((r) => r.exercise_id))))
      .catch(() => {});
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
    const q = search.trim().toLowerCase();
    return (exercises ?? []).filter((e) => {
      const byMuscle = muscleId === null || e.primary_muscle?.id === muscleId;
      const byText =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.primary_muscle?.name.toLowerCase().includes(q);
      return byMuscle && byText;
    });
  }, [exercises, search, muscleId]);

  const recent = filtered.filter((e) => trainedIds.has(e.id));

  return (
    <AppLayout title="Ejercicios">
      <div className="mb-md">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
            <Icon name="search" />
          </span>
          <input
            placeholder="Buscar ejercicio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-3 pl-11 pr-4
              text-on-surface placeholder-on-surface-variant outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Chips de músculo */}
      <div className="no-scrollbar mb-md flex gap-sm overflow-x-auto pb-1">
        <button
          onClick={() => setMuscleId(null)}
          className={
            "shrink-0 rounded-full px-3 py-1.5 text-label-caps uppercase transition-colors " +
            (muscleId === null
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface-variant")
          }
        >
          Todos
        </button>
        {muscles.map((m) => (
          <button
            key={m.id}
            onClick={() => setMuscleId(m.id)}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-label-caps uppercase transition-colors " +
              (muscleId === m.id
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant")
            }
          >
            {m.name}
          </button>
        ))}
      </div>

      {exercises === null && <Spinner />}

      {exercises && (
        <>
          {recent.length > 0 && (
            <section className="mb-md">
              <h3 className="mb-xs text-headline-md text-on-surface-variant">
                Ejercicios Recientes
              </h3>
              {recent.map((ex) => (
                <Row
                  key={ex.id}
                  ex={ex}
                  onClick={() => navigate(`/exercise-stats/${ex.id}`)}
                />
              ))}
            </section>
          )}

          <section>
            <h3 className="mb-xs text-headline-md text-on-surface-variant">
              Todos los Ejercicios
            </h3>
            {filtered.map((ex) => (
              <Row
                key={ex.id}
                ex={ex}
                onClick={() => navigate(`/exercise-stats/${ex.id}`)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-on-surface-variant">
                Sin resultados.
              </p>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
