// Helpers de recursos visuales de un ejercicio.
import type { Exercise } from "./types";

/**
 * Enlace de video del ejercicio: usa `video_url` si está definido; si no,
 * genera una búsqueda de YouTube por nombre (cubre cualquier ejercicio,
 * incluidos los personalizados en español).
 */
export function exerciseVideoUrl(exercise: Pick<Exercise, "name" | "video_url">): string {
  if (exercise.video_url) return exercise.video_url;
  const query = encodeURIComponent(`${exercise.name} técnica ejercicio`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

export function hasOwnVideo(exercise: Pick<Exercise, "video_url">): boolean {
  return Boolean(exercise.video_url);
}
