'use strict';

const { renderLayout } = require('./layout');

function renderHistoryPage() {
  return renderLayout({
    page: '/history',
    title: 'History',
    content: `
      <section class="page-heading">
        <div>
          <div class="eyebrow">Saved traffic</div>
          <h1>Request history</h1>
          <p>Search stored payloads, download log files, and verify stamped proofs.</p>
        </div>
        <button id="history-verify-all" type="button">Verify all</button>
      </section>
      <section class="panel stack">
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="inline-actions">
              <button id="history-refresh" type="button">Refresh history</button>
              <button class="button-secondary" id="history-clear-button" type="button">Clear filters</button>
            </div>
            <div class="status" id="history-status"></div>
          </div>
        </div>
        <div class="history-filters">
          <label class="filter-field">From date
            <input id="history-date-from" type="date">
          </label>
          <label class="filter-field">To date
            <input id="history-date-to" type="date">
          </label>
          <div class="search-field-group">
            <label class="filter-field">Search
              <input id="history-search" type="search" placeholder="Search request or response body">
            </label>
            <button class="button-secondary" id="history-search-button" type="button">Search</button>
          </div>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th scope="col">Select</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Provider</th>
                <th scope="col">Model</th>
                <th scope="col">Request</th>
                <th scope="col">Response</th>
                <th scope="col">Create file</th>
                <th scope="col">Proof</th>
              </tr>
            </thead>
            <tbody id="history-list">
              <tr>
                <td colspan="8" class="empty-state">Loading history...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `
  });
}

module.exports = {
  renderHistoryPage
};
