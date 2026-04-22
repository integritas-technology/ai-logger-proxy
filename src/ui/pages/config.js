"use strict";

const { renderLayout } = require("./layout");

function renderConfigPage() {
  return renderLayout({
    page: "/config",
    title: "Config",
    intro:
      "Configuration is now stored in PostgreSQL and applied on the next request without a restart.",
    content: `
      <section class="panel config-layout">
        <article class="panel-section">
          <div class="eyebrow">Normal Config</div>
          <h2>Update runtime settings</h2>
          <form id="config-form" class="stack">
            <label>Active provider
              <select id="provider" name="provider">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </label>
            <label>Base URL
              <input id="baseUrl" name="baseUrl" type="url" required>
            </label>
            <label>API key
              <input id="apiKey" name="apiKey" type="password" placeholder="Leave unchanged to keep the saved key">
            </label>
            <label id="anthropic-version-group">Anthropic version
              <input id="anthropicVersion" name="anthropicVersion" type="text" placeholder="2023-06-01">
            </label>
            <label>Default model fallback
              <select id="defaultModelSelect" name="defaultModelSelect">
                <option value="">Loading models...</option>
              </select>
            </label>
            <label id="default-model-manual-group" class="hidden">Custom model
              <input id="defaultModel" name="defaultModel" type="text" placeholder="gpt-4.1-mini">
            </label>
            <div class="inline-actions">
              <button id="refresh-models-button" type="button">Refresh models</button>
              <span class="hint" id="models-status">Loading provider models...</span>
            </div>
            <button id="save-button" type="submit">Save config</button>
            <div class="status" id="status"></div>
          </form>
        </article>
        <article class="panel-section">
          <div class="eyebrow">Current State</div>
          <h2>Saved config snapshot</h2>
          <pre id="config-preview">Loading...</pre>
        </article>
        <details class="panel-section config-addons">
          <summary class="config-addons-summary">
            <div>
              <div class="eyebrow">Optional Addons</div>
              <h2>Check the box to opt in.</h2>
            </div>
            <span class="config-addons-toggle">
              <span class="config-addons-toggle-icon" aria-hidden="true"></span>
              <span class="config-addons-toggle-label">Expand</span>
            </span>
          </summary>
          <div class="stack config-addons-body">
            <section class="addon-card">
              <div class="addon-copy">
                <h3>I want to stamp my logs</h3>
                <p>Generate a proof workflow for each saved log and track its proof state over time.</p>
              </div>
              <label class="addon-control">
                <input id="stampLogs" name="stampLogs" type="checkbox">
                <span class="addon-pill" aria-hidden="true"></span>
                <span class="sr-only">Toggle stamp my logs</span>
              </label>
              <div id="integritas-api-key-group" class="hidden addon-fields">
                <p class="hint">
                  Get Your Integritas API key here:
                  <a href="https://integritas.technology/" target="_blank" rel="noreferrer">https://integritas.technology/</a>
                </p>
                <label>Integritas API key
                  <input id="integritasApiKey" name="integritasApiKey" type="password" placeholder="Leave unchanged to keep the saved key">
                </label>
              </div>
            </section>
            <section class="addon-card is-disabled">
              <div class="addon-copy">
                <h3>I want cloud storage of my logs</h3>
                <p>Not yet available.</p>
              </div>
              <label class="addon-control">
                <input id="cloudStorageLogs" name="cloudStorageLogs" type="checkbox" disabled>
                <span class="addon-pill" aria-hidden="true"></span>
                <span class="sr-only">Cloud storage of logs is not yet available</span>
              </label>
            </section>
            <section class="addon-card is-disabled">
              <div class="addon-copy">
                <h3>I want my logs notarized</h3>
                <p>Not yet available.</p>
              </div>
              <label class="addon-control">
                <input id="notarizeLogs" name="notarizeLogs" type="checkbox" disabled>
                <span class="addon-pill" aria-hidden="true"></span>
                <span class="sr-only">Log notarization is not yet available</span>
              </label>
            </section>
          </div>
        </details>
      </section>
    `,
  });
}

module.exports = {
  renderConfigPage,
};
