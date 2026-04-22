'use strict';

const { escapeHtml } = require('../../lib/http');

const navItems = [
  ['/', 'Home'],
  ['/config', 'Config'],
  ['/setup', 'Setup'],
  ['/testing', 'Testing'],
  ['/history', 'History']
];

function renderLayout({ page, title, intro, content }) {
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
        <div class="topbar-copy">
          <div class="eyebrow">AI Logger Proxy</div>
          <h1>Control, test, and inspect LLM traffic.</h1>
          <p>${escapeHtml(intro)}</p>
        </div>
        <nav class="nav">${nav}</nav>
      </header>
      <main class="content">${content}</main>
    </div>
    <div class="modal hidden" id="content-modal" role="dialog" aria-modal="true" aria-labelledby="content-modal-title">
      <div class="modal-backdrop" data-close-modal="true"></div>
      <div class="modal-panel">
        <button class="modal-close" id="content-modal-close" type="button" aria-label="Close modal">X</button>
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
