'use strict';

const { renderLayout } = require('./layout');

function renderHomePage() {
  return renderLayout({
    page: '/',
    title: 'Home',
    content: `
      <section class="hero-panel">
        <div class="hero-copy">
          <div class="eyebrow">Control plane</div>
          <h1>Capture, inspect, and verify local LLM traffic.</h1>
          <p>Configure one upstream provider, point your AI tools at the proxy, and use the saved history to review every request and response.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="/config">Configure provider</a>
            <a class="button button-secondary" href="/history">View history</a>
          </div>
        </div>
        <div class="hero-status" aria-label="Proxy workflow">
          <div class="status-line">
            <span class="status-dot"></span>
            <span>Proxy endpoint</span>
            <strong>localhost:3333</strong>
          </div>
          <div class="route-preview">
            <span>Client</span>
            <span>Proxy</span>
            <span>Provider</span>
          </div>
          <pre>{
  "capture": "request + response",
  "storage": "local history",
  "proofs": "optional"
}</pre>
        </div>
      </section>
      <section class="workflow-grid">
        <a class="workflow-card" href="/config">
          <span class="step-number">01</span>
          <h2>Configure</h2>
          <p>Choose OpenAI, Anthropic, or OpenRouter and set the model fallback.</p>
        </a>
        <a class="workflow-card" href="/testing">
          <span class="step-number">02</span>
          <h2>Test</h2>
          <p>Run a real inference through the saved provider settings.</p>
        </a>
        <a class="workflow-card" href="/setup">
          <span class="step-number">03</span>
          <h2>Connect</h2>
          <p>Point Codex, OpenCode, or OpenAI-compatible clients at the proxy.</p>
        </a>
        <a class="workflow-card" href="/history">
          <span class="step-number">04</span>
          <h2>Inspect</h2>
          <p>Filter saved traffic, open raw payloads, and verify stamped logs.</p>
        </a>
      </section>
    `
  });
}

module.exports = {
  renderHomePage
};
