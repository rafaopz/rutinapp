// Recursos visuales y guía técnica de un ejercicio: miniatura + modal.
import { useState } from "react";
import { createPortal } from "react-dom";

import { exerciseVideoUrl } from "../lib/media";
import type { Exercise } from "../lib/types";
import { Icon } from "./ui";

function Placeholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "flex items-center justify-center bg-surface-container-high text-on-surface-variant " +
        className
      }
    >
      <span className="text-xl">🏋️</span>
    </div>
  );
}

/** Miniatura cuadrada del ejercicio (imagen o placeholder). */
export function ExerciseThumb({
  exercise,
  size = 44,
  fill = false,
}: {
  exercise: Pick<Exercise, "name" | "image_url">;
  size?: number;
  /** Si es true, ocupa todo el ancho disponible en proporción cuadrada. */
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const cls = "overflow-hidden rounded-lg" + (fill ? "" : " shrink-0");
  const fillCls = fill ? "aspect-square w-full" : "";
  if (!exercise.image_url || failed) {
    return (
      <Placeholder
        className={`${cls} ${fillCls}`}
        {...(fill ? {} : {})}
      />
    );
  }
  return (
    <img
      src={exercise.image_url}
      alt={exercise.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${cls} ${fillCls} bg-white object-contain`}
      style={fill ? undefined : { width: size, height: size }}
    />
  );
}

/** Botón con miniatura que abre el modal de guía del ejercicio. */
export function ExerciseGuide({
  exercise,
  size = 44,
}: {
  exercise: Exercise;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver guía de ${exercise.name}`}
        className="relative block overflow-hidden rounded-lg active:scale-95"
      >
        <ExerciseThumb exercise={exercise} size={size} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 transition-opacity hover:opacity-100">
          <Icon name="play_circle" />
        </span>
      </button>
      {open && <GuideModal exercise={exercise} onClose={() => setOpen(false)} />}
    </>
  );
}

function GuideModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[28rem] overflow-y-auto rounded-t-3xl border border-outline-variant
          bg-surface-container p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-on-surface">{exercise.name}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-on-surface-variant">
          {[exercise.primary_muscle?.name, exercise.equipment]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {exercise.image_url && !imgFailed ? (
          <img
            src={exercise.image_url}
            alt={exercise.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="mt-3 w-full rounded-2xl bg-white object-contain"
          />
        ) : (
          <div className="mt-3 flex h-40 items-center justify-center rounded-2xl bg-surface-container-high text-4xl">
            🏋️
          </div>
        )}

        {exercise.instructions && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-on-surface">Técnica</h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              {exercise.instructions}
            </p>
          </div>
        )}

        <a
          href={exerciseVideoUrl(exercise)}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg
            bg-tertiary px-4 py-3 font-medium text-on-tertiary hover:bg-tertiary-fixed-dim"
        >
          ▶ Ver demostración en video
        </a>
      </div>
    </div>,
    document.body,
  );
}
