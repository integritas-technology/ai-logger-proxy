'use strict';

const { renderLayout } = require('./layout');

function renderHistoryPage() {
  return renderLayout({
    page: '/history',
    title: 'History',
    intro: 'Each stored row contains a timestamp, LLM identifier, request blob, response blob, and an empty proof field.',
    content: `
      <section class="panel stack">
        <div class="eyebrow">History</div>
        <h2>Saved AI communication</h2>
        <div class="toolbar">
          <button id="history-refresh" type="button">Refresh history</button>
          <div class="status" id="history-status"></div>
        </div>
        <div class="history-filters">
          <div class="search-field-group">
            <label class="filter-field">Search
              <input id="history-search" type="search" placeholder="Search request or response body">
            </label>
            <button id="history-search-button" type="button">Search</button>
          </div>
          <label class="filter-field">From date
            <input id="history-date-from" type="date">
          </label>
          <label class="filter-field">To date
            <input id="history-date-to" type="date">
          </label>
          <div class="inline-actions">
            <button id="history-clear-button" type="button">Clear filters</button>
          </div>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Provider</th>
                <th scope="col">Model</th>
                <th scope="col">Proof</th>
                <th scope="col">Request</th>
                <th scope="col">Response</th>
              </tr>
            </thead>
            <tbody id="history-list">
              <tr>
                <td colspan="6" class="empty-state">Loading history...</td>
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
