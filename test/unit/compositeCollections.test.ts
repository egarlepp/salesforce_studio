import { describe, it, expect, vi } from "vitest";
import type { Connection } from "jsforce";
import { createRecords, deleteRecords, type CompositeRecordInput, type CompositeResult } from "../../src/salesforce/compositeCollections";

function makeAccountPayloads(count: number): CompositeRecordInput[] {
  return Array.from({ length: count }, (_, i) => ({
    attributes: { type: "Account" },
    Name: `Account ${i}`,
  }));
}

function successResults(records: unknown[]): CompositeResult[] {
  return records.map((_, i) => ({ id: `id-${i}`, success: true, errors: [] }));
}

describe("createRecords", () => {
  it("returns an empty array without calling the API when there are no records", async () => {
    const requestPost = vi.fn();
    const conn = { requestPost } as unknown as Connection;
    const results = await createRecords(conn, []);
    expect(results).toEqual([]);
    expect(requestPost).not.toHaveBeenCalled();
  });

  it("sends a single batch for 199 records", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: unknown[] }) => successResults(body.records));
    const conn = { requestPost } as unknown as Connection;
    const results = await createRecords(conn, makeAccountPayloads(199));
    expect(requestPost).toHaveBeenCalledTimes(1);
    expect(results.length).toBe(199);
  });

  it("sends a single batch for exactly 200 records", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: unknown[] }) => successResults(body.records));
    const conn = { requestPost } as unknown as Connection;
    const results = await createRecords(conn, makeAccountPayloads(200));
    expect(requestPost).toHaveBeenCalledTimes(1);
    expect(requestPost.mock.calls[0][1].records.length).toBe(200);
    expect(results.length).toBe(200);
  });

  it("splits into two batches for 201 records", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: unknown[] }) => successResults(body.records));
    const conn = { requestPost } as unknown as Connection;
    const results = await createRecords(conn, makeAccountPayloads(201));
    expect(requestPost).toHaveBeenCalledTimes(2);
    expect(requestPost.mock.calls[0][1].records.length).toBe(200);
    expect(requestPost.mock.calls[1][1].records.length).toBe(1);
    expect(results.length).toBe(201);
  });

  it("splits into two even batches for 250 records", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: unknown[] }) => successResults(body.records));
    const conn = { requestPost } as unknown as Connection;
    const results = await createRecords(conn, makeAccountPayloads(250));
    expect(requestPost).toHaveBeenCalledTimes(2);
    expect(requestPost.mock.calls[0][1].records.length).toBe(200);
    expect(requestPost.mock.calls[1][1].records.length).toBe(50);
    expect(results.length).toBe(250);
  });

  it("splits into two even batches for 400 records", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: unknown[] }) => successResults(body.records));
    const conn = { requestPost } as unknown as Connection;
    const results = await createRecords(conn, makeAccountPayloads(400));
    expect(requestPost).toHaveBeenCalledTimes(2);
    expect(requestPost.mock.calls[0][1].records.length).toBe(200);
    expect(requestPost.mock.calls[1][1].records.length).toBe(200);
    expect(results.length).toBe(400);
  });

  it("always sets allOrNone:false", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: unknown[]; allOrNone: boolean }) =>
      successResults(body.records)
    );
    const conn = { requestPost } as unknown as Connection;
    await createRecords(conn, makeAccountPayloads(5));
    expect(requestPost.mock.calls[0][1].allOrNone).toBe(false);
  });

  it("returns results index-aligned with the input records across batches", async () => {
    const requestPost = vi.fn(async (_url: string, body: { records: { Name: string }[] }) =>
      body.records.map((r) => ({ id: r.Name, success: true, errors: [] }))
    );
    const conn = { requestPost } as unknown as Connection;
    const payloads = makeAccountPayloads(201);
    const results = await createRecords(conn, payloads);
    results.forEach((r, i) => {
      expect(r.id).toBe(`Account ${i}`);
    });
  });
});

describe("deleteRecords", () => {
  it("returns an empty array without calling the API when there are no ids", async () => {
    const requestDelete = vi.fn();
    const conn = { requestDelete } as unknown as Connection;
    const results = await deleteRecords(conn, []);
    expect(results).toEqual([]);
    expect(requestDelete).not.toHaveBeenCalled();
  });

  it("chunks 250 ids into batches of 200 and 50, with allOrNone=false in the query string", async () => {
    const requestDelete = vi.fn(async (url: string) => {
      const ids = new URLSearchParams(url.split("?")[1]).get("ids")!.split(",");
      return ids.map((id) => ({ id, success: true, errors: [] }));
    });
    const conn = { requestDelete } as unknown as Connection;
    const ids = Array.from({ length: 250 }, (_, i) => `001${i}`);
    const results = await deleteRecords(conn, ids);

    expect(requestDelete).toHaveBeenCalledTimes(2);
    for (const call of requestDelete.mock.calls) {
      expect(call[0]).toContain("allOrNone=false");
    }
    expect(results.length).toBe(250);
  });
});
