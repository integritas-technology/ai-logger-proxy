'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const redactedHeaderKeys = new Set([
  'authorization',
  'chatgpt-account-id',
  'cookie',
  'set-cookie',
  'user-agent',
  'x-api-key',
  'x-forwarded-for',
  'cf-ray'
]);

function writeJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function writeHtml(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function writeText(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function serveStaticFile(res, filePath, contentType) {
  const body = fs.readFileSync(filePath, 'utf8');
  writeText(res, 200, body, contentType);
}

function collectRequestBody(req, callback) {
  const chunks = [];

  req.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  req.on('end', () => {
    callback(null, Buffer.concat(chunks));
  });

  req.on('error', (error) => {
    callback(error);
  });
}

function readJsonBody(req, res, callback) {
  collectRequestBody(req, (error, body) => {
    if (error) {
      writeJson(res, 400, {
        error: 'invalid_request_stream',
        message: error.message
      });
      return;
    }

    if (!body.length) {
      callback({});
      return;
    }

    try {
      callback(JSON.parse(body.toString('utf8')));
    } catch (parseError) {
      writeJson(res, 400, {
        error: 'invalid_json',
        message: parseError.message
      });
    }
  });
}

function copyHeaders(source, destination) {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      destination[key] = value;
    }
  }
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };

  for (const key of Object.keys(sanitized)) {
    if (redactedHeaderKeys.has(key.toLowerCase())) {
      sanitized[key] = '[redacted]';
    }
  }

  return sanitized;
}

function previewBody(buffer) {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  return buffer.toString('utf8');
}

function parseJsonBuffer(buffer) {
  if (!buffer || !buffer.length) {
    return null;
  }

  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return null;
  }
}

function decodeContentBuffer(buffer, contentEncoding) {
  if (!buffer || !buffer.length) {
    return buffer;
  }

  const encoding = String(contentEncoding || '').toLowerCase().trim();
  if (!encoding || encoding === 'identity') {
    return buffer;
  }

  try {
    if (encoding.includes('gzip')) {
      return zlib.gunzipSync(buffer);
    }

    if (encoding.includes('br')) {
      return zlib.brotliDecompressSync(buffer);
    }

    if (encoding.includes('deflate')) {
      return zlib.inflateSync(buffer);
    }
  } catch {
    return buffer;
  }

  return buffer;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveAsset(basePath, fileName) {
  return path.join(basePath, fileName);
}

module.exports = {
  allowedMethods,
  collectRequestBody,
  copyHeaders,
  decodeContentBuffer,
  escapeHtml,
  parseJsonBuffer,
  previewBody,
  readJsonBody,
  resolveAsset,
  sanitizeHeaders,
  serveStaticFile,
  writeHtml,
  writeJson
};
