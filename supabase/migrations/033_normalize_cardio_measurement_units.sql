-- 033_normalize_cardio_measurement_units.sql
-- Normalize cardio measurement/unit metadata so session + exercise surfaces derive from canonical cardio semantics.

-- Align session_exercises measurement_type with canonical exercise measurement for cardio movements.
UPDATE public.session_exercises se
SET measurement_type = e.measurement_type
FROM public.exercises e
WHERE se.exercise_id = e.id
  AND e.measurement_type IN ('time', 'distance', 'time_distance')
  AND se.measurement_type IS DISTINCT FROM e.measurement_type;

-- Align session_exercises default_unit for cardio rows.
UPDATE public.session_exercises se
SET default_unit = CASE e.measurement_type
  WHEN 'time' THEN 'sec'
  WHEN 'distance' THEN COALESCE(NULLIF(se.distance_unit, ''), 'mi')
  WHEN 'time_distance' THEN COALESCE(NULLIF(se.distance_unit, ''), 'mi')
  ELSE se.default_unit
END
FROM public.exercises e
WHERE se.exercise_id = e.id
  AND e.measurement_type IN ('time', 'distance', 'time_distance')
  AND (se.default_unit IS NULL OR se.default_unit IN ('reps', 'time', 'distance', 'time_distance'));

-- Keep canonical exercise cardio units aligned for consistent formatting defaults.
UPDATE public.exercises e
SET default_unit = CASE e.measurement_type
  WHEN 'time' THEN 'sec'
  WHEN 'distance' THEN 'mi'
  WHEN 'time_distance' THEN 'mi'
  ELSE e.default_unit
END
WHERE e.measurement_type IN ('time', 'distance', 'time_distance')
  AND (e.default_unit IS NULL OR e.default_unit IN ('reps', 'time', 'distance', 'time_distance'));
