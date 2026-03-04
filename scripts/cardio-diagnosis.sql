-- Cardio diagnosis snippets
-- Exercise: Incline Walk
-- exercise_id: 45ddf163-a5b3-4bb6-a52b-a5e965946b91
-- user_id: 5550b023-3077-44ef-9bde-9194dc206cd9

-- 1) session_exercises unit/measurement metadata
select
  se.id as session_exercise_id,
  se.session_id,
  se.exercise_id,
  se.measurement_type as se_measurement_type,
  se.default_unit as se_default_unit,
  se.is_skipped,
  se.performed_index
from session_exercises se
where se.user_id = '5550b023-3077-44ef-9bde-9194dc206cd9'
  and se.exercise_id = '45ddf163-a5b3-4bb6-a52b-a5e965946b91'
order by se.session_id desc
limit 50;

-- 2) sets presence in cardio fields
select
  s.session_exercise_id,
  count(*) as set_cnt,
  count(*) filter (where s.duration_seconds is not null and s.duration_seconds > 0) as duration_cnt,
  count(*) filter (where s.distance is not null and s.distance > 0) as distance_cnt,
  max(s.duration_seconds) as max_duration_seconds,
  max(s.distance) as max_distance,
  max(s.calories) as max_calories
from sets s
join session_exercises se on se.id = s.session_exercise_id
where se.user_id = '5550b023-3077-44ef-9bde-9194dc206cd9'
  and se.exercise_id = '45ddf163-a5b3-4bb6-a52b-a5e965946b91'
group by s.session_exercise_id
order by set_cnt desc;

-- 3) canonical exercise measurement metadata
select id, name, measurement_type, default_unit, primary_muscle, primary_muscles
from exercises
where id = '45ddf163-a5b3-4bb6-a52b-a5e965946b91';
