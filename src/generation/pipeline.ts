import type { Connection } from "jsforce";
import { createRecords, type CompositeRecordInput, type CompositeResult } from "../salesforce/compositeCollections";
import { recordCreatedBatch, recordErrors, completeRun } from "../db/runsRepository";
import { getAppVersion } from "../version";
import { BackdatingCoordinator } from "./backdating";
import { distributeChildren, sampleDistinct } from "./relationshipEngine";
import {
  generateAccountFields,
  generateCampaignFields,
  generateCampaignMemberFields,
  generateContactFields,
  generateOpportunityFields,
  randomIntInRange,
} from "./fieldGenerators";
import type { ObjectType, RunConfig, RunStatus, RunSummary, StageErrorDetail, StageSummary } from "./types";

function toPayload(objectType: ObjectType, fields: Record<string, unknown>, createdDate?: string): CompositeRecordInput {
  return {
    attributes: { type: objectType },
    ...fields,
    ...(createdDate ? { CreatedDate: createdDate } : {}),
  };
}

async function createWithBackdating(
  conn: Connection,
  backdating: BackdatingCoordinator,
  payloads: CompositeRecordInput[]
): Promise<CompositeResult[]> {
  let results = await createRecords(conn, payloads);

  if (backdating.isActive()) {
    const failedErrors = results.filter((r) => !r.success).flatMap((r) => r.errors);
    if (failedErrors.length > 0 && BackdatingCoordinator.isCreatedDateError(failedErrors)) {
      backdating.markUnsupported();
      const stripped = payloads.map((p) => {
        const clone = { ...p };
        delete clone.CreatedDate;
        return clone;
      });
      results = await createRecords(conn, stripped);
    }
  }

  return results;
}

async function runObjectStage(params: {
  conn: Connection;
  runId: string;
  objectType: ObjectType;
  fieldsList: Record<string, unknown>[];
  backdating: BackdatingCoordinator;
}): Promise<{ successIds: string[]; summary: StageSummary; errors: StageErrorDetail[] }> {
  const { conn, runId, objectType, fieldsList, backdating } = params;
  const requested = fieldsList.length;

  if (requested === 0) {
    return { successIds: [], summary: { objectType, requested: 0, created: 0, failed: 0 }, errors: [] };
  }

  const payloads = fieldsList.map((fields) => toPayload(objectType, fields, backdating.randomCreatedDate()));

  let results: CompositeResult[];
  try {
    results = await createWithBackdating(conn, backdating, payloads);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const errors: StageErrorDetail[] = [
      {
        objectType,
        stage: objectType,
        recordIndex: -1,
        errorMessage: `Batch request failed: ${message}`,
        payloadSnippet: "",
      },
    ];
    recordErrors(runId, errors);
    return { successIds: [], summary: { objectType, requested, created: 0, failed: requested }, errors };
  }

  const successIds: string[] = [];
  const errors: StageErrorDetail[] = [];
  const createdRows: Array<{ objectType: ObjectType; salesforceId: string }> = [];

  results.forEach((r, i) => {
    if (r.success && r.id) {
      successIds.push(r.id);
      createdRows.push({ objectType, salesforceId: r.id });
    } else {
      const first = r.errors[0];
      errors.push({
        objectType,
        stage: objectType,
        recordIndex: i,
        errorCode: first?.statusCode,
        errorMessage: first?.message ?? "Unknown error",
        payloadSnippet: JSON.stringify(payloads[i]).slice(0, 500),
      });
    }
  });

  if (createdRows.length > 0) recordCreatedBatch(runId, createdRows);
  if (errors.length > 0) recordErrors(runId, errors);

  return {
    successIds,
    summary: { objectType, requested, created: successIds.length, failed: errors.length },
    errors,
  };
}

