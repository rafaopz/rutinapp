// Pantalla principal tras iniciar sesión — bento grid.
import { useNavigate } from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { Icon } from "../components/ui";
import { useAuth } from "../context/AuthContext";

function BentoTile({
  to,
  icon,
  title,
  subtitle,
  iconClass = "bg-surface-bright text-on-surface-variant",
  subtitleClass = "text-on-surface-variant",
  wide = false,
  children,
}: {
  to: string;
  icon: string;
  title: string;
  subtitle: string;
  iconClass?: string;
  subtitleClass?: string;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={
        "glass-card flex flex-col items-start gap-md rounded-xl p-md text-left transition-transform " +
        "duration-200 hover:border-inverse-primary/50 active:scale-[0.96] " +
        (wide ? "col-span-2" : "")
      }
    >
      <div className="flex w-full items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${iconClass}`}
        >
          <Icon name={icon} />
        </div>
        {children}
      </div>
      <div>
        <span className="block text-stat-value text-on-surface">{title}</span>
        <span className={`mt-1 block text-label-caps ${subtitleClass}`}>
          {subtitle}
        </span>
      </div>
    </button>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = user?.display_name || user?.username || "Guerrero";

  return (
    <AppLayout title="RutinApp" showBack={false}>
      <section className="mb-sm mt-sm">
        <h2 className="text-headline-lg-mobile text-on-surface">
          ¡Hola, {name}! 👋
        </h2>
        <p className="mt-xs text-body-md text-on-surface-variant">
          ¿Listo para destruir otro entrenamiento?
        </p>
      </section>

      <button
        onClick={() => navigate("/workout")}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary
          text-body-lg font-medium text-on-primary transition-colors duration-150
          hover:bg-primary-fixed-dim active:scale-[0.98]"
      >
        <Icon name="play_arrow" fill />
        Empezar Entrenamiento
      </button>

      <section className="mt-md grid grid-cols-2 gap-md">
        <BentoTile
          to="/workout"
          icon="fitness_center"
          title="Entrenar hoy"
          subtitle="Registra tu sesión"
          iconClass="bg-primary-container/20 text-primary"
        />
        <BentoTile
          to="/routines"
          icon="list_alt"
          title="Mis rutinas"
          subtitle="Tu plan de entreno"
          iconClass="bg-secondary-container/20 text-secondary"
        />
        <BentoTile
          to="/progress"
          icon="insights"
          title="Progreso"
          subtitle="1RM y récords personales"
          iconClass="bg-tertiary-container/20 text-tertiary"
          wide
        >
          <svg
            className="text-tertiary opacity-70"
            height="24"
            viewBox="0 0 60 24"
            width="60"
          >
            <path
              d="M0,20 L10,15 L20,18 L30,8 L40,12 L50,4 L60,0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </BentoTile>
        <BentoTile
          to="/measurements"
          icon="straighten"
          title="Medidas"
          subtitle="Peso y circunferencias"
          iconClass="bg-primary-container/20 text-primary"
        />
        <BentoTile
          to="/goals"
          icon="track_changes"
          title="Objetivos"
          subtitle="Tus metas"
          iconClass="bg-secondary-container/20 text-secondary"
        />
        <BentoTile
          to="/exercises"
          icon="menu_book"
          title="Ejercicios"
          subtitle="Catálogo con guías"
          iconClass="bg-tertiary-container/20 text-tertiary"
          wide
        />
      </section>
    </AppLayout>
  );
}
