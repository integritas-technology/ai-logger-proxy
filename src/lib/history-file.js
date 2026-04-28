'use strict';

function normalizeTimestamp(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  return timestamp;
}

function buildHistoryFileRow(row) {
  return {
    id: row.id,
    timestamp: normalizeTimestamp(row.timestamp),
    llm: row.llm,
    request: row.request,
    response: row.response
  };
}

function buildHistoryFileContent(row) {
  return `${JSON.stringify(buildHistoryFileRow(row), null, 2)}\n`;
}

module.exports = {
  buildHistoryFileContent,
  buildHistoryFileRow
};
