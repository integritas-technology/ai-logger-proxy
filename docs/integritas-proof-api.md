# Integritas Stamping and Verification API Guide

This guide describes how another application can stamp and verify documents with Integritas in the same way this app does it. The document input is intentionally dynamic: the caller can stamp any file, JSON object, database row, transcript, message bundle, invoice, or other domain record as long as it first converts that input into deterministic bytes and hashes those bytes.

## Configuration

Use these runtime settings:

- `integritasBaseUrl`: defaults to `https://integritas.technology/core`
- `integritasApiKey`: Integritas API key, sent in the `x-api-key` header
- `requestId`: any short app identifier for tracing, sent in `x-request-id`

This app uses:

```text
integritasBaseUrl = https://integritas.technology/core
x-request-id = ai-logger
```

## Core Model

Integritas receives and timestamps a hash, not the raw document.

The application must keep enough local metadata to rebuild the exact same hash later. For fully dynamic inputs, treat the stamped subject as:

```json
{
  "contentType": "application/json",
  "canonicalization": "your-app-specific-canonical-format-v1",
  "bytes": "<the exact bytes used for hashing>"
}
```

Store the following local state for every stamped document:

- `documentId`: local identifier
- `hash`: SHA3-256 hex digest of the canonical bytes
- `proofUid`: UID returned by Integritas after the stamp request
- `proofStatus`: pending, ready, or failed
- `proof`: the proof payload returned by the status endpoint
- `proofError`: any error from stamping or polling
- `canonicalization`: the versioned rule used to create the bytes

## 1. Canonicalize the Input

The caller can accept any input shape, but it must convert that input to stable bytes before hashing.

Recommended rules:

- For files: hash the exact file bytes.
- For text: hash UTF-8 bytes, with a clearly defined newline policy.
- For JSON or objects: use canonical JSON with stable key ordering, stable timestamp formatting, and no runtime-only fields unless they are intentionally part of the document.
- For database rows: build an explicit object with only the fields that should be proved, then serialize it with a versioned canonicalization rule.

This app's AI log canonicalization is:

```js
const canonicalObject = {
  id: row.id,
  timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
  llm: row.llm,
  request: row.request,
  response: row.response
};

const bytesToHash = `${JSON.stringify(canonicalObject, null, 2)}\n`;
```

For a new app, do not copy the AI-log fields unless they match the use case. Copy the pattern: build the exact document representation, serialize deterministically, hash that, and store the serialization rule.

## 2. Hash the Canonical Bytes

Use SHA3-256 and encode the digest as lowercase hex.

Node.js example:

```js
const crypto = require("crypto");

function sha3HashHex(bytesOrString) {
  return crypto
    .createHash("sha3-256")
    .update(bytesOrString)
    .digest("hex");
}
```

Use a small parser helper for Integritas responses because verification responses may not always be JSON:

```js
function parseResponseBody(responseText) {
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}
```

## 3. Request a Timestamp UID

Call:

```text
POST {integritasBaseUrl}/v1/timestamp/post
```

Headers:

```text
Content-Type: application/json
x-request-id: <your-app-id>
x-api-key: <integritas-api-key>
```

Body:

```json
{
  "hash": "<sha3-256-hex-digest>"
}
```

Successful response shape used by this app:

```json
{
  "data": {
    "uid": "<proof-uid>"
  }
}
```

Persist `data.uid` as `proofUid` and mark the document proof as pending.

Example:

```js
async function requestProofUid({ baseUrl, apiKey, requestId, hash }) {
  const response = await fetch(`${baseUrl}/v1/timestamp/post`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": requestId,
      "x-api-key": apiKey
    },
    body: JSON.stringify({ hash })
  });

  const responseText = await response.text();
  const parsed = parseResponseBody(responseText);

  if (!response.ok) {
    const error = new Error(`Integritas stamp failed with status ${response.status}`);
    error.statusCode = response.status;
    error.responseBody = responseText;
    throw error;
  }

  return parsed?.data?.uid || "";
}
```

## 4. Poll Timestamp Status

Timestamping is asynchronous. Poll pending UIDs until Integritas returns an on-chain proof. This app polls every three minutes, but another app can choose a cadence that fits its workload.

Call:

```text
POST {integritasBaseUrl}/v1/timestamp/status
```

Headers:

```text
Content-Type: application/json
x-request-id: <your-app-id>
x-api-key: <integritas-api-key>
```

Body:

```json
{
  "uids": ["<proof-uid-1>", "<proof-uid-2>"]
}
```

Successful response shape used by this app:

```json
{
  "data": [
    {
      "uid": "<proof-uid>",
      "onchain": true,
      "address": "<chain-or-contract-address>",
      "data": "<timestamped-hash-or-proof-data>",
      "proof": "<proof-data>",
      "root": "<merkle-root>"
    }
  ]
}
```

