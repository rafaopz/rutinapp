// Componentes UI base — Material 3 (tema oscuro), mobile-first.
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/** Icono Material Symbols. `fill` lo rellena; `className` para color/tamaño. */
export function Icon({
  name,
  fill = false,
  className = "",
}: {
  name: string;
  fill?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? "fill" : ""} ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

type Variant = "primary" | "secondary" | "danger" | "outline";

const VARIANTS: Record<Variant, string> = {
  // Planos y simples, acordes a la app.
  primary: "bg-primary text-on-primary hover:bg-primary-fixed-dim",
  secondary:
    "bg-surface-container-high text-on-surface border border-outline-variant hover:bg-surface-bright/60",
  danger:
    "bg-transparent text-error border border-error/40 hover:bg-error/10",
  outline:
    "bg-transparent text-primary border border-primary/50 hover:bg-primary/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  full = true,
  ...props
}: ButtonProps) {
  return (
    <button
      className={
        `${full ? "w-full" : ""} inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 ` +
        "font-medium transition-colors duration-150 active:scale-[0.98] " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        `${VARIANTS[variant]} ${className}`
      }
      {...props}
    >
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, className = "", ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-xs ml-1 block text-label-caps uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <input
        id={id}
        className={
          "w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 " +
          "text-on-surface placeholder-outline-variant/60 outline-none transition-colors " +
          `focus:border-primary focus:ring-1 focus:ring-primary ${className}`
        }
        {...props}
      />
    </label>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function SelectField({ label, children, ...props }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-xs ml-1 block text-label-caps uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pr-10
            text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-on-surface-variant">
          <Icon name="expand_more" />
        </span>
      </div>
    </label>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="glass-card w-full max-w-[24rem] rounded-xl p-lg shadow-2xl">
      {children}
    </div>
  );
}

export function Alert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-error/40 bg-error-container/20 px-4 py-3 text-sm text-error">
      {message}
    </div>
  );
}

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant">
      <Icon name="progress_activity" className="animate-spin" />
      {label}
    </div>
  );
}
