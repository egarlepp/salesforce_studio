import { Router } from "express";
import { getConnectionFromSession } from "../salesforce/sfClient";
import { deleteRecords } from "../salesforce/compositeCollections";
import { requireSfSession } from "../auth/requireAuth";
import {
  listRuns,
  getRun,
  getRunErrors,
  getLiveRecordsForRun,
  markRecordsDeleted,
  type CreatedRecordRow,
  type RunRow,
} from "../db/runsRepository";
import type { ObjectType } from "../generation/types";

export const runsRouter = Router();

function serializeRun(row: RunRow) {
  return {
    id: row.id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    status: row.status,
    orgInstanceUrl: row.org_instance_url,
    orgUsername: row.org_username,
    config: JSON.parse(row.config_json),
    summary: row.summary_json ? JSON.parse(row.summary_json) : null,
  };
}

runsRouter.get("/runs", (_req, res) => {
  res.json(listRuns().map(serializeRun));
});

runsRouter.get("/runs/:id", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const liveRecords = getLiveRecordsForRun(run.id);
  res.json({
    ...serializeRun(run),
    errors: getRunErrors(run.id),
    liveRecordCount: liveRecords.length,
  });
});

const DELETION_ORDER: ObjectType[] = ["CampaignMember", "Opportunity", "Contact", "Campaign", "Account"];

runsRouter.delete("/runs/:id", requireSfSession, async (req, res) => {
  const run = getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const liveRecords = getLiveRecordsForRun(run.id);
  if (liveRecords.length === 0) {
    res.json({ deleted: 0, failed: 0, errors: [] });
    return;
  }

  const conn = getConnectionFromSession(req);

  const byType = new Map<ObjectType, CreatedRecordRow[]>();
  for (const record of liveRecords) {
    const list = byType.get(record.object_type) ?? [];
    list.push(record);
    byType.set(record.object_type, list);
  }

  const deletedRecordIds: string[] = [];
  const errors: Array<{ objectType: ObjectType; salesforceId: string; message: string }> = [];

  for (const objectType of DELETION_ORDER) {
    const records = byType.get(objectType);
    if (!records || records.length === 0) continue;

    const results = await deleteRecords(
      conn,
      records.map((r) => r.salesforce_id)
    );

    results.forEach((result, i) => {
      const record = records[i];
      if (result.success) {
        deletedRecordIds.push(record.id);
      } else {
        errors.push({
          objectType,
          salesforceId: record.salesforce_id,
          message: result.errors[0]?.message ?? "Unknown error",
        });
      }
    });
  }

  markRecordsDeleted(deletedRecordIds);

  res.json({
    deleted: deletedRecordIds.length,
    failed: errors.length,
    errors,
  });
});
