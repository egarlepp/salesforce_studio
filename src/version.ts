import fs from "node:fs";
import path from "node:path";

let cachedVersion: string | undefined;

export function getAppVersion(): string {
  if (!cachedVersion) {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { version: string };
    cachedVersion = pkg.version;
  }
  return cachedVersion;
}
