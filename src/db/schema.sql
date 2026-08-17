CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL, -- 'running' | 'completed' | 'completed_with_errors' | 'failed'
  org_instance_url TEXT NOT NULL,
  org_username TEXT NOT NULL,
  config_json TEXT NOT NULL,
  summary_json TEXT
);

CREATE TABLE IF NOT EXISTS created_records (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  object_type TEXT NOT NULL,
  salesforce_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_created_records_run_id ON created_records(run_id);
CREATE INDEX IF NOT EXISTS idx_created_records_run_id_deleted_at ON created_records(run_id, deleted_at);

CREATE TABLE IF NOT EXISTS run_errors (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  object_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  record_index INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT NOT NULL,
  payload_snippet TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_errors_run_id ON run_errors(run_id);
