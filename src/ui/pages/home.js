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
        <div class="flow-diagram" aria-label="AI Logger Proxy request flow">
          <div class="flow-node">
            <span class="flow-kicker">AI client</span>
            <strong>Codex / OpenCode</strong>
            <span>Base URL points to localhost:3333</span>
          </div>
          <div class="flow-connector-pair" aria-hidden="true">
            <span class="flow-stream flow-stream-down">
              <span class="flow-packet"></span>
              <span class="flow-packet"></span>
            </span>
            <span class="flow-stream flow-stream-up">
              <span class="flow-packet"></span>
              <span class="flow-packet"></span>
            </span>
          </div>
          <div class="flow-node flow-node-primary">
            <div class="flow-node-copy">
              <span class="flow-kicker">Proxy</span>
              <strong>Capture traffic</strong>
              <span>Log request and response payloads</span>
            </div>
            <div class="package-animation" aria-hidden="true">
              <span class="package-dot package-dot-request"></span>
              <span class="package-dot package-dot-response"></span>
              <span class="package-box">
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
          <div class="flow-connector-pair" aria-hidden="true">
            <span class="flow-stream flow-stream-down">
              <span class="flow-packet"></span>
              <span class="flow-packet"></span>
            </span>
            <span class="flow-stream flow-stream-up">
              <span class="flow-packet"></span>
              <span class="flow-packet"></span>
            </span>
          </div>
          <div class="flow-node">
            <span class="flow-kicker">Provider</span>
            <strong>OpenAI / Anthropic / OpenRouter</strong>
            <span>Return model response</span>
          </div>
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
