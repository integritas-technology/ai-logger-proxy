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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  llm TEXT NOT NULL,
  request_json JSONB NOT NULL,
  response_json JSONB NOT NULL,
  proof TEXT NOT NULL DEFAULT ''
);
`;

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: getDatabaseUrl()
  });

  await pool.query(schemaSql);

  const defaults = buildDefaultConfig();
  await pool.query(
    `
    INSERT INTO proxy_config (id, provider, base_url, api_key, anthropic_version, default_model)
    VALUES (1, $1, $2, $3, $4, $5)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      defaults.provider,
      defaults.baseUrl,
      defaults.apiKey,
      defaults.anthropicVersion,
      defaults.defaultModel
    ]
  );

  return pool;
}

module.exports = {
  initializeDatabase
};
