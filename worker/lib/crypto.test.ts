import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, encryptSecret, decryptSecret } from './crypto.ts';

test('hashPassword and verifyPassword work correctly', async () => {
  const hash = await hashPassword('Crystal5S@2026');
  assert.equal(hash.startsWith('pbkdf2$100000$'), true);
  assert.equal(await verifyPassword('Crystal5S@2026', hash), true);
  assert.equal(await verifyPassword('WrongPassword', hash), false);
});

test('encryptSecret and decryptSecret protect tokens with AES-GCM-256', async () => {
  const secretKey = 'super-secret-jwt-key';
  const rawToken = 'ghp_1234567890abcdefghijklmnopqrstuv';

  const encrypted = await encryptSecret(rawToken, secretKey);
  assert.equal(encrypted.startsWith('enc:v1:'), true);
  assert.notEqual(encrypted, rawToken);

  const decrypted = await decryptSecret(encrypted, secretKey);
  assert.equal(decrypted, rawToken);

  // Wrong master key cannot decrypt
  const wrongDecrypted = await decryptSecret(encrypted, 'wrong-key');
  assert.equal(wrongDecrypted, '');
});
