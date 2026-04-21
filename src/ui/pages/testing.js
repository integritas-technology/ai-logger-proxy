'use strict';

const { renderLayout } = require('./layout');

function renderTestingPage() {
  return renderLayout({
    page: '/testing',
    title: 'Testing',
    intro: 'Run a direct end-to-end test through the active provider and inspect the full metadata.',
    content: `
      <section class="panel stack">
        <div class="eyebrow">Testing</div>
        <h2>Run a live inference</h2>
        <p>The button below sends a real request through the saved provider configuration and stores the result in history.</p>
        <button id="test-button" type="button">Run provider test</button>
        <div class="status" id="test-status"></div>
        <div class="response-grid">
          <article class="panel-section">
            <div class="eyebrow">Raw Request Body</div>
            <button id="test-request-button" type="button" disabled>Raw Request Body</button>
          </article>
          <article class="panel-section">
            <div class="eyebrow">Raw Response Body</div>
            <button id="test-response-button" type="button" disabled>Raw Response Body</button>
          </article>
        </div>
        <article class="panel-section">
          <div class="eyebrow">Latest Run</div>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Timestamp</span>
              <strong id="test-meta-timestamp">No test run yet.</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">LLM</span>
              <strong id="test-meta-llm">No test run yet.</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Model</span>
              <strong id="test-meta-model">No test run yet.</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Proof</span>
              <strong id="test-meta-proof">(blank)</strong>
            </div>
          </div>
        </article>
      </section>
    `
  });
}

module.exports = {
  renderTestingPage
};
