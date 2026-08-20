import { z } from "zod";
import type { RunConfig } from "./types";

const weightedOptionSchema = z.object({
  value: z.string().min(1),
  weight: z.number().positive(),
});

const numberRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((r) => r.max >= r.min, { message: "max must be >= min" });

const dateRangeSchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "start must be YYYY-MM-DD"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "end must be YYYY-MM-DD"),
  })
  .refine((r) => r.end >= r.start, { message: "end must be >= start" });

const countSchema = z.number().int().min(10).max(250);

export const runConfigSchema: z.ZodType<RunConfig> = z.object({
  account: z.object({
    count: countSchema,
    industries: z.array(weightedOptionSchema).min(1),
    annualRevenue: numberRangeSchema,
    numberOfEmployees: numberRangeSchema,
  }),
  contact: z.object({
    count: countSchema,
    accountRatio: numberRangeSchema,
    titles: z.array(weightedOptionSchema).min(1),
    leadSources: z.array(weightedOptionSchema).min(1),
  }),
  opportunity: z.object({
    count: countSchema,
    accountRatio: numberRangeSchema,
    campaignAttachRate: z.number().min(0).max(1),
    amount: numberRangeSchema,
    stages: z.array(weightedOptionSchema).min(1),
    closeDate: dateRangeSchema,
  }),
  campaign: z.object({
    count: countSchema,
    types: z.array(weightedOptionSchema).min(1),
    statuses: z.array(weightedOptionSchema).min(1),
    dateRange: dateRangeSchema,
    budgetedCost: numberRangeSchema,
  }),
  campaignMember: z.object({
    contactsPerCampaign: numberRangeSchema,
    statuses: z.array(weightedOptionSchema).min(1),
  }),
  backdating: z.object({
    enabled: z.boolean(),
    createdDateRange: dateRangeSchema.optional(),
  }),
});

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function defaultRunConfig(): RunConfig {
  return {
    account: {
      count: 25,
      industries: [
        { value: "Technology", weight: 1 },
        { value: "Finance", weight: 1 },
        { value: "Healthcare", weight: 1 },
        { value: "Manufacturing", weight: 1 },
        { value: "Retail", weight: 1 },
        { value: "Education", weight: 1 },
      ],
      annualRevenue: { min: 500_000, max: 500_000_000 },
      numberOfEmployees: { min: 5, max: 10_000 },
    },
    contact: {
      count: 75,
      accountRatio: { min: 2, max: 5 },
      titles: [
        { value: "Director", weight: 1 },
        { value: "Manager", weight: 1 },
        { value: "VP", weight: 1 },
        { value: "Coordinator", weight: 1 },
        { value: "Analyst", weight: 1 },
      ],
      leadSources: [
        { value: "Web", weight: 1 },
        { value: "Referral", weight: 1 },
        { value: "Partner", weight: 1 },
        { value: "Trade Show", weight: 1 },
      ],
    },
    opportunity: {
      count: 50,
      accountRatio: { min: 1, max: 3 },
      campaignAttachRate: 0.4,
      amount: { min: 5_000, max: 250_000 },
      stages: [
        { value: "Prospecting", weight: 2 },
        { value: "Qualification", weight: 2 },
        { value: "Needs Analysis", weight: 2 },
        { value: "Proposal/Price Quote", weight: 2 },
        { value: "Negotiation/Review", weight: 1 },
        { value: "Closed Won", weight: 2 },
        { value: "Closed Lost", weight: 1 },
      ],
      closeDate: { start: isoDateOffset(-30), end: isoDateOffset(180) },
    },
    campaign: {
      count: 8,
      types: [
        { value: "Webinar", weight: 1 },
        { value: "Email", weight: 1 },
        { value: "Conference", weight: 1 },
        { value: "Advertisement", weight: 1 },
      ],
      statuses: [
        { value: "Planned", weight: 1 },
        { value: "In Progress", weight: 1 },
        { value: "Completed", weight: 2 },
      ],
      dateRange: { start: isoDateOffset(-90), end: isoDateOffset(90) },
      budgetedCost: { min: 1_000, max: 50_000 },
    },
    campaignMember: {
      contactsPerCampaign: { min: 5, max: 30 },
      statuses: [
        { value: "Sent", weight: 2 },
        { value: "Responded", weight: 1 },
      ],
    },
    backdating: {
      enabled: false,
    },
  };
}
