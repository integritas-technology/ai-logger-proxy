'use strict';

const path = require('path');
const { getUiAssetPath } = require('../config/env');
const { serveStaticFile, writeHtml, writeJson } = require('../lib/http');
const { renderConfigPage } = require('../ui/pages/config');
const { renderHistoryPage } = require('../ui/pages/history');
const { renderHomePage } = require('../ui/pages/home');
const { renderSetupPage } = require('../ui/pages/setup');
const { renderTestingPage } = require('../ui/pages/testing');

const assetPath = getUiAssetPath();

function createPageRouter() {
  const pages = new Map([
    ['/', renderHomePage],
    ['/home', renderHomePage],
    ['/config', renderConfigPage],
    ['/setup', renderSetupPage],
    ['/testing', renderTestingPage],
    ['/history', renderHistoryPage],
    ['/admin', renderConfigPage]
  ]);

  return function routePage(req, res) {
    if (req.method !== 'GET') {
      return false;
    }

    const requestUrl = new URL(req.url, 'http://localhost');
    const pathname = requestUrl.pathname !== '/' && requestUrl.pathname.endsWith('/')
      ? requestUrl.pathname.slice(0, -1)
      : requestUrl.pathname;

    if (pathname === '/assets/styles.css') {
      serveStaticFile(res, path.join(assetPath, 'styles.css'), 'text/css; charset=utf-8');
      return true;
    }

    if (pathname === '/assets/app.js') {
      serveStaticFile(res, path.join(assetPath, 'app.js'), 'application/javascript; charset=utf-8');
      return true;
    }

    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return true;
    }

    if (pathname === '/robots.txt') {
      writeJson(res, 200, {
        message: 'No indexing directives configured for this local app.'
      });
      return true;
    }

    const renderPage = pages.get(pathname);
    if (!renderPage) {
      return false;
    }

    writeHtml(res, 200, renderPage());
    return true;
  };
}

module.exports = {
  createPageRouter
};
