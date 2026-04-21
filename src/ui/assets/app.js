const presets = {
  openai: { baseUrl: 'https://api.openai.com', anthropicVersion: '2023-06-01' },
  anthropic: { baseUrl: 'https://api.anthropic.com', anthropicVersion: '2023-06-01' },
  openrouter: { baseUrl: 'https://openrouter.ai/api', anthropicVersion: '2023-06-01' }
};

function setStatus(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle('error', isError);
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function formatBodyContent(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return formatJson(value);
}

function normalizeViewerContent(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createContentModal() {
  const modal = document.getElementById('content-modal');
  if (!modal) {
    return null;
  }

  const closeButton = document.getElementById('content-modal-close');
  const title = document.getElementById('content-modal-title');
  const kicker = document.getElementById('content-modal-kicker');
  const content = document.getElementById('content-modal-content');

  function close() {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function open(nextTitle, nextContent, nextKicker = 'Viewer') {
    title.textContent = nextTitle;
    kicker.textContent = nextKicker;
    content.textContent = normalizeViewerContent(nextContent);
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === 'true') {
      close();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      close();
    }
  });

  return {
    open
  };
}

async function loadConfigPage() {
  const form = document.getElementById('config-form');
  if (!form) {
    return;
  }

  const providerInput = document.getElementById('provider');
  const baseUrlInput = document.getElementById('baseUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const anthropicVersionGroup = document.getElementById('anthropic-version-group');
  const anthropicVersionInput = document.getElementById('anthropicVersion');
  const defaultModelSelect = document.getElementById('defaultModelSelect');
  const defaultModelManualGroup = document.getElementById('default-model-manual-group');
  const defaultModelInput = document.getElementById('defaultModel');
  const refreshModelsButton = document.getElementById('refresh-models-button');
  const modelsStatus = document.getElementById('models-status');
  const preview = document.getElementById('config-preview');
  const status = document.getElementById('status');
  const saveButton = document.getElementById('save-button');
  let availableModels = [];

  function showManualModelInput(visible) {
    defaultModelManualGroup.classList.toggle('hidden', !visible);
  }

  function populateModelOptions(models, selectedModel = '') {
    const options = ['<option value="">No default model</option>']
      .concat(models.map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`))
      .concat('<option value="__custom__">Custom model...</option>');

    defaultModelSelect.innerHTML = options.join('');
    if (selectedModel && models.some((model) => model.id === selectedModel)) {
      defaultModelSelect.value = selectedModel;
      showManualModelInput(false);
      return;
    }

    if (selectedModel) {
      defaultModelSelect.value = '__custom__';
      defaultModelInput.value = selectedModel;
      showManualModelInput(true);
      return;
    }

    defaultModelSelect.value = '';
    showManualModelInput(false);
  }

  async function refreshModels(selectedModel = '') {
    refreshModelsButton.disabled = true;
    defaultModelSelect.disabled = true;
    modelsStatus.textContent = 'Loading provider models...';

    try {
      const response = await fetch('/__admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerInput.value,
          baseUrl: baseUrlInput.value,
          anthropicVersion: anthropicVersionInput.value,
          apiKey: apiKeyInput.value.trim() || undefined
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.responseBody || result.message || 'Failed to load models');
      }

      availableModels = result.models || [];
      populateModelOptions(availableModels, selectedModel || defaultModelInput.value.trim());
      defaultModelSelect.disabled = false;
      modelsStatus.textContent = availableModels.length
        ? `Loaded ${availableModels.length} models.`
        : 'No models returned by provider.';
    } catch (error) {
      availableModels = [];
      defaultModelSelect.innerHTML = '<option value="__custom__">Custom model...</option>';
      defaultModelSelect.value = '__custom__';
      defaultModelSelect.disabled = false;
      showManualModelInput(true);
      modelsStatus.textContent = 'Could not load models. Use a custom model.';
    } finally {
      refreshModelsButton.disabled = false;
    }
  }

  function updateProviderFields(provider) {
    anthropicVersionGroup.classList.toggle('hidden', provider !== 'anthropic');
    if (provider === 'anthropic' && !anthropicVersionInput.value.trim()) {
      anthropicVersionInput.value = presets.anthropic.anthropicVersion;
    }

    if (provider === 'openrouter') {
      defaultModelInput.placeholder = 'deepseek/deepseek-v3.2';
    } else if (provider === 'anthropic') {
      defaultModelInput.placeholder = 'claude-3-7-sonnet-latest';
    } else {
      defaultModelInput.placeholder = 'gpt-4.1-mini';
    }
  }

  providerInput.addEventListener('change', () => {
    const preset = presets[providerInput.value];
    if (preset) {
      baseUrlInput.value = preset.baseUrl;
      if (providerInput.value === 'anthropic') {
        anthropicVersionInput.value = preset.anthropicVersion;
      }
    }

    updateProviderFields(providerInput.value);
    refreshModels(defaultModelInput.value.trim()).catch(() => {});
  });

  defaultModelSelect.addEventListener('change', () => {
    if (defaultModelSelect.value === '__custom__') {
      showManualModelInput(true);
      return;
    }

    showManualModelInput(false);
    defaultModelInput.value = defaultModelSelect.value;
  });

  refreshModelsButton.addEventListener('click', () => {
    refreshModels(defaultModelInput.value.trim()).catch((error) => {
      modelsStatus.textContent = error.message;
    });
  });

  const response = await fetch('/__admin/config');
  const payload = await response.json();
  const config = payload.config;
  providerInput.value = config.provider;
  baseUrlInput.value = config.baseUrl;
  anthropicVersionInput.value = config.anthropicVersion || presets.anthropic.anthropicVersion;
  defaultModelInput.value = config.defaultModel || '';
  preview.textContent = formatJson(config);
  updateProviderFields(config.provider);
  await refreshModels(config.defaultModel || '');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(status, '');
    saveButton.disabled = true;

    const nextConfig = {
      provider: providerInput.value,
      baseUrl: baseUrlInput.value,
      anthropicVersion: anthropicVersionInput.value,
      defaultModel: defaultModelSelect.value === '__custom__'
        ? defaultModelInput.value
        : defaultModelSelect.value
    };

    if (apiKeyInput.value.trim()) {
      nextConfig.apiKey = apiKeyInput.value.trim();
    }

    try {
      const saveResponse = await fetch('/__admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextConfig)
      });
      const result = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(result.message || 'Failed to save config');
      }

      apiKeyInput.value = '';
      preview.textContent = formatJson(result.config);
      setStatus(status, 'Saved. New requests will use this config immediately.');
      defaultModelInput.value = result.config.defaultModel || '';
      await refreshModels(result.config.defaultModel || '');
    } catch (error) {
      setStatus(status, error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  });
}

async function loadTestingPage() {
  const testButton = document.getElementById('test-button');
  if (!testButton) {
    return;
  }

  const modal = createContentModal();
  const testStatus = document.getElementById('test-status');
  const testRequestButton = document.getElementById('test-request-button');
  const testResponseButton = document.getElementById('test-response-button');
  const testMetaTimestamp = document.getElementById('test-meta-timestamp');
  const testMetaLlm = document.getElementById('test-meta-llm');
  const testMetaModel = document.getElementById('test-meta-model');
  const testMetaProof = document.getElementById('test-meta-proof');
  let latestRawRequest = 'No test run yet.';
  let latestRawResponse = 'No test run yet.';

  testRequestButton.addEventListener('click', () => {
    modal?.open('Raw request body', latestRawRequest, 'Testing');
  });
  testResponseButton.addEventListener('click', () => {
    modal?.open('Raw response body', latestRawResponse, 'Testing');
  });

  testButton.addEventListener('click', async () => {
    testButton.disabled = true;
    setStatus(testStatus, 'Running test inference...');
    latestRawRequest = 'Waiting for request payload...';
    latestRawResponse = 'Waiting for model response...';
    testRequestButton.disabled = true;
    testResponseButton.disabled = true;
    testMetaTimestamp.textContent = 'Waiting for response...';
    testMetaLlm.textContent = 'Waiting for response...';
    testMetaModel.textContent = 'Waiting for response...';
    testMetaProof.textContent = 'Waiting for response...';

    try {
      const response = await fetch('/__admin/test', { method: 'POST' });
      const result = await response.json();
      latestRawRequest = formatBodyContent(result.request?.body);
      latestRawResponse = formatBodyContent(result.response?.body);
      testRequestButton.disabled = false;
      testResponseButton.disabled = false;
      testMetaTimestamp.textContent = result.completedAt || result.timestamp || 'Unknown';
      testMetaLlm.textContent = result.llm || result.provider || 'Unknown';
      testMetaModel.textContent = result.model || 'Unknown';
      testMetaProof.textContent = result.proof || '(blank)';

      if (!response.ok || !result.ok) {
        throw new Error(result.message || `Upstream test failed with status ${result.statusCode || response.status}`);
      }

      setStatus(testStatus, `Test succeeded against ${result.target}`);
    } catch (error) {
      setStatus(testStatus, error.message, true);
    } finally {
      testButton.disabled = false;
    }
  });
}

function renderHistoryRow(row) {
  const requestValue = encodeURIComponent(formatBodyContent(row.request?.body));
  const responseValue = encodeURIComponent(formatBodyContent(row.response?.body));
  const provider = row.request?.provider || row.response?.provider || '';
  const model = row.request?.body?.model || row.response?.body?.model || '';

  return `
    <tr>
      <td>${escapeHtml(new Date(row.timestamp).toLocaleString())}</td>
      <td>${escapeHtml(provider || '')}</td>
      <td>${escapeHtml(model || '')}</td>
      <td>${escapeHtml(row.proof || '(blank)')}</td>
      <td>
        <button type="button" class="history-open-button" data-modal-title="Raw request body" data-modal-kicker="History" data-modal-content="${requestValue}">Raw Request Body</button>
      </td>
      <td>
        <button type="button" class="history-open-button" data-modal-title="Raw response body" data-modal-kicker="History" data-modal-content="${responseValue}">Raw Response Body</button>
      </td>
    </tr>
  `;
}

function rowMatchesHistoryFilters(row, filters) {
  const rowDate = new Date(row.timestamp);
  const requestContent = formatBodyContent(row.request?.body).toLowerCase();
  const responseContent = formatBodyContent(row.response?.body).toLowerCase();
  const searchTerm = filters.search.toLowerCase().trim();

  if (searchTerm && !requestContent.includes(searchTerm) && !responseContent.includes(searchTerm)) {
    return false;
  }

  if (filters.dateFrom) {
    const dateFrom = new Date(`${filters.dateFrom}T00:00:00`);
    if (rowDate < dateFrom) {
      return false;
    }
  }

  if (filters.dateTo) {
    const dateTo = new Date(`${filters.dateTo}T23:59:59.999`);
    if (rowDate > dateTo) {
      return false;
    }
  }

  return true;
}

async function loadHistoryPage() {
  const historyList = document.getElementById('history-list');
  if (!historyList) {
    return;
  }

  const modal = createContentModal();
  const refreshButton = document.getElementById('history-refresh');
  const historyStatus = document.getElementById('history-status');
  const historySearch = document.getElementById('history-search');
  const historyDateFrom = document.getElementById('history-date-from');
  const historyDateTo = document.getElementById('history-date-to');
  const historySearchButton = document.getElementById('history-search-button');
  const historyClearButton = document.getElementById('history-clear-button');
  let loadedRows = [];

  function bindHistoryButtons() {
    historyList.querySelectorAll('.history-open-button').forEach((button) => {
      button.addEventListener('click', () => {
        modal?.open(
          button.dataset.modalTitle || 'Payload',
          decodeURIComponent(button.dataset.modalContent || ''),
          button.dataset.modalKicker || 'History'
        );
      });
    });
  }

  function renderFilteredHistory() {
    const filters = {
      search: historySearch.value,
      dateFrom: historyDateFrom.value,
      dateTo: historyDateTo.value
    };
    const filteredRows = loadedRows.filter((row) => rowMatchesHistoryFilters(row, filters));

    if (!filteredRows.length) {
      historyList.innerHTML = '<tr><td colspan="6" class="empty-state">No rows match the current filters.</td></tr>';
      setStatus(historyStatus, loadedRows.length ? 'No matching rows found.' : 'History loaded.');
      return;
    }

    historyList.innerHTML = filteredRows.map(renderHistoryRow).join('');
    bindHistoryButtons();
    setStatus(historyStatus, `Showing ${filteredRows.length} of ${loadedRows.length} rows.`);
  }

  async function refreshHistory() {
    setStatus(historyStatus, 'Loading history...');
    const response = await fetch('/__admin/history?limit=50');
    const payload = await response.json();
    loadedRows = payload.rows || [];

    if (!loadedRows.length) {
      historyList.innerHTML = '<tr><td colspan="6" class="empty-state">No saved AI communication yet.</td></tr>';
      setStatus(historyStatus, 'History loaded.');
      return;
    }

    renderFilteredHistory();
  }

  refreshButton.addEventListener('click', () => {
    refreshHistory().catch((error) => {
      setStatus(historyStatus, error.message, true);
    });
  });

  historySearchButton.addEventListener('click', renderFilteredHistory);
  historyClearButton.addEventListener('click', () => {
    historySearch.value = '';
    historyDateFrom.value = '';
    historyDateTo.value = '';
    renderFilteredHistory();
  });

  await refreshHistory();
}

window.addEventListener('DOMContentLoaded', () => {
  loadConfigPage().catch((error) => {
    setStatus(document.getElementById('status'), error.message, true);
  });
  loadTestingPage();
  loadHistoryPage().catch((error) => {
    setStatus(document.getElementById('history-status'), error.message, true);
  });
});
