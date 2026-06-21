// Ejercicios principales: los que realizas con más frecuencia (por series).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { Alert, Icon, Spinner } from "../components/ui";
import { ApiError, statsApi } from "../lib/api";
import type { TopExercise } from "../lib/types";

export function TopExercisesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TopExercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statsApi
      .topExercises(20)
      .then(setItems)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, []);

  const maxSets = Math.max(...(items ?? []).map((i) => i.sets), 1);

  return (
    <AppLayout title="Ejercicios principales">
      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {items === null && !error && <Spinner />}

      {items && items.length === 0 && (
        <p className="py-10 text-center text-on-surface-variant">
          Aún no has registrado ejercicios.
        </p>
      )}

      {items && items.length > 0 && (
        <div className="flex flex-col gap-sm">
          {items.map((it, idx) => (
            <button
              key={it.exercise_id}
              onClick={() => navigate(`/exercise-stats/${it.exercise_id}`)}
              className="glass-card flex items-center gap-md rounded-xl p-md text-left transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/30 text-stat-value text-primary">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-lg text-on-surface">
                  {it.exercise_name}
                </p>
                <div className="mt-xs h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max((it.sets / maxSets) * 100, 4)}%` }}
                  />
                </div>
                <p className="mt-xs text-body-md text-on-surface-variant">
                  {it.sets} series · {it.sessions}{" "}
                  {it.sessions === 1 ? "sesión" : "sesiones"}
                </p>
              </div>
              <Icon name="chevron_right" className="text-outline" />
            </button>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
