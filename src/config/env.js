'use strict';

const path = require('path');
const { providerPresets } = require('./providers');

function getPort() {
  return Number.parseInt(process.env.PORT || '3333', 10);
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/ai_logger_proxy';
}

function buildDefaultConfig() {
  return {
    provider: 'openai',
    baseUrl: providerPresets.openai.baseUrl,
    apiKey: '',
    anthropicVersion: providerPresets.anthropic.anthropicVersion,
    defaultModel: '',
    stampLogs: false,
    cloudStorageLogs: false,
    notarizeLogs: false,
    integritasApiKeyEncrypted: ''
  };
}

function getUiAssetPath() {
  return path.join(__dirname, '..', 'ui', 'assets');
}

module.exports = {
  buildDefaultConfig,
  getDatabaseUrl,
  getPort,
  getUiAssetPath
};
