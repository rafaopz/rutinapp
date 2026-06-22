// Estructura común: barra superior + navegación inferior + lienzo central.
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Icon } from "./ui";

const NAV = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/workout", label: "Entrenar", icon: "fitness_center" },
  { to: "/routines", label: "Rutinas", icon: "list_alt" },
  { to: "/profile", label: "Perfil", icon: "person" },
];

function TopAppBar({
  title = "RutinApp",
  showBack = true,
}: {
  title?: string;
  showBack?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header className="fixed top-0 z-50 w-full border-b border-surface-container-high/50 bg-surface-container/60 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-container-margin">
        {showBack ? (
          <button
            aria-label="Atrás"
            onClick={() => navigate(-1)}
            className="flex h-touch-target-min w-touch-target-min items-center justify-center rounded-full
              text-primary transition-transform duration-200 hover:bg-surface-bright/20 active:scale-95"
          >
            <Icon name="arrow_back" />
          </button>
        ) : (
          <div className="h-touch-target-min w-touch-target-min" />
        )}
        <h1 className="mx-4 flex-1 truncate text-center text-headline-md text-primary">
          {title}
        </h1>
        <div className="h-touch-target-min w-touch-target-min" />
      </div>
    </header>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <nav
      className="fixed bottom-0 z-50 w-full rounded-t-xl border-t border-surface-container-high/50
        bg-surface-container/60 backdrop-blur-xl md:hidden"
    >
      <div className="flex h-20 items-center justify-around px-2 pb-safe">
        {NAV.map((item) => {
          const active =
            item.to === "/"
              ? pathname === "/"
              : pathname.startsWith(item.to);
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={
                "flex h-touch-target-min flex-col items-center justify-center px-4 py-1 transition-transform duration-200 active:scale-95 " +
                (active
                  ? "rounded-full bg-primary-container/30 text-primary"
                  : "rounded-xl text-on-surface-variant hover:bg-surface-variant/20")
              }
            >
              <Icon name={item.icon} fill={active} />
              <span className="mt-1 text-label-caps">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Lienzo principal de la app autenticada: barra superior fija, contenido
 * desplazable y navegación inferior (móvil).
 */
export function AppLayout({
  children,
  title,
  showBack = true,
  maxWidth = "max-w-[28rem]",
}: {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  maxWidth?: string;
  // Nota: no usar max-w-md/sm/lg/xl: colisionan con los tokens --spacing-*.
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopAppBar title={title} showBack={showBack} />
      <main
        className={`mx-auto w-full ${maxWidth} flex-1 px-container-margin pb-28 pt-20 md:pb-10`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
