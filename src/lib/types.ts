export type Project = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  camera_label: string | null;
  active: boolean;
  created_at: string;
};

export type PlanMilestone = {
  id: string;
  project_id: string;
  trade: string;
  expected_start: string;
  expected_end: string;
  expected_workers: number;
  rate_payment_dkk: number | null;
  notes: string | null;
  created_at: string;
};

export type Snapshot = {
  id: string;
  project_id: string;
  storage_path: string;
  captured_at: string;
  created_at: string;
};

export type Observation = {
  id: string;
  snapshot_id: string;
  project_id: string;
  trades_detected: string[];
  person_count: number;
  confidence: number;
  matches_plan: boolean | null;
  raw_model_output: unknown;
  reviewed: boolean;
  reviewer_verdict: "confirmed" | "rejected" | null;
  created_at: string;
};
