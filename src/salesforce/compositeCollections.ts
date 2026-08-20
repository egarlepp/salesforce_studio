import type { Connection } from "jsforce";

const MAX_BATCH_SIZE = 200;

export interface CompositeRecordInput {
  attributes: { type: string };
  [field: string]: unknown;
}

export interface CompositeError {
  statusCode: string;
  message: string;
  fields: string[];
}

export interface CompositeResult {
  id: string | null;
  success: boolean;
  errors: CompositeError[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Creates records via the sObject Collections (composite/sobjects) API, in
 * chunks of at most 200, with allOrNone:false so a bad record doesn't block
 * the rest of its batch. Returns one result per input record, index-aligned.
 */
export async function createRecords(
  conn: Connection,
  records: CompositeRecordInput[]
): Promise<CompositeResult[]> {
  if (records.length === 0) return [];

  const results: CompositeResult[] = [];
  for (const batch of chunk(records, MAX_BATCH_SIZE)) {
    const batchResults = await conn.requestPost<CompositeResult[]>("/composite/sobjects", {
      allOrNone: false,
      records: batch,
    });
    results.push(...batchResults);
  }
  return results;
}

/**
 * Deletes records by Id via the sObject Collections API, in chunks of at
 * most 200, with allOrNone:false. Returns one result per input id,
 * index-aligned.
 */
export async function deleteRecords(conn: Connection, ids: string[]): Promise<CompositeResult[]> {
  if (ids.length === 0) return [];

  const results: CompositeResult[] = [];
  for (const batch of chunk(ids, MAX_BATCH_SIZE)) {
    const query = new URLSearchParams({ ids: batch.join(","), allOrNone: "false" });
    const batchResults = await conn.requestDelete<CompositeResult[]>(`/composite/sobjects?${query.toString()}`);
    results.push(...batchResults);
  }
  return results;
}
