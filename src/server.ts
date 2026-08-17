import express from "express";
import session from "express-session";
import path from "node:path";
import { config } from "./config";
import { getAppVersion } from "./version";
import { oauthRouter } from "./auth/oauthRoutes";
import { orgRouter } from "./routes/orgRoutes";
import { configRouter } from "./routes/configRoutes";
import { generateRouter } from "./routes/generateRoutes";
import { runsRouter } from "./routes/runsRoutes";
import { versionRouter } from "./routes/versionRoutes";
import { getDb } from "./db/database";

getDb(); // run migrations on startup

const app = express();

app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

app.use("/oauth", oauthRouter);
app.use("/api", orgRouter);
app.use("/api", configRouter);
app.use("/api", generateRouter);
app.use("/api", runsRouter);
app.use("/api", versionRouter);

app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(config.port, () => {
  console.log(`Salesforce Studio v${getAppVersion()} listening on http://localhost:${config.port}`);
});
