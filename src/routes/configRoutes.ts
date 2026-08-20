import { Router } from "express";
import { defaultRunConfig } from "../generation/templates";

export const configRouter = Router();

configRouter.get("/config/defaults", (_req, res) => {
  res.json(defaultRunConfig());
});
