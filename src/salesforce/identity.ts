import type { Connection } from "jsforce";

export interface OrgIdentity {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  isSandbox: boolean;
  username: string;
  instanceUrl: string;
}

interface OrganizationRecord {
  Name: string;
  OrganizationType: string;
  IsSandbox: boolean;
}

export async function fetchOrgIdentity(
  conn: Connection,
  organizationId: string,
  username: string
): Promise<OrgIdentity> {
  const org = (await conn.sobject("Organization").retrieve(organizationId)) as unknown as OrganizationRecord;
  return {
    organizationId,
    organizationName: org.Name,
    organizationType: org.OrganizationType,
    isSandbox: org.IsSandbox,
    username,
    instanceUrl: conn.instanceUrl ?? "",
  };
}
