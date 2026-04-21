'use strict';

const { providerPresets } = require('../config/providers');
const { sanitizeHeaders } = require('../lib/http');

function resolveUpstream(config) {
  const upstreamUrl = new URL(config.baseUrl);
  const upstreamBasePath = upstreamUrl.pathname.replace(/\/$/, '') || '';
  return { upstreamUrl, upstreamBasePath };
}

function getTestModel(config) {
  if (config.defaultModel) {
    return config.defaultModel;
  }

  if (config.provider === 'openrouter') {
    return 'deepseek/deepseek-v3.2';
  }

  if (config.provider === 'anthropic') {
    return 'claude-3-7-sonnet-latest';
  }

  return 'gpt-4.1-mini';
}

function buildInferenceTestRequest(config) {
  const { upstreamUrl, upstreamBasePath } = resolveUpstream(config);
  const model = getTestModel(config);
  const timestamp = new Date().toISOString();
  const prompt = `This is a proxy test request sent at ${timestamp}. Please reply with one short original joke and mention that this is a proxy test.`;
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json'
  };

  let targetPath = '/v1/chat/completions';
  let body;

  if (config.provider === 'anthropic') {
    targetPath = '/v1/messages';
    if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }
    headers['anthropic-version'] = config.anthropicVersion || providerPresets.anthropic.anthropicVersion;
    body = {
      model,
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }]
    };
  } else {
    if (config.apiKey) {
      headers.authorization = `Bearer ${config.apiKey}`;
    }
    body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    };
  }

  return {
    model,
    timestamp,
    requestUrl: new URL(`${upstreamBasePath}${targetPath}`, upstreamUrl.origin),
    headers,
    body
  };
}

function extractTestResponseText(provider, payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (provider === 'anthropic') {
    if (!Array.isArray(payload.content)) {
      return '';
    }

    return payload.content
      .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
      .trim();
  }

  const message = payload.choices?.[0]?.message;
  if (!message) {
    return '';
  }

  if (typeof message.content === 'string') {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((item) => (typeof item === 'string' ? item : item?.text || ''))
      .join('\n')
      .trim();
  }

  return '';
}

function logAiLifecycle(label, payload) {
  console.log(`[${new Date().toISOString()}] ${label} ${JSON.stringify(payload)}`);
}

function createTestService({ configService, historyService }) {
  async function runUpstreamTest() {
    const config = await configService.getResolvedConfig();
    const inferenceRequest = buildInferenceTestRequest(config);
    const requestBody = JSON.stringify(inferenceRequest.body);
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    let response;

    logAiLifecycle('ai_request_started', {
      source: 'admin-test',
      provider: config.provider,
      target: inferenceRequest.requestUrl.toString(),
      llm: inferenceRequest.model
    });

    try {
      response = await fetch(inferenceRequest.requestUrl, {
        method: 'POST',
        headers: inferenceRequest.headers,
        body: requestBody
      });
    } catch (error) {
      logAiLifecycle('ai_request_error', {
        source: 'admin-test',
        provider: config.provider,
        target: inferenceRequest.requestUrl.toString(),
        llm: inferenceRequest.model,
        error: error.message
      });
      throw error;
    }

    const responseBody = await response.text();
    let parsedBody = null;

    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = null;
    }

    const result = {
      ok: response.ok,
      provider: config.provider,
      llm: config.provider,
      target: inferenceRequest.requestUrl.toString(),
      model: inferenceRequest.model,
      proof: '',
      timestamp: inferenceRequest.timestamp,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      statusCode: response.status,
      request: {
        method: 'POST',
        headers: sanitizeHeaders(inferenceRequest.headers),
        body: inferenceRequest.body,
        rawBody: requestBody
      },
      response: {
        headers: sanitizeHeaders(Object.fromEntries(response.headers.entries())),
        text: extractTestResponseText(config.provider, parsedBody),
        body: parsedBody || responseBody,
        rawBody: responseBody
      }
    };

    logAiLifecycle(response.ok ? 'ai_response_completed' : 'ai_response_error', {
      source: 'admin-test',
      provider: config.provider,
      target: result.target,
      llm: result.model,
      statusCode: result.statusCode
    });

    await historyService.saveCommunication({
      timestamp: result.completedAt,
      llm: inferenceRequest.model,
      request: {
        source: 'admin-test',
        provider: config.provider,
        target: result.target,
        ...result.request
      },
      response: {
        source: 'admin-test',
        provider: config.provider,
        statusCode: result.statusCode,
        ...result.response
      },
      proof: ''
    });

    return result;
  }

  return {
    runUpstreamTest
  };
}

module.exports = {
  createTestService,
  resolveUpstream
};
