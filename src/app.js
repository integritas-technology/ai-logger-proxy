'use strict';

const http = require('http');
const { getPort } = require('./config/env');
const { initializeDatabase } = require('./db');
const { createAdminRouter } = require('./routes/admin-api');
const { createPageRouter } = require('./routes/pages');
const { createProxyServer } = require('./services/proxy-service');
const { createConfigService } = require('./services/config-service');
const { createModelsService } = require('./services/models-service');
const { writeJson } = require('./lib/http');

async function createAppServer() {
  const db = await initializeDatabase();
  const configService = createConfigService(db);
  const modelsService = createModelsService({ configService });
  const proxyService = createProxyServer({ db, configService });
  const adminRouter = createAdminRouter({
    configService,
    historyService: proxyService.historyService,
    testService: proxyService.testService,
    modelsService
  });
  const pageRouter = createPageRouter({ configService });
  const port = getPort();

  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (pageRouter(req, res)) {
      return;
    }

    if (adminRouter(req, res)) {
      return;
    }

    if (requestUrl.pathname === '/healthz') {
      configService.getPublicConfig()
        .then((config) => {
          writeJson(res, 200, {
            ok: true,
            provider: config.provider,
            upstreamOrigin: config.baseUrl,
            database: 'connected'
          });
        })
        .catch((error) => {
          writeJson(res, 500, {
            ok: false,
            error: 'health_check_failed',
            message: error.message
          });
        });
      return;
    }

    proxyService.handleHttp(req, res).catch((error) => {
      writeJson(res, 500, {
        error: 'proxy_request_failed',
        message: error.message
      });
    });
  });

  server.on('upgrade', (req, socket, head) => {
    proxyService.handleUpgrade(req, socket, head).catch((error) => {
      console.error(`WebSocket upgrade failed: ${error.message}`);
      socket.destroy();
    });
  });

  const config = await configService.getPublicConfig();

  return {
    server,
    port,
    config
  };
}

module.exports = {
  createAppServer
};