export async function runPipeline(conn: Connection, runId: string, config: RunConfig): Promise<RunSummary> {
  const backdating = new BackdatingCoordinator(config.backdating);
  const warnings: string[] = [];
  const stages: StageSummary[] = [];
  const allErrors: StageErrorDetail[] = [];

  const accountFields = Array.from({ length: config.account.count }, () => generateAccountFields(config.account));
  const accountStage = await runObjectStage({
    conn,
    runId,
    objectType: "Account",
    fieldsList: accountFields,
    backdating,
  });
  stages.push(accountStage.summary);
  allErrors.push(...accountStage.errors);
  const accountIds = accountStage.successIds;

  const campaignFields = Array.from({ length: config.campaign.count }, () => generateCampaignFields(config.campaign));
  const campaignStage = await runObjectStage({
    conn,
    runId,
    objectType: "Campaign",
    fieldsList: campaignFields,
    backdating,
  });
  stages.push(campaignStage.summary);
  allErrors.push(...campaignStage.errors);
  const campaignIds = campaignStage.successIds;

  let contactIds: string[] = [];
  if (accountIds.length === 0) {
    warnings.push("Skipped Contact generation: no Account records were successfully created.");
    stages.push({ objectType: "Contact", requested: 0, created: 0, failed: 0 });
  } else {
    const assignments = distributeChildren(accountIds, config.contact.count, config.contact.accountRatio);
    const contactFields = assignments.map((accountId) => generateContactFields(config.contact, accountId));
    const contactStage = await runObjectStage({
      conn,
      runId,
      objectType: "Contact",
      fieldsList: contactFields,
      backdating,
    });
    stages.push(contactStage.summary);
    allErrors.push(...contactStage.errors);
    contactIds = contactStage.successIds;
  }

  if (accountIds.length === 0) {
    warnings.push("Skipped Opportunity generation: no Account records were successfully created.");
    stages.push({ objectType: "Opportunity", requested: 0, created: 0, failed: 0 });
  } else {
    const assignments = distributeChildren(accountIds, config.opportunity.count, config.opportunity.accountRatio);
    const oppFields = assignments.map((accountId) => {
      const campaignId =
        campaignIds.length > 0 && Math.random() < config.opportunity.campaignAttachRate
          ? campaignIds[Math.floor(Math.random() * campaignIds.length)]
          : undefined;
      return generateOpportunityFields(config.opportunity, accountId, campaignId);
    });
    const oppStage = await runObjectStage({
      conn,
      runId,
      objectType: "Opportunity",
      fieldsList: oppFields,
      backdating,
    });
    stages.push(oppStage.summary);
    allErrors.push(...oppStage.errors);
  }

  if (contactIds.length === 0 || campaignIds.length === 0) {
    warnings.push(
      "Skipped Campaign Member generation: needs both Contact and Campaign records to have been successfully created."
    );
    stages.push({ objectType: "CampaignMember", requested: 0, created: 0, failed: 0 });
  } else {
    const pairs: Array<{ campaignId: string; contactId: string }> = [];
    const seen = new Set<string>();
    for (const campaignId of campaignIds) {
      const count = Math.min(randomIntInRange(config.campaignMember.contactsPerCampaign), contactIds.length);
      for (const contactId of sampleDistinct(contactIds, count)) {
        const key = `${campaignId}:${contactId}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ campaignId, contactId });
        }
      }
    }
    const memberFields = pairs.map((p) => generateCampaignMemberFields(config.campaignMember, p.campaignId, p.contactId));
    const memberStage = await runObjectStage({
      conn,
      runId,
      objectType: "CampaignMember",
      fieldsList: memberFields,
      backdating,
    });
    stages.push(memberStage.summary);
    allErrors.push(...memberStage.errors);
  }

  const totalRequested = stages.reduce((sum, s) => sum + s.requested, 0);
  const totalCreated = stages.reduce((sum, s) => sum + s.created, 0);

  let status: RunStatus;
  if (totalRequested > 0 && totalCreated === 0) {
    status = "failed";
  } else if (allErrors.length > 0 || warnings.length > 0) {
    status = "completed_with_errors";
  } else {
    status = "completed";
  }

  const summary: RunSummary = {
    version: getAppVersion(),
    createdDateBackdating: backdating.currentStatus,
    stages,
    errors: allErrors,
    warnings,
  };

  completeRun(runId, status, summary);
  return summary;
}
