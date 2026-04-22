'use strict';

const httpProxy = require('http-proxy');
const { PassThrough } = require('stream');
const { providerPresets } = require('../config/providers');
const {
  allowedMethods,
  collectRequestBody,
  copyHeaders,
  decodeContentBuffer,
  parseJsonBuffer,
  previewBody,
  sanitizeHeaders,
  writeJson
} = require('../lib/http');
const { createHistoryService } = require('./history-service');
const { createProofService } = require('./proof-service');
const { createTestService, resolveUpstream } = require('./test-service');

const proxiedPathPrefixes = [
  '/v1/',
  '/openai/',
  '/anthropic/'
];

function maybeInjectDefaultModel(req, requestBody, config) {
  if (!config.defaultModel || !requestBody.length) {
    return requestBody;
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return requestBody;
  }

  try {
    const parsed = JSON.parse(requestBody.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.model) {
      return requestBody;
    }

    req.defaultModelInjected = true;
    return Buffer.from(JSON.stringify({
      ...parsed,
      model: config.defaultModel
    }));
  } catch {
    return requestBody;
  }
}

function extractLlm(config, requestPayload) {
  return requestPayload?.model || config.defaultModel || providerPresets[config.provider]?.label || config.provider;
}

function logEvent(label, payload) {
  console.log(`[${new Date().toISOString()}] ${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

function logAiLifecycle(label, payload) {
  console.log(`[${new Date().toISOString()}] ${label} ${JSON.stringify(payload)}`);
}

function buildUpstreamPath(req, config) {
  const { upstreamBasePath } = resolveUpstream(config);
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const requestPath = requestUrl.pathname || '/';
  const normalizedPath = upstreamBasePath && requestPath.startsWith(`${upstreamBasePath}/`)
    ? requestPath
    : `${upstreamBasePath}${requestPath}`;
  return `${normalizedPath}${requestUrl.search}` || '/';
}

function normalizeRequestPath(req) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname || '/';
  return pathname !== '/' && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
}

function shouldProxyRequest(req) {
  const pathname = normalizeRequestPath(req);
  return proxiedPathPrefixes.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix));
}

function writeNotProxied(res, pathname) {
  writeJson(res, 404, {
    error: 'route_not_found',
    message: `Path ${pathname} is not a frontend route or proxied API route.`,
    proxiedPrefixes: proxiedPathPrefixes
  });
}

function decorateProxyRequest(proxyReq, req, config) {
  const { upstreamUrl } = resolveUpstream(config);
  proxyReq.path = buildUpstreamPath(req, config);
  proxyReq.setHeader('host', upstreamUrl.host);

  if (config.provider === 'anthropic') {
    proxyReq.removeHeader('authorization');

    if (config.apiKey && !req.headers['x-api-key']) {
      proxyReq.setHeader('x-api-key', config.apiKey);
    }

    if (!req.headers['anthropic-version']) {
      proxyReq.setHeader('anthropic-version', config.anthropicVersion || providerPresets.anthropic.anthropicVersion);
    }
  } else if (config.apiKey && !req.headers.authorization) {
    proxyReq.setHeader('authorization', `Bearer ${config.apiKey}`);
  }
}

function createProxyServer({ db, configService }) {
  const historyService = createHistoryService(db);
  const proofService = createProofService({ configService, historyService });
  historyService.setProofService(proofService);
  const testService = createTestService({ configService, historyService });
  const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    ignorePath: true,
    ws: true,
    xfwd: true,
    selfHandleResponse: true
  });

  proxy.on('proxyReq', (proxyReq, req) => {
    const config = req.proxyConfig;
    const { upstreamUrl } = resolveUpstream(config);
    const requestPayload = parseJsonBuffer(req.loggedRequestBody);
    decorateProxyRequest(proxyReq, req, config);

    logEvent('outgoing_request', {
      provider: config.provider,
      defaultModelInjected: Boolean(req.defaultModelInjected),
      method: req.method,
      target: `${upstreamUrl.origin}${proxyReq.path}`,
      headers: sanitizeHeaders(proxyReq.getHeaders()),
      body: previewBody(req.loggedRequestBody)
    });

    logAiLifecycle('ai_request_started', {
      source: 'proxy',
      provider: config.provider,
      method: req.method,
      path: req.url,
      llm: extractLlm(config, requestPayload)
    });
  });

  proxy.on('proxyReqWs', (proxyReq, req) => {
    decorateProxyRequest(proxyReq, req, req.proxyConfig);
  });

  proxy.on('error', (error, req, res) => {
    const message = {
      error: 'upstream_proxy_error',
      message: error.message
    };

    if (req) {
      logAiLifecycle('ai_request_error', {
        source: 'proxy',
        provider: req.proxyConfig?.provider,
        method: req.method,
        path: req.url,
        error: error.message
      });
    }

    if (res && typeof res.writeHead === 'function' && !res.headersSent) {
      writeJson(res, 502, message);
      return;
    }

    if (res && typeof res.end === 'function') {
      res.end();
    }
  });

  proxy.on('proxyRes', (proxyRes, req, res) => {
    const responseChunks = [];

    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);

    proxyRes.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      responseChunks.push(buffer);
      res.write(buffer);
    });

    proxyRes.on('end', () => {
      const responseBody = Buffer.concat(responseChunks);
      const decodedResponseBody = decodeContentBuffer(responseBody, proxyRes.headers['content-encoding']);
      const responsePayload = parseJsonBuffer(decodedResponseBody);
      const requestPayload = parseJsonBuffer(req.loggedRequestBody);

      logEvent('incoming_response', {
        provider: req.proxyConfig.provider,
        method: req.method,
        path: req.url,
        statusCode: proxyRes.statusCode,
        headers: sanitizeHeaders(proxyRes.headers),
        body: previewBody(decodedResponseBody)
      });

      historyService.saveCommunication({
        timestamp: new Date().toISOString(),
        llm: extractLlm(req.proxyConfig, requestPayload),
        request: {
          source: 'proxy',
          provider: req.proxyConfig.provider,
          method: req.method,
          path: req.url,
          headers: sanitizeHeaders(req.headers),
          body: requestPayload || previewBody(req.loggedRequestBody)
        },
        response: {
          source: 'proxy',
          provider: req.proxyConfig.provider,
          statusCode: proxyRes.statusCode || 502,
          headers: sanitizeHeaders(proxyRes.headers),
          body: responsePayload || previewBody(decodedResponseBody)
        },
        proof: ''
      }).catch((error) => {
        console.error(`Failed to save AI log: ${error.message}`);
      });

      logAiLifecycle('ai_response_completed', {
        source: 'proxy',
        provider: req.proxyConfig.provider,
        method: req.method,
        path: req.url,
        llm: extractLlm(req.proxyConfig, requestPayload),
        statusCode: proxyRes.statusCode || 502
      });

      res.end();
    });

    proxyRes.on('error', (error) => {
      logEvent('incoming_response_error', {
        provider: req.proxyConfig.provider,
        method: req.method,
        path: req.url,
        message: error.message
      });

      logAiLifecycle('ai_response_error', {
        source: 'proxy',
        provider: req.proxyConfig.provider,
        method: req.method,
        path: req.url,
        error: error.message
      });

      historyService.saveCommunication({
        timestamp: new Date().toISOString(),
        llm: req.proxyConfig.provider,
        request: {
          source: 'proxy',
          provider: req.proxyConfig.provider,
          method: req.method,
          path: req.url,
          headers: sanitizeHeaders(req.headers),
          body: parseJsonBuffer(req.loggedRequestBody) || previewBody(req.loggedRequestBody)
        },
        response: {
          source: 'proxy',
          provider: req.proxyConfig.provider,
          error: error.message
        },
        proof: ''
      }).catch(() => {});

      if (!res.headersSent) {
        writeJson(res, 502, {
          error: 'upstream_response_error',
          message: error.message
        });
        return;
      }

      res.end();
    });
  });

  async function handleHttp(req, res) {
    if (!allowedMethods.has(req.method || '')) {
      writeJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-API-Key,Anthropic-Version'
      });
      res.end();
      return;
    }

    const pathname = normalizeRequestPath(req);
    if (!shouldProxyRequest(req)) {
      writeNotProxied(res, pathname);
      return;
    }

    const config = await configService.getResolvedConfig();
    const { upstreamUrl } = resolveUpstream(config);
    const outgoingHeaders = {};
    copyHeaders(req.headers, outgoingHeaders);
    outgoingHeaders.host = upstreamUrl.host;
    outgoingHeaders['x-forwarded-host'] = req.headers.host || '';
    outgoingHeaders['x-forwarded-proto'] = 'http';

    collectRequestBody(req, (error, requestBody) => {
      if (error) {
        writeJson(res, 400, {
          error: 'invalid_request_stream',
          message: error.message
        });
        return;
      }

      req.proxyConfig = config;
      req.loggedRequestBody = requestBody;

      logEvent('incoming_request', {
        provider: config.provider,
        defaultModelInjected: false,
        method: req.method,
        path: req.url,
        headers: sanitizeHeaders(req.headers),
        body: previewBody(requestBody)
      });

      const proxiedRequestBody = maybeInjectDefaultModel(req, requestBody, config);
      req.loggedRequestBody = proxiedRequestBody;

      if (proxiedRequestBody !== requestBody) {
        outgoingHeaders['content-length'] = String(proxiedRequestBody.length);
      }

      const requestStream = new PassThrough();
      requestStream.end(proxiedRequestBody);

      proxy.web(req, res, {
        target: upstreamUrl.origin,
        secure: upstreamUrl.protocol === 'https:',
        headers: outgoingHeaders,
        buffer: requestStream
      });
    });
  }

  async function handleUpgrade(req, socket, head) {
    if (!shouldProxyRequest(req)) {
      socket.destroy();
      return;
    }

    const config = await configService.getResolvedConfig();
    const { upstreamUrl } = resolveUpstream(config);
    req.proxyConfig = config;
    proxy.ws(req, socket, head, {
      target: upstreamUrl.origin,
      secure: upstreamUrl.protocol === 'https:'
    });
  }

  return {
    handleHttp,
    handleUpgrade,
    historyService,
    proofService,
    testService
  };
}

module.exports = {
  createProxyServer
};
