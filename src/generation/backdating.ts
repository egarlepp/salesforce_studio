import type { CompositeError } from "../salesforce/compositeCollections";
import type { BackdatingConfig, CreatedDateBackdatingStatus } from "./types";

/**
 * Coordinates the optional CreatedDate audit-field backdating feature.
 *
 * Setting CreatedDate on insert requires the connected user's org to grant
 * "Set Audit Fields upon Record Creation". We don't know ahead of time
 * whether that's the case, so the first batch that includes CreatedDate acts
 * as a capability probe: if Salesforce rejects records specifically because
 * of the CreatedDate field, this coordinator flips to "unsupported" so the
 * rest of the run (and the caller) can stop attempting it.
 */
export class BackdatingCoordinator {
  private status: CreatedDateBackdatingStatus;

  constructor(private readonly config: BackdatingConfig) {
    this.status = config.enabled ? "applied" : "not_requested";
  }

  get currentStatus(): CreatedDateBackdatingStatus {
    return this.status;
  }

  isActive(): boolean {
    return this.status === "applied";
  }

  /** Returns a random ISO-8601 datetime within the configured range, or undefined if backdating isn't active. */
  randomCreatedDate(): string | undefined {
    if (!this.isActive() || !this.config.createdDateRange) return undefined;
    const { start, end } = this.config.createdDateRange;
    const startMs = new Date(`${start}T00:00:00Z`).getTime();
    const endMs = new Date(`${end}T23:59:59Z`).getTime();
    const t = startMs + Math.random() * Math.max(0, endMs - startMs);
    return new Date(t).toISOString();
  }

  /** Best-effort detection of a permission failure on the CreatedDate field. */
  static isCreatedDateError(errors: CompositeError[]): boolean {
    return errors.some(
      (e) => e.fields?.includes("CreatedDate") || /createddate/i.test(e.message ?? "")
    );
  }

  markUnsupported(): void {
    this.status = "unsupported";
  }
}
