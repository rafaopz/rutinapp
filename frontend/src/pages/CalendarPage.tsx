// Calendario de entrenamientos: marca los días entrenados; al tocar un día
// muestra las sesiones de ese día con acceso a su detalle.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { Alert, Icon, Spinner } from "../components/ui";
import { ApiError, statsApi } from "../lib/api";
import type { SessionStat } from "../lib/types";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_MS = 86_400_000;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - dow);
  return x;
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

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m}${ampm}`;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SessionStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<string | null>(dateKey(today));

  useEffect(() => {
    statsApi
      .sessions()
      .then(setStats)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Error al cargar"),
      );
  }, []);

  // Sesiones agrupadas por día local.
  const byDay = useMemo(() => {
    const map = new Map<string, SessionStat[]>();
    for (const s of stats ?? []) {
      const k = dateKey(new Date(s.performed_at));
      const arr = map.get(k);
      if (arr) arr.push(s);
      else map.set(k, [s]);
    }
    return map;
  }, [stats]);

  // Racha: semanas consecutivas (hasta hoy) con al menos un entrenamiento.
  const streakWeeks = useMemo(() => {
    if (!stats || stats.length === 0) return 0;
    const weeks = new Set(
      stats.map((s) => startOfWeek(new Date(s.performed_at)).getTime()),
    );
    let n = 0;
    let w = startOfWeek(today).getTime();
    while (weeks.has(w)) {
      n++;
      w -= 7 * DAY_MS;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthCount = useMemo(
    () =>
      (stats ?? []).filter((s) => {
        const d = new Date(s.performed_at);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length,
    [stats, year, month],
  );

  // Celdas del mes: huecos iniciales + días.
  const firstDow = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedSessions = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <AppLayout title="Calendario">
      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}

      {stats === null && !error && <Spinner />}

      {stats && (
        <>
          {/* Resumen */}
          <div className="mb-md flex gap-sm">
            <span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-surface-container-high px-3 py-2 text-body-md text-on-surface">
              🔥 Racha de {streakWeeks} {streakWeeks === 1 ? "semana" : "semanas"}
            </span>
            <span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-surface-container-high px-3 py-2 text-body-md text-on-surface">
              📅 {monthCount} este mes
            </span>
          </div>

          {/* Navegación de mes */}
          <div className="mb-md flex items-center justify-between">
            <button
              aria-label="Mes anterior"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="chevron_left" />
            </button>
            <h2 className="text-headline-md text-on-surface">
              {MONTHS[month]} {year}
            </h2>
            <button
              aria-label="Mes siguiente"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="chevron_right" />
            </button>
          </div>

          {/* Cabecera de días */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="py-1 text-center text-label-caps uppercase text-on-surface-variant"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Días */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={`e${i}`} />;
              const d = new Date(year, month, day);
              const k = dateKey(d);
              const has = byDay.has(k);
              const isToday = k === dateKey(today);
              const isSel = k === selected;
              return (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  className={
                    "flex aspect-square items-center justify-center rounded-full text-body-md transition-colors " +
                    (has
                      ? "bg-primary font-medium text-on-primary"
                      : "text-on-surface hover:bg-surface-container-high") +
                    (isSel && !has ? " bg-surface-container-high" : "") +
                    (isToday ? " ring-1 ring-primary" : "")
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Sesiones del día seleccionado */}
          <section className="mt-lg flex flex-col gap-sm">
            <h3 className="text-headline-md text-on-surface">
              {selectedSessions.length > 0
                ? "Entrenamientos del día"
                : "Sin entrenamientos este día"}
            </h3>
            {selectedSessions.map((s) => (
              <button
                key={s.session_id}
                onClick={() => navigate(`/sessions/${s.session_id}`)}
                className="glass-card flex items-center gap-md rounded-xl p-md text-left transition-transform active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container/30 text-primary">
                  <Icon name="fitness_center" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-lg text-on-surface">
                    {fmtTime(s.performed_at)}
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {fmtDuration(s.duration_seconds)} · {fmtVolume(s.volume)} ·{" "}
                    {s.sets} series
                  </p>
                </div>
                <Icon name="chevron_right" className="text-outline" />
              </button>
            ))}
          </section>
        </>
      )}
    </AppLayout>
  );
}
