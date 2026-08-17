# Salesforce Studio

A local web app for generating configurable volumes of realistic, related test
data (Accounts, Contacts, Opportunities, Campaigns, Campaign Members) into a
Salesforce org, and cleaning it up again afterwards.

## Features

- Connects to any Salesforce org via OAuth 2.0 (production, sandbox, or a
  free Developer Edition org)
- Configure record counts (10–250 per object), field templates, picklist
  weights, and parent/child relationship ratios from a web UI
- Generates records with realistic relationships:
  - Contacts and Opportunities linked to Accounts
  - Opportunities optionally linked to a Campaign (Primary Campaign Source)
  - Campaign Members linking Contacts to Campaigns
- Business date fields (Close Date, Campaign Start/End Date) are configurable
  as absolute date ranges, so a run can be made to look like it happened in
  any target period
- Optional "Backdate Created Date" — attempts to set the real Salesforce
  `CreatedDate` audit field on new records (see [Backdating Created
  Date](#backdating-created-date) below)
- Tracks every run and every record it creates in a local SQLite database, so
  a run's records can be bulk-deleted from Salesforce later from the Run
  History view
- Partial-failure tolerant: a bad record in a batch doesn't block the rest

## Prerequisites

- Node.js 18+
- A Salesforce org you're allowed to write test data into (a free
  [Developer Edition](https://developer.salesforce.com/signup) org is a good
  choice for trying this out)

## 1. Create a Salesforce Connected App

1. In Salesforce Setup, go to **App Manager** → **New Connected App**.
2. Fill in the required Connected App name / API name / contact email.
3. Under **API (Enable OAuth Settings)**, check "Enable OAuth Settings".
4. Callback URL: `http://localhost:3000/oauth/callback` (or match whatever
   `PORT`/`SF_CALLBACK_URL` you configure below).
5. Selected OAuth Scopes: add "Manage user data via APIs (api)" and "Perform
   requests at any time (refresh_token, offline_access)".
6. Save. It can take a few minutes to become active.
7. Open the Connected App again and note the **Consumer Key** and **Consumer
   Secret**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `.env`:

- `SF_CLIENT_ID` / `SF_CLIENT_SECRET` — the Consumer Key/Secret from step 1
- `SF_LOGIN_URL` — `https://login.salesforce.com` for production/Developer
  Edition orgs, `https://test.salesforce.com` for sandboxes
- `SF_CALLBACK_URL` — must exactly match the Callback URL configured on the
  Connected App
- `SESSION_SECRET` — any random string, used to sign the session cookie

## 3. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click **Connect to Salesforce**, and log in.

## Backdating Created Date

Business date fields (like Opportunity Close Date) are ordinary writable
fields, so their date ranges are always fully configurable in the UI.

The `CreatedDate` field is different: it's a system audit field, and
Salesforce only allows the API to set it on insert if the connected user's
profile/permission set grants **"Set Audit Fields upon Record Creation"**
(sometimes shown as "Create audit field values"). This is off by default in
every edition, including Developer Edition — an admin has to grant it
explicitly:

1. In Setup, go to **Permission Sets** (or the user's Profile) → create or
   edit a permission set.
2. Under **System Permissions**, enable "Set Audit Fields upon Record
   Creation".
3. Assign the permission set to the user that authorizes this app's
   Connected App.

If you turn on "Backdate Created Date" in the Configuration screen but the
connected user doesn't have this permission, the app detects the failure on
the first batch, automatically retries without `CreatedDate`, and shows a
message in the run results explaining that records were created with today's
date instead. Business date fields you configured are unaffected either way.

## Cleaning up generated data

Every run is listed under **Run History** along with the Salesforce IDs it
created. Click **Delete Run Data** to bulk-delete those records from
Salesforce (in reverse dependency order) and mark the run as cleaned up
locally.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run build        # compile to dist/
npm test             # vitest unit tests (mocked Salesforce client, no live org needed)
```

There are no production safeguards baked into the app beyond showing you the
name and type of whichever org you're connected to before you generate data —
double-check the **Connect** screen before running a generation against an
org you care about.
