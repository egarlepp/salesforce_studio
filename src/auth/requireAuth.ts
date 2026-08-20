import type { NextFunction, Request, Response } from "express";

export function requireSfSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.sf) {
    res.status(401).json({ error: "not_connected", message: "Not connected to Salesforce" });
    return;
  }
  next();
}
