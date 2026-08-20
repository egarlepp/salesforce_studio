import "express-session";

declare module "express-session" {
  interface SessionData {
    sf?: {
      accessToken: string;
      refreshToken?: string;
      instanceUrl: string;
      userId: string;
      organizationId: string;
      username: string;
    };
  }
}
