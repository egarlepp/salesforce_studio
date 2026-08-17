import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Connection } from "jsforce";
import { closeDb, getDb } from "../../src/db/database";
import { createRun, getRun, getLiveRecordsForRun, getRunErrors } from "../../src/db/runsRepository";
import { runPipeline } from "../../src/generation/pipeline";
import { defaultRunConfig } from "../../src/generation/templates";
import type { RunConfig } from "../../src/generation/types";

beforeEach(() => {
  closeDb();
  getDb();
});

function smallConfig(): RunConfig {
  const cfg = defaultRunConfig();
  cfg.account.count = 4;
  cfg.contact.count = 6;
  cfg.opportunity.count = 5;
  cfg.opportunity.campaignAttachRate = 0.5;
  cfg.campaign.count = 2;
  cfg.campaignMember.contactsPerCampaign = { min: 1, max: 3 };
  return cfg;
}

let idCounter = 0;

function allSuccessConn(): { conn: Connection; requestPost: ReturnType<typeof vi.fn> } {
  const requestPost = vi.fn(async (_url: string, body: { records: unknown[] }) =>
    body.records.map(() => ({ id: `id-${idCounter++}`, success: true, errors: [] }))
  );
  const conn = { requestPost } as unknown as Connection;
  return { conn, requestPost };
}

describe("runPipeline", () => {
  it("runs all five stages in dependency order and persists created records", async () => {
    const { conn } = allSuccessConn();
    const config = smallConfig();
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config });

    const summary = await runPipeline(conn, runId, config);

    expect(summary.stages.map((s) => s.objectType)).toEqual([
      "Account",
      "Campaign",
      "Contact",
      "Opportunity",
      "CampaignMember",
    ]);
    for (const stage of summary.stages) {
      expect(stage.failed).toBe(0);
      expect(stage.created).toBe(stage.requested);
    }
    expect(summary.warnings).toEqual([]);
    expect(summary.errors).toEqual([]);

    const run = getRun(runId);
    expect(run!.status).toBe("completed");

    const liveRecords = getLiveRecordsForRun(runId);
    const totalCreated = summary.stages.reduce((sum, s) => sum + s.created, 0);
    expect(liveRecords.length).toBe(totalCreated);
  });

  it("skips dependent stages and adds warnings when Account creation entirely fails", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: { attributes: { type: string } }[] }) => {
      if (body.records[0]?.attributes.type === "Account") {
        return body.records.map(() => ({
          id: null,
          success: false,
          errors: [{ statusCode: "REQUIRED_FIELD_MISSING", message: "Required fields are missing", fields: ["Name"] }],
        }));
      }
      return body.records.map(() => ({ id: `id-${idCounter++}`, success: true, errors: [] }));
    });
    const conn = { requestPost } as unknown as Connection;

    const config = smallConfig();
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config });
    const summary = await runPipeline(conn, runId, config);

    const byType = Object.fromEntries(summary.stages.map((s) => [s.objectType, s]));
    expect(byType.Account.created).toBe(0);
    expect(byType.Account.failed).toBe(config.account.count);
    expect(byType.Contact).toEqual({ objectType: "Contact", requested: 0, created: 0, failed: 0 });
    expect(byType.Opportunity).toEqual({ objectType: "Opportunity", requested: 0, created: 0, failed: 0 });
    expect(byType.CampaignMember).toEqual({ objectType: "CampaignMember", requested: 0, created: 0, failed: 0 });

    expect(summary.warnings).toContain("Skipped Contact generation: no Account records were successfully created.");
    expect(summary.warnings).toContain("Skipped Opportunity generation: no Account records were successfully created.");
    expect(
      summary.warnings.some((w) => w.startsWith("Skipped Campaign Member generation"))
    ).toBe(true);

    const run = getRun(runId);
    expect(run!.status).toBe("completed_with_errors");

    const errors = getRunErrors(runId);
    expect(errors.length).toBe(config.account.count);
  });

  it("classifies the run as 'failed' when nothing at all was created", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: unknown[] }) =>
      body.records.map(() => ({ id: null, success: false, errors: [{ statusCode: "SERVER_UNAVAILABLE", message: "down", fields: [] }] }))
    );
    const conn = { requestPost } as unknown as Connection;

    const config = smallConfig();
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config });
    const summary = await runPipeline(conn, runId, config);

    const totalCreated = summary.stages.reduce((sum, s) => sum + s.created, 0);
    expect(totalCreated).toBe(0);

    const run = getRun(runId);
    expect(run!.status).toBe("failed");
  });

  it("falls back to real timestamps and reports 'unsupported' when the org rejects CreatedDate", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: Record<string, unknown>[] }) => {
      const hasCreatedDate = body.records.some((r) => "CreatedDate" in r);
      if (hasCreatedDate) {
        return body.records.map(() => ({
          id: null,
          success: false,
          errors: [
            {
              statusCode: "INVALID_FIELD_FOR_INSERT_UPDATE",
              message: "Unable to create/update fields: CreatedDate",
              fields: ["CreatedDate"],
            },
          ],
        }));
      }
      return body.records.map(() => ({ id: `id-${idCounter++}`, success: true, errors: [] }));
    });
    const conn = { requestPost } as unknown as Connection;

    const config = smallConfig();
    config.backdating = { enabled: true, createdDateRange: { start: "2024-01-01", end: "2024-01-31" } };
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config });

    const summary = await runPipeline(conn, runId, config);

    expect(summary.createdDateBackdating).toBe("unsupported");
    const accountStage = summary.stages.find((s) => s.objectType === "Account")!;
    expect(accountStage.created).toBe(config.account.count);
    expect(accountStage.failed).toBe(0);

    // First call for Account included CreatedDate and failed; the retry (and everything
    // after) omitted it and succeeded.
    const accountCalls = (requestPost.mock.calls as Array<[string, { records: { attributes: { type: string } }[] }]>).filter(
      ([, body]) => body.records[0]?.attributes.type === "Account"
    );
    expect(accountCalls.length).toBe(2);
  });

  it("does not attempt backdating when disabled", async () => {
    const { conn, requestPost } = allSuccessConn();
    const config = smallConfig();
    config.backdating = { enabled: false };
    const runId = createRun({ orgInstanceUrl: "https://x", orgUsername: "u", config });

    const summary = await runPipeline(conn, runId, config);

    expect(summary.createdDateBackdating).toBe("not_requested");
    for (const [, body] of requestPost.mock.calls as [string, { records: Record<string, unknown>[] }][]) {
      for (const record of body.records) {
        expect("CreatedDate" in record).toBe(false);
      }
    }
  });
});
