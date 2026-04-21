'use strict';

function extractModelFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  return payload.model || payload.body?.model || '';
}

function createHistoryService(db) {
  async function saveCommunication(entry) {
    await db.query(
      `
      INSERT INTO ai_logs (timestamp, llm, request_json, response_json, proof)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
      `,
      [
        entry.timestamp || new Date().toISOString(),
        entry.llm,
        JSON.stringify(entry.request),
        JSON.stringify(entry.response),
        entry.proof || ''
      ]
    );
  }

  async function listHistory(limit = 50) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
    const result = await db.query(
      `
      SELECT id, timestamp, llm, request_json, response_json, proof
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
      proof: row.proof
    }));
  }

  return {
    extractModelFromPayload,
    listHistory,
    saveCommunication
  };
}

module.exports = {
  createHistoryService
};
