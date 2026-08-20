import { Router } from "express";
import { getConnectionFromSession } from "../salesforce/sfClient";
import { requireSfSession } from "../auth/requireAuth";
import { runConfigSchema } from "../generation/templates";
import { runPipeline } from "../generation/pipeline";
import { createRun, completeRun } from "../db/runsRepository";
import { getAppVersion } from "../version";

export const generateRouter = Router();

generateRouter.post("/generate", requireSfSession, async (req, res) => {
  const parsed = runConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_config", message: parsed.error.message });
    return;
  }
  const runConfig = parsed.data;

  const conn = getConnectionFromSession(req);
  const sf = req.session.sf!;

  const runId = createRun({
    orgInstanceUrl: sf.instanceUrl,
    orgUsername: sf.username,
    config: runConfig,
  });

  try {
    const summary = await runPipeline(conn, runId, runConfig);
    res.json({ runId, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    completeRun(runId, "failed", {
      version: getAppVersion(),
      createdDateBackdating: "not_requested",
      stages: [],
      errors: [],
      warnings: [`Run failed unexpectedly: ${message}`],
    });
    res.status(500).json({ runId, error: "generation_failed", message });
  }
});
