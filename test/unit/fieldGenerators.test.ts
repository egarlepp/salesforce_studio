import { describe, it, expect } from "vitest";
import {
  pickWeighted,
  randomIntInRange,
  randomFloatInRange,
  randomDateInRange,
  generateAccountFields,
  generateContactFields,
  generateOpportunityFields,
  generateCampaignFields,
} from "../../src/generation/fieldGenerators";
import { defaultRunConfig } from "../../src/generation/templates";

describe("pickWeighted", () => {
  it("only ever returns one of the given option values", () => {
    const options = [
      { value: "A", weight: 1 },
      { value: "B", weight: 5 },
      { value: "C", weight: 0.5 },
    ];
    for (let i = 0; i < 200; i++) {
      expect(["A", "B", "C"]).toContain(pickWeighted(options));
    }
  });

  it("always returns the only option when there's just one", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickWeighted([{ value: "Only", weight: 1 }])).toBe("Only");
    }
  });
});

describe("randomIntInRange / randomFloatInRange", () => {
  it("stays within [min, max] for many samples", () => {
    const range = { min: 10, max: 20 };
    for (let i = 0; i < 200; i++) {
      const intVal = randomIntInRange(range);
      expect(intVal).toBeGreaterThanOrEqual(10);
      expect(intVal).toBeLessThanOrEqual(20);

      const floatVal = randomFloatInRange(range);
      expect(floatVal).toBeGreaterThanOrEqual(10);
      expect(floatVal).toBeLessThanOrEqual(20);
    }
  });

  it("handles min === max", () => {
    expect(randomIntInRange({ min: 7, max: 7 })).toBe(7);
    expect(randomFloatInRange({ min: 7, max: 7 })).toBe(7);
  });
});

describe("randomDateInRange", () => {
  it("stays within the configured date range, inclusive", () => {
    const range = { start: "2026-01-01", end: "2026-01-10" };
    for (let i = 0; i < 100; i++) {
      const date = randomDateInRange(range);
      expect(date >= range.start).toBe(true);
      expect(date <= range.end).toBe(true);
    }
  });

  it("returns the same date when start === end", () => {
    const range = { start: "2026-06-15", end: "2026-06-15" };
    expect(randomDateInRange(range)).toBe("2026-06-15");
  });
});

describe("field generators respect configured ranges/weights", () => {
  const config = defaultRunConfig();

  it("generateAccountFields respects revenue/employee ranges and industry weights", () => {
    for (let i = 0; i < 25; i++) {
      const fields = generateAccountFields(config.account) as {
        AnnualRevenue: number;
        NumberOfEmployees: number;
        Industry: string;
      };
      expect(fields.AnnualRevenue).toBeGreaterThanOrEqual(config.account.annualRevenue.min);
      expect(fields.AnnualRevenue).toBeLessThanOrEqual(config.account.annualRevenue.max);
      expect(fields.NumberOfEmployees).toBeGreaterThanOrEqual(config.account.numberOfEmployees.min);
      expect(fields.NumberOfEmployees).toBeLessThanOrEqual(config.account.numberOfEmployees.max);
      expect(config.account.industries.map((o) => o.value)).toContain(fields.Industry);
    }
  });

  it("generateContactFields sets AccountId and stays within picklist options", () => {
    const fields = generateContactFields(config.contact, "001xxTEST") as {
      AccountId: string;
      Title: string;
      LeadSource: string;
    };
    expect(fields.AccountId).toBe("001xxTEST");
    expect(config.contact.titles.map((o) => o.value)).toContain(fields.Title);
    expect(config.contact.leadSources.map((o) => o.value)).toContain(fields.LeadSource);
  });

  it("generateOpportunityFields only includes CampaignId when one is passed", () => {
    const withCampaign = generateOpportunityFields(config.opportunity, "001xx", "701xx") as Record<string, unknown>;
    expect(withCampaign.CampaignId).toBe("701xx");

    const withoutCampaign = generateOpportunityFields(config.opportunity, "001xx", undefined) as Record<
      string,
      unknown
    >;
    expect("CampaignId" in withoutCampaign).toBe(false);
  });

  it("generateOpportunityFields keeps Amount and CloseDate within configured bounds", () => {
    for (let i = 0; i < 25; i++) {
      const fields = generateOpportunityFields(config.opportunity, "001xx", undefined) as {
        Amount: number;
        CloseDate: string;
      };
      expect(fields.Amount).toBeGreaterThanOrEqual(config.opportunity.amount.min);
      expect(fields.Amount).toBeLessThanOrEqual(config.opportunity.amount.max);
      expect(fields.CloseDate >= config.opportunity.closeDate.start).toBe(true);
      expect(fields.CloseDate <= config.opportunity.closeDate.end).toBe(true);
    }
  });

  it("generateCampaignFields keeps StartDate <= EndDate within the configured range", () => {
    for (let i = 0; i < 25; i++) {
      const fields = generateCampaignFields(config.campaign) as { StartDate: string; EndDate: string };
      expect(fields.StartDate <= fields.EndDate).toBe(true);
      expect(fields.StartDate >= config.campaign.dateRange.start).toBe(true);
      expect(fields.EndDate <= config.campaign.dateRange.end).toBe(true);
    }
  });
});
