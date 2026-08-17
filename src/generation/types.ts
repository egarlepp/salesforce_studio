export type ObjectType = "Account" | "Contact" | "Opportunity" | "Campaign" | "CampaignMember";

export const PIPELINE_STAGES: ObjectType[] = [
  "Account",
  "Campaign",
  "Contact",
  "Opportunity",
  "CampaignMember",
];

export interface DateRangeConfig {
  /** ISO date string, e.g. "2026-06-01" */
  start: string;
  /** ISO date string, e.g. "2026-12-01" */
  end: string;
}

export interface NumberRangeConfig {
  min: number;
  max: number;
}

export interface WeightedOption {
  value: string;
  weight: number;
}

export interface AccountConfig {
  count: number;
  industries: WeightedOption[];
  annualRevenue: NumberRangeConfig;
  numberOfEmployees: NumberRangeConfig;
}

export interface ContactConfig {
  count: number;
  accountRatio: NumberRangeConfig;
  titles: WeightedOption[];
  leadSources: WeightedOption[];
}

export interface OpportunityConfig {
  count: number;
  accountRatio: NumberRangeConfig;
  campaignAttachRate: number; // 0-1
  amount: NumberRangeConfig;
  stages: WeightedOption[];
  closeDate: DateRangeConfig;
}

export interface CampaignConfig {
  count: number;
  types: WeightedOption[];
  statuses: WeightedOption[];
  dateRange: DateRangeConfig;
  budgetedCost: NumberRangeConfig;
}

export interface CampaignMemberConfig {
  contactsPerCampaign: NumberRangeConfig;
  statuses: WeightedOption[];
}

export interface BackdatingConfig {
  enabled: boolean;
  createdDateRange?: DateRangeConfig;
}

export interface RunConfig {
  account: AccountConfig;
  contact: ContactConfig;
  opportunity: OpportunityConfig;
  campaign: CampaignConfig;
  campaignMember: CampaignMemberConfig;
  backdating: BackdatingConfig;
}

export type CreatedDateBackdatingStatus = "not_requested" | "applied" | "unsupported";

export type RunStatus = "running" | "completed" | "completed_with_errors" | "failed";

export interface StageErrorDetail {
  objectType: ObjectType;
  stage: ObjectType;
  recordIndex: number;
  errorCode?: string;
  errorMessage: string;
  payloadSnippet: string;
}

export interface StageSummary {
  objectType: ObjectType;
  requested: number;
  created: number;
  failed: number;
}

export interface RunSummary {
  version: string;
  createdDateBackdating: CreatedDateBackdatingStatus;
  stages: StageSummary[];
  errors: StageErrorDetail[];
  warnings: string[];
}
