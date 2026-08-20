import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  sfClientId: required("SF_CLIENT_ID"),
  sfClientSecret: required("SF_CLIENT_SECRET"),
  sfLoginUrl: process.env.SF_LOGIN_URL ?? "https://login.salesforce.com",
  sfCallbackUrl: process.env.SF_CALLBACK_URL ?? "http://localhost:3000/oauth/callback",
  sessionSecret: required("SESSION_SECRET"),
  dbPath:
    process.env.DB_PATH === ":memory:"
      ? ":memory:"
      : path.resolve(process.cwd(), process.env.DB_PATH ?? "./data/app.db"),
};
