// Recuento de series por grupo muscular en un periodo.
import { useEffect, useState } from "react";

import { AppLayout } from "../components/AppLayout";
import { Alert, Icon, Spinner } from "../components/ui";
import { ApiError, statsApi } from "../lib/api";
import type { MuscleDistribution } from "../lib/types";

const RANGES = [
  { key: 30, label: "Últimos 30 días" },
  { key: 90, label: "Últimos 90 días" },
  { key: 365, label: "Último año" },
];

export function SetsByMusclePage() {
  const [data, setData] = useState<MuscleDistribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setData(null);
    statsApi
      .muscleDistribution(days)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, [days]);

  const muscles = [...(data?.muscles ?? [])].sort(
    (a, b) => b.current - a.current,
  );
  const max = Math.max(...muscles.map((m) => m.current), 1);
  const totalSets = muscles.reduce((a, m) => a + m.current, 0);

  return (
    <AppLayout title="Series por músculo">
      <div className="mb-md">
        <div className="relative">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full appearance-none rounded-lg bg-surface-container-high px-4 py-3 text-center
              text-body-lg text-on-surface outline-none"
          >
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-on-surface-variant">
            <Icon name="expand_more" />
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {data === null && !error && <Spinner />}

      {data && (
        <>
          <p className="mb-md text-body-md text-on-surface-variant">
            {totalSets} series en total
          </p>
          {totalSets === 0 ? (
            <p className="py-8 text-center text-body-md text-on-surface-variant">
              Sin series registradas en este periodo.
            </p>
          ) : (
            <div className="flex flex-col gap-md">
              {muscles.map((m) => (
                <div key={m.name} className="flex flex-col gap-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-body-md text-on-surface">{m.name}</span>
                    <span className="text-body-md text-on-surface-variant">
                      {m.current} {m.current === 1 ? "serie" : "series"}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${m.current > 0 ? Math.max((m.current / max) * 100, 3) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
