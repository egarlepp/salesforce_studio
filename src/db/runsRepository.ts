import { v4 as uuidv4 } from "uuid";
import { getDb } from "./database";
import type { ObjectType, RunConfig, RunStatus, RunSummary, StageErrorDetail } from "../generation/types";

export interface RunRow {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: RunStatus;
  org_instance_url: string;
  org_username: string;
  config_json: string;
  summary_json: string | null;
}

export interface CreatedRecordRow {
  id: string;
  run_id: string;
  object_type: ObjectType;
  salesforce_id: string;
  created_at: string;
  deleted_at: string | null;
}

export function createRun(params: {
  orgInstanceUrl: string;
  orgUsername: string;
  config: RunConfig;
}): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO runs (id, created_at, completed_at, status, org_instance_url, org_username, config_json, summary_json)
     VALUES (?, ?, NULL, 'running', ?, ?, ?, NULL)`
  ).run(id, new Date().toISOString(), params.orgInstanceUrl, params.orgUsername, JSON.stringify(params.config));
  return id;
}

export function recordCreated(params: { runId: string; objectType: ObjectType; salesforceId: string }): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO created_records (id, run_id, object_type, salesforce_id, created_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, NULL)`
  ).run(uuidv4(), params.runId, params.objectType, params.salesforceId, new Date().toISOString());
}

export function recordCreatedBatch(
  runId: string,
  records: Array<{ objectType: ObjectType; salesforceId: string }>
): void {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO created_records (id, run_id, object_type, salesforce_id, created_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, NULL)`
  );
  const now = new Date().toISOString();
  const insertMany = db.transaction((rows: typeof records) => {
    for (const r of rows) {
      insert.run(uuidv4(), runId, r.objectType, r.salesforceId, now);
    }
  });
  insertMany(records);
}

export function recordErrors(runId: string, errors: StageErrorDetail[]): void {
  if (errors.length === 0) return;
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO run_errors (id, run_id, object_type, stage, record_index, error_code, error_message, payload_snippet)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertMany = db.transaction((rows: StageErrorDetail[]) => {
    for (const e of rows) {
      insert.run(
        uuidv4(),
        runId,
        e.objectType,
        e.stage,
        e.recordIndex,
        e.errorCode ?? null,
        e.errorMessage,
        e.payloadSnippet
      );
    }
  });
  insertMany(errors);
}

export function completeRun(runId: string, status: RunStatus, summary: RunSummary): void {
  const db = getDb();
  db.prepare(`UPDATE runs SET status = ?, completed_at = ?, summary_json = ? WHERE id = ?`).run(
    status,
    new Date().toISOString(),
    JSON.stringify(summary),
    runId
  );
}

export function listRuns(): RunRow[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM runs ORDER BY created_at DESC`).all() as RunRow[];
}

export function getRun(runId: string): RunRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM runs WHERE id = ?`).get(runId) as RunRow | undefined;
}

export function getRunErrors(runId: string): StageErrorDetail[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM run_errors WHERE run_id = ?`).all(runId) as Array<{
    object_type: ObjectType;
    stage: ObjectType;
    record_index: number;
    error_code: string | null;
    error_message: string;
    payload_snippet: string;
  }>;
  return rows.map((r) => ({
    objectType: r.object_type,
    stage: r.stage,
    recordIndex: r.record_index,
    errorCode: r.error_code ?? undefined,
    errorMessage: r.error_message,
    payloadSnippet: r.payload_snippet,
  }));
}

export function getLiveRecordsForRun(runId: string): CreatedRecordRow[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM created_records WHERE run_id = ? AND deleted_at IS NULL`)
    .all(runId) as CreatedRecordRow[];
}

export function markRecordsDeleted(recordIds: string[]): void {
  if (recordIds.length === 0) return;
  const db = getDb();
  const update = db.prepare(`UPDATE created_records SET deleted_at = ? WHERE id = ?`);
  const now = new Date().toISOString();
  const updateMany = db.transaction((ids: string[]) => {
    for (const id of ids) {
      update.run(now, id);
    }
  });
  updateMany(recordIds);
}
