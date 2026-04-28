"use strict";

const { renderLayout } = require("./layout");

function renderConfigPage() {
  return renderLayout({
    page: "/config",
    title: "Config",
    content: `
      <section class="page-heading">
        <div>
          <div class="eyebrow">Runtime config</div>
          <h1>Provider settings</h1>
          <p>Changes are stored locally and applied to new proxy requests immediately.</p>
        </div>
      </section>
      <section class="panel config-layout">
        <article class="panel-section">
          <div class="section-heading">
            <div>
              <div class="eyebrow">Connection</div>
              <h2>Upstream provider</h2>
            </div>
          </div>
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
              <button class="button-secondary" id="refresh-models-button" type="button">Refresh models</button>
              <span class="hint" id="models-status">Loading provider models...</span>
            </div>
            <button id="save-button" type="submit">Save config</button>
            <div class="status" id="status"></div>
          </form>
        </article>
        <article class="panel-section">
          <div class="section-heading">
            <div>
              <div class="eyebrow">Current state</div>
              <h2>Saved snapshot</h2>
            </div>
          </div>
          <pre id="config-preview">Loading...</pre>
        </article>
        <details class="panel-section config-addons">
          <summary class="config-addons-summary">
            <div>
              <div class="eyebrow">Optional addons</div>
              <h2>Log services</h2>
            </div>
            <span class="config-addons-toggle">
              <span class="config-addons-toggle-icon" aria-hidden="true"></span>
              <span class="config-addons-toggle-label" aria-hidden="true"></span>
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
        <details class="panel-section config-advanced">
          <summary class="config-addons-summary">
            <div>
              <div class="eyebrow">Advanced settings</div>
              <h2>Service endpoints</h2>
            </div>
            <span class="config-addons-toggle">
              <span class="config-addons-toggle-icon" aria-hidden="true"></span>
              <span class="config-addons-toggle-label" aria-hidden="true"></span>
            </span>
          </summary>
          <div class="advanced-settings-grid config-addons-body">
            <div class="stack">
              <label>Stamping/verification service URL
                <select id="integritasBaseUrlMode" name="integritasBaseUrlMode">
                  <option value="https://integritas.technology/core">https://integritas.technology/core</option>
                  <option value="http://host.docker.internal:5005">http://host.docker.internal:5005</option>
                  <option value="__custom__">Custom</option>
                </select>
              </label>
              <label id="integritas-base-url-custom-group" class="hidden">Custom stamping/verification service URL
                <input id="integritasBaseUrlCustom" name="integritasBaseUrlCustom" type="url">
              </label>
            </div>
            <div class="stack">
              <label>Cloud storage service URL
                <select id="storageBaseUrlMode" name="storageBaseUrlMode">
                  <option value="https://integritas.technology/core">https://integritas.technology/core</option>
                  <option value="http://host.docker.internal:5005">http://host.docker.internal:5005</option>
                  <option value="__custom__">Custom</option>
                </select>
              </label>
              <label id="storage-base-url-custom-group" class="hidden">Custom cloud storage service URL
                <input id="storageBaseUrlCustom" name="storageBaseUrlCustom" type="url">
              </label>
            </div>
            <div class="stack">
              <label>Notary service URL
                <select id="notaryBaseUrlMode" name="notaryBaseUrlMode">
                  <option value="https://integritas.technology/core">https://integritas.technology/core</option>
                  <option value="http://host.docker.internal:5005">http://host.docker.internal:5005</option>
                  <option value="__custom__">Custom</option>
                </select>
              </label>
              <label id="notary-base-url-custom-group" class="hidden">Custom notary service URL
                <input id="notaryBaseUrlCustom" name="notaryBaseUrlCustom" type="url">
              </label>
            </div>
          </div>
        </details>
      </section>
    `,
  });
}

module.exports = {
  renderConfigPage,
};
