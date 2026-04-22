'use strict';

const { buildDefaultConfig } = require('../config/env');
const { inferProviderFromBaseUrl, normalizeProvider, providerPresets } = require('../config/providers');
const { decryptSecret, encryptSecret } = require('../lib/crypto');

function sanitizeConfig(input) {
  const provider = normalizeProvider(input.provider) || inferProviderFromBaseUrl(input.baseUrl) || 'openai';
  const preset = providerPresets[provider] || providerPresets.openai;
  const baseUrl = typeof input.baseUrl === 'string' && input.baseUrl.trim()
    ? input.baseUrl.trim()
    : preset.baseUrl;
  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
  const anthropicVersion = typeof input.anthropicVersion === 'string' && input.anthropicVersion.trim()
    ? input.anthropicVersion.trim()
    : providerPresets.anthropic.anthropicVersion;
  const defaultModel = typeof input.defaultModel === 'string' ? input.defaultModel.trim() : '';
  const stampLogs = Boolean(input.stampLogs);
  const cloudStorageLogs = Boolean(input.cloudStorageLogs);
  const notarizeLogs = Boolean(input.notarizeLogs);
  const integritasApiKey = typeof input.integritasApiKey === 'string' ? input.integritasApiKey.trim() : '';
  const integritasApiKeyEncrypted = typeof input.integritasApiKeyEncrypted === 'string'
    ? input.integritasApiKeyEncrypted
    : '';

  new URL(baseUrl);

  return {
    provider,
    baseUrl,
    apiKey,
    anthropicVersion,
    defaultModel,
    stampLogs,
    cloudStorageLogs,
    notarizeLogs,
    integritasApiKey,
    integritasApiKeyEncrypted: integritasApiKey
      ? encryptSecret(integritasApiKey)
      : (stampLogs ? integritasApiKeyEncrypted : '')
  };
}

function maskSecret(value) {
  if (!value) {
    return '';
  }

  if (value.length <= 8) {
    return '********';
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function fromRow(row) {
  return {
    provider: row.provider,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    anthropicVersion: row.anthropic_version,
    defaultModel: row.default_model,
    stampLogs: row.stamp_logs,
    cloudStorageLogs: row.cloud_storage_logs,
    notarizeLogs: row.notarize_logs,
    integritasApiKeyEncrypted: row.integritas_api_key_encrypted,
    integritasApiKey: decryptSecret(row.integritas_api_key_encrypted)
  };
}

function createConfigService(db) {
  async function getResolvedConfig() {
    const result = await db.query('SELECT * FROM proxy_config WHERE id = 1');
    if (!result.rows[0]) {
      return sanitizeConfig(buildDefaultConfig());
    }
    return sanitizeConfig(fromRow(result.rows[0]));
  }

  async function saveConfig(nextConfig) {
    const current = await getResolvedConfig();
    const sanitized = sanitizeConfig({
      ...current,
      ...nextConfig
    });

    await db.query(
      `
      UPDATE proxy_config
      SET provider = $1,
          base_url = $2,
          api_key = $3,
          anthropic_version = $4,
          default_model = $5,
          stamp_logs = $6,
          cloud_storage_logs = $7,
          notarize_logs = $8,
          integritas_api_key_encrypted = $9,
          updated_at = NOW()
      WHERE id = 1
      `,
      [
        sanitized.provider,
        sanitized.baseUrl,
        sanitized.apiKey,
        sanitized.anthropicVersion,
        sanitized.defaultModel,
        sanitized.stampLogs,
        sanitized.cloudStorageLogs,
        sanitized.notarizeLogs,
        sanitized.integritasApiKeyEncrypted
      ]
    );

    return sanitized;
  }

  async function getPublicConfig() {
    const config = await getResolvedConfig();
    return {
      provider: config.provider,
      providerLabel: providerPresets[config.provider]?.label || config.provider,
      baseUrl: config.baseUrl,
      anthropicVersion: config.anthropicVersion,
      defaultModel: config.defaultModel,
      apiKeyConfigured: Boolean(config.apiKey),
      apiKeyPreview: config.apiKey ? maskSecret(config.apiKey) : '',
      stampLogs: config.stampLogs,
      cloudStorageLogs: config.cloudStorageLogs,
      notarizeLogs: config.notarizeLogs,
      integritasApiKeyConfigured: Boolean(config.integritasApiKey),
      integritasApiKeyPreview: config.integritasApiKey ? maskSecret(config.integritasApiKey) : ''
    };
  }

  return {
    getPublicConfig,
    getResolvedConfig,
    providerPresets,
    saveConfig
  };
}

module.exports = {
  createConfigService
};
