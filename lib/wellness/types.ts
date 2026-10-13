export type WellnessKind = "workout" | "supplement";

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  note: string;
}

export interface WorkoutData {
  title: string;
  exercises: Exercise[];
  notes: string;
}

export interface SupplementData {
  name: string;
  amount: string;
  schedule: string;
  note: string;
}

export type WellnessData = WorkoutData | SupplementData;

export interface WellnessEntry {
  id: string;
  kind: WellnessKind;
  data: WellnessData;
  createdAt: string;
  updatedAt: string;
}

export interface WellnessListResponse {
  entries: WellnessEntry[];
}

export interface WellnessMutationResponse {
  ok: true;
  id?: string;
  updatedAt?: string;
}

export interface WellnessErrorResponse {
  error: string;
  status?: number;
}
