'use strict';

const { renderLayout } = require('./layout');

function renderSetupPage() {
  return renderLayout({
    page: '/setup',
    title: 'Setup',
    intro: 'This page is for configuring clients to use the proxy after the app is already running.',
    content: `
      <section class="panel stack">
        <div class="eyebrow">Setup</div>
        <h2>Point clients at the proxy</h2>
        <p>Once the proxy is running and configured in the <a href="/config">Config</a> page, point your local tools at <code>http://localhost:3333</code> instead of a provider base URL.</p>
        <p>OpenAI and OpenRouter use OpenAI-style routes. Anthropic requests are forwarded with Anthropic auth headers and versioning, but this proxy does not translate OpenAI payloads into Anthropic message format.</p>
        <div class="callout">
          <strong>Proxy base URL</strong>
          <pre>http://localhost:3333</pre>
        </div>
        <div class="callout">
          <strong>Codex</strong>
          <pre>chatgpt_base_url = "http://localhost:3333"</pre>
        </div>
        <div class="callout">
          <strong>OpenCode Desktop</strong>
          <pre>1. Add a credential in OpenCode with /connect and choose Other.
2. Use a provider id such as ai-logger-proxy.
3. Point the provider baseURL at the proxy.
4. Add at least one model entry under models.

Example opencode.json:
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ai-logger-proxy": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "AI Logger Proxy",
      "options": {
        "baseURL": "http://localhost:3333/v1"
      },
      "models": {
        "gpt-4.1-mini": {
          "name": "Proxy Model"
        }
      }
    }
  }
}</pre>
        </div>
        <div class="callout">
          <strong>Claude Code or other OpenAI-compatible clients</strong>
          <pre>Base URL: http://localhost:3333
Route example: /v1/chat/completions</pre>
        </div>
        <div class="callout">
          <strong>Notes</strong>
          <pre>- Configure provider credentials in the Config page.
- Use the Testing page to verify upstream connectivity.
- Use the History page to inspect saved traffic.</pre>
        </div>
      </section>
    `
  });
}

module.exports = {
  renderSetupPage
};
