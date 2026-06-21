// Cliente HTTP tipado para la API de RutinApp.
//
// - Guarda los tokens en localStorage.
// - Añade el Bearer token automáticamente.
// - Si una petición autenticada devuelve 401, intenta refrescar el token una
//   vez y reintenta de forma transparente.

import type {
  BodyMeasurement,
  BodyMeasurementCreatePayload,
  Exercise,
  ExerciseHistoryPoint,
  ExerciseUpdatePayload,
  Goal,
  GoalCreatePayload,
  MuscleDistribution,
  MuscleGroup,
  PersonalRecord,
  ProgressionPoint,
  Routine,
  RoutineCreatePayload,
  RoutineDay,
  RoutineDayCreatePayload,
  RoutineDayExercise,
  RoutineDayExerciseCreatePayload,
  RoutineDayExerciseUpdatePayload,
  RoutineSummary,
  RoutineUpdatePayload,
  SessionStat,
  SetLog,
  TopExercise,
  SetLogCreatePayload,
  Token,
  User,
  WorkoutSession,
  WorkoutSessionCreatePayload,
  WorkoutSessionSummary,
} from "./types";

// En desarrollo se usa la ruta relativa (proxy de Vite hacia el backend local).
// En producción se define VITE_API_BASE con la URL completa del backend.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";
const ACCESS_KEY = "rutinapp.access";
const REFRESH_KEY = "rutinapp.refresh";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// --- Almacenamiento de tokens ------------------------------------------
export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(token: Token) {
    localStorage.setItem(ACCESS_KEY, token.access_token);
    localStorage.setItem(REFRESH_KEY, token.refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
    return JSON.stringify(data);
  } catch {
    return res.statusText || "Error de red";
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    tokenStore.clear();
    return false;
  }
  tokenStore.set((await res.json()) as Token);
  return true;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // por defecto true
  retry?: boolean; // uso interno para el reintento tras refresh
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokenStore.access) {
    headers["Authorization"] = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    if (await tryRefresh()) {
      return request<T>(path, { ...opts, retry: false });
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- API de autenticación ----------------------------------------------
export const authApi = {
  async login(username: string, password: string): Promise<Token> {
    // OAuth2 Password Flow usa form-urlencoded con el campo `username`.
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) throw new ApiError(res.status, await parseError(res));
    const token = (await res.json()) as Token;
    tokenStore.set(token);
    return token;
  },

  async register(
    username: string,
    password: string,
    displayName?: string,
  ): Promise<User> {
    return request<User>("/auth/register", {
      method: "POST",
      auth: false,
      body: {
        username,
        password,
        display_name: displayName || null,
      },
    });
  },

  async me(): Promise<User> {
    return request<User>("/auth/me");
  },

  async logout(): Promise<void> {
    const refresh = tokenStore.refresh;
    if (refresh) {
      try {
        await request<void>("/auth/logout", {
          method: "POST",
          auth: false,
          body: { refresh_token: refresh },
        });
      } catch {
        // ignorar errores de logout en el servidor
      }
    }
    tokenStore.clear();
  },
};

// --- Catálogo ----------------------------------------------------------
export const catalogApi = {
  muscleGroups(): Promise<MuscleGroup[]> {
    return request<MuscleGroup[]>("/muscle-groups");
  },
  exercises(params?: { muscleId?: number; search?: string }): Promise<Exercise[]> {
    const q = new URLSearchParams();
    if (params?.muscleId) q.set("muscle_id", String(params.muscleId));
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return request<Exercise[]>(`/exercises${qs ? `?${qs}` : ""}`);
  },
  updateExercise(
    id: number,
    payload: ExerciseUpdatePayload,
  ): Promise<Exercise> {
    return request<Exercise>(`/exercises/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
};

// --- Rutinas -----------------------------------------------------------
export const routinesApi = {
  list(): Promise<RoutineSummary[]> {
    return request<RoutineSummary[]>("/routines");
  },
  get(id: number): Promise<Routine> {
    return request<Routine>(`/routines/${id}`);
  },
  create(payload: RoutineCreatePayload): Promise<Routine> {
    return request<Routine>("/routines", { method: "POST", body: payload });
  },
  update(id: number, payload: RoutineUpdatePayload): Promise<Routine> {
    return request<Routine>(`/routines/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
  remove(id: number): Promise<void> {
    return request<void>(`/routines/${id}`, { method: "DELETE" });
  },
  activate(id: number): Promise<Routine> {
    return request<Routine>(`/routines/${id}/activate`, { method: "POST" });
  },
  addDay(
    routineId: number,
    payload: RoutineDayCreatePayload,
  ): Promise<RoutineDay> {
    return request<RoutineDay>(`/routines/${routineId}/days`, {
      method: "POST",
      body: payload,
    });
  },
  removeDay(dayId: number): Promise<void> {
    return request<void>(`/routine-days/${dayId}`, { method: "DELETE" });
  },
  addDayExercise(
    dayId: number,
    payload: RoutineDayExerciseCreatePayload,
  ): Promise<RoutineDayExercise> {
    return request<RoutineDayExercise>(`/routine-days/${dayId}/exercises`, {
      method: "POST",
      body: payload,
    });
  },
  updateDayExercise(
    rdeId: number,
    payload: RoutineDayExerciseUpdatePayload,
  ): Promise<RoutineDayExercise> {
    return request<RoutineDayExercise>(`/routine-day-exercises/${rdeId}`, {
      method: "PATCH",
      body: payload,
    });
  },
  removeDayExercise(rdeId: number): Promise<void> {
    return request<void>(`/routine-day-exercises/${rdeId}`, {
      method: "DELETE",
    });
  },
};

// --- Workouts ----------------------------------------------------------
export const workoutsApi = {
  list(): Promise<WorkoutSessionSummary[]> {
    return request<WorkoutSessionSummary[]>("/sessions");
  },
  get(id: number): Promise<WorkoutSession> {
    return request<WorkoutSession>(`/sessions/${id}`);
  },
  create(payload: WorkoutSessionCreatePayload): Promise<WorkoutSession> {
    return request<WorkoutSession>("/sessions", {
      method: "POST",
      body: payload,
    });
  },
  remove(id: number): Promise<void> {
    return request<void>(`/sessions/${id}`, { method: "DELETE" });
  },
  addSet(sessionId: number, payload: SetLogCreatePayload): Promise<SetLog> {
    return request<SetLog>(`/sessions/${sessionId}/sets`, {
      method: "POST",
      body: payload,
    });
  },
  removeSet(setId: number): Promise<void> {
    return request<void>(`/sets/${setId}`, { method: "DELETE" });
  },
};

// --- Stats -------------------------------------------------------------
export const statsApi = {
  progression(exerciseId: number): Promise<ProgressionPoint[]> {
    return request<ProgressionPoint[]>(
      `/stats/exercises/${exerciseId}/progression`,
    );
  },
  personalRecords(): Promise<PersonalRecord[]> {
    return request<PersonalRecord[]>("/stats/personal-records");
  },
  sessions(): Promise<SessionStat[]> {
    return request<SessionStat[]>("/stats/sessions");
  },
  exerciseHistory(exerciseId: number): Promise<ExerciseHistoryPoint[]> {
    return request<ExerciseHistoryPoint[]>(
      `/stats/exercises/${exerciseId}/history`,
    );
  },
  muscleDistribution(days: number): Promise<MuscleDistribution> {
    return request<MuscleDistribution>(
      `/stats/muscle-distribution?days=${days}`,
    );
  },
  topExercises(limit = 20): Promise<TopExercise[]> {
    return request<TopExercise[]>(`/stats/top-exercises?limit=${limit}`);
  },
};

// --- Medidas corporales ------------------------------------------------
export const measurementsApi = {
  list(): Promise<BodyMeasurement[]> {
    return request<BodyMeasurement[]>("/measurements");
  },
  create(payload: BodyMeasurementCreatePayload): Promise<BodyMeasurement> {
    return request<BodyMeasurement>("/measurements", {
      method: "POST",
      body: payload,
    });
  },
  remove(id: number): Promise<void> {
    return request<void>(`/measurements/${id}`, { method: "DELETE" });
  },
};

// --- Objetivos ---------------------------------------------------------
export const goalsApi = {
  list(): Promise<Goal[]> {
    return request<Goal[]>("/goals");
  },
  create(payload: GoalCreatePayload): Promise<Goal> {
    return request<Goal>("/goals", { method: "POST", body: payload });
  },
  remove(id: number): Promise<void> {
    return request<void>(`/goals/${id}`, { method: "DELETE" });
  },
};

export { request };
