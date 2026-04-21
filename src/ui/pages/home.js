'use strict';

const { renderLayout } = require('./layout');

function renderHomePage() {
  return renderLayout({
    page: '/',
    title: 'Home',
    intro: 'The frontend is split into focused pages instead of a single admin screen.',
    content: `
      <section class="panel">
        <div class="eyebrow">Overview</div>
        <h2>Choose the area you need.</h2>
        <div class="card-grid">
          <a class="card-link" href="/config">
            <strong>Config</strong>
            <span>Save the active provider, base URL, API key, Anthropic version, and fallback model in PostgreSQL.</span>
          </a>
          <a class="card-link" href="/setup">
            <strong>Setup</strong>
            <span>Read what the proxy does, how to run it, and how clients should point at it.</span>
          </a>
          <a class="card-link" href="/testing">
            <strong>Testing</strong>
            <span>Send a real inference request through the configured upstream provider from the browser.</span>
          </a>
          <a class="card-link" href="/history">
            <strong>History</strong>
            <span>Inspect saved AI traffic rows, including full request/response blobs and a placeholder proof field.</span>
          </a>
        </div>
      </section>
    `
  });
}

module.exports = {
  renderHomePage
};
