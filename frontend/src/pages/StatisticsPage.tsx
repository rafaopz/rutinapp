// Hub de estadísticas avanzadas. Una opción desarrollada (distribución de
// músculos); el resto queda preparado para futuras entregas.
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { Icon } from "../components/ui";

interface Option {
  icon: string;
  title: string;
  desc: string;
  to?: string;
}

const OPTIONS: Option[] = [
  {
    icon: "donut_small",
    title: "Distribución de los músculos",
    desc: "Compara las distribuciones actual y previa de los músculos.",
    to: "/statistics/muscle-distribution",
  },
  {
    icon: "format_list_numbered",
    title: "Recuento de series por músculo",
    desc: "Número de series registradas para cada grupo muscular.",
    to: "/statistics/sets-by-muscle",
  },
  {
    icon: "trophy",
    title: "Ejercicios principales",
    desc: "Lista de ejercicios que realizas con más frecuencia.",
    to: "/statistics/top-exercises",
  },
  {
    icon: "description",
    title: "Informe mensual",
    desc: "Resumen de tus entrenamientos y estadísticas mensuales.",
    to: "/statistics/monthly-report",
  },
];

export function StatisticsPage() {
  const navigate = useNavigate();

  return (
    <AppLayout title="Estadísticas">
      <h2 className="mb-md text-headline-md text-on-surface-variant">
        Estadísticas avanzadas
      </h2>
      <div className="flex flex-col">
        {OPTIONS.map((o) => {
          const enabled = Boolean(o.to);
          return (
            <button
              key={o.title}
              disabled={!enabled}
              onClick={() => o.to && navigate(o.to)}
              className={
                "flex items-center gap-md border-b border-surface-container-high/50 py-md text-left " +
                (enabled
                  ? "transition-colors hover:bg-surface-container-high/30"
                  : "cursor-default opacity-50")
              }
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-bright text-on-surface-variant">
                <Icon name={o.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-lg text-on-surface">
                  {o.title}
                </span>
                <span className="block text-body-md text-on-surface-variant">
                  {o.desc}
                </span>
              </span>
              {enabled ? (
                <Icon name="chevron_right" className="text-outline" />
              ) : (
                <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">
                  Pronto
                </span>
              )}
            </button>
          );
        })}
      </div>
    </AppLayout>
  );
}
