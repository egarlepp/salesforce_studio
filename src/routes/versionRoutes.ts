import { Router } from "express";
import { getAppVersion } from "../version";

export const versionRouter = Router();

versionRouter.get("/version", (_req, res) => {
  res.json({ version: getAppVersion() });
});
