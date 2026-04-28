"use strict";

const { hashString } = require("../lib/crypto");
const { buildHistoryFileContent } = require("../lib/history-file");
const { getDebugMode } = require("../config/env");

const POLL_INTERVAL_MS = 3 * 60 * 1000;
const debugMode = getDebugMode();

function getIntegritasUrl(config, pathname) {
  return `${config.integritasBaseUrl}${pathname}`;
}

function logProofLifecycle(label, payload) {
  console.log(
    `[${new Date().toISOString()}] ${label} ${JSON.stringify(payload)}`,
  );
}

function logProofDebug(label, payload) {
  if (!debugMode) {
    return;
  }

  logProofLifecycle(label, payload);
}

function buildRowHash(row) {
  return hashString(buildHistoryFileContent(row));
}

function normalizeProofPayload(proof) {
  let proofPayload = proof;

  if (typeof proofPayload === "string") {
    try {
      proofPayload = JSON.parse(proofPayload);
    } catch {
      proofPayload = null;
    }
  }

  if (!Array.isArray(proofPayload) || !proofPayload.length) {
    return null;
  }

  return proofPayload;
}

function createProofService({ configService, historyService }) {
  let pollTimer = null;
  let pollInFlight = false;

  async function requestProofUid(row) {
    const config = await configService.getResolvedConfig();
    if (!config.stampLogs) {
      return "";
    }

    const hash = buildRowHash(row);
    const requestUrl = getIntegritasUrl(config, "/v1/timestamp/post");

    logProofLifecycle("proof_stamp_started", {
      rowId: row.id,
      target: requestUrl,
    });

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": "ai-logger",
        "x-api-key": config.integritasApiKey,
      },
      body: JSON.stringify({ hash }),
    });

    const responseText = await response.text();
    let parsed = null;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      logProofLifecycle("proof_stamp_error", {
        rowId: row.id,
        target: requestUrl,
        statusCode: response.status,
      });
      const error = new Error(
        `Proof stamp failed with status ${response.status}`,
      );
      error.statusCode = response.status;
      error.responseBody = responseText;
      throw error;
    }

    const proofUid = parsed?.data?.uid || "";
    logProofLifecycle("proof_stamp_completed", {
      rowId: row.id,
      target: requestUrl,
      proofUid,
    });

    return proofUid;
  }

  async function pollPendingProofs() {
    if (pollInFlight) {
      return;
    }

    pollInFlight = true;

    try {
      const config = await configService.getResolvedConfig();
      if (!config.integritasApiKey) {
        return;
      }

      const pendingRows = await historyService.listPendingProofRows();
      if (!pendingRows.length) {
        return;
      }

      const uids = Array.from(
        new Set(pendingRows.map((row) => row.proofUid).filter(Boolean)),
      );
      if (!uids.length) {
        return;
      }

      const requestUrl = getIntegritasUrl(config, "/v1/timestamp/status");
      logProofLifecycle("proof_status_poll_started", {
        count: uids.length,
        target: requestUrl,
      });

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "ai-logger",
          "x-api-key": config.integritasApiKey,
        },
        body: JSON.stringify({ uids }),
      });

      const responseText = await response.text();
      let parsed = null;

      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        logProofLifecycle("proof_status_poll_error", {
          target: requestUrl,
          statusCode: response.status,
        });
        logProofDebug("proof_status_poll_error_debug", {
          target: requestUrl,
          statusCode: response.status,
          response: parsed ?? responseText,
        });
        return;
      }

      const data = Array.isArray(parsed?.data) ? parsed.data : [];
      for (const item of data) {
        if (!item || !item.uid) {
          continue;
        }

        const matchingRows = pendingRows.filter(
          (row) => row.proofUid === item.uid,
        );

        if (item.proof === "[ERROR]" || item.status === false || item.error) {
          const proofError = item.error
            ? `Proof status failed for uid ${item.uid}: ${item.error}`
            : `Proof status failed for uid ${item.uid}`;
          for (const row of matchingRows) {
            await historyService.updateProofFailed(row.id, proofError);
          }

          logProofLifecycle("proof_status_poll_failed", {
            count: matchingRows.length,
            proofUid: item.uid,
            error: item.error || "",
            target: requestUrl,
          });
          logProofDebug("proof_status_poll_failed_debug", {
            proofUid: item.uid,
            target: requestUrl,
            response: item,
          });
          continue;
        }

        if (!item.onchain) {
          continue;
        }

        const proofPayload = [
          {
            address: item.address || "",
            data: item.data || "",
            proof: item.proof || "",
            root: item.root || "",
          },
        ];

        for (const row of matchingRows) {
          await historyService.updateProof(row.id, proofPayload);
        }
      }

      logProofLifecycle("proof_status_poll_completed", {
        count: data.length,
        target: requestUrl,
      });
      logProofDebug("proof_status_poll_completed_debug", {
        count: data.length,
        target: requestUrl,
        response: parsed ?? responseText,
      });
    } catch (error) {
      logProofLifecycle("proof_status_poll_error", {
        error: error.message,
      });
    } finally {
      pollInFlight = false;
    }
  }

  function startPolling() {
    if (pollTimer) {
      return;
    }

    pollTimer = setInterval(() => {
      pollPendingProofs().catch(() => {});
    }, POLL_INTERVAL_MS);

    pollPendingProofs().catch(() => {});
  }

  async function verifyRow(row) {
    const config = await configService.getResolvedConfig();
    if (!config.integritasApiKey) {
      const error = new Error("Integritas API key is not configured.");
      error.statusCode = 400;
      throw error;
    }

    if (!row.proofStatus || !row.proof) {
      const error = new Error("Proof is not available yet.");
      error.statusCode = 409;
      throw error;
    }

    const requestUrl = getIntegritasUrl(config, "/v1/verify/post-lite-pdf");
    const proofPayload = normalizeProofPayload(row.proof);

    if (!proofPayload) {
      const error = new Error("Stored proof is invalid.");
      error.statusCode = 400;
      throw error;
    }

    logProofLifecycle("proof_verify_started", {
      rowId: row.id,
      target: requestUrl,
    });

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": "ai-logger",
        "x-report-required": true,
        "x-api-key": config.integritasApiKey,
      },
      body: JSON.stringify(proofPayload),
    });

    const responseText = await response.text();

    let parsed = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = responseText;
    }

    if (!response.ok) {
      logProofLifecycle("proof_verify_error", {
        rowId: row.id,
        target: requestUrl,
        statusCode: response.status,
      });
      const error = new Error(
        `Proof verify failed with status ${response.status}`,
      );
      error.statusCode = response.status;
      error.responseBody = responseText;
      throw error;
    }

    logProofLifecycle("proof_verify_completed", {
      rowId: row.id,
      target: requestUrl,
    });

    return parsed;
  }

  async function verifyProofs(proofPayload, context = {}) {
    const config = await configService.getResolvedConfig();
    if (!config.integritasApiKey) {
      const error = new Error("Integritas API key is not configured.");
      error.statusCode = 400;
      throw error;
    }

    if (!Array.isArray(proofPayload) || !proofPayload.length) {
      const error = new Error("No valid proofs were provided.");
      error.statusCode = 400;
      throw error;
    }

    const requestUrl = getIntegritasUrl(config, "/v1/verify/post-lite-pdf");

    logProofLifecycle("proof_verify_started", {
      ...context,
      target: requestUrl,
      proofCount: proofPayload.length,
    });

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": "ai-logger",
        "x-report-required": true,
        "x-api-key": config.integritasApiKey,
      },
      body: JSON.stringify(proofPayload),
    });

    const responseText = await response.text();

    let parsed = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = responseText;
    }

    if (!response.ok) {
      logProofLifecycle("proof_verify_error", {
        ...context,
        target: requestUrl,
        proofCount: proofPayload.length,
        statusCode: response.status,
      });
      const error = new Error(
        `Proof verify failed with status ${response.status}`,
      );
      error.statusCode = response.status;
      error.responseBody = responseText;
      throw error;
    }

    logProofLifecycle("proof_verify_completed", {
      ...context,
      target: requestUrl,
      proofCount: proofPayload.length,
    });

    return parsed;
  }

  return {
    buildRowHash,
    normalizeProofPayload,
    requestProofUid,
    startPolling,
    verifyProofs,
    verifyRow,
  };
}

module.exports = {
  buildRowHash,
  createProofService,
};
