'use strict';

const crypto = require('crypto');

const encryptionSecret = process.env.CONFIG_ENCRYPTION_KEY || '';

function hashString(value) {
  return crypto.createHash('sha3-256').update(value, 'utf8').digest('hex');
}

function getEncryptionKey() {
  return crypto.createHash('sha256').update(encryptionSecret || 'ai-logger-proxy-default-secret', 'utf8').digest();
}

function encryptSecret(value) {
  if (!value) {
    return '';
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(value) {
  if (!value) {
    return '';
  }

  const [ivHex, tagHex, encryptedHex] = String(value).split(':');
  if (!ivHex || !tagHex || !encryptedHex) {
    return '';
  }

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

module.exports = {
  decryptSecret,
  encryptSecret,
  hashString
};
