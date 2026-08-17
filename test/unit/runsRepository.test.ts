import { describe, it, expect, beforeEach } from "vitest";
import { closeDb, getDb } from "../../src/db/database";
import {
  createRun,
  getRun,
  listRuns,
  recordCreatedBatch,
  recordErrors,
  getLiveRecordsForRun,
  markRecordsDeleted,
  getRunErrors,
  completeRun,
} from "../../src/db/runsRepository";
import { defaultRunConfig } from "../../src/generation/templates";
import type { RunSummary } from "../../src/generation/types";

beforeEach(() => {
  closeDb();
  getDb();
});

function baseSummary(): RunSummary {
  return {
    version: "0.1.0",
    createdDateBackdating: "not_requested",
    stages: [],
    errors: [],
    warnings: [],
  };
}

describe("runsRepository", () => {
  it("creates the schema on first access", () => {
    const db = getDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["runs", "created_records", "run_errors"]));
  });

  it("createRun + getRun round-trips a run in 'running' status", () => {
    const runId = createRun({ orgInstanceUrl: "https://example.my.salesforce.com", orgUsername: "test@example.com", config: defaultRunConfig() });
    const run = getRun(runId);
    expect(run).toBeDefined();
    expect(run!.status).toBe("running");
    expect(run!.org_username).toBe("test@example.com");
    expect(JSON.parse(run!.config_json).account.count).toBe(defaultRunConfig().account.count);
  });

  it("getRun returns undefined for an unknown id", () => {
    expect(getRun("does-not-exist")).toBeUndefined();
  });

  it("recordCreatedBatch persists records retrievable via getLiveRecordsForRun", () => {
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config: defaultRunConfig() });
    recordCreatedBatch(runId, [
      { objectType: "Account", salesforceId: "001AAA" },
      { objectType: "Account", salesforceId: "001BBB" },
    ]);
    const live = getLiveRecordsForRun(runId);
    expect(live.length).toBe(2);
    expect(live.map((r) => r.salesforce_id).sort()).toEqual(["001AAA", "001BBB"]);
    expect(live.every((r) => r.deleted_at === null)).toBe(true);
  });

  it("markRecordsDeleted excludes records from getLiveRecordsForRun afterwards", () => {
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config: defaultRunConfig() });
    recordCreatedBatch(runId, [
      { objectType: "Account", salesforceId: "001AAA" },
      { objectType: "Account", salesforceId: "001BBB" },
    ]);
    const live = getLiveRecordsForRun(runId);
    markRecordsDeleted([live[0].id]);

    const remaining = getLiveRecordsForRun(runId);
    expect(remaining.length).toBe(1);
    expect(remaining[0].salesforce_id).toBe(live[1].salesforce_id);
  });

  it("recordErrors + getRunErrors round-trips error details", () => {
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config: defaultRunConfig() });
    recordErrors(runId, [
      {
        objectType: "Contact",
        stage: "Contact",
        recordIndex: 3,
        errorCode: "REQUIRED_FIELD_MISSING",
        errorMessage: "Required fields are missing: [LastName]",
        payloadSnippet: '{"FirstName":"Jo"}',
      },
    ]);
    const errors = getRunErrors(runId);
    expect(errors.length).toBe(1);
    expect(errors[0].errorCode).toBe("REQUIRED_FIELD_MISSING");
    expect(errors[0].recordIndex).toBe(3);
  });

  it("recordErrors is a no-op for an empty array", () => {
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config: defaultRunConfig() });
    expect(() => recordErrors(runId, [])).not.toThrow();
    expect(getRunErrors(runId)).toEqual([]);
  });

  it("completeRun updates status, completed_at, and summary_json", () => {
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config: defaultRunConfig() });
    const summary = baseSummary();
    summary.stages.push({ objectType: "Account", requested: 5, created: 5, failed: 0 });
    completeRun(runId, "completed", summary);

    const run = getRun(runId);
    expect(run!.status).toBe("completed");
    expect(run!.completed_at).not.toBeNull();
    expect(JSON.parse(run!.summary_json!).stages[0].created).toBe(5);
  });

  it("listRuns returns runs ordered by created_at descending", () => {
    const id1 = createRun({ orgInstanceUrl: "https://x", orgUsername: "u1", config: defaultRunConfig() });
    // Force a distinguishable created_at ordering without relying on wall-clock granularity.
    const db = getDb();
    db.prepare("UPDATE runs SET created_at = ? WHERE id = ?").run("2020-01-01T00:00:00.000Z", id1);

    const id2 = createRun({ orgInstanceUrl: "https://x", orgUsername: "u2", config: defaultRunConfig() });
    db.prepare("UPDATE runs SET created_at = ? WHERE id = ?").run("2025-01-01T00:00:00.000Z", id2);

    const runs = listRuns();
    expect(runs[0].id).toBe(id2);
    expect(runs[1].id).toBe(id1);
  });
});
