// A small host app for the connector E2E tests: creates a HubConnector from the PROBEX_* environment variables and
// connects. It is started as a child process by run-app.ts, so the connector runs with a real event loop and exit.
//
// Each status change is written to stdout as `{"status":"<status>"}`. With `E2E_HOLD_UNTIL=<status>` the app keeps
// itself alive until that status is reported; otherwise nothing but the connector could keep it alive.

import { HubConnector } from "../../../src/connector/index.js";

const holdUntil = process.env.E2E_HOLD_UNTIL;
const hold = holdUntil === undefined ? undefined : setInterval(() => undefined, 60_000);

const connector = new HubConnector();
connector.onStatus((status) => {
  process.stdout.write(`${JSON.stringify({ status })}\n`);
  if (status === holdUntil) {
    clearInterval(hold);
  }
});
connector.connect();
