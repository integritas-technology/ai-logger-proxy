# AI Logger Proxy capabilities and user stories

**Status:** Draft for scope review and sign-off  
**Application version:** 1.0.1  
**Review date:** 19 October 2026

## Purpose and scope

AI Logger Proxy lets a user route supported AI requests through one locally operated application, record the exchanges, inspect what was sent and received, and download individual logs. Users can optionally request timestamp proofs through Integritas and obtain verification reports for available proofs.

The intended outcome is visibility into AI communication from existing tools. Users continue working in their AI client; this application supplies connection settings, logging, inspection, and proof workflows through a browser interface.

This document describes the current implementation and provides scenarios for acceptance review. It is based on the application code; the scenarios are acceptance criteria to demonstrate, not a record of completed live testing. Approval confirms the agreed feature scope. Additional requirements can be recorded in the review section below.

## Who can use it and what they need

The current application has one shared configuration and history for each installation. A person with access to its interface can configure the connection and review stored traffic. There are no separate administrator, user, or reviewer accounts.

An operator needs Docker and Docker Compose to start the supplied application and PostgreSQL database. A user needs a browser, access to an upstream AI provider, appropriate provider credentials, and an AI client that can use a custom API base URL. Proof stamping and verification additionally require an Integritas API key and access to the configured Integritas service.

The standard browser address and proxy base URL are `http://localhost:3334`. Logs and settings remain in the database across normal restarts when its persistent volume is retained.

## Current user capabilities

| Area                             | What a user can do                                                                                                                                                                                                                                                                              | Conditions and boundaries                                                                                                                                                                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configure an AI connection       | Choose OpenAI, Anthropic Claude, or OpenRouter; enter a provider API key; change the upstream base URL; and set the Anthropic API version where applicable.                                                                                                                                     | One provider configuration is active for the installation. Custom endpoints must support the selected provider's API format.                                                                                                                                                                                                                       |
| Choose a model                   | Refresh the provider's model list, select a default model, enter a custom model identifier, or leave the default unset.                                                                                                                                                                         | The proxy supplies the default only when a JSON request omits its model. It preserves a model explicitly supplied by the client.                                                                                                                                                                                                                   |
| Save and change settings         | Save settings through the browser and apply them to subsequent requests without restarting the application. View a configuration snapshot with masked key previews.                                                                                                                             | Leaving an API key field blank retains the saved key. Model availability and credential validity depend on the provider.                                                                                                                                                                                                                           |
| Test the connection              | Run a predefined live inference using the saved provider settings, see success or failure, and open the request and response bodies. View the timestamp, provider, model, and initial proof state.                                                                                              | This makes a real provider request and may incur provider charges. The test prompt is fixed; the page is not a general chat interface. Tests with an upstream HTTP response are saved to history.                                                                                                                                                  |
| Connect an existing AI tool      | Read setup examples for Codex, OpenCode Desktop, and other clients, then point a compatible client at the proxy. The OpenCode example uses the saved provider's API adapter and exact default model ID, including OpenRouter free model suffixes, and selects that model as the client default. | Save a model before generating the OpenCode example. After changing saved settings, reopen Connect and update the client manually. Client credentials take precedence over the proxy's saved key. The client must send routes and payloads compatible with the chosen provider. Setup examples do not guarantee every client or version will work. |
| Forward AI traffic               | Send supported HTTP API traffic through the proxy and receive the upstream response, including streamed response chunks. Common routes include chat completions, responses, messages, and models.                                                                                               | The proxy does not translate between OpenAI and Anthropic message formats. Switching providers may require changing the client's model and request format.                                                                                                                                                                                         |
| Inspect saved exchanges          | Open History, refresh records, see timestamp, provider, model where available, and proof state, and open individual request and response bodies.                                                                                                                                                | Records are shown newest first. Streamed responses appear as captured stream text rather than a reconstructed conversation.                                                                                                                                                                                                                        |
| Find recent exchanges            | Search request and response body text, apply from/to date filters, combine the filters, and clear them.                                                                                                                                                                                         | Filtering operates on the latest 50 records loaded by the page. There is no browser pagination or search across the complete archive.                                                                                                                                                                                                              |
| Download a log                   | Use **Create file** to download one exchange as a JSON file containing its ID, timestamp, model identifier, request, and response.                                                                                                                                                              | The export includes stored request and response metadata. It does not include the timestamp proof or a verification report.                                                                                                                                                                                                                        |
| Request timestamp proofs         | Enable **I want to stamp my logs**, enter an Integritas API key, and choose the stamping and verification service endpoint. New saved exchanges then trigger stamping requests.                                                                                                                 | The application sends a hash of the generated log file content for stamping. Stamping is optional and depends on the external service. There is no UI action to stamp historical records retroactively.                                                                                                                                            |
| Track proof availability         | See **N/A**, **Pending**, **Failed**, or a **Verify** action in History. Refresh History to see updated states.                                                                                                                                                                                 | The server checks pending proofs at startup and approximately every three minutes. A **Verify** button means a proof has been obtained; it does not mean the user has already run verification.                                                                                                                                                    |
| Verify proofs and obtain reports | Verify one available proof, select rows and use **Verify selected**, or use **Verify all** for eligible rows in the current filtered view. Open the report download URL returned by Integritas.                                                                                                 | Pending and failed proofs are excluded. **Verify all** does not cover the full database. A report is available only when the external service returns its download URL.                                                                                                                                                                            |

## End to end user stories

### Story 1 Set up the application and confirm the connection

**As an operator, I want to configure and test an AI provider so that users can start sending traffic through the application.**

1. Start the supplied stack with `docker compose up -d --build` and open the application.
2. Open **Config**, choose a provider, and enter the provider API key.
3. Refresh models and select a model, or enter a custom model identifier.
4. Save the configuration.
5. Open **Testing** and choose **Run provider test**.
6. Inspect the request and response bodies, then open **History** to find the saved exchange.

