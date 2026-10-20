'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../src/ui/assets/app.js'), 'utf8');

function setup(config, ok = true) {
  const elements = new Map();
  for (const id of ['setup-tool', 'setup-config-status', 'setup-opencode-instructions', 'setup-compatible-instructions']) {
    elements.set(id, { textContent: '', value: 'opencode', classList: { toggle() {} }, addEventListener() {} });
  }
  const context = vm.createContext({
    document: { getElementById: (id) => elements.get(id), querySelectorAll: () => [] },
    window: { location: { origin: 'http://localhost:3334' }, addEventListener() {} },
    fetch: async () => ({ ok, json: async () => ({ config }) })
  });
  vm.runInContext(source, context);
  return { context, elements };
}

for (const provider of ['openrouter', 'openai', 'anthropic']) {
  test(`Connect generates ${provider} configuration using the saved model`, async () => {
    const model = provider === 'openrouter' ? 'vendor/model:free' : `${provider}-model`;
    const { context, elements } = setup({ provider, defaultModel: model, apiKey: 'must-not-appear' });
    await vm.runInContext('loadSetupPage()', context);
    const instructions = elements.get('setup-opencode-instructions').textContent;
    const json = instructions.split('Example opencode.json:\n')[1].split('\n\nAfter changing')[0];
    const example = JSON.parse(json);
    const entry = example.provider['ai-logger-proxy'];
    assert.equal(example.model, `ai-logger-proxy/${model}`);
    assert.deepEqual(Object.keys(entry.models), [model]);
    assert.equal(entry.options.baseURL, 'http://localhost:3334/v1');
    assert.equal(entry.npm, provider === 'anthropic' ? '@ai-sdk/anthropic' : '@ai-sdk/openai-compatible');
    assert.ok(!instructions.includes('must-not-appear'));
    assert.ok(elements.get('setup-compatible-instructions').textContent.includes(
      provider === 'anthropic' ? '/v1/messages' : '/v1/chat/completions'
    ));
  });
}

test('Connect asks for a saved model instead of inventing one', async () => {
  const { context, elements } = setup({ provider: 'openrouter', defaultModel: '' });
  await vm.runInContext('loadSetupPage()', context);
  assert.match(elements.get('setup-opencode-instructions').textContent, /Select a default model/);
  assert.ok(!elements.get('setup-opencode-instructions').textContent.includes('gpt-4.1-mini'));
});

test('Connect does not show a usable example when configuration loading fails', async () => {
  const { context, elements } = setup(null, false);
  await vm.runInContext('loadSetupPage()', context);
  assert.match(elements.get('setup-config-status').textContent, /Could not load/);
  assert.match(elements.get('setup-opencode-instructions').textContent, /Instructions unavailable/);
});

test('model IDs with markup and quotes remain text and valid JSON', () => {
  const { context } = setup();
  const model = 'vendor/<script>"\\model:free';
  context.config = { provider: 'openrouter', defaultModel: model };
  const instructions = vm.runInContext('buildOpenCodeSetup(config, "http://localhost:3334")', context);
  const json = instructions.split('Example opencode.json:\n')[1].split('\n\nAfter changing')[0];
  assert.deepEqual(Object.keys(JSON.parse(json).provider['ai-logger-proxy'].models), [model]);
});
