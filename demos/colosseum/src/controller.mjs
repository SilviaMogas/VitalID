import {ed25519} from '@noble/curves/ed25519.js';

export async function createController({portable = false} = {}) {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) {
    throw new Error('A secure browser context is required. Use HTTPS or localhost.');
  }
  if (!portable) {
    try {
      const keys = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
      return {
        publicKey: new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)),
        implementation: 'native non-extractable key',
        sign: async message => new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, message)),
      };
    } catch (error) {
      if (error.name !== 'NotSupportedError') throw error;
    }
  }
  const secret = crypto.getRandomValues(new Uint8Array(32));
  return {
    publicKey: ed25519.getPublicKey(secret),
    implementation: 'portable Ed25519 key in page memory',
    sign: async message => ed25519.sign(message, secret),
  };
}

export async function signController(key, message) {
  return typeof key?.sign === 'function'
    ? key.sign(message)
    : new Uint8Array(await crypto.subtle.sign('Ed25519', key, message));
}
