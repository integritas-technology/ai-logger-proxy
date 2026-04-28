"use strict";

const path = require("path");
const { providerPresets } = require("./providers");

function getPort() {
  return Number.parseInt(process.env.PORT || "3333", 10);
}

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@postgres:5432/ai_logger_proxy"
  );
}

function getDebugMode() {
  return String(process.env.DEBUG_MODE || "").toLowerCase() === "true";
}

function buildDefaultConfig() {
  return {
    provider: "openai",
    baseUrl: providerPresets.openai.baseUrl,
    apiKey: "",
    anthropicVersion: providerPresets.anthropic.anthropicVersion,
    defaultModel: "",
    stampLogs: false,
    cloudStorageLogs: false,
    notarizeLogs: false,
    integritasApiKeyEncrypted: "",
    integritasBaseUrl: "https://integritas.technology/core",
    storageBaseUrl: "https://integritas.technology/core",
    notaryBaseUrl: "https://integritas.technology/core",
  };
}

function getUiAssetPath() {
  return path.join(__dirname, "..", "ui", "assets");
}

module.exports = {
  buildDefaultConfig,
  getDatabaseUrl,
  getDebugMode,
  getPort,
  getUiAssetPath,
};
