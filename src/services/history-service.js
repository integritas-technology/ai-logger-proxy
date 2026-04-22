'use strict';

function extractModelFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  return payload.model || payload.body?.model || '';
}

function createHistoryService(db, initialProofService) {
  let proofService = initialProofService || null;

  async function saveCommunication(entry) {
    const result = await db.query(
      `
      INSERT INTO ai_logs (timestamp, llm, request_json, response_json, proof_uid, proof_status, proof_error, proof)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)
      RETURNING id, timestamp, llm, request_json, response_json, proof_uid, proof_status, proof_error, proof
      `,
      [
        entry.timestamp || new Date().toISOString(),
        entry.llm,
        JSON.stringify(entry.request),
        JSON.stringify(entry.response),
        entry.proofUid || '',
        Boolean(entry.proofStatus),
        entry.proofError || '',
        entry.proof || ''
      ]
    );

    const savedRow = {
      id: result.rows[0].id,
      timestamp: result.rows[0].timestamp,
      llm: result.rows[0].llm,
      request: result.rows[0].request_json,
      response: result.rows[0].response_json,
      proofUid: result.rows[0].proof_uid,
      proofStatus: result.rows[0].proof_status,
      proofError: result.rows[0].proof_error,
      proof: result.rows[0].proof
    };

    if (proofService) {
      const attemptProof = async () => {
        const proofUid = await proofService.requestProofUid(savedRow);
        if (!proofUid) {
          return savedRow;
        }

        await updateProofUid(savedRow.id, proofUid);
        return {
          ...savedRow,
          proofUid,
          proofStatus: false,
          proofError: ''
        };
      };

      if (entry.awaitProofAttempt) {
        try {
          return await attemptProof();
        } catch (error) {
          await updateProofError(savedRow.id, error.message);
          console.error(`Failed to create proof for row ${savedRow.id}: ${error.message}`);
          return {
            ...savedRow,
            proofError: error.message
          };
        }
      }

      attemptProof().catch((error) => {
        updateProofError(savedRow.id, error.message).catch(() => {});
        console.error(`Failed to create proof for row ${savedRow.id}: ${error.message}`);
      });
    }

    return savedRow;
  }

  async function listHistory(limit = 50) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
    const result = await db.query(
      `
      SELECT id, timestamp, llm, request_json, response_json, proof_uid, proof_status, proof_error, proof
      FROM ai_logs
      ORDER BY timestamp DESC, id DESC
      LIMIT $1
      `,
      [safeLimit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      llm: row.llm,
      request: row.request_json,
      response: row.response_json,
      proofUid: row.proof_uid,
      proofStatus: row.proof_status,
      proofError: row.proof_error,
      proof: row.proof
    }));
  }

  async function getHistoryRow(id) {
    const result = await db.query(
      `
      SELECT id, timestamp, llm, request_json, response_json, proof_uid, proof_status, proof_error, proof
      FROM ai_logs
      WHERE id = $1
      `,
      [id]
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      id: result.rows[0].id,
      timestamp: result.rows[0].timestamp,
      llm: result.rows[0].llm,
      request: result.rows[0].request_json,
      response: result.rows[0].response_json,
      proofUid: result.rows[0].proof_uid,
      proofStatus: result.rows[0].proof_status,
      proofError: result.rows[0].proof_error,
      proof: result.rows[0].proof
    };
  }

  async function updateProof(id, proof) {
    await db.query(
      `
      UPDATE ai_logs
      SET proof = $2,
          proof_status = TRUE,
          proof_error = ''
      WHERE id = $1
      `,
      [id, typeof proof === 'string' ? proof : JSON.stringify(proof)]
    );
  }

  async function updateProofUid(id, proofUid) {
    await db.query(
      `
      UPDATE ai_logs
      SET proof_uid = $2,
          proof_status = FALSE,
          proof_error = ''
      WHERE id = $1
      `,
      [id, proofUid]
    );
  }

  async function updateProofError(id, proofError) {
    await db.query(
      `
      UPDATE ai_logs
      SET proof_error = $2
      WHERE id = $1
      `,
      [id, proofError]
    );
  }

  async function listPendingProofRows() {
    const result = await db.query(
      `
      SELECT id, timestamp, llm, request_json, response_json, proof_uid, proof_status, proof_error, proof
      FROM ai_logs
      WHERE proof_uid <> ''
        AND proof_status = FALSE
      ORDER BY id ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      llm: row.llm,
      request: row.request_json,
      response: row.response_json,
      proofUid: row.proof_uid,
      proofStatus: row.proof_status,
      proofError: row.proof_error,
      proof: row.proof
    }));
  }

  return {
    extractModelFromPayload,
    getHistoryRow,
    listHistory,
    listPendingProofRows,
    saveCommunication,
    setProofService(nextProofService) {
      proofService = nextProofService;
    },
    updateProofError,
    updateProofUid,
    updateProof
  };
}

module.exports = {
  createHistoryService
};
