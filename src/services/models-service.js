'use strict';

const { providerPresets } = require('../config/providers');

function resolveUpstream(config) {
  const upstreamUrl = new URL(config.baseUrl);
  const upstreamBasePath = upstreamUrl.pathname.replace(/\/$/, '') || '';
  return { upstreamUrl, upstreamBasePath };
}

function buildHeaders(config) {
  const headers = {
    accept: 'application/json'
  };

  if (config.provider === 'anthropic') {
    if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }

    headers['anthropic-version'] = config.anthropicVersion || providerPresets.anthropic.anthropicVersion;
  } else if (config.apiKey) {
    headers.authorization = `Bearer ${config.apiKey}`;
  }

  return headers;
}

function normalizeModelEntry(model) {
  if (typeof model === 'string') {
    return {
      id: model,
      label: model
    };
  }

  if (!model || typeof model !== 'object') {
    return null;
  }

  const id = model.id || model.name || model.model || model.slug || '';
  if (!id) {
    return null;
  }

  return {
    id,
    label: model.name || model.display_name || model.id || id
  };
}

function normalizeModelsResponse(payload) {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.models)
        ? payload.models
        : [];

  const seen = new Set();
  return candidates
    .map(normalizeModelEntry)
    .filter((model) => {
      if (!model || seen.has(model.id)) {
        return false;
      }

      seen.add(model.id);
      return true;
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function logModelLifecycle(label, payload) {
  console.log(`[${new Date().toISOString()}] ${label} ${JSON.stringify(payload)}`);
}

function createModelsService({ configService }) {
  async function listModels(input = {}) {
    const savedConfig = await configService.getResolvedConfig();
    const config = {
      ...savedConfig,
      ...input
    };
    const { upstreamUrl, upstreamBasePath } = resolveUpstream(config);
    const requestUrl = new URL(`${upstreamBasePath}/v1/models`, upstreamUrl.origin);
    let response;

    logModelLifecycle('model_refresh_started', {
      provider: config.provider,
      target: requestUrl.toString()
    });

    try {
      response = await fetch(requestUrl, {
        method: 'GET',
        headers: buildHeaders(config)
      });
    } catch (error) {
      logModelLifecycle('model_refresh_error', {
        provider: config.provider,
        target: requestUrl.toString(),
        error: error.message
      });
      throw error;
    }

    const rawBody = await response.text();
    let parsedBody = null;

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = null;
    }

    if (!response.ok) {
      logModelLifecycle('model_refresh_error', {
        provider: config.provider,
        target: requestUrl.toString(),
        statusCode: response.status
      });
      const error = new Error(`Provider model lookup failed with status ${response.status}`);
      error.statusCode = response.status;
      error.responseBody = rawBody;
      throw error;
    }

    const models = normalizeModelsResponse(parsedBody);
    logModelLifecycle('model_refresh_completed', {
      provider: config.provider,
      target: requestUrl.toString(),
      count: models.length
    });

    return {
      provider: config.provider,
      models
    };
  }

  return {
    listModels
  };
}

module.exports = {
  createModelsService
};
