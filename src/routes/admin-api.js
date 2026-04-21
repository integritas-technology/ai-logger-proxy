'use strict';

const { readJsonBody, writeJson } = require('../lib/http');

function createAdminRouter({ configService, historyService, testService, modelsService }) {
  return function routeAdmin(req, res) {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (requestUrl.pathname === '/__admin/config' && req.method === 'GET') {
      configService.getPublicConfig()
        .then((config) => {
          writeJson(res, 200, {
            config,
            providers: configService.providerPresets
          });
        })
        .catch((error) => {
          writeJson(res, 500, {
            error: 'config_load_failed',
            message: error.message
          });
        });
      return true;
    }

    if (requestUrl.pathname === '/__admin/config' && req.method === 'POST') {
      readJsonBody(req, res, (payload) => {
        configService.saveConfig(payload)
          .then(() => configService.getPublicConfig())
          .then((config) => {
            writeJson(res, 200, {
              ok: true,
              config
            });
          })
          .catch((error) => {
            writeJson(res, 400, {
              error: 'invalid_config',
              message: error.message
            });
          });
      });
      return true;
    }

    if (requestUrl.pathname === '/__admin/test' && req.method === 'POST') {
      testService.runUpstreamTest()
        .then((result) => {
          writeJson(res, result.ok ? 200 : 502, result);
        })
        .catch((error) => {
          writeJson(res, 502, {
            ok: false,
            error: 'upstream_test_failed',
            message: error.message
          });
        });
      return true;
    }

    if (requestUrl.pathname === '/__admin/models' && req.method === 'POST') {
      readJsonBody(req, res, (payload) => {
        modelsService.listModels(payload)
          .then((result) => {
            writeJson(res, 200, result);
          })
          .catch((error) => {
            writeJson(res, error.statusCode || 502, {
              error: 'model_lookup_failed',
              message: error.message,
              responseBody: error.responseBody || ''
            });
          });
      });
      return true;
    }

    if (requestUrl.pathname === '/__admin/history' && req.method === 'GET') {
      historyService.listHistory(requestUrl.searchParams.get('limit'))
        .then((rows) => {
          writeJson(res, 200, {
            rows
          });
        })
        .catch((error) => {
          writeJson(res, 500, {
            error: 'history_load_failed',
            message: error.message
          });
        });
      return true;
    }

    return false;
  };
}

module.exports = {
  createAdminRouter
};
