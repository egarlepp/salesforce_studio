import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config";

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
    db = new Database(config.dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
    db.exec(schema);
  }
  return db;
}

export function closeDb(): void {
  db?.close();
  db = undefined;
}
