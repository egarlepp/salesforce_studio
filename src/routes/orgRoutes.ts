import { Router } from "express";
import { getConnectionFromSession } from "../salesforce/sfClient";
import { fetchOrgIdentity } from "../salesforce/identity";
import { requireSfSession } from "../auth/requireAuth";

export const orgRouter = Router();

orgRouter.get("/org", requireSfSession, async (req, res) => {
  try {
    const conn = getConnectionFromSession(req);
    const sf = req.session.sf!;
    const identity = await fetchOrgIdentity(conn, sf.organizationId, sf.username);
    res.json(identity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "salesforce_error", message });
  }
});
