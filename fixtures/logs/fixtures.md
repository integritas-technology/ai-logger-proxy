# Log Fixtures

These files mirror the payloads passed to `logEvent(...)` in `src/server.js`.

- `incoming_request.json`: client request received by the proxy
- `outgoing_request.json`: upstream request sent by the proxy
- `incoming_response.json`: upstream response returned through the proxy
- `incoming_response_error.json`: error while reading the upstream response stream

Notes:

- A `GET` request will typically have an empty `body` field because there is no request payload.
- `proxy.on('error')` currently returns a JSON error response to the client but does not emit a dedicated log event payload, so there is no fixture file for it.
