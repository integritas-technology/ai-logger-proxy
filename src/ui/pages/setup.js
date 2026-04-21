'use strict';

const { renderLayout } = require('./layout');

function renderSetupPage() {
  return renderLayout({
    page: '/setup',
    title: 'Setup',
    intro: 'This page explains how the app is wired and how to point external tools at the proxy.',
    content: `
      <section class="panel stack">
        <div class="eyebrow">Setup</div>
        <h2>How the app works</h2>
        <p>The service listens locally, forwards requests to the configured upstream LLM provider, and stores config plus AI request/response history in PostgreSQL.</p>
        <p>OpenAI and OpenRouter use OpenAI-style routes. Anthropic requests are forwarded with Anthropic auth headers and versioning, but this proxy does not translate OpenAI payloads into Anthropic message format.</p>
        <div class="callout">
          <strong>Run the stack</strong>
          <pre>docker compose up --build</pre>
        </div>
        <div class="callout">
          <strong>Use the web app</strong>
          <pre>Home:    http://localhost:3333/
Config:  http://localhost:3333/config
Testing: http://localhost:3333/testing
History: http://localhost:3333/history</pre>
        </div>
        <div class="callout">
          <strong>Point a client at the proxy</strong>
          <pre>chatgpt_base_url = "http://localhost:3333"</pre>
        </div>
      </section>
    `
  });
}

module.exports = {
  renderSetupPage
};