**Acceptance criteria:** With valid provider settings and an available model, the test reports success, displays the response and metadata, and appears in History. Settings remain available after a normal application restart with the database volume retained. If the provider returns an HTTP error, the test reports failure and its exchange can be inspected in History.

### Story 2 Use an existing AI tool and review its communication

**As an AI tool user, I want my requests and responses recorded so that I can review what my tool exchanged with the provider.**

1. Start with a configured, successfully tested provider.
2. Open **Setup** and follow the example relevant to the AI client.
3. Configure the client to use the local proxy URL and a model and API format supported by the selected provider.
4. Submit a normal task in the client and receive the provider's response.
5. Open **History**, refresh it, and locate the exchange.
6. Open the request and response bodies to inspect the captured content.

**Acceptance criteria:** A compatible request receives its upstream response and, when database saving succeeds, becomes available in History after completion. The stored exchange shows the provider and captured bodies. A model explicitly provided by the client is preserved; the configured fallback applies when an eligible JSON request omits it.

### Story 3 Investigate and share a recent exchange

**As a reviewer, I want to find and export a recent exchange so that I can share the exact stored record for investigation.**

1. Open **History** and refresh the latest records.
2. Enter a distinctive phrase from the request or response and optionally set a date range.
3. Choose **Search** and inspect the matching exchange's bodies.
4. Choose **Create file** for that row.
5. Open or share the downloaded JSON file through the organization's normal process.

**Acceptance criteria:** Results match the body text and date filters within the latest 50 loaded records. The downloaded file contains that exchange's ID, timestamp, model identifier, request, and response. Clearing filters restores the loaded list. If an older exchange is outside the loaded records, the browser cannot retrieve it through these filters.

### Story 4 Stamp a new exchange and obtain a proof report

**As a reviewer, I want a timestamp proof for a recorded exchange so that I can obtain an external verification report for its proof.**

1. Open **Config**, enable **I want to stamp my logs**, and enter a valid Integritas API key.
2. Confirm the stamping and verification endpoint and save the settings.
3. Run a provider test or submit a supported request from a connected client.
4. Open **History** and refresh to see the saved record's proof state.
5. Allow the external stamping process and background status checks to complete, refreshing History as needed.
6. When **Verify** becomes available, select it and open the returned report link.
7. Download the row's JSON file separately if the log contents are also needed.

**Acceptance criteria:** A successful stamp request moves the new record into a pending state. Once the service returns an on-chain proof, **Verify** becomes available. A successful verification response with a report URL opens the report. Stamping errors are reflected on the history row, and verification errors are shown in the page status.

**Proof boundary:** Verification submits the stored proof to Integritas. The application does not recompute the current log's hash and compare it with the stamped value during verification. A report must not be treated as an application-performed check that the current database row or an exported file is unchanged, or that the AI response is accurate.

### Story 5 Obtain a report for several exchanges

**As a reviewer, I want to verify a group of available proofs together so that I can request a report covering a chosen set of exchanges.**

1. Open **History** and filter the loaded records to the relevant exchanges.
2. Select specific rows to use **Verify selected**, or leave rows unselected to use **Verify all** on the filtered view.
3. Run verification and open the report link returned by Integritas.

**Acceptance criteria:** The request includes available proofs from the selected visible rows, or from the filtered visible rows when none are selected. Rows without available proofs are skipped. The action is disabled if there are no eligible rows. It does not silently extend to records outside the loaded view.

### Story 6 Change the provider for subsequent work

**As an operator, I want to change the active provider so that subsequent work uses a different AI service while earlier records remain available.**

1. Open **Config**, select another provider, and enter its credentials and a compatible model.
2. Save the settings and run a provider test.
3. Update the AI client's model or request format if the new provider requires it.
4. Submit a new task through the same local proxy address.
5. Open **History** and inspect records from before and after the change.

**Acceptance criteria:** New requests use the saved provider without restarting the proxy. Earlier logs retain their original captured provider and content. Switching between OpenAI-style and Anthropic-style APIs requires a compatible client configuration; the proxy supplies no format conversion or automatic provider failover.

## Capabilities outside the current scope

The following items are useful scope decisions, but are not available as completed user workflows:

| Area                                  | Current boundary                                                                                                                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud log storage                     | The option is visible but disabled. Logs are stored in the installation's PostgreSQL database. Saving a cloud service URL does not enable cloud storage.                                                                                                                     |
| Log notarization                      | The option is visible but disabled. Timestamp stamping is available separately; saving a notary service URL does not enable notarization.                                                                                                                                    |
| Accounts and access control           | No login, user roles, per-user history, or separate permissions for configuration and review. The supplied Docker ports are published without an explicit localhost-only binding.                                                                                            |
| Complete archive management           | No browser pagination, full-archive search, bulk log export, log deletion, retention settings, or backup/restore workflow.                                                                                                                                                   |
| Guaranteed capture                    | Logging is not a delivery guarantee. Some connection failures before an upstream response are not saved to History; a database save failure can occur after the client receives a response. WebSocket traffic is forwarded without recording individual messages in History. |
| Proof recovery and content comparison | No manual retry or retroactive stamping workflow, file upload for verification, or comparison of current log contents against the stamped hash during verification.                                                                                                          |
| Privacy controls                      | Selected sensitive headers are redacted in stored records and console logs. Request and response bodies are retained without automatic content redaction. The saved Integritas key is encrypted; the provider API key is stored as plain text in the database.               |
| Usage and operational reporting       | No cost dashboard, usage summaries, budgets, alerts, automatic provider failover, or service-level reporting.                                                                                                                                                                |
