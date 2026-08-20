import { Router } from "express";
import { Connection } from "jsforce";
import { createOAuth2, SF_API_VERSION } from "../salesforce/sfClient";

export const oauthRouter = Router();

oauthRouter.get("/login", (_req, res) => {
  const oauth2 = createOAuth2();
  const authUrl = oauth2.getAuthorizationUrl({
    scope: "api refresh_token offline_access",
  });
  res.redirect(authUrl);
});

oauthRouter.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string") {
    res.status(400).send("Missing authorization code");
    return;
  }

  try {
    const conn = new Connection({ oauth2: createOAuth2(), version: SF_API_VERSION });
    const userInfo = await conn.authorize(code);

    const identity = await conn.identity();

    req.session.sf = {
      accessToken: conn.accessToken ?? "",
      refreshToken: conn.refreshToken ?? undefined,
      instanceUrl: conn.instanceUrl ?? "",
      userId: userInfo.id,
      organizationId: userInfo.organizationId,
      username: identity.username,
    };

    res.redirect("/");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).send(`Salesforce authorization failed: ${message}`);
  }
});

oauthRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).end();
  });
});
