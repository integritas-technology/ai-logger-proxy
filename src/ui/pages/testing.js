'use strict';

const { renderLayout } = require('./layout');

function renderTestingPage() {
  return renderLayout({
    page: '/testing',
    title: 'Testing',
    content: `
      <section class="page-heading">
        <div>
          <div class="eyebrow">Provider test</div>
          <h1>Run a live inference</h1>
          <p>Send one request through the saved configuration and save the result to history.</p>
        </div>
        <button id="test-button" type="button">Run provider test</button>
      </section>
      <section class="panel stack">
        <div class="status" id="test-status"></div>
        <div class="response-grid">
          <article class="panel-section">
            <div class="eyebrow">Request payload</div>
            <h2>Raw request body</h2>
            <button class="button-secondary" id="test-request-button" type="button" disabled>Open request</button>
          </article>
          <article class="panel-section">
            <div class="eyebrow">Response payload</div>
            <h2>Raw response body</h2>
            <button class="button-secondary" id="test-response-button" type="button" disabled>Open response</button>
          </article>
        </div>
        <article class="panel-section">
          <div class="eyebrow">Latest run</div>
          <h2>Result metadata</h2>
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
