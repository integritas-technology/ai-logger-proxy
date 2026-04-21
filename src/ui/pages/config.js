'use strict';

const { renderLayout } = require('./layout');

function renderConfigPage() {
  return renderLayout({
    page: '/config',
    title: 'Config',
    intro: 'Configuration is now stored in PostgreSQL and applied on the next request without a restart.',
    content: `
      <section class="panel two-column">
        <article class="panel-section">
          <div class="eyebrow">Config</div>
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
      </section>
    `
  });
}

module.exports = {
  renderConfigPage
};
