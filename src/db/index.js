'use strict';

const { Pool } = require('pg');
const { buildDefaultConfig, getDatabaseUrl } = require('../config/env');

const schemaSql = `
CREATE TABLE IF NOT EXISTS proxy_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT '',
  anthropic_version TEXT NOT NULL,
  default_model TEXT NOT NULL DEFAULT '',
  stamp_logs BOOLEAN NOT NULL DEFAULT FALSE,
  cloud_storage_logs BOOLEAN NOT NULL DEFAULT FALSE,
  notarize_logs BOOLEAN NOT NULL DEFAULT FALSE,
  integritas_api_key_encrypted TEXT NOT NULL DEFAULT '',
  integritas_base_url TEXT NOT NULL DEFAULT 'https://integritas.technology/core',
  storage_base_url TEXT NOT NULL DEFAULT 'https://integritas.technology/core',
  notary_base_url TEXT NOT NULL DEFAULT 'https://integritas.technology/core',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  llm TEXT NOT NULL,
  request_json JSONB NOT NULL,
  response_json JSONB NOT NULL,
  proof_uid TEXT NOT NULL DEFAULT '',
  proof_status BOOLEAN NOT NULL DEFAULT FALSE,
  proof_error TEXT NOT NULL DEFAULT '',
  proof TEXT NOT NULL DEFAULT ''
);
`;

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: getDatabaseUrl()
  });

  await pool.query(schemaSql);
  await pool.query('ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS stamp_logs BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS cloud_storage_logs BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS notarize_logs BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS integritas_api_key_encrypted TEXT NOT NULL DEFAULT \'\'');
  await pool.query('ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS integritas_base_url TEXT NOT NULL DEFAULT \'https://integritas.technology/core\'');
  await pool.query('ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS storage_base_url TEXT NOT NULL DEFAULT \'https://integritas.technology/core\'');
  await pool.query('ALTER TABLE proxy_config ADD COLUMN IF NOT EXISTS notary_base_url TEXT NOT NULL DEFAULT \'https://integritas.technology/core\'');
  await pool.query('ALTER TABLE proxy_config ALTER COLUMN integritas_base_url SET DEFAULT \'https://integritas.technology/core\'');
  await pool.query('ALTER TABLE proxy_config ALTER COLUMN storage_base_url SET DEFAULT \'https://integritas.technology/core\'');
  await pool.query('ALTER TABLE proxy_config ALTER COLUMN notary_base_url SET DEFAULT \'https://integritas.technology/core\'');
  await pool.query('UPDATE proxy_config SET integritas_base_url = $1 WHERE integritas_base_url = $2', ['https://integritas.technology/core', 'https://integritas.technology']);
  await pool.query('UPDATE proxy_config SET storage_base_url = $1 WHERE storage_base_url = $2', ['https://integritas.technology/core', 'https://integritas.technology']);
  await pool.query('UPDATE proxy_config SET notary_base_url = $1 WHERE notary_base_url = $2', ['https://integritas.technology/core', 'https://integritas.technology']);
  await pool.query('ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS proof_uid TEXT NOT NULL DEFAULT \'\'');
  await pool.query('ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS proof_status BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS proof_error TEXT NOT NULL DEFAULT \'\'');

  const defaults = buildDefaultConfig();
  await pool.query(
    `
    INSERT INTO proxy_config (id, provider, base_url, api_key, anthropic_version, default_model, stamp_logs, cloud_storage_logs, notarize_logs, integritas_api_key_encrypted, integritas_base_url, storage_base_url, notary_base_url)
    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      defaults.provider,
      defaults.baseUrl,
      defaults.apiKey,
      defaults.anthropicVersion,
      defaults.defaultModel,
      defaults.stampLogs,
      defaults.cloudStorageLogs,
      defaults.notarizeLogs,
      defaults.integritasApiKeyEncrypted,
      defaults.integritasBaseUrl,
      defaults.storageBaseUrl,
      defaults.notaryBaseUrl
    ]
  );

  return pool;
}

module.exports = {
  initializeDatabase
};