Failure indicators handled by this app:

- `proof` equals `[ERROR]`
- `status` equals `false`
- `error` is present

When `onchain` is true, store the proof payload exactly in this array format:

```json
[
  {
    "address": "<address>",
    "data": "<data>",
    "proof": "<proof>",
    "root": "<root>"
  }
]
```

That stored array is the verification input.

Example:

```js
async function pollProofStatus({ baseUrl, apiKey, requestId, uids }) {
  const response = await fetch(`${baseUrl}/v1/timestamp/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": requestId,
      "x-api-key": apiKey
    },
    body: JSON.stringify({ uids })
  });

  const responseText = await response.text();
  const parsed = parseResponseBody(responseText);

  if (!response.ok) {
    const error = new Error(`Integritas status check failed with status ${response.status}`);
    error.statusCode = response.status;
    error.responseBody = responseText;
    throw error;
  }

  return Array.isArray(parsed?.data) ? parsed.data : [];
}

function proofPayloadFromStatusItem(item) {
  if (!item || !item.uid) {
    return null;
  }

  if (item.proof === "[ERROR]" || item.status === false || item.error) {
    throw new Error(item.error || `Integritas proof failed for uid ${item.uid}`);
  }

  if (!item.onchain) {
    return null;
  }

  return [
    {
      address: item.address || "",
      data: item.data || "",
      proof: item.proof || "",
      root: item.root || ""
    }
  ];
}
```

## 5. Verify a Stored Proof

Call:

```text
POST {integritasBaseUrl}/v1/verify/post-lite-pdf
```

Headers:

```text
Content-Type: application/json
x-request-id: <your-app-id>
x-report-required: true
x-api-key: <integritas-api-key>
```

Body:

```json
[
  {
    "address": "<address>",
    "data": "<data>",
    "proof": "<proof>",
    "root": "<root>"
  }
]
```

The body can contain one proof payload object or many proof payload objects. This app uses the same endpoint for a single row and for "verify all" bulk verification.

The response is returned directly to the caller by this app. It may be JSON or text, so parse defensively.

Example:

```js
async function verifyProof({ baseUrl, apiKey, requestId, proofPayload }) {
  if (!Array.isArray(proofPayload) || proofPayload.length === 0) {
    throw new Error("No proof payload was provided.");
  }

  const response = await fetch(`${baseUrl}/v1/verify/post-lite-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": requestId,
      "x-report-required": "true",
      "x-api-key": apiKey
    },
    body: JSON.stringify(proofPayload)
  });

  const responseText = await response.text();
  const parsed = parseResponseBody(responseText);

  if (!response.ok) {
    const error = new Error(`Integritas verification failed with status ${response.status}`);
    error.statusCode = response.status;
    error.responseBody = responseText;
    throw error;
  }

  return parsed;
}
```

## End-to-End Dynamic Flow

```js
async function stampDocument({
  baseUrl = "https://integritas.technology/core",
  apiKey,
  requestId = "my-app",
  canonicalBytes
}) {
  const hash = sha3HashHex(canonicalBytes);
  const proofUid = await requestProofUid({ baseUrl, apiKey, requestId, hash });

  return {
    hash,
    proofUid,
    proofStatus: "pending",
    proof: null
  };
}

async function refreshPendingProofs({
  baseUrl = "https://integritas.technology/core",
  apiKey,
  requestId = "my-app",
  pendingRecords
}) {
  const uids = [...new Set(pendingRecords.map((record) => record.proofUid).filter(Boolean))];
  const statusItems = await pollProofStatus({ baseUrl, apiKey, requestId, uids });

  return statusItems.map((item) => ({
    uid: item.uid,
    proofPayload: proofPayloadFromStatusItem(item)
  }));
}

async function verifyDocument({
  baseUrl = "https://integritas.technology/core",
  apiKey,
  requestId = "my-app",
  canonicalBytes,
  storedHash,
  proofPayload
}) {
  const currentHash = sha3HashHex(canonicalBytes);

  if (currentHash !== storedHash) {
    throw new Error("The current document bytes do not match the stamped hash.");
  }

  return verifyProof({ baseUrl, apiKey, requestId, proofPayload });
}
```

## Implementation Notes

- The proof proves the hash. The application is responsible for proving that the hash belongs to the current document by rebuilding the same canonical bytes and comparing the current hash with the stored stamped hash.
- Keep canonicalization versioned. If the document format changes, old documents must still be hashable with their original rule.
- Keep proof payloads as structured JSON arrays, not display strings.
- Do not mark a proof as ready until the status item has `onchain: true`.
- Treat Integritas non-2xx responses as failed API calls and persist the response body for diagnostics.
- Never expose the Integritas API key in client-side code. Route these calls through a trusted backend.
