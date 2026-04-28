'use strict';

const { escapeHtml } = require('../../lib/http');

const navItems = [
  ['/', 'Overview'],
  ['/config', 'Config'],
  ['/testing', 'Testing'],
  ['/setup', 'Setup'],
  ['/history', 'History']
];

function renderLayout({ page, title, content }) {
  const nav = navItems
    .map(([href, label]) => `<a class="nav-link${href === page ? ' is-active' : ''}" href="${href}">${label}</a>`)
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | AI Logger Proxy</title>
    <link rel="stylesheet" href="/assets/styles.css">
  </head>
  <body data-page="${escapeHtml(page)}">
    <div class="page-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <a class="brand-mark" href="/" aria-label="AI Logger Proxy home">AL</a>
          <div class="brand-copy">
            <div class="app-name">AI Logger Proxy</div>
            <p>Local LLM traffic console</p>
          </div>
        </div>
        <nav class="nav">${nav}</nav>
      </header>
      <main class="content">${content}</main>
    </div>
    <div class="modal hidden" id="content-modal" role="dialog" aria-modal="true" aria-labelledby="content-modal-title">
      <div class="modal-backdrop" data-close-modal="true"></div>
      <div class="modal-panel">
        <button class="modal-close" id="content-modal-close" type="button" aria-label="Close modal">Close</button>
        <div class="eyebrow" id="content-modal-kicker">Viewer</div>
        <h2 id="content-modal-title">Payload</h2>
        <pre id="content-modal-content">No content selected.</pre>
      </div>
    </div>
    <script src="/assets/app.js"></script>
  </body>
</html>`;
}

module.exports = {
  renderLayout
};
