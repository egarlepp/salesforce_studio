import { Connection, OAuth2 } from "jsforce";
import type { Request } from "express";
import { config } from "../config";

export const SF_API_VERSION = "60.0";

export function createOAuth2(): OAuth2 {
  return new OAuth2({
    loginUrl: config.sfLoginUrl,
    clientId: config.sfClientId,
    clientSecret: config.sfClientSecret,
    redirectUri: config.sfCallbackUrl,
  });
}

export class NotConnectedError extends Error {
  constructor() {
    super("Not connected to Salesforce");
    this.name = "NotConnectedError";
  }
}

/**
 * Builds a jsforce Connection from the session's stored tokens. Registers a
 * refresh listener so a rotated access token is written back to the session.
 */
export function getConnectionFromSession(req: Request): Connection {
  const sf = req.session.sf;
  if (!sf) {
    throw new NotConnectedError();
  }

  const conn = new Connection({
    oauth2: createOAuth2(),
    instanceUrl: sf.instanceUrl,
    accessToken: sf.accessToken,
    refreshToken: sf.refreshToken,
    version: SF_API_VERSION,
  });

  conn.on("refresh", (accessToken: string) => {
    if (req.session.sf) {
      req.session.sf.accessToken = accessToken;
    }
  });

  return conn;
}
