import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { Alert, Button, Field, Icon, Spinner } from "../components/ui";
import { ApiError, routinesApi } from "../lib/api";
import type { RoutineSummary } from "../lib/types";

export function RoutinesPage() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<RoutineSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    routinesApi
      .list()
      .then(setRoutines)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const routine = await routinesApi.create({
        name,
        days_per_week: days ? Number(days) : null,
      });
      navigate(`/routines/${routine.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo crear la rutina",
      );
      setBusy(false);
    }
  }

  return (
    <AppLayout title="RutinApp">
      <div className="mb-lg flex items-end justify-between">
        <div>
          <h2 className="text-headline-md text-on-surface">Mis Rutinas</h2>
          <p className="text-body-md text-on-surface-variant">
            Selecciona o edita tu plan
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex h-touch-target-min items-center gap-2 rounded-full bg-primary px-lg
              text-label-caps text-on-primary transition-transform duration-200 active:scale-95"
          >
            <Icon name="add" />
            Crear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {creating && (
        <form
          onSubmit={handleCreate}
          className="glass-card mb-md space-y-3 rounded-xl p-md"
        >
          <Field
            label="Nombre"
            placeholder="Push/Pull/Legs"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            label="Días por semana (opcional)"
            type="number"
            min={1}
            max={14}
            placeholder="5"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creando…" : "Crear"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreating(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        {routines === null && !error && <Spinner />}
        {routines?.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center text-on-surface-variant">
            <Icon name="fitness_center" className="!text-[40px] opacity-40" />
            <p>Aún no tienes rutinas. ¡Crea la primera!</p>
          </div>
        )}
        {routines?.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate(`/routines/${r.id}`)}
            className={
              "group relative overflow-hidden rounded-xl bg-surface-container/60 p-md text-left backdrop-blur-xl " +
              "transition-transform duration-200 active:scale-95 " +
              (r.is_active
                ? "border border-primary/30"
                : "border border-surface-container-high hover:border-outline-variant")
            }
          >
            {r.is_active && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            )}
            <div className="relative z-10 mb-lg flex items-start justify-between">
              <div>
                <h3 className="text-headline-md text-on-surface">{r.name}</h3>
                <p className="text-body-md text-on-surface-variant">
                  {r.days_per_week
                    ? `${r.days_per_week} días/semana`
                    : "Sin definir"}
                </p>
              </div>
              {r.is_active && (
                <span className="flex items-center gap-1 rounded-full bg-secondary-container px-sm py-xs text-label-caps text-on-secondary-container">
                  <Icon name="check_circle" className="!text-[14px]" />
                  Activa
                </span>
              )}
            </div>
            <div className="relative z-10 flex items-center gap-2 text-on-surface-variant">
              <Icon name="calendar_month" />
              <span className="text-stat-value">
                {r.days_per_week ?? "—"}{" "}
                <span className="text-body-md font-normal">días</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </AppLayout>
  );
}
