"""Analítica de sobrecarga progresiva sobre la vista `personal_records`."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.stats import (
    ExerciseHistoryPoint,
    MacroMuscle,
    MuscleDistribution,
    PeriodTotals,
    PersonalRecord,
    ProgressionPoint,
    SessionStat,
    TopExercise,
)
from app.services import exercise as exercise_service

# Mapa de grupo muscular (id) -> macro-grupo del radar.
_MACRO_BY_ID = {
    1: "Pecho",
    2: "Espalda",
    11: "Espalda",
    3: "Hombros",
    10: "Core",
    4: "Brazos",
    5: "Brazos",
    12: "Brazos",
    6: "Piernas",
    7: "Piernas",
    8: "Piernas",
    9: "Piernas",
}
_MACRO_ORDER = ["Espalda", "Pecho", "Core", "Hombros", "Brazos", "Piernas"]

_PROGRESSION_SQL = text(
    """
    SELECT performed_date, weight, reps, rpe, est_1rm
    FROM personal_records
    WHERE user_id = :uid AND exercise_id = :eid
    ORDER BY performed_date
    """
)

# Historial por día de un ejercicio: mejores marcas (sin calentamiento).
_EXERCISE_HISTORY_SQL = text(
    """
    SELECT
        (ws.performed_at AT TIME ZONE 'UTC')::date AS performed_date,
        MAX(sl.weight) AS max_weight,
        MAX(ROUND(sl.weight * (1 + sl.reps::numeric / 30), 2)) AS best_1rm,
        MAX(sl.weight * sl.reps) AS best_volume
    FROM set_logs sl
    JOIN workout_sessions ws ON ws.id = sl.session_id
    WHERE ws.user_id = :uid
      AND sl.exercise_id = :eid
      AND sl.is_warmup = false
    GROUP BY performed_date
    ORDER BY performed_date
    """
)

# Agregados por sesión (volumen/reps/series efectivas, sin calentamiento).
_SESSION_STATS_SQL = text(
    """
    SELECT
        ws.id AS session_id,
        ws.performed_at,
        ws.duration_seconds,
        COALESCE(
            SUM(CASE WHEN sl.is_warmup = false THEN sl.weight * sl.reps END), 0
        ) AS volume,
        COALESCE(
            SUM(CASE WHEN sl.is_warmup = false THEN sl.reps END), 0
        ) AS reps,
        COUNT(CASE WHEN sl.is_warmup = false THEN 1 END) AS sets
    FROM workout_sessions ws
    LEFT JOIN set_logs sl ON sl.session_id = ws.id
    WHERE ws.user_id = :uid
    GROUP BY ws.id, ws.performed_at, ws.duration_seconds
    ORDER BY ws.performed_at
    """
)

# Mejor 1RM estimado histórico por ejercicio (DISTINCT ON toma el mayor).
_PERSONAL_RECORDS_SQL = text(
    """
    SELECT DISTINCT ON (pr.exercise_id)
        pr.exercise_id, e.name AS exercise_name,
        pr.weight, pr.reps, pr.est_1rm, pr.performed_date
    FROM personal_records pr
    JOIN exercises e ON e.id = pr.exercise_id
    WHERE pr.user_id = :uid
    ORDER BY pr.exercise_id, pr.est_1rm DESC
    """
)


def get_progression(
    db: Session, user: User, exercise_id: int
) -> list[ProgressionPoint]:
    # 404 si el ejercicio no es accesible para el usuario.
    exercise_service.get_accessible_exercise(db, user, exercise_id)
    rows = db.execute(
        _PROGRESSION_SQL, {"uid": user.id, "eid": exercise_id}
    ).mappings()
    return [ProgressionPoint(**row) for row in rows]


def get_exercise_history(
    db: Session, user: User, exercise_id: int
) -> list[ExerciseHistoryPoint]:
    # 404 si el ejercicio no es accesible para el usuario.
    exercise_service.get_accessible_exercise(db, user, exercise_id)
    rows = db.execute(
        _EXERCISE_HISTORY_SQL, {"uid": user.id, "eid": exercise_id}
    ).mappings()
    return [ExerciseHistoryPoint(**row) for row in rows]


def get_session_stats(db: Session, user: User) -> list[SessionStat]:
    rows = db.execute(_SESSION_STATS_SQL, {"uid": user.id}).mappings()
    return [SessionStat(**row) for row in rows]


_TOP_EXERCISES_SQL = text(
    """
    SELECT
        sl.exercise_id,
        e.name AS exercise_name,
        COUNT(*) AS sets,
        COUNT(DISTINCT sl.session_id) AS sessions
    FROM set_logs sl
    JOIN workout_sessions ws ON ws.id = sl.session_id
    JOIN exercises e ON e.id = sl.exercise_id
    WHERE ws.user_id = :uid AND sl.is_warmup = false
    GROUP BY sl.exercise_id, e.name
    ORDER BY sets DESC, sessions DESC
    LIMIT :limit
    """
)


def get_top_exercises(
    db: Session, user: User, limit: int = 20
) -> list[TopExercise]:
    rows = db.execute(
        _TOP_EXERCISES_SQL, {"uid": user.id, "limit": limit}
    ).mappings()
    return [TopExercise(**row) for row in rows]


_PERIOD_TOTALS_SQL = text(
    """
    SELECT
        (SELECT COUNT(*) FROM workout_sessions ws
         WHERE ws.user_id = :uid
           AND ws.performed_at >= :start AND ws.performed_at < :end) AS workouts,
        (SELECT COALESCE(SUM(ws.duration_seconds), 0) FROM workout_sessions ws
         WHERE ws.user_id = :uid
           AND ws.performed_at >= :start AND ws.performed_at < :end) AS duration_seconds,
        (SELECT COALESCE(SUM(sl.weight * sl.reps), 0)
         FROM set_logs sl JOIN workout_sessions ws ON ws.id = sl.session_id
         WHERE ws.user_id = :uid AND sl.is_warmup = false
           AND ws.performed_at >= :start AND ws.performed_at < :end) AS volume,
        (SELECT COUNT(*)
         FROM set_logs sl JOIN workout_sessions ws ON ws.id = sl.session_id
         WHERE ws.user_id = :uid AND sl.is_warmup = false
           AND ws.performed_at >= :start AND ws.performed_at < :end) AS sets
    """
)

_MUSCLE_SETS_SQL = text(
    """
    SELECT e.primary_muscle_id AS mid, COUNT(*) AS sets
    FROM set_logs sl
    JOIN workout_sessions ws ON ws.id = sl.session_id
    JOIN exercises e ON e.id = sl.exercise_id
    WHERE ws.user_id = :uid AND sl.is_warmup = false
      AND ws.performed_at >= :start AND ws.performed_at < :end
    GROUP BY e.primary_muscle_id
    """
)


def _period_totals(db: Session, uid: int, start, end) -> PeriodTotals:
    row = db.execute(
        _PERIOD_TOTALS_SQL, {"uid": uid, "start": start, "end": end}
    ).mappings().one()
    return PeriodTotals(**row)


def _macro_counts(db: Session, uid: int, start, end) -> dict[str, int]:
    counts = {m: 0 for m in _MACRO_ORDER}
    rows = db.execute(
        _MUSCLE_SETS_SQL, {"uid": uid, "start": start, "end": end}
    ).mappings()
    for r in rows:
        macro = _MACRO_BY_ID.get(r["mid"])
        if macro:
            counts[macro] += r["sets"]
    return counts


def get_muscle_distribution(
    db: Session, user: User, days: int
) -> MuscleDistribution:
    now = datetime.now(timezone.utc)
    cur_start = now - timedelta(days=days)
    prev_start = now - timedelta(days=2 * days)

    cur = _macro_counts(db, user.id, cur_start, now)
    prev = _macro_counts(db, user.id, prev_start, cur_start)

    muscles = [
        MacroMuscle(name=m, current=cur[m], previous=prev[m])
        for m in _MACRO_ORDER
    ]
    return MuscleDistribution(
        muscles=muscles,
        current=_period_totals(db, user.id, cur_start, now),
        previous=_period_totals(db, user.id, prev_start, cur_start),
    )


def get_personal_records(db: Session, user: User) -> list[PersonalRecord]:
    rows = db.execute(_PERSONAL_RECORDS_SQL, {"uid": user.id}).mappings()
    records = [PersonalRecord(**row) for row in rows]
    # Orden de presentación: mejor 1RM primero.
    records.sort(key=lambda r: r.est_1rm, reverse=True)
    return records
