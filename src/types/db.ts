export type SessionRow = {
  id: string;
  user_id: string;
  performed_at: string;
  notes: string | null;
};

export type SetRow = {
  id: string;
  session_exercise_id: string;
  user_id: string;
  set_index: number;
  weight: number;
  reps: number;
  is_warmup: boolean;
  notes: string | null;
};
