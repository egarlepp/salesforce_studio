import { faker } from "@faker-js/faker";
import type {
  AccountConfig,
  CampaignConfig,
  CampaignMemberConfig,
  ContactConfig,
  DateRangeConfig,
  NumberRangeConfig,
  OpportunityConfig,
  WeightedOption,
} from "./types";

export function pickWeighted(options: WeightedOption[]): string {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option.value;
  }
  return options[options.length - 1].value;
}

export function randomIntInRange(range: NumberRangeConfig): number {
  return Math.round(range.min + Math.random() * (range.max - range.min));
}

export function randomFloatInRange(range: NumberRangeConfig, decimals = 2): number {
  const value = range.min + Math.random() * (range.max - range.min);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Returns a random Salesforce-format date string (YYYY-MM-DD) within the range, inclusive. */
export function randomDateInRange(range: DateRangeConfig): string {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();
  const t = start + Math.random() * Math.max(0, end - start);
  return new Date(t).toISOString().slice(0, 10);
}

export function generateAccountFields(cfg: AccountConfig): Record<string, unknown> {
  return {
    Name: faker.company.name(),
    Industry: pickWeighted(cfg.industries),
    BillingCity: faker.location.city(),
    BillingState: faker.location.state(),
    BillingCountry: faker.location.country(),
    Phone: faker.phone.number(),
    AnnualRevenue: randomFloatInRange(cfg.annualRevenue),
    NumberOfEmployees: randomIntInRange(cfg.numberOfEmployees),
  };
}

export function generateContactFields(cfg: ContactConfig, accountId: string): Record<string, unknown> {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    FirstName: firstName,
    LastName: lastName,
    Email: faker.internet.email({ firstName, lastName }),
    Phone: faker.phone.number(),
    Title: pickWeighted(cfg.titles),
    LeadSource: pickWeighted(cfg.leadSources),
    AccountId: accountId,
  };
}

export function generateOpportunityFields(
  cfg: OpportunityConfig,
  accountId: string,
  campaignId: string | undefined
): Record<string, unknown> {
  return {
    Name: `${faker.company.buzzPhrase()} Opportunity`,
    AccountId: accountId,
    Amount: randomFloatInRange(cfg.amount),
    StageName: pickWeighted(cfg.stages),
    CloseDate: randomDateInRange(cfg.closeDate),
    ...(campaignId ? { CampaignId: campaignId } : {}),
  };
}

export function generateCampaignFields(cfg: CampaignConfig): Record<string, unknown> {
  const startDate = randomDateInRange(cfg.dateRange);
  const start = new Date(startDate).getTime();
  const end = new Date(cfg.dateRange.end).getTime();
  const endDate = new Date(start + Math.random() * Math.max(0, end - start)).toISOString().slice(0, 10);
  return {
    Name: `${faker.company.buzzNoun()} ${pickWeighted(cfg.types)} Campaign`,
    Type: pickWeighted(cfg.types),
    Status: pickWeighted(cfg.statuses),
    StartDate: startDate,
    EndDate: endDate,
    BudgetedCost: randomFloatInRange(cfg.budgetedCost),
  };
}

export function generateCampaignMemberFields(
  cfg: CampaignMemberConfig,
  campaignId: string,
  contactId: string
): Record<string, unknown> {
  return {
    CampaignId: campaignId,
    ContactId: contactId,
    Status: pickWeighted(cfg.statuses),
  };
}
