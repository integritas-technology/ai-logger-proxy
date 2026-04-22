'use strict';

const providerPresets = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com'
  },
  anthropic: {
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    anthropicVersion: '2023-06-01'
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api'
  }
};

function normalizeProvider(provider) {
  const normalized = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
  return Object.prototype.hasOwnProperty.call(providerPresets, normalized) ? normalized : '';
}

function inferProviderFromBaseUrl(baseUrl) {
  if (!baseUrl) {
    return '';
  }

  if (baseUrl.includes('api.anthropic.com')) {
    return 'anthropic';
  }

  if (baseUrl.includes('openrouter.ai')) {
    return 'openrouter';
  }

  if (baseUrl.includes('api.openai.com')) {
    return 'openai';
  }

  return '';
}

module.exports = {
  inferProviderFromBaseUrl,
  normalizeProvider,
  providerPresets
};
